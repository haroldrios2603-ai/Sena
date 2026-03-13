import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuditOperation, AuditResult, Role } from '@prisma/client';
import { Request } from 'express';
import { SCREEN_PERMISSION_KEY } from '../decorators/screen-permission.decorator';
import { PermissionsService } from '../../permissions/permissions.service';
import { AuditService } from '../../audit/audit.service';

/**
 * Guardián que valida si el usuario autenticado posee alguno de los roles requeridos.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
    private readonly auditService: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredScreenPermission = this.reflector.getAllAndOverride<
      string | string[]
    >(
      SCREEN_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    type RequestWithUser = Request & {
      user?: { userId?: string; role?: Role };
    };
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const userId = request.user?.userId;
    const userRole = request.user?.role;

    if (requiredRoles?.length && (!userRole || !requiredRoles.includes(userRole))) {
      this.auditService.log({
        operation: AuditOperation.FORBIDDEN,
        entity: 'authorization',
        result: AuditResult.FAILURE,
        errorCode: '403',
        errorMessage: 'No tienes permisos suficientes para ejecutar esta acción.',
        metadata: {
          requiredRoles,
        },
        context: this.auditService.buildContextFromRequest(request),
      });
      throw new ForbiddenException(
        'No tienes permisos suficientes para ejecutar esta acción.',
      );
    }

    if (requiredScreenPermission) {
      if (!userId || !userRole) {
        throw new ForbiddenException(
          'Token invalido: faltan datos de usuario para validar permisos.',
        );
      }

      const screenKeys = Array.isArray(requiredScreenPermission)
        ? requiredScreenPermission
        : [requiredScreenPermission];

      const permissionChecks = await Promise.all(
        screenKeys.map((screenKey) =>
          this.permissionsService.canUserViewScreen(userId, userRole, screenKey),
        ),
      );

      const canView = permissionChecks.some(Boolean);

      if (!canView) {
        this.auditService.log({
          operation: AuditOperation.FORBIDDEN,
          entity: screenKeys.join('|'),
          result: AuditResult.FAILURE,
          errorCode: '403',
          errorMessage: 'No tienes permisos para visualizar este módulo.',
          metadata: { requiredScreenPermissions: screenKeys },
          context: this.auditService.buildContextFromRequest(request),
        });
        throw new ForbiddenException(
          'No tienes permisos para visualizar este módulo.',
        );
      }
    }

    return true;
  }
}

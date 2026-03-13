import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Request,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RequireScreenPermission } from '../common/decorators/screen-permission.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsService } from './permissions.service';
import { UpdateScreenPermissionsDto } from './dto/update-screen-permissions.dto';
import { AuditService } from '../audit/audit.service';

@Controller('permissions')
@UseGuards(AuthGuard('jwt'))
export class PermissionsController {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly auditService: AuditService,
  ) {}

  @Get('me')
  async getMyEffectivePermissions(
    @Request() req: { user: { userId: string; role: Role } },
  ) {
    return this.permissionsService.getEffectivePermissionsForUser(req.user.userId);
  }

  @Get('screens')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @RequireScreenPermission('settings-permissions-profiles')
  async listScreens() {
    return this.permissionsService.listScreens();
  }

  @Get('roles/:role')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @RequireScreenPermission('settings-permissions-profiles')
  async getRolePermissions(@Param('role') role: string, @Request() req: any) {
    const parsedRole = this.parseRole(role);
    const result = await this.permissionsService.getRolePermissions(parsedRole);
    this.auditService.log({
      operation: 'VIEW' as any,
      entity: 'permissions_roles',
      result: 'SUCCESS' as any,
      metadata: { role: parsedRole },
      context: this.auditService.buildContextFromRequest(req),
    });
    return result;
  }

  @Put('roles/:role')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @RequireScreenPermission('settings-permissions-profiles')
  async updateRolePermissions(
    @Param('role') role: string,
    @Body() dto: UpdateScreenPermissionsDto,
    @Request() req: any,
  ) {
    const parsedRole = this.parseRole(role);
    const previous = await this.permissionsService.getRolePermissions(parsedRole);
    const result = await this.permissionsService.saveRolePermissions(
      parsedRole,
      dto.permissions,
    );
    this.auditService.log({
      operation: 'UPDATE' as any,
      entity: 'permissions_roles',
      recordId: parsedRole,
      previousValues: previous,
      newValues: result,
      result: 'SUCCESS' as any,
      context: this.auditService.buildContextFromRequest(req),
    });
    return result;
  }

  @Get('users/:userId')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @RequireScreenPermission('settings-permissions-profiles')
  async getUserPermissions(@Param('userId') userId: string, @Request() req: any) {
    const result = await this.permissionsService.getUserPermissions(userId);
    this.auditService.log({
      operation: 'VIEW' as any,
      entity: 'permissions_users',
      recordId: userId,
      result: 'SUCCESS' as any,
      context: this.auditService.buildContextFromRequest(req),
    });
    return result;
  }

  @Put('users/:userId')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @RequireScreenPermission('settings-permissions-profiles')
  async updateUserPermissions(
    @Param('userId') userId: string,
    @Body() dto: UpdateScreenPermissionsDto,
    @Request() req: any,
  ) {
    const previous = await this.permissionsService.getUserPermissions(userId);
    const result = await this.permissionsService.saveUserPermissions(
      userId,
      dto.permissions,
    );
    this.auditService.log({
      operation: 'UPDATE' as any,
      entity: 'permissions_users',
      recordId: userId,
      previousValues: previous,
      newValues: result,
      result: 'SUCCESS' as any,
      context: this.auditService.buildContextFromRequest(req),
    });
    return result;
  }

  private parseRole(role: string): Role {
    const normalized = role.toUpperCase();
    if (!Object.values(Role).includes(normalized as Role)) {
      throw new BadRequestException('Rol no válido');
    }
    return normalized as Role;
  }
}

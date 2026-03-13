import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditOperation, AuditResult, Role } from '@prisma/client';
import { RequireScreenPermission } from '../common/decorators/screen-permission.decorator';
import { AuditService } from '../audit/audit.service';

/**
 * Controlador para tareas administrativas de usuarios.
 */
@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.SUPER_ADMIN)
@RequireScreenPermission('users-management')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Crea un usuario operativo con el rol deseado.
   */
  @Post()
  async create(
    @Body() createUserDto: CreateUserDto,
    @Request() req: any,
  ) {
    const created = await this.usersService.createUser(createUserDto);
    this.auditService.log({
      operation: AuditOperation.CREATE,
      entity: 'users',
      recordId: created.id,
      newValues: created,
      result: AuditResult.SUCCESS,
      context: this.auditService.buildContextFromRequest(req),
    });
    return created;
  }

  /**
   * Lista usuarios con filtros opcionales.
   */
  @Get()
  async findAll(@Query() filters: ListUsersDto, @Request() req: any) {
    const users = await this.usersService.findAll(filters);
    this.auditService.log({
      operation: AuditOperation.VIEW,
      entity: 'users',
      result: AuditResult.SUCCESS,
      metadata: { count: users.length },
      context: this.auditService.buildContextFromRequest(req),
    });
    return users;
  }

  /**
   * Cambia el rol del usuario identificado.
   */
  @Patch(':id/role')
  async updateRole(
    @Param('id') id: string,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
    @Request() req: any,
  ) {
    const previous = await this.usersService.findById(id);
    const updated = await this.usersService.updateRole(id, updateUserRoleDto);
    this.auditService.log({
      operation: AuditOperation.UPDATE,
      entity: 'users',
      recordId: id,
      previousValues: previous,
      newValues: updated,
      result: AuditResult.SUCCESS,
      context: this.auditService.buildContextFromRequest(req),
    });
    return updated;
  }

  /**
   * Activa o desactiva el usuario identificado.
   */
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() updateUserStatusDto: UpdateUserStatusDto,
    @Request() req: any,
  ) {
    const previous = await this.usersService.findById(id);
    const updated = await this.usersService.updateStatus(id, updateUserStatusDto);
    this.auditService.log({
      operation: AuditOperation.UPDATE,
      entity: 'users',
      recordId: id,
      previousValues: previous,
      newValues: updated,
      result: AuditResult.SUCCESS,
      context: this.auditService.buildContextFromRequest(req),
    });
    return updated;
  }
}

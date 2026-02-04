import { IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

/**
 * DTO para asignar o cambiar roles desde la consola administrativa.
 */
export class UpdateUserRoleDto {
  /**
   * Rol que se desea aplicar al usuario objetivo.
   */
  @IsEnum(Role, { message: 'Rol inválido' })
  role: Role;
}

/**
 * Data Transfer Object que define la forma y validaciones del payload para dto.
 */
import { IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

/**
 * DTO para asignar o cambiar roles desde la consola administrativa.
 */
/**
 * Clase UpdateUserRoleDto que implementa la lógica principal de dto.
 */
/**
 * Clase UpdateUserRoleDto que implementa la lógica principal de dto.
 */
/**
 * Clase UpdateUserRoleDto que implementa la lógica principal de dto.
 */
export class UpdateUserRoleDto {
  /**
   * Rol que se desea aplicar al usuario objetivo.
   */
  @IsEnum(Role, { message: 'Rol inválido' })
  role: Role;
}

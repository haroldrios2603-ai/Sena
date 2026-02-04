import { IsEnum, IsOptional, IsBooleanString } from 'class-validator';
import { Role } from '@prisma/client';

/**
 * DTO para filtrar la vista de usuarios.
 */
export class ListUsersDto {
  /**
   * Rol opcional para filtrar resultados.
   */
  @IsOptional()
  @IsEnum(Role, { message: 'Rol inválido' })
  role?: Role;

  /**
   * Permite filtrar por estado activo usando strings 'true' o 'false'.
   */
  @IsOptional()
  @IsBooleanString()
  isActive?: string;
}

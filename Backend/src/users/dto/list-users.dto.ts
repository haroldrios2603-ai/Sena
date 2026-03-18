import { IsEnum, IsOptional, IsBooleanString, IsString } from 'class-validator';
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

  /**
   * Filtro opcional por nombre completo.
   */
  @IsOptional()
  @IsString()
  fullName?: string;

  /**
   * Filtro opcional por correo.
   */
  @IsOptional()
  @IsString()
  email?: string;

  /**
   * Filtro opcional por teléfono de contacto.
   */
  @IsOptional()
  @IsString()
  contactPhone?: string;

  /**
   * Filtro opcional por número de documento.
   */
  @IsOptional()
  @IsString()
  documentNumber?: string;
}

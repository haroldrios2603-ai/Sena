import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';
import { Role } from '@prisma/client';

/**
 * DTO para actualizar datos básicos de un usuario existente.
 */
export class UpdateUserDto {
  /**
   * Nombre completo del usuario.
   */
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim() : value,
  )
  fullName?: string;

  /**
   * Correo corporativo único del usuario.
   */
  @IsOptional()
  @IsEmail({}, { message: 'Debes ingresar un correo válido' })
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  email?: string;

  /**
   * Teléfono de contacto del usuario.
   */
  @IsOptional()
  @IsString()
  @MinLength(7)
  @MaxLength(20)
  @Matches(/^[+0-9()\-\s]+$/, {
    message: 'El teléfono de contacto contiene caracteres inválidos',
  })
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim() : value,
  )
  contactPhone?: string;

  /**
   * Rol operativo dentro de la plataforma.
   */
  @IsOptional()
  @IsEnum(Role, { message: 'Rol inválido' })
  role?: Role;

  /**
   * Estado de activación de la cuenta.
   */
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

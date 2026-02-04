import {
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
  IsEnum,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Role } from '@prisma/client';

/**
 * DTO para que un SUPER_ADMIN cree usuarios con rol asignado.
 */
export class CreateUserDto {
  /**
   * Nombre completo del usuario administrado.
   */
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  fullName: string;

  /**
   * Correo corporativo único.
   */
  @IsEmail({}, { message: 'Debes ingresar un correo válido' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  /**
   * Contraseña temporal asignada por el administrador.
   */
  @IsString()
  @MinLength(8, {
    message: 'La contraseña debe tener al menos 8 caracteres',
  })
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).+$/, {
    message:
      'La contraseña debe contener mayúsculas, minúsculas, números y un carácter especial',
  })
  password: string;

  /**
   * Rol asignado. Solo el SUPER_ADMIN puede otorgar permisos elevados.
   */
  @IsEnum(Role, { message: 'Rol inválido' })
  role: Role;
}

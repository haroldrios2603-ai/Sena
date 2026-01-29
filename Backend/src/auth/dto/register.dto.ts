import {
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Role } from '@prisma/client';

/**
 * Objeto de Transferencia de Datos para Registro de Usuario.
 * Valida y sanitiza la carga útil para crear un nuevo usuario.
 */
export class RegisterDto {
  /**
   * User full name.
   * ES: Nombre completo del usuario.
   */
  @IsString()
  @MinLength(2, {
    message: 'El nombre completo debe tener al menos 2 caracteres',
  })
  @MaxLength(100, {
    message: 'El nombre completo no puede exceder 100 caracteres',
  })
  @Transform(({ value }: { value: string }) => value?.trim())
  fullName: string;

  /**
   * User email address. Must be a valid email.
   * ES: Dirección de correo electrónico. Debe ser un email válido.
   */
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email: string;

  /**
   * User password. Must be at least 8 characters with mixed case, numbers, and special chars.
   * ES: Contraseña del usuario. Debe tener al menos 8 caracteres con mayúsculas, minúsculas, números y caracteres especiales.
   */
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(128, { message: 'La contraseña no puede exceder 128 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial',
  })
  password: string;

  /**
   * User role (optional, defaults to OPERATOR in DB).
   * ES: Rol del usuario (opcional, por defecto es OPERATOR en BD).
   */
  @IsOptional()
  @IsEnum(Role, { message: 'Rol inválido' })
  role?: Role;
}

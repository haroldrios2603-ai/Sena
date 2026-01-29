import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Objeto de Transferencia de Datos para Inicio de Sesión.
 * Valida y sanitiza las credenciales de login.
 */
export class LoginDto {
  /**
   * User email.
   * ES: Correo del usuario.
   */
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email: string;

  /**
   * User password.
   * ES: Contraseña del usuario.
   */
  @IsString()
  @MinLength(1, { message: 'La contraseña es requerida' })
  @MaxLength(128, { message: 'La contraseña no puede exceder 128 caracteres' })
  password: string;
}

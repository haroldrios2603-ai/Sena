import { IsEmail, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO para confirmar código y definir nueva contraseña.
 */
export class PasswordResetDto {
  /**
   * Correo asociado al código enviado.
   */
  @IsEmail({}, { message: 'Debes ingresar un correo válido' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  /**
   * Código recibido por el usuario.
   */
  @IsString()
  @MinLength(6, { message: 'El código debe tener al menos 6 caracteres' })
  code: string;

  /**
   * Nueva contraseña que se desea establecer.
   */
  @IsString()
  @MinLength(8, { message: 'La nueva contraseña debe tener mínimo 8 caracteres' })
  newPassword: string;
}

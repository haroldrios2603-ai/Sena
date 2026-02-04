import { IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO para solicitar el envío de código de recuperación.
 */
export class PasswordRequestDto {
  /**
   * Correo del usuario que solicita el código.
   */
  @IsEmail({}, { message: 'Debes ingresar un correo válido' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;
}

/**
 * Data Transfer Object que define la forma y validaciones del payload para dto.
 */
import { IsEmail } from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';

/**
 * DTO para solicitar el envío de código de recuperación.
 */
/**
 * Clase PasswordRequestDto que implementa la lógica principal de dto.
 */
/**
 * Clase PasswordRequestDto que implementa la lógica principal de dto.
 */
/**
 * Clase PasswordRequestDto que implementa la lógica principal de dto.
 */
export class PasswordRequestDto {
  /**
   * Correo del usuario que solicita el código.
   */
  @IsEmail({}, { message: 'Debes ingresar un correo válido' })
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.toLowerCase().trim() : '',
  )
  email: string;
}

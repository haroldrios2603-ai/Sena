import { IsEmail, IsString, MaxLength, MinLength, Matches } from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';

/**
 * DTO para confirmar código y definir nueva contraseña.
 */
export class PasswordResetDto {
  /**
   * Correo asociado al código enviado.
   */
  @IsEmail({}, { message: 'Debes ingresar un correo válido' })
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.toLowerCase().trim() : '',
  )
  email: string;

  /**
   * Código recibido por el usuario.
   */
  @IsString()
  @MinLength(6, { message: 'El código debe tener al menos 6 caracteres' })
  @MaxLength(6, { message: 'El código debe tener máximo 6 caracteres' })
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim().toUpperCase() : '',
  )
  code: string;

  /**
   * Nueva contraseña que se desea establecer.
   */
  @IsString()
  @MinLength(8, {
    message: 'La nueva contraseña debe tener mínimo 8 caracteres',
  })
  @MaxLength(128, {
    message: 'La nueva contraseña no puede superar 128 caracteres',
  })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, {
    message:
      'La nueva contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial',
  })
  newPassword: string;
}

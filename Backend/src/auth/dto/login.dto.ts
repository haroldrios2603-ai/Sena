import { IsEmail, IsString, MinLength } from 'class-validator';

/**
 * Objeto de Transferencia de Datos para Inicio de Sesión.
 */
export class LoginDto {
    /**
     * User email.
     * ES: Correo del usuario.
     */
    @IsEmail()
    email: string;

    /**
     * User password.
     * ES: Contraseña del usuario.
     */
    @IsString()
    @MinLength(6)
    password: string;
}

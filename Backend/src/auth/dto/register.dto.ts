import { IsString, IsEmail, MinLength, IsOptional, IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

/**
 * Objeto de Transferencia de Datos para Registro de Usuario.
 * Valida la carga útil para crear un nuevo usuario.
 */
export class RegisterDto {
    /**
     * User full name.
     * ES: Nombre completo del usuario.
     */
    @IsString()
    fullName: string;

    /**
     * User email address. Must be a valid email.
     * ES: Dirección de correo electrónico. Debe ser un email válido.
     */
    @IsEmail()
    email: string;

    /**
     * User password. Must be at least 6 characters.
     * ES: Contraseña del usuario. Debe tener al menos 6 caracteres.
     */
    @IsString()
    @MinLength(6, { message: 'Password must be at least 6 characters long' })
    password: string;

    /**
     * User role (optional, defaults to OPERATOR in DB).
     * ES: Rol del usuario (opcional, por defecto es OPERATOR en BD).
     */
    @IsOptional()
    @IsEnum(Role)
    role?: Role;
}

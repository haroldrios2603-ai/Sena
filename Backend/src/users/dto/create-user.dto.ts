import {
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
  IsEnum,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';
import { Role, DocumentType } from '@prisma/client';

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
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim() : '',
  )
  fullName: string;

  /**
   * Correo corporativo único.
   */
  @IsEmail({}, { message: 'Debes ingresar un correo válido' })
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.toLowerCase().trim() : '',
  )
  email: string;

  /**
   * Teléfono de contacto principal del usuario.
   */
  @IsString()
  @IsNotEmpty({ message: 'El teléfono de contacto es obligatorio' })
  @MinLength(7)
  @MaxLength(20)
  @Matches(/^[+0-9()\-\s]+$/, {
    message: 'El teléfono de contacto contiene caracteres inválidos',
  })
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim() : '',
  )
  contactPhone: string;

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

  /**
   * Tipo de documento de identidad.
   */
  @IsOptional()
  @IsEnum(DocumentType, { message: 'Tipo de documento inválido' })
  documentType?: DocumentType;

  /**
   * Número del documento de identidad.
   */
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim() : value,
  )
  documentNumber?: string;
}

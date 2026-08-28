/**
 * Data Transfer Object que define la forma y validaciones del payload para dto.
 */
import {
  IsEmail,
  IsNumber,
  Min,
  IsString,
  MinLength,
  MaxLength,
  IsUUID,
  IsOptional,
  IsDateString,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';
import { Transform, TransformFnParams, Type } from 'class-transformer';
import { DocumentType } from '@prisma/client';

/**
 * DTO para registrar clientes con mensualidad.
 */
/**
 * Clase CreateClientDto que implementa la lógica principal de dto.
 */
/**
 * Clase CreateClientDto que implementa la lógica principal de dto.
 */
/**
 * Clase CreateClientDto que implementa la lógica principal de dto.
 */
export class CreateClientDto {
  @IsString()
  @MinLength(2)
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim() : '',
  )
  fullName: string;

  @IsEmail({}, { message: 'Debes ingresar un correo válido' })
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.toLowerCase().trim() : '',
  )
  email: string;

  @IsString()
  @MinLength(7)
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim() : '',
  )
  contactPhone: string;

  @IsUUID()
  parkingId: string;

  @IsDateString({}, { message: 'Fecha de inicio inválida' })
  startDate: string;

  @IsDateString({}, { message: 'Fecha de finalización inválida' })
  endDate: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'La mensualidad no puede ser negativa' })
  monthlyFee: number;

  @IsOptional()
  @IsString()
  planName?: string;

  @IsNotEmpty({ message: 'Debes seleccionar el tipo de documento' })
  @IsEnum(DocumentType, { message: 'Tipo de documento inválido' })
  documentType: DocumentType;

  @IsNotEmpty({ message: 'El número de documento es obligatorio' })
  @IsString()
  @MinLength(3, { message: 'El número de documento debe tener al menos 3 caracteres' })
  @MaxLength(20, { message: 'El número de documento no puede exceder 20 caracteres' })
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim() : value,
  )
  documentNumber: string;
}

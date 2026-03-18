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
} from 'class-validator';
import { Transform, TransformFnParams, Type } from 'class-transformer';
import { DocumentType } from '@prisma/client';

/**
 * DTO para registrar clientes con mensualidad.
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

  @IsOptional()
  @IsEnum(DocumentType, { message: 'Tipo de documento inválido' })
  documentType?: DocumentType;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim() : value,
  )
  documentNumber?: string;
}

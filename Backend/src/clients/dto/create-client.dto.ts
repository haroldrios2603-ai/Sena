import {
  IsEmail,
  IsNumber,
  Min,
  IsString,
  MinLength,
  IsUUID,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * DTO para registrar clientes con mensualidad.
 */
export class CreateClientDto {
  @IsString()
  @MinLength(2)
  @Transform(({ value }) => value?.trim())
  fullName: string;

  @IsEmail({}, { message: 'Debes ingresar un correo válido' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

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
}

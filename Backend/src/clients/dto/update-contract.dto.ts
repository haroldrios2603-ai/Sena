import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Transform, TransformFnParams, Type } from 'class-transformer';

/**
 * DTO para actualizar datos editables de cliente y contrato.
 */
export class UpdateContractDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim() : value,
  )
  fullName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Debes ingresar un correo válido' })
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(7)
  @MaxLength(20)
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim() : value,
  )
  contactPhone?: string;

  @IsOptional()
  @IsUUID()
  parkingId?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Fecha de inicio inválida' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Fecha de finalización inválida' })
  endDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Fecha de último pago inválida' })
  lastPaymentDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Fecha de próximo pago inválida' })
  nextPaymentDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  monthlyFee?: number;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim() : value,
  )
  planName?: string;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;
}

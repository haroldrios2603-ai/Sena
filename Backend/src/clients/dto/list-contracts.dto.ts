import { IsIn, IsOptional, IsString } from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';

/**
 * Filtros para inventario de contratos de clientes.
 */
export class ListContractsDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  fullName?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  email?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  parkingId?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  parkingName?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  planName?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'EXPIRED', 'EXPIRING_SOON', 'PAYMENT_PENDING'])
  status?: 'ACTIVE' | 'EXPIRED' | 'EXPIRING_SOON' | 'PAYMENT_PENDING';
}

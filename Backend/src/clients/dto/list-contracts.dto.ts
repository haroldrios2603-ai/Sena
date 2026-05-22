/**
 * Data Transfer Object que define la forma y validaciones del payload para dto.
 */
import { IsIn, IsOptional, IsString } from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';

/**
 * Filtros para inventario de contratos de clientes.
 */
/**
 * Clase ListContractsDto que implementa la lógica principal de dto.
 */
/**
 * Clase ListContractsDto que implementa la lógica principal de dto.
 */
/**
 * Clase ListContractsDto que implementa la lógica principal de dto.
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
  @IsIn(['ACTIVE', 'EXPIRED', 'EXPIRING_SOON', 'PAYMENT_PENDING', 'CANCELLED'])
  status?: 'ACTIVE' | 'EXPIRED' | 'EXPIRING_SOON' | 'PAYMENT_PENDING' | 'CANCELLED';

  @IsOptional()
  @IsString()
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  documentNumber?: string;
}

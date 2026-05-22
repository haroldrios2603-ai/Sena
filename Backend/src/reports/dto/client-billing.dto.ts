/**
 * Data Transfer Object que define la forma y validaciones del payload para dto.
 */
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

/**
 * DTO para facturacion por cliente.
 */
/**
 * Clase ClientBillingDto que implementa la lógica principal de dto.
 */
/**
 * Clase ClientBillingDto que implementa la lógica principal de dto.
 */
/**
 * Clase ClientBillingDto que implementa la lógica principal de dto.
 */
export class ClientBillingDto {
  @IsUUID()
  clientId!: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

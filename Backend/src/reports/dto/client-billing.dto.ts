import { IsDateString, IsOptional, IsUUID } from 'class-validator';

/**
 * DTO para facturacion por cliente.
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

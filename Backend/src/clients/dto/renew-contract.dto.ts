/**
 * Data Transfer Object que define la forma y validaciones del payload para dto.
 */
import { IsDateString, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para renovar mensualidades y registrar el pago.
 */
/**
 * Clase RenewContractDto que implementa la lógica principal de dto.
 */
/**
 * Clase RenewContractDto que implementa la lógica principal de dto.
 */
/**
 * Clase RenewContractDto que implementa la lógica principal de dto.
 */
export class RenewContractDto {
  @IsDateString({}, { message: 'La nueva fecha debe ser válida' })
  newEndDate: string;

  @IsDateString({}, { message: 'Debes indicar la fecha del pago' })
  paymentDate: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  monthlyFee?: number;
}

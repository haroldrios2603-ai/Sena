/**
 * Data Transfer Object que define la forma y validaciones del payload para dto.
 */
import { IsInt, IsOptional, IsPositive, Max, Min } from 'class-validator';

/**
 * Clase CreateExitPaymentIntentDto que implementa la lógica principal de dto.
 */
/**
 * Clase CreateExitPaymentIntentDto que implementa la lógica principal de dto.
 */
/**
 * Clase CreateExitPaymentIntentDto que implementa la lógica principal de dto.
 */
export class CreateExitPaymentIntentDto {
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(120)
  expiresInMinutes?: number;

  @IsOptional()
  @IsPositive()
  overrideAmount?: number;
}

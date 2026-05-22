/**
 * Data Transfer Object que define la forma y validaciones del payload para dto.
 */
import { Type } from 'class-transformer';
import { IsDateString, IsOptional } from 'class-validator';

/**
 * DTO base para filtros por rango de fechas.
 */
/**
 * Clase DateRangeDto que implementa la lógica principal de dto.
 */
/**
 * Clase DateRangeDto que implementa la lógica principal de dto.
 */
/**
 * Clase DateRangeDto que implementa la lógica principal de dto.
 */
export class DateRangeDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  limit?: number;
}

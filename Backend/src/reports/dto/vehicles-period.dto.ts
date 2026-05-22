/**
 * Data Transfer Object que define la forma y validaciones del payload para dto.
 */
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsOptional } from 'class-validator';

/**
 * DTO para reporte de cantidad de vehiculos por periodo.
 */
/**
 * Clase VehiclesPeriodDto que implementa la lógica principal de dto.
 */
/**
 * Clase VehiclesPeriodDto que implementa la lógica principal de dto.
 */
/**
 * Clase VehiclesPeriodDto que implementa la lógica principal de dto.
 */
export class VehiclesPeriodDto {
  @IsIn(['day', 'week', 'month'])
  period!: 'day' | 'week' | 'month';

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @Type(() => Number)
  limit?: number;
}

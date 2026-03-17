import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsOptional } from 'class-validator';

/**
 * DTO para reporte de cantidad de vehiculos por periodo.
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

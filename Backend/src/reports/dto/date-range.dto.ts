import { Type } from 'class-transformer';
import { IsDateString, IsOptional } from 'class-validator';

/**
 * DTO base para filtros por rango de fechas.
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

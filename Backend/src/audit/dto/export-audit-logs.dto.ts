/**
 * Data Transfer Object que define la forma y validaciones del payload para dto.
 */
import { IsIn, IsOptional } from 'class-validator';
import { QueryAuditLogsDto } from './query-audit-logs.dto';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

/**
 * Clase ExportAuditLogsDto que implementa la lógica principal de dto.
 */
/**
 * Clase ExportAuditLogsDto que implementa la lógica principal de dto.
 */
/**
 * Clase ExportAuditLogsDto que implementa la lógica principal de dto.
 */
export class ExportAuditLogsDto extends QueryAuditLogsDto {
  @IsOptional()
  @IsIn(['csv', 'json'])
  format?: 'csv' | 'json' = 'csv';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  limit?: number = 1000;
}

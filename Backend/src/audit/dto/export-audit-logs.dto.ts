import { IsIn, IsOptional } from 'class-validator';
import { QueryAuditLogsDto } from './query-audit-logs.dto';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

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

import { IsDateString, IsOptional, IsUUID } from 'class-validator';

/**
 * DTO para filtrar asistencia por usuario y fechas.
 */
export class AttendanceReportDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

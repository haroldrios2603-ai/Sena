import { IsDateString, IsOptional, IsUUID, IsString } from 'class-validator';

/**
 * DTO para filtrar asistencia por usuario y fechas.
 */
export class AttendanceReportDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

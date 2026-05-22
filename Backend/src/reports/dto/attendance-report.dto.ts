/**
 * Data Transfer Object que define la forma y validaciones del payload para dto.
 */
import { IsDateString, IsOptional, IsUUID, IsString } from 'class-validator';

/**
 * DTO para filtrar asistencia por usuario y fechas.
 */
/**
 * Clase AttendanceReportDto que implementa la lógica principal de dto.
 */
/**
 * Clase AttendanceReportDto que implementa la lógica principal de dto.
 */
/**
 * Clase AttendanceReportDto que implementa la lógica principal de dto.
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

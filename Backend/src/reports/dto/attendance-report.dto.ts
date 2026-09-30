/**
 * Data Transfer Object que define la forma y validaciones del payload para dto.
 */
import { IsDateString, IsOptional, IsString } from 'class-validator';

/**
 * DTO para filtrar asistencia por usuario y fechas.
 * ES: se acepta texto libre porque el usuario puede buscar por UUID, nombre, email o documento.
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
  @IsString()
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

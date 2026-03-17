import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';

/**
 * DTO para exportacion de reportes en distintos formatos.
 */
export class ExportReportDto {
  @IsIn(['trabajadores', 'vehiculos', 'facturacion-total', 'facturacion-cliente', 'mensualidades', 'asistencia', 'ingresos-por-tipo', 'horas-pico'])
  reportType!:
    | 'trabajadores'
    | 'vehiculos'
    | 'facturacion-total'
    | 'facturacion-cliente'
    | 'mensualidades'
    | 'asistencia'
    | 'ingresos-por-tipo'
    | 'horas-pico';

  @IsIn(['excel', 'pdf', 'word'])
  format!: 'excel' | 'pdf' | 'word';

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  period?: 'day' | 'week' | 'month';

  @IsOptional()
  @IsIn(['todos', 'al_dia', 'atrasados'])
  status?: 'todos' | 'al_dia' | 'atrasados';

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @Type(() => Number)
  limit?: number;
}

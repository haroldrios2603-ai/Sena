/**
 * Data Transfer Object que define la forma y validaciones del payload para dto.
 */
import { IsIn, IsOptional } from 'class-validator';

/**
 * DTO para filtrar estado de mensualidades.
 */
/**
 * Clase MonthlyStatusDto que implementa la lógica principal de dto.
 */
/**
 * Clase MonthlyStatusDto que implementa la lógica principal de dto.
 */
/**
 * Clase MonthlyStatusDto que implementa la lógica principal de dto.
 */
export class MonthlyStatusDto {
  @IsOptional()
  @IsIn(['todos', 'al_dia', 'atrasados'])
  status?: 'todos' | 'al_dia' | 'atrasados';
}

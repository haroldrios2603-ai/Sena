import { IsIn, IsOptional } from 'class-validator';

/**
 * DTO para filtrar estado de mensualidades.
 */
export class MonthlyStatusDto {
  @IsOptional()
  @IsIn(['todos', 'al_dia', 'atrasados'])
  status?: 'todos' | 'al_dia' | 'atrasados';
}

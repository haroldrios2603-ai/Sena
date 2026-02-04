import { IsBoolean } from 'class-validator';

/**
 * DTO para activar o desactivar usuarios operativos.
 */
export class UpdateUserStatusDto {
  /**
   * Bandera que define si la cuenta permanece activa.
   */
  @IsBoolean()
  isActive: boolean;
}

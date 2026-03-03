import { IsBoolean } from 'class-validator';

/**
 * DTO sencillo para activar o desactivar una sede.
 */
export class UpdateParkingStatusDto {
  @IsBoolean()
  activo: boolean;
}

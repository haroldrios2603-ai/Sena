import { IsString, IsIn, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO para registrar la entrada de un vehículo.
 */
export class EntryDto {
  /**
   * Placa del vehículo.
   */
  @IsString()
  @Transform(({ value }: { value: string }) => value?.toUpperCase().trim())
  placa: string;

  /**
   * Tipo de vehículo.
   */
  @IsString()
  @IsIn(['CAR', 'MOTORCYCLE', 'VAN'], {
    message: 'Tipo de vehículo inválido. Debe ser CAR, MOTORCYCLE o VAN',
  })
  vehicleType: string;

  /**
   * ID del parqueadero.
   */
  @IsUUID()
  parkingId: string;
}

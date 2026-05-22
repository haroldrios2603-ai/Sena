/**
 * Data Transfer Object que define la forma y validaciones del payload para dto.
 */
import { IsString, IsIn, IsUUID, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO para registrar la entrada de un vehículo.
 */
/**
 * Clase EntryDto que implementa la lógica principal de dto.
 */
/**
 * Clase EntryDto que implementa la lógica principal de dto.
 */
/**
 * Clase EntryDto que implementa la lógica principal de dto.
 */
export class EntryDto {
  /**
   * Placa del vehículo.
   */
  @IsString()
  @MinLength(6, { message: 'La placa debe tener exactamente 6 caracteres' })
  @MaxLength(6, { message: 'La placa debe tener máximo 6 caracteres' })
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

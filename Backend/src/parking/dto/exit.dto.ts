import { IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO para registrar la salida de un vehículo.
 */
export class ExitDto {
  /**
   * Placa del vehículo.
   */
  @IsString()
  @MinLength(6, { message: 'La placa debe tener exactamente 6 caracteres' })
  @MaxLength(6, { message: 'La placa debe tener máximo 6 caracteres' })
  @Transform(({ value }: { value: string }) => value?.toUpperCase().trim())
  placa: string;
}

import { IsString } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO para registrar la salida de un vehículo.
 */
export class ExitDto {
  /**
   * Placa del vehículo.
   */
  @IsString()
  @Transform(({ value }: { value: string }) => value?.toUpperCase().trim())
  placa: string;
}

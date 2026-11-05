/**
 * Data Transfer Object que define la forma y validaciones del payload para dto.
 */
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO para registrar la salida de un vehículo.
 */
/**
 * Clase ExitDto que implementa la lógica principal de dto.
 */
/**
 * Clase ExitDto que implementa la lógica principal de dto.
 */
/**
 * Clase ExitDto que implementa la lógica principal de dto.
 */
export class ExitDto {
  /**
   * Placa del vehículo.
   */
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'La placa debe tener exactamente 6 caracteres' })
  // ES: Permitimos hasta 7 para resolver placas legadas ya registradas en operación.
  @MaxLength(7, {
    message: 'La placa debe tener máximo 7 caracteres para salida',
  })
  @Transform(({ value }: { value: string }) => value?.toUpperCase().trim())
  placa?: string;

  /** Código del ticket o identificador alternativo para vehículos sin placa. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  ticketCode?: string;

  /** Permite que el cliente envíe una sola clave sin romper clientes antiguos. */
  @ValidateIf((data: ExitDto) => !data.placa && !data.ticketCode)
  @IsNotEmpty({ message: 'Debes ingresar una placa o el código del ticket' })
  identificador?: string;
}

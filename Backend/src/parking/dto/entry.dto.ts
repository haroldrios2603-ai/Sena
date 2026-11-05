/**
 * Data Transfer Object que define la forma y validaciones del payload para dto.
 */
import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { DocumentType } from '@prisma/client';

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
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'La placa debe tener exactamente 6 caracteres' })
  @MaxLength(6, { message: 'La placa debe tener máximo 6 caracteres' })
  @Transform(({ value }: { value: string }) => value?.toUpperCase().trim())
  placa?: string;

  /**
   * Tipo de vehículo.
   */
  @IsString()
  @IsIn(['CAR', 'MOTORCYCLE', 'VAN', 'BICYCLE', 'ELECTRIC_MOTORCYCLE'], {
    message:
      'Tipo de vehículo inválido. Debe ser CAR, MOTORCYCLE, VAN, BICYCLE o ELECTRIC_MOTORCYCLE',
  })
  vehicleType: string;

  /**
   * ID del parqueadero.
   */
  @IsUUID()
  parkingId: string;

  /** Datos obligatorios para identificar al responsable cuando no existe placa visible. */
  @ValidateIf((data: EntryDto) => !data.placa)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  ownerName?: string;

  @ValidateIf((data: EntryDto) => !data.placa)
  @IsEnum(DocumentType, { message: 'Tipo de documento del responsable inválido' })
  ownerDocumentType?: DocumentType;

  @ValidateIf((data: EntryDto) => !data.placa)
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  ownerDocumentNumber?: string;

  @ValidateIf((data: EntryDto) => !data.placa)
  @IsString()
  @MinLength(7)
  @MaxLength(20)
  ownerPhone?: string;
}

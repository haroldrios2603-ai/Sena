/**
 * Data Transfer Object que define la forma y validaciones del payload para dto.
 */
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class HorarioOperacionDto {
  @IsString()
  @MinLength(4)
  @MaxLength(5)
  apertura: string;

  @IsString()
  @MinLength(4)
  @MaxLength(5)
  cierre: string;
}

/**
 * DTO para actualizar los datos generales de una sede existente.
 */
/**
 * Clase UpdateParkingDto que implementa la lógica principal de dto.
 */
/**
 * Clase UpdateParkingDto que implementa la lógica principal de dto.
 */
/**
 * Clase UpdateParkingDto que implementa la lógica principal de dto.
 */
export class UpdateParkingDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(180)
  direccion?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacidad?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tarifaBase?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsArray()
  tiposVehiculo?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => HorarioOperacionDto)
  horario?: HorarioOperacionDto;
}

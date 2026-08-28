/**
 * DTO para definir el payload de creación de parqueaderos.
 * Mantiene la validación de entradas sin alterar la lógica de negocio.
 */
import {
  ArrayNotEmpty,
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

/**
 * DTO interno para describir el horario de operación del parqueadero.
 */
class HorarioOperacionDto {
  @IsString()
  @MinLength(4)
  @MaxLength(5)
  apertura!: string;

  @IsString()
  @MinLength(4)
  @MaxLength(5)
  cierre!: string;
}

/**
 * DTO para crear nuevas sedes o parqueaderos operativos.
 */
export class CreateParkingDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  nombre!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(180)
  direccion!: string;

  @IsInt()
  @Min(1)
  capacidad!: number;

  @IsNumber()
  @Min(0)
  tarifaBase!: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  tiposVehiculo?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => HorarioOperacionDto)
  horario?: HorarioOperacionDto;
}

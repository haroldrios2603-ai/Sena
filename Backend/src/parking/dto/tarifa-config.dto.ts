import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * DTO reutilizable para definir tarifas por tipo de vehículo.
 */
export class TarifaConfigDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  tipoVehiculo: string;

  @IsNumber()
  @Min(0)
  tarifaBase: number;

  @IsNumber()
  @Min(0)
  tarifaHora: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tarifaDia?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tarifaNocturna?: number;

  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(5)
  horaInicioNocturna?: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(5)
  horaFinNocturna?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tarifaPlana?: number;
}

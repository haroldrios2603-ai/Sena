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
import { TarifaConfigDto } from '../../parking/dto/tarifa-config.dto';

export class HorarioAtencionDto {
  @IsString()
  @MinLength(4)
  @MaxLength(5)
  apertura: string;

  @IsString()
  @MinLength(4)
  @MaxLength(5)
  cierre: string;
}

export class CapacidadPorTipoDto {
  @IsString()
  @MinLength(2)
  tipo: string;

  @IsInt()
  @Min(0)
  capacidad: number;
}

export class TarifaEspecialDto {
  @IsString()
  @MinLength(3)
  nombre: string;

  @IsString()
  @MinLength(3)
  aplica: string;

  @IsNumber()
  @Min(0)
  recargoPorcentaje: number;
}

export class MetodosPagoDto {
  @IsBoolean()
  aceptaEfectivo: boolean;

  @IsBoolean()
  aceptaTarjeta: boolean;

  @IsBoolean()
  aceptaEnLinea: boolean;

  @IsBoolean()
  aceptaQr: boolean;

  @IsOptional()
  @IsString()
  notas?: string;
}

export class PoliticaFacturacionDto {
  @IsString()
  @MinLength(5)
  nit: string;

  @IsString()
  @MinLength(3)
  razonSocial: string;

  @IsOptional()
  @IsString()
  prefijo?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  consecutivo?: number;

  @IsNumber()
  @Min(0)
  ivaPorcentaje: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  retencionPorcentaje?: number;
}

export class MensajesOperativosDto {
  @IsString()
  @MinLength(3)
  mensajeIngreso: string;

  @IsString()
  @MinLength(3)
  mensajeSalida: string;

  @IsOptional()
  @IsString()
  avisoLegal?: string;
}

export class ParametrosOperacionDto {
  @IsInt()
  @Min(1)
  limiteHoras: number;

  @IsNumber()
  @Min(0)
  penalidadTicket: number;

  @IsNumber()
  @Min(0)
  alertaAforoPorcentaje: number;
}

export class SeguridadDto {
  @IsBoolean()
  permiteEdicionOperadores: boolean;

  @IsInt()
  @Min(5)
  expiracionSesionMinutos: number;
}

export class IntegracionesDto {
  @IsOptional()
  @IsString()
  pasarelaPago?: string;

  @IsOptional()
  @IsString()
  apiKeyPagos?: string;

  @IsOptional()
  @IsString()
  webhookVigilancia?: string;
}

export class UpdateGeneralConfigDto {
  @IsInt()
  @Min(1)
  capacidadTotal: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CapacidadPorTipoDto)
  capacidadPorTipo?: CapacidadPorTipoDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => HorarioAtencionDto)
  horariosAtencion?: HorarioAtencionDto;

  @IsOptional()
  @IsInt()
  @Min(0)
  minutosCortesia?: number;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TarifaEspecialDto)
  tarifasEspeciales?: TarifaEspecialDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => MetodosPagoDto)
  metodosPago?: MetodosPagoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PoliticaFacturacionDto)
  politicasFacturacion?: PoliticaFacturacionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => MensajesOperativosDto)
  mensajesOperativos?: MensajesOperativosDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ParametrosOperacionDto)
  parametrosOperacion?: ParametrosOperacionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SeguridadDto)
  seguridad?: SeguridadDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => IntegracionesDto)
  integraciones?: IntegracionesDto;
}

export class UpdateTarifasDto {
  @IsBoolean()
  aplicarATodos: boolean;

  @IsOptional()
  @IsString()
  parkingId?: string;

  @ValidateNested({ each: true })
  @Type(() => TarifaConfigDto)
  tarifas: TarifaConfigDto[];
}

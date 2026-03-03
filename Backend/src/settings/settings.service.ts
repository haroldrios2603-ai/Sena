import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import {
  UpdateGeneralConfigDto,
  UpdateTarifasDto,
} from './dto/update-config.dto';
import { ParkingService } from '../parking/parking.service';

@Injectable()
export class SettingsService {
  private readonly CONFIG_ID = 'configuracion-principal';

  constructor(
    private readonly prisma: PrismaService,
    private readonly parkingService: ParkingService,
  ) {}

  /**
   * Retorna la configuración completa más las sedes y tarifas cargadas.
   */
  async obtenerConfiguracionCompleta() {
    const configuracion = await this.ensureConfig();
    const parkings = await this.prisma.parking.findMany({
      include: { tariffs: true },
      orderBy: { name: 'asc' },
    });
    const tarifas = await this.prisma.tariff.findMany({
      orderBy: [{ parkingId: 'asc' }, { vehicleType: 'asc' }],
    });
    return { configuracion, parkings, tarifas };
  }

  /**
   * Persiste los parámetros generales del sistema.
   */
  async actualizarConfiguracion(dto: UpdateGeneralConfigDto) {
    const data = {
      capacidadTotal: dto.capacidadTotal,
      capacidadPorTipo: this.toJsonValue(dto.capacidadPorTipo ?? null),
      horariosAtencion: this.toJsonValue(dto.horariosAtencion ?? null),
      minutosCortesia: dto.minutosCortesia ?? 0,
      tarifasEspeciales: this.toJsonValue(dto.tarifasEspeciales ?? null),
      metodosPago: this.toJsonValue(dto.metodosPago ?? null),
      politicasFacturacion: this.toJsonValue(dto.politicasFacturacion ?? null),
      mensajesOperativos: this.toJsonValue(dto.mensajesOperativos ?? null),
      parametrosOperacion: this.toJsonValue(dto.parametrosOperacion ?? null),
      seguridad: this.toJsonValue(dto.seguridad ?? null),
      integraciones: this.toJsonValue(dto.integraciones ?? null),
    };

    return this.prisma.systemConfig.upsert({
      where: { id: this.CONFIG_ID },
      update: data,
      create: {
        id: this.CONFIG_ID,
        ...data,
      },
    });
  }

  /**
   * Sincroniza las tarifas por tipo de vehículo con las sedes seleccionadas.
   */
  async actualizarTarifas(dto: UpdateTarifasDto) {
    const parkingIds = await this.resolveParkingTargets(dto);
    if (!parkingIds.length) {
      throw new BadRequestException(
        'No hay parqueaderos configurados para aplicar las tarifas.',
      );
    }

    await this.parkingService.bulkUpsertTariffs(parkingIds, dto.tarifas);

    return this.prisma.tariff.findMany({
      where: { parkingId: { in: parkingIds } },
      orderBy: [{ parkingId: 'asc' }, { vehicleType: 'asc' }],
    });
  }

  private async ensureConfig() {
    let config = await this.prisma.systemConfig.findUnique({
      where: { id: this.CONFIG_ID },
    });

    if (!config) {
      config = await this.prisma.systemConfig.create({
        data: {
          id: this.CONFIG_ID,
          capacidadTotal: 0,
          minutosCortesia: 0,
          metodosPago: this.toJsonValue({
            aceptaEfectivo: true,
            aceptaTarjeta: true,
            aceptaEnLinea: false,
            aceptaQr: false,
          }),
        },
      });
    }

    return config;
  }

  private toJsonValue<T>(
    value: T | null | undefined,
  ): Prisma.InputJsonValue | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return Prisma.JsonNull as any;
    }
    return value as unknown as Prisma.InputJsonValue;
  }

  private async resolveParkingTargets(dto: UpdateTarifasDto) {
    if (dto.aplicarATodos) {
      const parkings = await this.prisma.parking.findMany({
        select: { id: true },
      });
      return parkings.map((parking) => parking.id);
    }

    if (!dto.parkingId) {
      throw new BadRequestException(
        'Debes indicar el parqueadero objetivo para aplicar las tarifas.',
      );
    }

    const parking = await this.prisma.parking.findUnique({
      where: { id: dto.parkingId },
      select: { id: true },
    });

    if (!parking) {
      throw new NotFoundException('Parqueadero no encontrado');
    }

    return [parking.id];
  }
}

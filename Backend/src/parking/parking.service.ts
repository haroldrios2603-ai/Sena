import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateParkingDto } from './dto/create-parking.dto';
import { UpdateParkingDto } from './dto/update-parking.dto';
import { TarifaConfigDto } from './dto/tarifa-config.dto';

/**
 * Servicio principal para la gestión de parqueaderos y operaciones de flujo.
 * Centraliza la creación de sedes, gestión de tarifas y lógica de entrada/salida.
 */
@Injectable()
export class ParkingService {
  constructor(private prisma: PrismaService) {}

  /**
   * Registra un nuevo parqueadero en el sistema (RF 1.1).
   */
  async createParking(data: CreateParkingDto) {
    return this.prisma.parking.create({
      data: {
        name: data.nombre,
        address: data.direccion,
        capacity: data.capacidad,
        baseRate: data.tarifaBase,
        isActive: data.activo ?? true,
        vehicleTypes: data.tiposVehiculo ?? ['CAR', 'MOTORCYCLE'],
        operationHours: this.toJsonValue(data.horario ?? null),
      },
      include: { tariffs: true },
    });
  }

  /**
   * Actualiza los datos generales de una sede existente.
   */
  async updateParking(parkingId: string, data: UpdateParkingDto) {
    await this.ensureParkingExists(parkingId);
    return this.prisma.parking.update({
      where: { id: parkingId },
      data: {
        name: data.nombre,
        address: data.direccion,
        capacity: data.capacidad,
        baseRate: data.tarifaBase,
        isActive: typeof data.activo === 'boolean' ? data.activo : undefined,
        vehicleTypes: data.tiposVehiculo,
        operationHours: this.toJsonValue(data.horario),
      },
      include: { tariffs: true },
    });
  }

  /**
   * Habilita o deshabilita una sede completa.
   */
  async updateParkingStatus(parkingId: string, isActive: boolean) {
    await this.ensureParkingExists(parkingId);
    return this.prisma.parking.update({
      where: { id: parkingId },
      data: { isActive },
      include: { tariffs: true },
    });
  }

  /**
   * Obtiene la lista de todos los parqueaderos registrados.
   */
  async findAll() {
    return this.prisma.parking.findMany({
      include: { tariffs: true },
    });
  }

  /**
   * Configura o actualiza la tarifa para un tipo de vehículo (RF 1.2).
   */
  async setTariff(parkingId: string, tarifa: TarifaConfigDto) {
    return this.prisma.tariff.upsert({
      where: {
        parkingId_vehicleType: {
          parkingId,
          vehicleType: tarifa.tipoVehiculo,
        },
      },
      update: {
        baseRate: tarifa.tarifaBase,
        hourlyRate: tarifa.tarifaHora,
        dayRate: tarifa.tarifaDia,
        nightRate: tarifa.tarifaNocturna,
        nightStart: tarifa.horaInicioNocturna,
        nightEnd: tarifa.horaFinNocturna,
        flatRate: tarifa.tarifaPlana,
      },
      create: {
        parkingId,
        vehicleType: tarifa.tipoVehiculo,
        baseRate: tarifa.tarifaBase,
        hourlyRate: tarifa.tarifaHora,
        dayRate: tarifa.tarifaDia,
        nightRate: tarifa.tarifaNocturna,
        nightStart: tarifa.horaInicioNocturna,
        nightEnd: tarifa.horaFinNocturna,
        flatRate: tarifa.tarifaPlana,
      },
    });
  }

  /**
   * Guarda un paquete de tarifas para múltiples sedes.
   */
  async bulkUpsertTariffs(parkingIds: string[], tarifas: TarifaConfigDto[]) {
    const operaciones = parkingIds.flatMap((id) =>
      tarifas.map((tarifa) => this.setTariff(id, tarifa)),
    );
    await Promise.all(operaciones);
    return this.prisma.tariff.findMany({
      where: { parkingId: { in: parkingIds } },
    });
  }

  /**
   * Obtiene los detalles de un parqueadero específico.
   */
  async findOne(id: string) {
    const parking = await this.prisma.parking.findUnique({
      where: { id },
      include: { tariffs: true },
    });
    if (!parking) throw new NotFoundException('Parqueadero no encontrado');
    return parking;
  }

  /**
   * Registra el ingreso de un vehículo.
   */
  async registerEntry(plate: string, vehicleType: string, parkingId: string) {
    // Buscar o crear vehículo
    const vehicle = await this.prisma.vehicle.upsert({
      where: { plate },
      update: { type: vehicleType },
      create: { plate, type: vehicleType },
    });

    // Generar código único de ticket usando UUID
    const { randomUUID } = await import('crypto');
    const ticketCode = `TK-${randomUUID()}`;

    // Crear ticket
    const ticket = await this.prisma.ticket.create({
      data: {
        ticketCode,
        parkingId,
        vehicleId: vehicle.id,
        status: 'ACTIVE',
      },
      include: { vehicle: true },
    });

    return ticket;
  }

  /**
   * Registra la salida de un vehículo y calcula el cobro.
   */
  async registerExit(plate: string) {
    // Buscar ticket activo
    const ticket = await this.prisma.ticket.findFirst({
      where: {
        vehicle: { plate },
        status: 'ACTIVE',
      },
      include: {
        vehicle: true,
        parking: {
          include: { tariffs: true },
        },
      },
    });

    if (!ticket)
      throw new NotFoundException(
        'No se encontró un ticket activo para esta placa',
      );

    const exitTime = new Date();
    const durationMs = exitTime.getTime() - ticket.entryTime.getTime();
    const durationMinutes = Math.ceil(durationMs / (1000 * 60));

    // Buscar tarifa
    const tariff = ticket.parking.tariffs.find(
      (t: { vehicleType: string; baseRate: number; hourlyRate: number }) =>
        t.vehicleType === ticket.vehicle.type,
    );
    const baseRate = tariff ? tariff.baseRate : ticket.parking.baseRate;
    const hourlyRate = tariff ? tariff.hourlyRate : 0;

    const totalAmount = this.calcularMonto(
      tariff ?? null,
      durationMinutes,
      baseRate,
      hourlyRate,
    );

    // Crear registro de salida
    const exit = await this.prisma.exit.create({
      data: {
        ticketId: ticket.id,
        exitTime,
        durationMinutes,
        totalAmount,
      },
    });

    // Cerrar ticket
    await this.prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: 'CLOSED' },
    });

    return {
      ticket,
      exit,
      message: 'Salida registrada con éxito',
    };
  }

  /**
   * Obtiene un resumen de tickets activos y cerrados para el dashboard operativo.
   */
  async obtenerResumenTickets() {
    const [ticketsActivos, ticketsCerrados] = await Promise.all([
      this.prisma.ticket.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { entryTime: 'desc' },
        include: {
          vehicle: true,
          parking: true,
        },
      }),
      this.prisma.ticket.findMany({
        where: { status: 'CLOSED' },
        orderBy: { entryTime: 'desc' },
        include: {
          vehicle: true,
          parking: true,
          exit: true,
        },
      }),
    ]);

    return {
      activos: ticketsActivos,
      cerrados: ticketsCerrados,
    };
  }

  /**
   * Garantiza que el parqueadero exista antes de mutar información.
   */
  private async ensureParkingExists(parkingId: string) {
    const parking = await this.prisma.parking.findUnique({
      where: { id: parkingId },
    });
    if (!parking) {
      throw new NotFoundException('Parqueadero no encontrado');
    }
    return parking;
  }

  /**
   * Calcula el cobro final combinando tarifas base, nocturnas, diarias o planas.
   */
  private calcularMonto(
    tarifa: {
      dayRate: number | null;
      nightRate: number | null;
      nightStart: string | null;
      nightEnd: string | null;
      flatRate: number | null;
    } | null,
    durationMinutes: number,
    baseRate: number,
    hourlyRate: number,
  ) {
    if (tarifa?.flatRate && tarifa.flatRate > 0) {
      return tarifa.flatRate;
    }

    const ahora = new Date();
    if (
      tarifa?.nightRate &&
      tarifa.nightStart &&
      tarifa.nightEnd &&
      this.estaEnHorarioNocturno(tarifa.nightStart, tarifa.nightEnd, ahora)
    ) {
      return tarifa.nightRate;
    }

    if (tarifa?.dayRate && durationMinutes >= 60 * 24) {
      const dias = Math.ceil(durationMinutes / (60 * 24));
      return dias * tarifa.dayRate;
    }

    const horasFacturables = Math.max(1, Math.ceil(durationMinutes / 60));
    return baseRate + (horasFacturables - 1) * hourlyRate;
  }

  /**
   * Evalúa si la hora actual cae dentro del rango nocturno configurado.
   */
  private estaEnHorarioNocturno(inicio: string, fin: string, fecha: Date) {
    const inicioMinutos = this.convertirAHoraReferencia(inicio);
    const finMinutos = this.convertirAHoraReferencia(fin);
    const actualMinutos = fecha.getHours() * 60 + fecha.getMinutes();

    if (inicioMinutos === null || finMinutos === null) {
      return false;
    }

    if (inicioMinutos <= finMinutos) {
      return actualMinutos >= inicioMinutos && actualMinutos < finMinutos;
    }

    return actualMinutos >= inicioMinutos || actualMinutos < finMinutos;
  }

  private convertirAHoraReferencia(valor: string) {
    const [hora, minuto] = valor.split(':').map((n) => Number(n));
    if (Number.isNaN(hora) || Number.isNaN(minuto)) {
      return null;
    }
    return hora * 60 + minuto;
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
}

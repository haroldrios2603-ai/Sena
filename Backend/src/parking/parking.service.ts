import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

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
  async createParking(data: {
    name: string;
    address: string;
    capacity: number;
    baseRate: number;
  }) {
    return this.prisma.parking.create({
      data: {
        name: data.name,
        address: data.address,
        capacity: data.capacity,
        baseRate: data.baseRate,
      },
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
  async setTariff(
    parkingId: string,
    vehicleType: string,
    baseRate: number,
    hourlyRate: number,
  ) {
    return this.prisma.tariff.upsert({
      where: {
        parkingId_vehicleType: {
          parkingId,
          vehicleType,
        },
      },
      update: {
        baseRate,
        hourlyRate,
      },
      create: {
        parkingId,
        vehicleType,
        baseRate,
        hourlyRate,
      },
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

    const hours = Math.ceil(durationMinutes / 60);
    const totalAmount = baseRate + (hours > 0 ? (hours - 1) * hourlyRate : 0);

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
}

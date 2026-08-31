/**
 * Pruebas para la lógica de entrada y salida del parqueadero.
 */
import { ConflictException } from '@nestjs/common';
import { ParkingService } from './parking.service';

describe('ParkingService', () => {
  let service: ParkingService;

  const prismaMock = {
    ticket: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    vehicle: {
      upsert: jest.fn(),
    },
    exit: {
      create: jest.fn(),
    },
    parking: {
      findUnique: jest.fn(),
    },
    systemConfig: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ParkingService(prismaMock as any);
  });

  it('should reject a new entry when the vehicle already has an active ticket', async () => {
    prismaMock.ticket.findFirst.mockResolvedValue({
      id: 'ticket-active-1',
      ticketCode: 'TK-ACTIVE-1',
      entryTime: new Date('2026-08-31T08:00:00.000Z'),
      status: 'ACTIVE',
    });

    await expect(service.registerEntry('QWE123', 'CAR', 'parking-1')).rejects.toThrow(
      ConflictException,
    );
  });

  it('should allow a new entry when the previous ticket is pending payment because the vehicle already exited', async () => {
    prismaMock.ticket.findFirst.mockResolvedValue(null);
    prismaMock.vehicle.upsert.mockResolvedValue({ id: 'vehicle-1', plate: 'QWE124', type: 'CAR' });
    prismaMock.ticket.create.mockResolvedValue({
      id: 'ticket-new-1',
      ticketCode: 'TK-NEW-1',
      parkingId: 'parking-1',
      vehicleId: 'vehicle-1',
      status: 'ACTIVE',
      vehicle: { id: 'vehicle-1', plate: 'QWE124', type: 'CAR' },
    });

    const result = await service.registerEntry('QWE124', 'CAR', 'parking-1');

    expect(result.status).toBe('ACTIVE');
    expect(prismaMock.ticket.create).toHaveBeenCalled();
  });

  it('should return the existing exit when the ticket is pending payment instead of creating a duplicate exit', async () => {
    const exitStamp = new Date('2026-08-31T09:00:00.000Z');

    prismaMock.ticket.findFirst.mockResolvedValue({
      id: 'ticket-pending-1',
      ticketCode: 'TK-PENDING-1',
      status: 'PENDING_PAYMENT',
      entryTime: new Date('2026-08-31T08:00:00.000Z'),
      vehicle: { id: 'vehicle-1', type: 'CAR' },
      parking: {
        id: 'parking-1',
        baseRate: 1000,
        tariffs: [],
      },
      exit: {
        id: 'exit-1',
        ticketId: 'ticket-pending-1',
        exitTime: exitStamp,
        durationMinutes: 60,
        totalAmount: 1000,
      },
    });

    const result = await service.registerExit('QWE123');

    expect(prismaMock.exit.create).not.toHaveBeenCalled();
    expect(result.exit.id).toBe('exit-1');
    expect(result.message).toContain('pendiente de pago');
  });
});

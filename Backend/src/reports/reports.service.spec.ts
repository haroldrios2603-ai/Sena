/**
 * Pruebas para reportes de asistencia y turnos activos.
 */
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Role } from '@prisma/client';
import { ReportsService } from './reports.service';
import { AttendanceReportDto } from './dto/attendance-report.dto';

describe('ReportsService', () => {
  let service: ReportsService;

  const prismaMock = {
    attendance: {
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReportsService(prismaMock as any);
  });

  it('should accept free-form employee search values in attendance filters', async () => {
    const dto = plainToInstance(AttendanceReportDto, {
      userId: '1143960',
      from: '2026-08-31',
      to: '2026-08-31',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should return only active users with an open attendance in the current shift', async () => {
    const now = new Date('2026-08-31T15:00:00.000Z');
    const activeLogin = new Date('2026-08-31T15:10:00.000Z');

    prismaMock.attendance.findMany.mockResolvedValue([
      {
        id: 'attendance-1',
        userId: 'user-1',
        checkIn: activeLogin,
        checkOut: null,
        user: {
          id: 'user-1',
          fullName: 'Ana García',
          email: 'ana@rmparking.com',
          role: Role.OPERATOR,
          isActive: true,
          documentType: 'CEDULA',
          documentNumber: '123456789',
        },
      },
      {
        id: 'attendance-2',
        userId: 'user-2',
        checkIn: new Date('2026-08-31T14:20:00.000Z'),
        checkOut: null,
        user: {
          id: 'user-2',
          fullName: 'Usuario inactivo',
          email: 'inactivo@rmparking.com',
          role: Role.OPERATOR,
          isActive: false,
          documentType: 'CEDULA',
          documentNumber: '987654321',
        },
      },
    ]);

    const result = await service.getWorkersOnCurrentShift();

    expect(result.totalPresentes).toBe(1);
    expect(result.registros).toHaveLength(1);
    expect(result.registros[0].nombre).toBe('Ana García');
    expect(result.registros[0].ingreso).toBe(activeLogin);
  });

  it('should include the currently logged user even when the attendance started before the shift range but is still open', async () => {
    const now = new Date('2026-08-31T15:00:00.000Z');
    const activeLogin = new Date('2026-08-31T05:55:00.000Z');

    prismaMock.attendance.findMany.mockResolvedValue([
      {
        id: 'attendance-3',
        userId: 'user-3',
        checkIn: activeLogin,
        checkOut: null,
        user: {
          id: 'user-3',
          fullName: 'Luis Pérez',
          email: 'luis@rmparking.com',
          role: Role.OPERATOR,
          isActive: true,
          documentType: 'CEDULA',
          documentNumber: '111222333',
        },
      },
    ]);

    const result = await service.getWorkersOnCurrentShift();

    expect(result.totalPresentes).toBe(1);
    expect(result.registros).toHaveLength(1);
    expect(result.registros[0].nombre).toBe('Luis Pérez');
    expect(result.registros[0].presente).toBe(true);
  });
});

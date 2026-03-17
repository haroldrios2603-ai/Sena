import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { ClientsService } from './clients.service';

jest.mock('bcrypt', () => ({
  hash: jest
    .fn()
    .mockImplementation((value: string) => Promise.resolve(`hashed-${value}`)),
}));

describe('ClientsService', () => {
  let service: ClientsService;

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    contract: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
    },
    contractAlert: {
      updateMany: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
    jest.clearAllMocks();

    prismaMock.$transaction.mockImplementation((arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: typeof prismaMock) => Promise<unknown>)(prismaMock);
      }
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      return Promise.resolve(arg);
    });
  });

  it('should reject contract when end date is not after start date', async () => {
    await expect(
      service.createClientWithContract({
        fullName: 'Cliente Uno',
        email: 'cliente1@rmparking.com',
        contactPhone: '+57 300 123 0000',
        parkingId: '57f0c6de-50b4-4ce8-9e67-57f2e5608a78',
        startDate: '2026-03-15',
        endDate: '2026-03-15',
        monthlyFee: 100000,
        planName: 'Mensualidad',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject when email exists with non-client role', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'mix@rmparking.com',
      role: Role.OPERATOR,
    });

    await expect(
      service.createClientWithContract({
        fullName: 'Cliente Dos',
        email: 'mix@rmparking.com',
        contactPhone: '+57 300 456 0000',
        parkingId: '57f0c6de-50b4-4ce8-9e67-57f2e5608a78',
        startDate: '2026-03-10',
        endDate: '2026-04-10',
        monthlyFee: 150000,
        planName: 'Mensualidad',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should create client and contract atomically', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 'client-user-1',
      email: 'nuevo@rmparking.com',
      role: Role.CLIENT,
      fullName: 'Cliente Nuevo',
      contactPhone: '+57 300 999 0000',
    });
    prismaMock.contract.create.mockResolvedValue({
      id: 'contract-1',
      userId: 'client-user-1',
      parkingId: '57f0c6de-50b4-4ce8-9e67-57f2e5608a78',
      startDate: new Date('2026-03-10'),
      endDate: new Date('2026-06-10'),
      status: 'ACTIVE',
      planName: 'Mensualidad',
      monthlyFee: 200000,
      isRecurring: true,
      user: { id: 'client-user-1', email: 'nuevo@rmparking.com' },
      parking: { id: '57f0c6de-50b4-4ce8-9e67-57f2e5608a78', name: 'Sede Norte' },
    });
    prismaMock.contract.update.mockResolvedValue({ id: 'contract-1', status: 'ACTIVE' });
    prismaMock.contractAlert.updateMany.mockResolvedValue({ count: 0 });

    const result = await service.createClientWithContract({
      fullName: 'Cliente Nuevo',
      email: 'nuevo@rmparking.com',
      contactPhone: '+57 300 999 0000',
      parkingId: '57f0c6de-50b4-4ce8-9e67-57f2e5608a78',
      startDate: '2026-03-10',
      endDate: '2026-06-10',
      monthlyFee: 200000,
      planName: 'Mensualidad',
    });

    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(prismaMock.user.create).toHaveBeenCalled();
    expect(prismaMock.contract.create).toHaveBeenCalled();
    expect(result.id).toBe('contract-1');
  });

  it('should renew contract inside transaction', async () => {
    prismaMock.contract.findUnique.mockResolvedValue({
      id: 'contract-1',
      startDate: new Date('2026-03-10'),
      endDate: new Date('2026-04-10'),
      monthlyFee: 180000,
    });
    prismaMock.contract.update.mockResolvedValue({ id: 'contract-1', status: 'ACTIVE' });
    prismaMock.contractAlert.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.renewContract('contract-1', {
      newEndDate: '2026-05-15',
      paymentDate: '2026-04-10',
      monthlyFee: 190000,
    });

    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(prismaMock.contract.update).toHaveBeenCalled();
    expect(result.id).toBe('contract-1');
  });

  it('should update client and contract atomically', async () => {
    prismaMock.contract.findUnique.mockResolvedValue({
      id: 'contract-1',
      userId: 'client-user-1',
      parkingId: '57f0c6de-50b4-4ce8-9e67-57f2e5608a78',
      startDate: new Date('2026-03-10'),
      endDate: new Date('2026-04-10'),
      status: 'ACTIVE',
      planName: 'Mensualidad',
      monthlyFee: 180000,
      isRecurring: true,
      user: {
        id: 'client-user-1',
        email: 'cliente1@rmparking.com',
      },
      parking: { id: '57f0c6de-50b4-4ce8-9e67-57f2e5608a78', name: 'Sede Norte' },
      alerts: [],
    });
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.update.mockResolvedValue({ id: 'client-user-1' });
    prismaMock.contract.update.mockResolvedValue({ id: 'contract-1' });
    prismaMock.contract.findUniqueOrThrow.mockResolvedValue({
      id: 'contract-1',
      status: 'EXPIRING_SOON',
      user: { id: 'client-user-1', email: 'cliente.editado@rmparking.com' },
      parking: { id: 'new-parking-id', name: 'Sede Sur' },
      alerts: [],
    });
    prismaMock.contractAlert.upsert.mockResolvedValue({ id: 'alert-1' });

    const result = await service.updateContract('contract-1', {
      fullName: 'Cliente Editado',
      email: 'cliente.editado@rmparking.com',
      contactPhone: '+57 300 111 2222',
      parkingId: 'new-parking-id',
      startDate: '2026-03-10',
      endDate: '2026-03-20',
      monthlyFee: 195000,
      planName: 'Corporativo',
      isRecurring: false,
    });

    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(prismaMock.user.update).toHaveBeenCalled();
    expect(prismaMock.contract.update).toHaveBeenCalled();
    expect(result.id).toBe('contract-1');
  });

  it('should reject duplicate email on updateContract', async () => {
    prismaMock.contract.findUnique.mockResolvedValue({
      id: 'contract-1',
      userId: 'client-user-1',
      startDate: new Date('2026-03-10'),
      endDate: new Date('2026-04-10'),
      user: {
        id: 'client-user-1',
        email: 'cliente1@rmparking.com',
      },
      parking: { id: '57f0c6de-50b4-4ce8-9e67-57f2e5608a78', name: 'Sede Norte' },
      alerts: [],
    });
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'other-user',
      email: 'repetido@rmparking.com',
      role: Role.CLIENT,
    });

    await expect(
      service.updateContract('contract-1', { email: 'repetido@rmparking.com' }),
    ).rejects.toThrow(ConflictException);
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { PermissionsService } from './permissions.service';

describe('PermissionsService', () => {
  let service: PermissionsService;

  const mockPrisma = {
    appScreen: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    userScreenPermission: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    roleScreenPermission: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  } as unknown as PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);

    (mockPrisma as any).$transaction = jest
      .fn()
      .mockImplementation(async (operations: unknown[]) => Promise.all(operations));
    (mockPrisma as any).appScreen.findMany = jest
      .fn()
      .mockResolvedValue([{ key: 'operations-dashboard', name: 'Operación diaria', route: '/dashboard' }]);
    (mockPrisma as any).appScreen.upsert = jest.fn().mockResolvedValue(null);
  });

  it('should prioritize user explicit permission over role defaults', async () => {
    (mockPrisma as any).userScreenPermission.findUnique = jest
      .fn()
      .mockResolvedValue({ canView: false });

    const allowed = await service.canUserViewScreen(
      'user-1',
      Role.SUPER_ADMIN,
      'operations-dashboard',
    );

    expect(allowed).toBe(false);
  });

  it('should use role default when no explicit user or role record exists', async () => {
    (mockPrisma as any).userScreenPermission.findUnique = jest
      .fn()
      .mockResolvedValue(null);
    (mockPrisma as any).roleScreenPermission.findUnique = jest
      .fn()
      .mockResolvedValue(null);

    const allowed = await service.canUserViewScreen(
      'user-1',
      Role.OPERATOR,
      'operations-dashboard',
    );

    expect(allowed).toBe(true);
  });

  it('should return effective allowed keys for user profile', async () => {
    (mockPrisma as any).user.findUnique = jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'operator@rmparking.com',
      fullName: 'Operador',
      role: Role.OPERATOR,
    });
    (mockPrisma as any).userScreenPermission.findMany = jest
      .fn()
      .mockResolvedValue([]);

    const result = await service.getEffectivePermissionsForUser('user-1');

    expect(result.allowedScreenKeys).toContain('operations-dashboard');
    expect(result.allowedScreenKeys).not.toContain('users-management');
  });
});

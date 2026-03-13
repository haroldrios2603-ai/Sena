import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { compare } from 'bcrypt';
import { PrismaService } from '../prisma.service';
import { UsersService } from './users.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest
    .fn()
    .mockImplementation((value: string) => Promise.resolve(`hashed-${value}`)),
}));

describe('UsersService', () => {
  let service: UsersService;

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('should create and sanitize user data', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'new@rmparking.com',
      fullName: 'Nuevo Usuario',
      contactPhone: '+57 300 123 4567',
      role: Role.OPERATOR,
      isActive: true,
      passwordHash: 'hashed-Strong1!',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.createUser({
      fullName: 'Nuevo Usuario',
      email: 'new@rmparking.com',
      contactPhone: '+57 300 123 4567',
      password: 'Strong1!',
      role: Role.OPERATOR,
    });

    expect(prismaMock.user.create).toHaveBeenCalled();
    expect(result).not.toHaveProperty('passwordHash');
    expect(result.email).toBe('new@rmparking.com');
  });

  it('should reject duplicate email on createUser', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'existing',
      email: 'duplicado@rmparking.com',
    });

    await expect(
      service.createUser({
        fullName: 'Duplicado',
        email: 'duplicado@rmparking.com',
        contactPhone: '+57 300 000 0000',
        password: 'Strong1!',
        role: Role.OPERATOR,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should parse isActive filter and sanitize listed users', async () => {
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: 'user-1',
        email: 'activo@rmparking.com',
        fullName: 'Activo',
        contactPhone: '+57 300 111 1111',
        role: Role.OPERATOR,
        isActive: true,
        passwordHash: 'hashed-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const result = await service.findAll({ isActive: 'true' });

    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true }),
      }),
    );
    expect(result[0]).not.toHaveProperty('passwordHash');
  });

  it('should throw NotFoundException on updateRole when user does not exist', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(
      service.updateRole('missing-id', { role: Role.ADMIN_PARKING }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException on updateStatus when user does not exist', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(
      service.updateStatus('missing-id', { isActive: false }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should keep bcrypt mock available', () => {
    expect(compare).toBeDefined();
  });
});

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
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
    $transaction: jest.fn(),
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

    prismaMock.$transaction.mockImplementation((arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: typeof prismaMock) => Promise<unknown>)(prismaMock);
      }
      return Promise.resolve(arg);
    });
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

  it('should update and sanitize user data on updateUser', async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce({
        id: 'user-1',
        email: 'operator@rmparking.com',
        fullName: 'Operador Base',
        contactPhone: '+57 300 100 1000',
        role: Role.OPERATOR,
        isActive: true,
        passwordHash: 'hashed-original',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .mockResolvedValueOnce(null);

    prismaMock.user.update.mockResolvedValue({
      id: 'user-1',
      email: 'operator.editado@rmparking.com',
      fullName: 'Operador Editado',
      contactPhone: '+57 300 222 2222',
      role: Role.ADMIN_PARKING,
      isActive: false,
      passwordHash: 'hashed-original',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.updateUser('user-1', {
      fullName: 'Operador Editado',
      email: 'operator.editado@rmparking.com',
      contactPhone: '+57 300 222 2222',
      role: Role.ADMIN_PARKING,
      isActive: false,
    });

    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
      }),
    );
    expect(result).not.toHaveProperty('passwordHash');
    expect(result.fullName).toBe('Operador Editado');
    expect(result.email).toBe('operator.editado@rmparking.com');
    expect(result.role).toBe(Role.ADMIN_PARKING);
    expect(result.isActive).toBe(false);
  });

  it('should reject duplicate email on updateUser', async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce({
        id: 'user-1',
        email: 'operator@rmparking.com',
        fullName: 'Operador Base',
      })
      .mockResolvedValueOnce({
        id: 'user-2',
        email: 'operator.editado@rmparking.com',
        fullName: 'Otro Usuario',
      });

    await expect(
      service.updateUser('user-1', { email: 'operator.editado@rmparking.com' }),
    ).rejects.toThrow(ConflictException);
  });

  it('should throw NotFoundException on updateUser when user does not exist', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(
      service.updateUser('missing-id', { fullName: 'Sin usuario' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should archive user by setting isActive=false', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-delete',
      email: 'delete@rmparking.com',
      fullName: 'Delete User',
      role: Role.OPERATOR,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      passwordHash: 'hashed',
    });
    prismaMock.user.update.mockResolvedValue({
      id: 'user-delete',
      email: 'delete@rmparking.com',
      isActive: false,
    });

    const result = await service.deleteUser('user-delete', 'actor-1');

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-delete' },
      data: { isActive: false },
    });
    expect(result.archived).toBe(true);
    expect(result.deleted).toBe(true);
  });

  it('should reject self deletion', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'self-user',
      email: 'self@rmparking.com',
      fullName: 'Self User',
      role: Role.OPERATOR,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      passwordHash: 'hashed',
    });

    await expect(service.deleteUser('self-user', 'self-user')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should reject archive when user is already inactive', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'already-inactive',
      email: 'inactive@rmparking.com',
      fullName: 'Inactive User',
      role: Role.OPERATOR,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      passwordHash: 'hashed',
    });

    await expect(
      service.deleteUser('already-inactive', 'actor-1'),
    ).rejects.toThrow(ConflictException);
  });

  it('should restore archived user', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'archived-user',
      email: 'archived@rmparking.com',
      fullName: 'Archived User',
      role: Role.OPERATOR,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      passwordHash: 'hashed',
    });
    prismaMock.user.update.mockResolvedValue({
      id: 'archived-user',
      email: 'archived@rmparking.com',
      isActive: true,
    });

    const result = await service.restoreUser('archived-user');

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'archived-user' },
      data: { isActive: true },
    });
    expect(result.restored).toBe(true);
  });

  it('should keep bcrypt mock available', () => {
    expect(compare).toBeDefined();
  });
});

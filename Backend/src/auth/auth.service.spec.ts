import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { compare } from 'bcrypt';
import { Role } from '@prisma/client';
import { RegisterDto } from './dto/register.dto';
import { PermissionsService } from '../permissions/permissions.service';
import { PasswordRecoveryNotifierService } from './password-recovery-notifier.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  genSalt: jest.fn().mockResolvedValue('test-salt'),
  hash: jest
    .fn()
    .mockImplementation((value: string) => Promise.resolve(`hashed-${value}`)),
}));

describe('AuthService', () => {
  let service: AuthService;
  // ES: No es necesario mantener referencias directas a los servicios mockeados.

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    attendance: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    passwordResetToken: {
      updateMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockPermissionsService = {
    getEffectivePermissionsForUser: jest.fn().mockResolvedValue({
      allowedScreenKeys: ['operations-dashboard'],
    }),
  };

  const mockPasswordRecoveryNotifierService = {
    sendRecoveryCode: jest.fn(),
  };

  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: PermissionsService,
          useValue: mockPermissionsService,
        },
        {
          provide: PasswordRecoveryNotifierService,
          useValue: mockPasswordRecoveryNotifierService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
    mockPrismaService.$transaction.mockImplementation((arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: typeof mockPrismaService) => Promise<unknown>)(
          mockPrismaService,
        );
      }
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      return Promise.resolve(arg);
    });
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
        role: Role.OPERATOR,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-id',
        email: registerDto.email,
        fullName: registerDto.fullName,
        role: registerDto.role,
      });

      const result = await service.register(registerDto);

      expect(result).toEqual({
        message: 'Usuario creado correctamente',
        userId: 'user-id',
      });
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(mockPrismaService.user.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      const registerDto = {
        email: 'existing@example.com',
        password: 'password123',
        fullName: 'Test User',
      };

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'existing-id',
        email: registerDto.email,
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const user = {
        id: 'user-id',
        email: loginDto.email,
        passwordHash: 'hashed-password',
        role: 'OPERATOR',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user);
      (compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('jwt-token');
      mockPrismaService.attendance.findFirst.mockResolvedValue(null);
      mockPrismaService.attendance.create.mockResolvedValue({
        id: 'attendance-created-1',
        userId: user.id,
        checkIn: new Date('2026-01-01T08:00:00.000Z'),
        checkOut: null,
      });

      const result = await service.login(loginDto);

        expect(result.accessToken).toBe('jwt-token');
        expect(result.attendanceAction).toBe('CHECK_IN_CREATED');
      expect(mockPrismaService.attendance.create).toHaveBeenCalled();
      type AttendanceCreateArg = { data: { userId: string; checkIn: Date } };
      const mockCreate = mockPrismaService.attendance
        .create as jest.Mock<Promise<AttendanceCreateArg>, [AttendanceCreateArg]>;
      const callArg = mockCreate.mock.calls[0][0] as AttendanceCreateArg;
      expect(callArg.data.userId).toBe(user.id);
      expect(callArg.data.checkIn).toBeInstanceOf(Date);
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const user = {
        id: 'user-id',
        email: loginDto.email,
        passwordHash: 'hashed-password',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user);
      (compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
    it('should reuse open attendance and avoid duplicate check-in', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const user = {
        id: 'user-id',
        email: loginDto.email,
        passwordHash: 'hashed-password',
        role: 'OPERATOR',
      };

      const openAttendance = {
        id: 'attendance-open-1',
        userId: user.id,
        checkIn: new Date('2026-01-01T08:00:00.000Z'),
        checkOut: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.attendance.findFirst.mockResolvedValue(openAttendance);
      (compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('jwt-token');

      const result = await service.login(loginDto);

      expect(result.accessToken).toBe('jwt-token');
      expect(result.attendanceAction).toBe('CHECK_IN_REUSED');
      expect(result.attendanceId).toBe(openAttendance.id);
      expect(mockPrismaService.attendance.create).not.toHaveBeenCalled();
    });
  });

  describe('requestPasswordReset', () => {
    it('should return generic message when email does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.requestPasswordReset({
        email: 'unknown@example.com',
      });

      expect(result).toEqual({
        message:
          'Si el correo está registrado recibirás un código de recuperación en los próximos minutos.',
      });
      expect(mockPrismaService.passwordResetToken.create).not.toHaveBeenCalled();
      expect(
        mockPasswordRecoveryNotifierService.sendRecoveryCode,
      ).not.toHaveBeenCalled();
    });

    it('should return debugCode in non-production when email transport is unavailable', async () => {
      process.env.NODE_ENV = 'development';
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-id',
        email: 'test@example.com',
      });
      mockPasswordRecoveryNotifierService.sendRecoveryCode.mockResolvedValue(
        false,
      );

      const result = await service.requestPasswordReset({
        email: 'test@example.com',
      });

      expect(result.message).toContain('codigo de recuperacion');
      expect(result).toHaveProperty('debugCode');
      expect(mockPrismaService.passwordResetToken.updateMany).toHaveBeenCalled();
      expect(mockPrismaService.passwordResetToken.create).toHaveBeenCalled();
    });

    it('should hide debugCode in production even when transport is unavailable', async () => {
      process.env.NODE_ENV = 'production';
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-id',
        email: 'test@example.com',
      });
      mockPasswordRecoveryNotifierService.sendRecoveryCode.mockResolvedValue(
        false,
      );

      const result = await service.requestPasswordReset({
        email: 'test@example.com',
      });

      expect(result).toEqual({
        message:
          'Hemos enviado un código de recuperación. Revisa tu bandeja de entrada y continúa el proceso.',
      });
      expect(result).not.toHaveProperty('debugCode');
    });
  });

  describe('confirmPasswordReset', () => {
    it('should normalize lowercase code and update password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-id',
        email: 'test@example.com',
      });
      mockPrismaService.passwordResetToken.findFirst.mockResolvedValue({
        id: 'token-id',
        userId: 'user-id',
        tokenHash: 'hashed-ABC123',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        usedAt: null,
      });
      (compare as jest.Mock).mockImplementation(
        (value: string, hashedValue: string) =>
          Promise.resolve(hashedValue === `hashed-${value}`),
      );
      mockPrismaService.user.update.mockResolvedValue({ id: 'user-id' });
      mockPrismaService.passwordResetToken.updateMany.mockResolvedValue({
        count: 1,
      });

      const result = await service.confirmPasswordReset({
        email: 'test@example.com',
        code: 'abc123',
        newPassword: 'NuevaClave1!',
      });

      expect(result).toEqual({
        message:
          'Contraseña actualizada correctamente. Ya puedes iniciar sesión.',
      });
      expect(compare).toHaveBeenCalledWith('ABC123', 'hashed-ABC123');
      expect(mockPrismaService.user.update).toHaveBeenCalled();
      expect(mockPrismaService.passwordResetToken.updateMany).toHaveBeenCalledWith(
        {
          where: { userId: 'user-id', usedAt: null },
          data: { usedAt: expect.any(Date) },
        },
      );
    });

    it('should throw when code is invalid', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-id',
        email: 'test@example.com',
      });
      mockPrismaService.passwordResetToken.findFirst.mockResolvedValue({
        id: 'token-id',
        userId: 'user-id',
        tokenHash: 'hashed-ABC123',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        usedAt: null,
      });
      (compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.confirmPasswordReset({
          email: 'test@example.com',
          code: 'ZZZ999',
          newPassword: 'NuevaClave1!',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

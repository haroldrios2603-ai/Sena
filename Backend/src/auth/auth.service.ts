import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PasswordRequestDto } from './dto/password-request.dto';
import { PasswordResetDto } from './dto/password-reset.dto';
import { PermissionsService } from '../permissions/permissions.service';
import { PasswordRecoveryNotifierService } from './password-recovery-notifier.service';

/**
 * Servicio responsable de la lógica de Autenticación.
 * Maneja el Registro, Inicio de Sesión y Generación de Tokens JWT.
 */
@Injectable()
export class AuthService {
  validateToken(token: string) {
    return this.jwtService.verify(token);
  }
  /**
   * Minutos de vigencia del código de recuperación.
   */
  private readonly recoveryExpirationMinutes = 15;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private readonly permissionsService: PermissionsService,
    private readonly passwordRecoveryNotifier: PasswordRecoveryNotifierService,
  ) {}

  /**
   * Registra un nuevo usuario.
   * Hashea la contraseña y guarda en BD.
   */
  async register(registerDto: RegisterDto) {
    const { email, password, fullName, role } = registerDto;

    // Verificar si el usuario existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('El correo ya está registrado');
    }

    // Hashear contraseña
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(password, salt);

    // Crear usuario
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        role: role || Role.OPERATOR,
      },
    });

    return { message: 'Usuario creado correctamente', userId: user.id };
  }

  /**
   * Valida credenciales y retorna JWT.
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Buscar usuario
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Validar contraseña
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Generar token
    const payload = { sub: user.id, email: user.email, role: user.role };

    // ES: Evitamos check-in duplicado si el usuario ya tiene una sesión abierta.
    const openAttendance = await this.prisma.attendance.findFirst({
      where: {
        userId: user.id,
        checkOut: null,
      },
      orderBy: {
        checkIn: 'desc',
      },
    });

    let attendanceId = openAttendance?.id;
    let checkIn = openAttendance?.checkIn;
    let attendanceAction: 'CHECK_IN_CREATED' | 'CHECK_IN_REUSED' =
      'CHECK_IN_REUSED';

    if (!openAttendance) {
      const createdAttendance = await this.prisma.attendance.create({
        data: {
          userId: user.id,
          checkIn: new Date(),
        },
      });
      attendanceId = createdAttendance.id;
      checkIn = createdAttendance.checkIn;
      attendanceAction = 'CHECK_IN_CREATED';
    }

    return {
      accessToken: this.jwtService.sign(payload),
      attendanceId,
      checkIn,
      attendanceAction,
    };
  }

  /**
   * Obtiene el perfil completo del usuario autenticado.
   * ES: Retorna los campos esperados por el Frontend.
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        documentType: true,
        documentNumber: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return null;
    }

    const effective = await this.permissionsService.getEffectivePermissionsForUser(
      userId,
    );

    return {
      ...user,
      permissions: effective.allowedScreenKeys,
    };
  }

  /**
   * Cierra la asistencia activa del usuario (checkOut).
   * ES: Marca la salida del último registro de asistencia sin cerrar.
   */
  async logout(userId: string) {
    const attendance = await this.prisma.attendance.findFirst({
      where: {
        userId,
        checkOut: null,
      },
      orderBy: {
        checkIn: 'desc',
      },
    });

    if (attendance) {
      const checkOut = new Date();
      await this.prisma.attendance.update({
        where: { id: attendance.id },
        data: { checkOut },
      });

      return {
        message: 'Sesión cerrada y asistencia actualizada',
        attendanceClosed: true,
        attendanceId: attendance.id,
        checkIn: attendance.checkIn,
        checkOut,
      };
    }

    return {
      message: 'Sesión cerrada y asistencia actualizada',
      attendanceClosed: false,
    };
  }

  /**
   * Genera un código de recuperación y lo registra en la base de datos.
   * ES: Endpoint consumido por el Frontend para iniciar la recuperación.
   */
  async requestPasswordReset(passwordRequestDto: PasswordRequestDto) {
    const { email } = passwordRequestDto;

    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      // ES: Se retorna mensaje genérico para no revelar existencia de usuarios.
      return {
        message:
          'Si el correo está registrado recibirás un código de recuperación en los próximos minutos.',
      };
    }

    const code = this.generateRecoveryCode();
    const tokenHash = await bcrypt.hash(code, await bcrypt.genSalt());
    const expiresAt = new Date(
      Date.now() + this.recoveryExpirationMinutes * 60 * 1000,
    );

    await this.prisma.$transaction(async (tx) => {
      // ES: Invalidar códigos vigentes previos.
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });

      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          email: user.email,
          tokenHash,
          expiresAt,
        },
      });
    });

    const emailSent = await this.passwordRecoveryNotifier.sendRecoveryCode(
      email,
      code,
      this.recoveryExpirationMinutes,
    );

    if (!emailSent) {
      console.log(
        `Codigo de recuperacion para ${email}: ${code} (valido ${this.recoveryExpirationMinutes} minutos)`,
      );
    }

    if (!emailSent && process.env.NODE_ENV !== 'production') {
      return {
        message:
          'Hemos generado un codigo de recuperacion para pruebas. Revisa el mensaje de soporte y continua el proceso.',
        debugCode: code,
      };
    }

    return {
      message:
        'Hemos enviado un código de recuperación. Revisa tu bandeja de entrada y continúa el proceso.',
    };
  }

  /**
   * Valida el código recibido y actualiza la contraseña del usuario.
   */
  async confirmPasswordReset(passwordResetDto: PasswordResetDto) {
    const { email, code, newPassword } = passwordResetDto;
    const normalizedCode = code.trim().toUpperCase();

    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new BadRequestException('Código inválido o expirado');
    }

    const token = await this.prisma.passwordResetToken.findFirst({
      where: { userId: user.id, usedAt: null },
      orderBy: { expiresAt: 'desc' },
    });

    if (!token || token.expiresAt < new Date()) {
      throw new BadRequestException('Código inválido o expirado');
    }

    const isValidCode = await bcrypt.compare(normalizedCode, token.tokenHash);

    if (!isValidCode) {
      throw new BadRequestException('Código inválido o expirado');
    }

    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
    ]);

    return {
      message:
        'Contraseña actualizada correctamente. Ya puedes iniciar sesión.',
    };
  }

  /**
   * Genera un código alfanumérico de 6 caracteres para la recuperación.
   */
  private generateRecoveryCode() {
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i += 1) {
      code += charset[Math.floor(Math.random() * charset.length)];
    }
    return code;
  }
}

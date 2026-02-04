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

/**
 * Servicio responsable de la lógica de Autenticación.
 * Maneja el Registro, Inicio de Sesión y Generación de Tokens JWT.
 */
@Injectable()
export class AuthService {
  /**
   * Minutos de vigencia del código de recuperación.
   */
  private readonly recoveryExpirationMinutes = 15;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
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
      throw new ConflictException('Email already in use');
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

    return { message: 'User created successfully', userId: user.id };
  }

  /**
   * Valida credenciales y retorna JWT.
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Buscar usuario
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Validar contraseña
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generar token
    const payload = { sub: user.id, email: user.email, role: user.role };

    // Registrar asistencia automáticamente (RF 1.7)
    await this.prisma.attendance.create({
      data: {
        userId: user.id,
        checkIn: new Date(),
      },
    });

    return {
      accessToken: this.jwtService.sign(payload),
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
        createdAt: true,
        updatedAt: true,
      },
    });
    return user;
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
      await this.prisma.attendance.update({
        where: { id: attendance.id },
        data: { checkOut: new Date() },
      });
    }

    return { message: 'Sesión cerrada y asistencia actualizada' };
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

    // TODO: Integrar servicio de correo/SMS; por ahora se registra en logs para pruebas.
    console.log(
      `Código de recuperación para ${email}: ${code} (válido ${this.recoveryExpirationMinutes} minutos)`,
    );

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

    const isValidCode = await bcrypt.compare(code, token.tokenHash);

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
      this.prisma.passwordResetToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' };
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

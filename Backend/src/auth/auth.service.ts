import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * Servicio responsable de la lógica de Autenticación.
 * Maneja el Registro, Inicio de Sesión y Generación de Tokens JWT.
 */
@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) { }

    /**
     * Registra un nuevo usuario.
     * Hashea la contraseña y guarda en BD.
     */
    async register(registerDto: RegisterDto) {
        const { email, password, fullName, role } = registerDto;

        // Verificar si el usuario existe
        const existingUser = await this.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            throw new ConflictException('Email already in use');
        }

        // Hashear contraseña
        const salt = await bcrypt.genSalt();
        const passwordHash = await bcrypt.hash(password, salt);

        // Crear usuario (incluye updatedAt requerido por el esquema)
        const now = new Date();
        const user = await this.prisma.user.create({
            data: {
                email,
                passwordHash,
                fullName,
                role: role || Role.OPERATOR,
                updatedAt: now,
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
            }
        });

        return {
            accessToken: this.jwtService.sign(payload),
        };
    }
}

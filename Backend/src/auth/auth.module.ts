import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaService } from '../prisma.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';

/**
 * Module that encapsulates all Authentication components.
 * Imports JwtModule and PassportModule.
 * 
 * ES: Módulo que encapsula todos los componentes de Autenticación.
 * Importa JwtModule y PassportModule.
 */
@Module({
    imports: [
        PassportModule,
        JwtModule.register({
            secret: process.env.JWT_SECRET || 'secretKey',
            signOptions: { expiresIn: '60m' },
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, PrismaService, JwtStrategy],
    exports: [AuthService, PrismaService], // Export if needed by other modules
})
export class AuthModule { }

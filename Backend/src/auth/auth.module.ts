import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { DatabaseModule } from '../database.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { PasswordRecoveryNotifierService } from './password-recovery-notifier.service';

/**
 * Module that encapsulates all Authentication components.
 * Imports JwtModule and PassportModule.
 *
 * ES: Módulo que encapsula todos los componentes de Autenticación.
 * Importa JwtModule y PassportModule.
 */
@Module({
  imports: [
    DatabaseModule,
    PassportModule,
    // ES: En producción se requiere JWT_SECRET. En desarrollo se permite un secreto por defecto.
    JwtModule.register({
      secret:
        process.env.JWT_SECRET ||
        (process.env.NODE_ENV === 'development' ? 'dev-secret' : undefined),
      signOptions: { expiresIn: '10h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, PasswordRecoveryNotifierService],
  exports: [AuthService],
})
export class AuthModule {}

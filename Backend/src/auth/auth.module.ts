/**
 * Módulo que agrupa providers y controladores para auth.
 */
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { DatabaseModule } from '../database.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { PasswordRecoveryNotifierService } from './password-recovery-notifier.service';

/**
 * Módulo que encapsula todos los componentes de Autenticación.
 *
 * Responsabilidades:
 * - Proveer `AuthService` para registro, login y gestión de sesiones.
 * - Configurar `JwtModule` para firmar tokens JWT.
 * - Registrar la estrategia `JwtStrategy` y el notificador de recuperación de contraseña.
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
/**
 * Clase AuthModule que implementa la lógica principal de auth.
 */
/**
 * Clase AuthModule que implementa la lógica principal de auth.
 */
/**
 * Clase AuthModule que implementa la lógica principal de auth.
 */
export class AuthModule {}

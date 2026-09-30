/**
 * Módulo raíz que carga y configura todos los módulos de la aplicación.
 */
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { DatabaseModule } from './database.module';
import { AuthModule } from './auth/auth.module';
import { ParkingModule } from './parking/parking.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { SettingsModule } from './settings/settings.module';
import { PermissionsModule } from './permissions/permissions.module';
import { AuditModule } from './audit/audit.module';
import { ReportsModule } from './reports/reports.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    // ES: Se aplican límites razonables para rutas públicas y se excluyen las rutas autenticadas
    // del throttling agresivo para evitar bloqueos al refrescar el perfil del usuario.
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 30,
      },
      {
        name: 'auth',
        ttl: 60000,
        limit: 10,
      },
    ]),
    DatabaseModule,
    AuthModule,
    ParkingModule,
    UsersModule,
    ClientsModule,
    SettingsModule,
    PermissionsModule,
    AuditModule,
    ReportsModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
/**
 * Clase AppModule que implementa la lógica principal de src.
 */
/**
 * Clase AppModule que implementa la lógica principal de src.
 */
/**
 * Clase AppModule que implementa la lógica principal de src.
 */
export class AppModule {}

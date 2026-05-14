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
    // Rate limiting/throttling para proteger endpoints críticos
    ThrottlerModule.forRoot([
      {
        ttl: 900000, // 15 minutos (configuración por defecto)
        limit: 5, // 5 requests por 15 minutos
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
export class AppModule {}

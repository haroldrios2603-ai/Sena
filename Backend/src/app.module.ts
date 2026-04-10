import { Module } from '@nestjs/common';
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
  providers: [AppService],
})
export class AppModule {}

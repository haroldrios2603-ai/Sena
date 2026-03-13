import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { DatabaseModule } from '../database.module';
import { ParkingModule } from '../parking/parking.module';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  imports: [DatabaseModule, ParkingModule],
  controllers: [SettingsController],
  providers: [SettingsService, RolesGuard],
})
export class SettingsModule {}

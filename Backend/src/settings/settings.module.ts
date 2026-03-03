import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { DatabaseModule } from '../database.module';
import { ParkingModule } from '../parking/parking.module';

@Module({
  imports: [DatabaseModule, ParkingModule],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}

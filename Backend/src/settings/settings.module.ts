/**
 * Módulo que agrupa providers y controladores para settings.
 */
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
/**
 * Clase SettingsModule que implementa la lógica principal de settings.
 */
/**
 * Clase SettingsModule que implementa la lógica principal de settings.
 */
/**
 * Clase SettingsModule que implementa la lógica principal de settings.
 */
export class SettingsModule {}

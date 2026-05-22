/**
 * Módulo que agrupa providers y controladores para parking.
 */
import { Module } from '@nestjs/common';
import { ParkingController } from './parking.controller';
import { ParkingService } from './parking.service';
import { DatabaseModule } from '../database.module';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  imports: [DatabaseModule],
  controllers: [ParkingController],
  providers: [ParkingService, RolesGuard],
  exports: [ParkingService],
})
/**
 * Clase ParkingModule que implementa la lógica principal de parking.
 */
/**
 * Clase ParkingModule que implementa la lógica principal de parking.
 */
/**
 * Clase ParkingModule que implementa la lógica principal de parking.
 */
export class ParkingModule {}

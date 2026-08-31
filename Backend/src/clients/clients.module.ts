/**
 * Módulo que agrupa providers y controladores para clients.
 */
import { Module } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { DatabaseModule } from '../database.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { PassportModule } from '@nestjs/passport';

/**
 * Module for managing clients
 */
@Module({
  imports: [DatabaseModule, PassportModule],
  controllers: [ClientsController],
  providers: [ClientsService, RolesGuard],
})
/**
 * Clase ClientsModule que implementa la lógica principal de clients.
 */

export class ClientsModule {}

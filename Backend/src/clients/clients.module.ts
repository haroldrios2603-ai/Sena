import { Module } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { PrismaService } from '../prisma.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { PassportModule } from '@nestjs/passport';

/**
 * Módulo encargado de la lógica de clientes con mensualidad.
 */
@Module({
  imports: [PassportModule],
  controllers: [ClientsController],
  providers: [ClientsService, PrismaService, RolesGuard],
})
export class ClientsModule {}

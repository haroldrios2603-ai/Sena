import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Módulo centralizado para la configuración de la base de datos.
 * Proporciona una única instancia de PrismaService para toda la aplicación.
 */
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}

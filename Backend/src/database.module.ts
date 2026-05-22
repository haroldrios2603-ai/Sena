/**
 * Módulo que expone el servicio de Prisma para acceso a la base de datos.
 */
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
/**
 * Clase DatabaseModule que implementa la lógica principal de src.
 */
/**
 * Clase DatabaseModule que implementa la lógica principal de src.
 */
/**
 * Clase DatabaseModule que implementa la lógica principal de src.
 */
export class DatabaseModule {}

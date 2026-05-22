/**
 * Servicio que maneja la conexión Prisma con la base de datos.
 */
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Servicio para manejar la conexión a la base de datos usando Prisma Client.
 * Implementa hooks de ciclo de vida para conectar/desconectar automáticamente.
 */
/**
 * Clase PrismaService que implementa la lógica principal de src.
 */
/**
 * Clase PrismaService que implementa la lógica principal de src.
 */
/**
 * Clase PrismaService que implementa la lógica principal de src.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  /**
   * Llamado cuando el módulo se inicializa.
   * Conecta a la base de datos.
   */
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * Llamado cuando la aplicación se cierra.
   * Desconecta de la base de datos.
   */
  async onModuleDestroy() {
    await this.$disconnect();
  }
}

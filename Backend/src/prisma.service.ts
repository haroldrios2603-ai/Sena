import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

// Tipo genérico para PrismaClient hasta que se generen los tipos correctos
type PrismaClient = any;

/**
 * Servicio para manejar la conexión a la base de datos usando Prisma Client.
 * Implementa hooks de ciclo de vida para conectar/desconectar automáticamente.
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private prismaClient: PrismaClient;

  // Exposer propiedades de Prisma para acceso directo
  get parking() {
    return this.prismaClient?.parking;
  }

  get tariff() {
    return this.prismaClient?.tariff;
  }

  get vehicle() {
    return this.prismaClient?.vehicle;
  }

  get ticket() {
    return this.prismaClient?.ticket;
  }

  get exit() {
    return this.prismaClient?.exit;
  }

  get payment() {
    return this.prismaClient?.payment;
  }

  get user() {
    return this.prismaClient?.user;
  }

  get contract() {
    return this.prismaClient?.contract;
  }

  get attendance() {
    return this.prismaClient?.attendance;
  }

  get report() {
    return this.prismaClient?.report;
  }

  constructor() {
    // Inicializar prismaClient de forma segura
    this.prismaClient = null;
  }

  /**
   * Llamado cuando el módulo se inicializa.
   * Conecta a la base de datos.
   */
  async onModuleInit() {
    try {
      // Usar dynamic import para evitar errores de tipos
      // eslint-disable-next-line
      const prismaModule = (global as any).require('@prisma/client');
      this.prismaClient = new prismaModule.PrismaClient();
      await this.prismaClient.$connect();
    } catch (error) {
      console.error('Error initializing Prisma:', error);
      throw error;
    }
  }

  /**
   * Llamado cuando la aplicación se cierra.
   * Desconecta de la base de datos.
   */
  async onModuleDestroy() {
    if (this.prismaClient) {
      await this.prismaClient.$disconnect();
    }
  }
}

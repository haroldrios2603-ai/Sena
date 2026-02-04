import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { RenewContractDto } from './dto/renew-contract.dto';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * Servicio para gestionar clientes con mensualidades y alertas.
 */
@Injectable()
export class ClientsService {
  private readonly alertThresholdDays = 5;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra un cliente (role CLIENT) y crea su contrato mensual.
   */
  async createClientWithContract(createClientDto: CreateClientDto) {
    const user = await this.upsertClientUser(createClientDto);

    const startDate = new Date(createClientDto.startDate);
    const endDate = new Date(createClientDto.endDate);

    const contract = await this.prisma.contract.create({
      data: {
        userId: user.id,
        parkingId: createClientDto.parkingId,
        startDate,
        endDate,
        status: this.computeStatus(endDate),
        planName: createClientDto.planName || 'Mensualidad',
        monthlyFee: createClientDto.monthlyFee,
        isRecurring: true,
        lastPaymentDate: startDate,
        nextPaymentDate: endDate,
      },
      include: {
        user: true,
        parking: true,
      },
    });

    await this.handleAlertsForContract(contract.id, endDate);

    return contract;
  }

  /**
   * Lista todos los contratos con información del cliente y estacionamiento.
   */
  async listContracts() {
    await this.syncContractStatuses();
    return this.prisma.contract.findMany({
      include: {
        user: true,
        parking: true,
        alerts: {
          where: { status: 'PENDING' },
        },
      },
      orderBy: { endDate: 'asc' },
    });
  }

  /**
   * Devuelve alertas pendientes tras sincronizar estados.
   */
  async listAlerts() {
    await this.syncContractStatuses();
    return this.prisma.contractAlert.findMany({
      where: { status: 'PENDING' },
      include: {
        contract: {
          include: { user: true, parking: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Registra el pago y nueva fecha de expiración del contrato.
   */
  async renewContract(contractId: string, renewContractDto: RenewContractDto) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundException('Contrato no encontrado');
    }

    const newEndDate = new Date(renewContractDto.newEndDate);
    const paymentDate = new Date(renewContractDto.paymentDate);

    const updated = await this.prisma.contract.update({
      where: { id: contractId },
      data: {
        endDate: newEndDate,
        status: this.computeStatus(newEndDate),
        monthlyFee:
          typeof renewContractDto.monthlyFee === 'number'
            ? renewContractDto.monthlyFee
            : contract.monthlyFee,
        lastPaymentDate: paymentDate,
        nextPaymentDate: newEndDate,
      },
    });

    await this.handleAlertsForContract(contractId, newEndDate);

    return updated;
  }

  /**
   * Crea o actualiza el usuario con rol CLIENT.
   */
  private async upsertClientUser(createClientDto: CreateClientDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createClientDto.email },
    });

    if (existingUser && existingUser.role !== Role.CLIENT) {
      throw new ConflictException(
        'El correo pertenece a otro rol. Crea un usuario nuevo o cambia su rol manualmente.',
      );
    }

    if (existingUser) {
      return existingUser;
    }

    const temporaryPassword = this.generateTemporalPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    return this.prisma.user.create({
      data: {
        email: createClientDto.email,
        fullName: createClientDto.fullName,
        passwordHash,
        role: Role.CLIENT,
      },
    });
  }

  /**
   * Sincroniza todos los contratos para generar alertas consistentes.
   */
  private async syncContractStatuses() {
    const contracts = await this.prisma.contract.findMany({
      select: { id: true, endDate: true },
    });

    await Promise.all(
      contracts.map((contract) =>
        this.handleAlertsForContract(contract.id, contract.endDate),
      ),
    );
  }

  /**
   * Calcula el estado basado en la fecha de finalización.
   */
  private computeStatus(endDate: Date) {
    const now = new Date();
    if (endDate.getTime() < now.getTime()) {
      return 'EXPIRED';
    }

    const diffDays = Math.ceil(
      (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays <= this.alertThresholdDays) {
      return 'EXPIRING_SOON';
    }

    return 'ACTIVE';
  }

  /**
   * Genera o resuelve alertas según el estado del contrato.
   */
  private async handleAlertsForContract(contractId: string, endDate: Date) {
    const status = this.computeStatus(endDate);

    await this.prisma.contract.update({
      where: { id: contractId },
      data: { status },
    });

    if (status === 'ACTIVE') {
      await this.prisma.contractAlert.updateMany({
        where: { contractId, status: 'PENDING' },
        data: { status: 'RESOLVED', resolvedAt: new Date() },
      });
      return;
    }

    const alertType = status === 'EXPIRED' ? 'EXPIRED' : 'EXPIRING_SOON';
    const message =
      status === 'EXPIRED'
        ? 'El contrato está vencido. Debe renovar el pago de la mensualidad.'
        : 'El contrato vencerá en breve. Recuerda contactar al cliente para renovar.';

    await this.prisma.contractAlert.upsert({
      where: {
        contractId_alertType: {
          contractId,
          alertType,
        },
      },
      update: {
        status: 'PENDING',
        message,
        resolvedAt: null,
      },
      create: {
        contractId,
        alertType,
        message,
      },
    });
  }

  /**
   * Genera contraseñas temporales sencillas para clientes (se recomienda forzar cambio vía correo).
   */
  private generateTemporalPassword() {
    return `Cliente${Math.floor(Math.random() * 10000)}!`;
  }
}

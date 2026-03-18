import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { RenewContractDto } from './dto/renew-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { ListContractsDto } from './dto/list-contracts.dto';

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
    const startDate = new Date(createClientDto.startDate);
    const endDate = new Date(createClientDto.endDate);
    this.validateContractRange(startDate, endDate);

    const { contract } = await this.prisma.$transaction(async (tx) => {
      const user = await this.upsertClientUser(createClientDto, tx);

      const createdContract = await tx.contract.create({
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

      await this.handleAlertsForContract(createdContract.id, endDate, tx);

      return { user, contract: createdContract };
    });

    return contract;
  }

  /**
   * Lista todos los contratos con información del cliente y estacionamiento.
   */
  async listContracts(filters: ListContractsDto = {}) {
    await this.syncContractStatuses();

    const where = this.buildContractWhere(filters);

    return this.prisma.contract.findMany({
      where,
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

    if (contract.status === 'CANCELLED') {
      throw new ConflictException(
        'El contrato está archivado. Debes restaurarlo antes de renovarlo.',
      );
    }

    const newEndDate = new Date(renewContractDto.newEndDate);
    const paymentDate = new Date(renewContractDto.paymentDate);
    this.validateContractRange(contract.startDate, newEndDate);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.contract.update({
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

      await this.handleAlertsForContract(contractId, newEndDate, tx);
      return updated;
    });
  }

  /**
   * Obtiene un contrato por id incluyendo cliente, parqueadero y alertas activas.
   */
  async findContractById(contractId: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        user: true,
        parking: true,
        alerts: {
          where: { status: 'PENDING' },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException('Contrato no encontrado');
    }

    return contract;
  }

  /**
   * Edita datos del cliente y del contrato en una sola transacción.
   */
  async updateContract(contractId: string, updateContractDto: UpdateContractDto) {
    const existing = await this.findContractById(contractId);

    if (existing.status === 'CANCELLED') {
      throw new ConflictException(
        'El contrato está archivado. Debes restaurarlo antes de editarlo.',
      );
    }

    const startDate =
      typeof updateContractDto.startDate === 'string'
        ? new Date(updateContractDto.startDate)
        : existing.startDate;
    const endDate =
      typeof updateContractDto.endDate === 'string'
        ? new Date(updateContractDto.endDate)
        : existing.endDate;

    this.validateContractRange(startDate, endDate);

    const lastPaymentDate =
      typeof updateContractDto.lastPaymentDate === 'string'
        ? new Date(updateContractDto.lastPaymentDate)
        : undefined;
    const nextPaymentDate =
      typeof updateContractDto.nextPaymentDate === 'string'
        ? new Date(updateContractDto.nextPaymentDate)
        : undefined;

    if (
      typeof updateContractDto.email === 'string' &&
      updateContractDto.email !== existing.user.email
    ) {
      const duplicated = await this.prisma.user.findUnique({
        where: { email: updateContractDto.email },
      });
      if (duplicated && duplicated.id !== existing.userId) {
        throw new ConflictException('El correo ya está registrado');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: existing.userId },
        data: {
          ...(typeof updateContractDto.fullName === 'string'
            ? { fullName: updateContractDto.fullName }
            : {}),
          ...(typeof updateContractDto.email === 'string'
            ? { email: updateContractDto.email }
            : {}),
          ...(typeof updateContractDto.contactPhone === 'string'
            ? { contactPhone: updateContractDto.contactPhone }
            : {}),
          ...(typeof updateContractDto.documentType !== 'undefined'
            ? { documentType: updateContractDto.documentType }
            : {}),
          ...(typeof updateContractDto.documentNumber === 'string'
            ? { documentNumber: updateContractDto.documentNumber }
            : {}),
        },
      });

      const updated = await tx.contract.update({
        where: { id: contractId },
        data: {
          ...(typeof updateContractDto.parkingId === 'string'
            ? { parkingId: updateContractDto.parkingId }
            : {}),
          ...(typeof updateContractDto.startDate === 'string' ? { startDate } : {}),
          ...(typeof updateContractDto.endDate === 'string' ? { endDate } : {}),
          ...(typeof updateContractDto.monthlyFee === 'number'
            ? { monthlyFee: updateContractDto.monthlyFee }
            : {}),
          ...(typeof updateContractDto.planName === 'string'
            ? { planName: updateContractDto.planName }
            : {}),
          ...(typeof updateContractDto.isRecurring === 'boolean'
            ? { isRecurring: updateContractDto.isRecurring }
            : {}),
          ...(typeof updateContractDto.lastPaymentDate === 'string'
            ? { lastPaymentDate }
            : {}),
          ...(typeof updateContractDto.nextPaymentDate === 'string'
            ? { nextPaymentDate }
            : typeof updateContractDto.endDate === 'string'
              ? { nextPaymentDate: endDate }
              : {}),
          status: this.computeStatus(endDate),
        },
      });

      await this.handleAlertsForContract(contractId, endDate, tx);

      return tx.contract.findUniqueOrThrow({
        where: { id: updated.id },
        include: {
          user: true,
          parking: true,
          alerts: {
            where: { status: 'PENDING' },
          },
        },
      });
    });
  }

  /**
   * Archiva un contrato para mantener histórico y permitir restauración posterior.
   */
  async deleteContract(contractId: string) {
    const existing = await this.findContractById(contractId);

    if (existing.status === 'CANCELLED') {
      throw new ConflictException('El contrato ya se encuentra archivado');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.contractAlert.updateMany({
        where: { contractId, status: 'PENDING' },
        data: { status: 'RESOLVED', resolvedAt: new Date() },
      });

      const archivedContract = await tx.contract.update({
        where: { id: contractId },
        data: {
          status: 'CANCELLED',
          isRecurring: false,
        },
      });

      const remainingContracts = await tx.contract.count({
        where: {
          userId: existing.userId,
          status: { not: 'CANCELLED' },
        },
      });

      let userArchived = false;
      if (remainingContracts === 0 && existing.user.role === Role.CLIENT) {
        if (existing.user.isActive) {
          await tx.user.update({
            where: { id: existing.userId },
            data: { isActive: false },
          });
          userArchived = true;
        }
      }

      return {
        contractId: archivedContract.id,
        userId: existing.userId,
        userArchived,
        archived: true,
        deleted: true,
      };
    });
  }

  /**
   * Restaura un contrato archivado y reactiva al cliente cuando aplique.
   */
  async restoreContract(contractId: string) {
    const existing = await this.findContractById(contractId);

    if (existing.status !== 'CANCELLED') {
      throw new ConflictException('El contrato no está archivado');
    }

    const restoredStatus = this.computeStatus(existing.endDate);

    return this.prisma.$transaction(async (tx) => {
      const restoredContract = await tx.contract.update({
        where: { id: contractId },
        data: {
          status: restoredStatus,
          isRecurring: true,
        },
      });

      await this.handleAlertsForContract(contractId, existing.endDate, tx);

      let userRestored = false;
      if (existing.user.role === Role.CLIENT && !existing.user.isActive) {
        await tx.user.update({
          where: { id: existing.userId },
          data: { isActive: true },
        });
        userRestored = true;
      }

      return {
        contractId: restoredContract.id,
        userId: existing.userId,
        userRestored,
        restored: true,
      };
    });
  }

  /**
   * Crea o actualiza el usuario con rol CLIENT.
   */
  private async upsertClientUser(
    createClientDto: CreateClientDto,
    tx: Prisma.TransactionClient,
  ) {
    const existingUser = await tx.user.findUnique({
      where: { email: createClientDto.email },
    });

    if (existingUser && existingUser.role !== Role.CLIENT) {
      throw new ConflictException(
        'El correo pertenece a otro rol. Crea un usuario nuevo o cambia su rol manualmente.',
      );
    }

    if (existingUser) {
      return tx.user.update({
        where: { id: existingUser.id },
        data: {
          fullName: createClientDto.fullName,
          contactPhone: createClientDto.contactPhone,
          ...(createClientDto.documentType ? { documentType: createClientDto.documentType } : {}),
          ...(createClientDto.documentNumber ? { documentNumber: createClientDto.documentNumber } : {}),
        },
      });
    }

    const temporaryPassword = this.generateTemporalPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    return tx.user.create({
      data: {
        email: createClientDto.email,
        fullName: createClientDto.fullName,
        contactPhone: createClientDto.contactPhone,
        passwordHash,
        role: Role.CLIENT,
        ...(createClientDto.documentType ? { documentType: createClientDto.documentType } : {}),
        ...(createClientDto.documentNumber ? { documentNumber: createClientDto.documentNumber } : {}),
      },
    });
  }

  private buildContractWhere(filters: ListContractsDto) {
    return {
      status: filters.status || { not: 'CANCELLED' },
      planName: filters.planName
        ? { contains: filters.planName, mode: 'insensitive' as const }
        : undefined,
      parkingId: filters.parkingId || undefined,
      user: {
        fullName: filters.fullName
          ? { contains: filters.fullName, mode: 'insensitive' as const }
          : undefined,
        email: filters.email
          ? { contains: filters.email, mode: 'insensitive' as const }
          : undefined,
        contactPhone: filters.contactPhone
          ? { contains: filters.contactPhone, mode: 'insensitive' as const }
          : undefined,
        documentNumber: filters.documentNumber
          ? { contains: filters.documentNumber, mode: 'insensitive' as const }
          : undefined,
      },
      parking: {
        name: filters.parkingName
          ? { contains: filters.parkingName, mode: 'insensitive' as const }
          : undefined,
      },
    };
  }

  /**
   * Sincroniza todos los contratos para generar alertas consistentes.
   */
  private async syncContractStatuses() {
    const contracts = await this.prisma.contract.findMany({
      where: { status: { not: 'CANCELLED' } },
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
  private async handleAlertsForContract(
    contractId: string,
    endDate: Date,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? this.prisma;
    const currentContract = await db.contract.findUnique({
      where: { id: contractId },
      select: { status: true },
    });

    if (!currentContract) {
      return;
    }

    if (currentContract.status === 'CANCELLED') {
      await db.contractAlert.updateMany({
        where: { contractId, status: 'PENDING' },
        data: { status: 'RESOLVED', resolvedAt: new Date() },
      });
      return;
    }

    const status = this.computeStatus(endDate);

    await db.contract.update({
      where: { id: contractId },
      data: { status },
    });

    if (status === 'ACTIVE') {
      await db.contractAlert.updateMany({
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

    await db.contractAlert.upsert({
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

  private validateContractRange(startDate: Date, endDate: Date) {
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('Fechas de contrato inválidas');
    }

    if (endDate.getTime() <= startDate.getTime()) {
      throw new BadRequestException(
        'La fecha de finalización debe ser posterior a la fecha de inicio',
      );
    }
  }

  /**
   * Genera contraseñas temporales sencillas para clientes (se recomienda forzar cambio vía correo).
   */
  private generateTemporalPassword() {
    return `Cliente${Math.floor(Math.random() * 10000)}!`;
  }
}

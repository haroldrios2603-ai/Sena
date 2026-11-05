/**
 * Servicio que contiene la lógica de negocio para parking.
 */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DocumentType, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma.service';
import { toNumericCode } from '../common/utils/numeric-code.util';
import { CreateParkingDto } from './dto/create-parking.dto';
import { UpdateParkingDto } from './dto/update-parking.dto';
import { TarifaConfigDto } from './dto/tarifa-config.dto';

/**
 * Servicio principal para la gestión de parqueaderos y operaciones de flujo.
 * Centraliza la creación de sedes, gestión de tarifas y lógica de entrada/salida.
 */
/**
 * Clase ParkingService que implementa la lógica principal de parking.
 */
/**
 * Clase ParkingService que implementa la lógica principal de parking.
 */
/**
 * Clase ParkingService que implementa la lógica principal de parking.
 */
@Injectable()
export class ParkingService {
  private readonly CONFIG_ID = 'configuracion-principal';

  constructor(private prisma: PrismaService) {}

  /**
   * Registra un nuevo parqueadero en el sistema (RF 1.1).
   */
  async createParking(data: CreateParkingDto) {
    return this.prisma.parking.create({
      data: {
        name: data.nombre,
        address: data.direccion,
        capacity: data.capacidad,
        baseRate: data.tarifaBase,
        isActive: data.activo ?? true,
        vehicleTypes: data.tiposVehiculo ?? ['CAR', 'MOTORCYCLE'],
        operationHours: this.toJsonValue(data.horario ?? null),
      },
      include: { tariffs: true },
    });
  }

  /**
   * Actualiza los datos generales de una sede existente.
   */
  async updateParking(parkingId: string, data: UpdateParkingDto) {
    await this.ensureParkingExists(parkingId);
    return this.prisma.parking.update({
      where: { id: parkingId },
      data: {
        name: data.nombre,
        address: data.direccion,
        capacity: data.capacidad,
        baseRate: data.tarifaBase,
        isActive: typeof data.activo === 'boolean' ? data.activo : undefined,
        vehicleTypes: data.tiposVehiculo,
        operationHours: this.toJsonValue(data.horario),
      },
      include: { tariffs: true },
    });
  }

  /**
   * Habilita o deshabilita una sede completa.
   */
  async updateParkingStatus(parkingId: string, isActive: boolean) {
    await this.ensureParkingExists(parkingId);
    return this.prisma.parking.update({
      where: { id: parkingId },
      data: { isActive },
      include: { tariffs: true },
    });
  }

  /**
   * Elimina una sede únicamente cuando no tiene historial dependiente.
   * Los tickets y contratos se conservan para no romper reportes ni trazabilidad.
   */
  async deleteParking(parkingId: string) {
    const parking = await this.ensureParkingExists(parkingId);
    const [ticketCount, contractCount] = await Promise.all([
      this.prisma.ticket.count({ where: { parkingId } }),
      this.prisma.contract.count({ where: { parkingId } }),
    ]);

    if (ticketCount > 0 || contractCount > 0) {
      throw new ConflictException(
        'No se puede eliminar la sede porque tiene tickets o contratos asociados. Suspéndela para conservar el historial operativo.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.tariff.deleteMany({ where: { parkingId } }),
      this.prisma.parking.delete({ where: { id: parkingId } }),
    ]);

    return {
      id: parking.id,
      deleted: true,
      tariffsDeleted: true,
    };
  }

  /**
   * Obtiene la lista de todos los parqueaderos registrados.
   */
  async findAll() {
    return this.prisma.parking.findMany({
      include: { tariffs: true },
    });
  }

  /**
   * Configura o actualiza la tarifa para un tipo de vehículo (RF 1.2).
   */
  async setTariff(parkingId: string, tarifa: TarifaConfigDto) {
    return this.prisma.tariff.upsert({
      where: {
        parkingId_vehicleType: {
          parkingId,
          vehicleType: tarifa.tipoVehiculo,
        },
      },
      update: {
        baseRate: tarifa.tarifaBase,
        hourlyRate: tarifa.tarifaHora,
        dayRate: tarifa.tarifaDia,
        nightRate: tarifa.tarifaNocturna,
        nightStart: tarifa.horaInicioNocturna,
        nightEnd: tarifa.horaFinNocturna,
        flatRate: tarifa.tarifaPlana,
      },
      create: {
        parkingId,
        vehicleType: tarifa.tipoVehiculo,
        baseRate: tarifa.tarifaBase,
        hourlyRate: tarifa.tarifaHora,
        dayRate: tarifa.tarifaDia,
        nightRate: tarifa.tarifaNocturna,
        nightStart: tarifa.horaInicioNocturna,
        nightEnd: tarifa.horaFinNocturna,
        flatRate: tarifa.tarifaPlana,
      },
    });
  }

  /**
   * Guarda un paquete de tarifas para múltiples sedes.
   */
  async bulkUpsertTariffs(parkingIds: string[], tarifas: TarifaConfigDto[]) {
    const vehicleTypes = tarifas.map((tarifa) => tarifa.tipoVehiculo);
    await this.prisma.$transaction(async (tx) => {
      for (const id of parkingIds) {
        await tx.tariff.deleteMany({
          where: {
            parkingId: id,
            ...(vehicleTypes.length
              ? { vehicleType: { notIn: vehicleTypes } }
              : {}),
          },
        });

        for (const tarifa of tarifas) {
          await tx.tariff.upsert({
            where: {
              parkingId_vehicleType: {
                parkingId: id,
                vehicleType: tarifa.tipoVehiculo,
              },
            },
            update: {
              baseRate: tarifa.tarifaBase,
              hourlyRate: tarifa.tarifaHora,
              dayRate: tarifa.tarifaDia,
              nightRate: tarifa.tarifaNocturna,
              nightStart: tarifa.horaInicioNocturna,
              nightEnd: tarifa.horaFinNocturna,
              flatRate: tarifa.tarifaPlana,
            },
            create: {
              parkingId: id,
              vehicleType: tarifa.tipoVehiculo,
              baseRate: tarifa.tarifaBase,
              hourlyRate: tarifa.tarifaHora,
              dayRate: tarifa.tarifaDia,
              nightRate: tarifa.tarifaNocturna,
              nightStart: tarifa.horaInicioNocturna,
              nightEnd: tarifa.horaFinNocturna,
              flatRate: tarifa.tarifaPlana,
            },
          });
        }
      }
    });
    return this.prisma.tariff.findMany({
      where: { parkingId: { in: parkingIds } },
    });
  }

  /**
   * Obtiene los detalles de un parqueadero específico.
   */
  async findOne(id: string) {
    const parking = await this.prisma.parking.findUnique({
      where: { id },
      include: { tariffs: true },
    });
    if (!parking) throw new NotFoundException('Parqueadero no encontrado');
    return parking;
  }

  /**
   * Registra el ingreso de un vehículo.
   * ES: si ya existe un ticket activo o pendiente de pago para la placa, se bloquea el nuevo ingreso
   * para evitar duplicados y mantener la trazabilidad del vehículo dentro del parqueadero.
   */
  async registerEntry(
    plate: string | undefined,
    vehicleType: string,
    parkingId: string,
    owner?: {
      ownerName?: string;
      ownerDocumentType?: DocumentType;
      ownerDocumentNumber?: string;
      ownerPhone?: string;
    },
  ) {
    // ES: La placa sigue siendo opcional únicamente para vehículos sin placa visible.
    // En ese caso se genera un código interno no reutilizable y el DTO ya exigió los datos del responsable.
    const normalizedPlate = plate?.trim().toUpperCase() || undefined;
        if (
          !normalizedPlate
          && (!owner?.ownerName
            || !owner.ownerDocumentType
            || !owner.ownerDocumentNumber
            || !owner.ownerPhone)
        ) {
          throw new BadRequestException(
            'Los vehículos sin placa requieren nombre, documento y teléfono del responsable.',
          );
        }
    const identificationCode = normalizedPlate ?? `NP-${toNumericCode(randomUUID())}`;
    // ES: La placa puede reingresar después de una salida registrada. La lógica de bloqueo solo debe
    // aplicarse a tickets cuyo ingreso sigue abierto. Si el ticket ya fue egresado, aunque esté en
    // pendiente de pago, el vehículo ya no está dentro del parqueadero y puede registrar un nuevo ingreso.
    const existingActiveTicket = normalizedPlate
      ? await this.prisma.ticket.findFirst({
          where: {
            vehicle: { plate: normalizedPlate },
            status: 'ACTIVE',
          },
      select: {
        id: true,
        ticketCode: true,
        entryTime: true,
      },
      orderBy: {
        entryTime: 'desc',
      },
        })
      : null;

    if (existingActiveTicket) {
      throw new ConflictException(
        `La placa ${normalizedPlate} ya tiene un ingreso activo (ticket ${existingActiveTicket.ticketCode}). Debes registrar la salida antes de generar uno nuevo.`,
      );
    }

    // ES: El aforo se valida con la ocupación real del parqueadero y la capacidad configurada.
    // Esto evita registrar ingresos cuando la sede ya alcanzó el máximo permitido, sin tocar la regla
    // de cobro ni la lógica de cierre de jornada.
    const parking = await this.prisma.parking.findUnique({
      where: { id: parkingId },
      select: { id: true, name: true, capacity: true },
    });

    if (!parking) {
      throw new NotFoundException('Parqueadero no encontrado');
    }

    const activeCountInParking = await this.prisma.ticket.count({
      where: {
        parkingId,
        status: 'ACTIVE',
      },
    });

    if (
      typeof parking.capacity === 'number' &&
      activeCountInParking >= parking.capacity
    ) {
      throw new ConflictException(
        `El parqueadero ${parking.name ?? 'seleccionado'} ya alcanzó su capacidad máxima (${parking.capacity} vehículos). No se permiten nuevos ingresos.`,
      );
    }

    // Buscar o crear vehículo
    const vehicle = normalizedPlate
      ? await this.prisma.vehicle.upsert({
          where: { plate: normalizedPlate },
          update: {
            type: vehicleType,
            ...(owner?.ownerName ? { ownerName: owner.ownerName } : {}),
            ...(owner?.ownerDocumentType
              ? { ownerDocumentType: owner.ownerDocumentType }
              : {}),
            ...(owner?.ownerDocumentNumber
              ? { ownerDocumentNumber: owner.ownerDocumentNumber } : {}),
            ...(owner?.ownerPhone ? { ownerPhone: owner.ownerPhone } : {}),
          },
          create: {
            plate: normalizedPlate,
            identificationCode,
            type: vehicleType,
          },
        })
      : await this.prisma.vehicle.create({
          data: {
            identificationCode,
            type: vehicleType,
            ownerName: owner?.ownerName,
            ownerDocumentType: owner?.ownerDocumentType,
            ownerDocumentNumber: owner?.ownerDocumentNumber,
            ownerPhone: owner?.ownerPhone,
          },
        });

    // ES: Se genera un código visible totalmente numérico para evitar valores alfanuméricos en tickets y reportes.
    const ticketCode = toNumericCode(randomUUID());

    // Crear ticket
    const ticket = await this.prisma.ticket.create({
      data: {
        ticketCode,
        parkingId,
        vehicleId: vehicle.id,
        status: 'ACTIVE',
      },
      include: { vehicle: true },
    });

    return ticket;
  }

  /**
   * Registra la salida de un vehículo y calcula el cobro.
   * ES: la salida debe resolverse contra el ticket activo más reciente, incluso si ya quedó en estado
   * pendiente de pago por una operación previa. Esto evita falsos 404 cuando el vehículo sigue existiendo
   * en el flujo operativo pero el estado del ticket ya fue actualizado.
   */
  async registerExit(identificador: string) {
    // ES: Para vehículos sin placa, el código del ticket es la credencial operativa
    // que permite localizar la salida sin inventar una placa ni mezclar registros.
    const ticket = await this.prisma.ticket.findFirst({
      where: {
        OR: [
          { ticketCode: identificador },
          { vehicle: { plate: identificador } },
          { vehicle: { identificationCode: identificador } },
        ],
        status: {
          in: ['ACTIVE', 'PENDING_PAYMENT'],
        },
      },
      include: {
        vehicle: true,
        parking: {
          include: { tariffs: true },
        },
        exit: true,
      },
      orderBy: {
        entryTime: 'desc',
      },
    });

    if (!ticket) {
      throw new NotFoundException(
        'No se encontró un ticket activo para esta placa',
      );
    }

    if (ticket.exit) {
      return {
        ticket,
        exit: ticket.exit,
        message:
          'El vehículo ya tiene una salida registrada pendiente de pago o confirmación.',
        paymentOptions: await this.getPaymentOptions(),
      };
    }

    const exitTime = new Date();
    const durationMs = exitTime.getTime() - ticket.entryTime.getTime();
    const durationMinutes = Math.ceil(durationMs / (1000 * 60));

    const tariff = ticket.parking.tariffs.find(
      (t: { vehicleType: string; baseRate: number; hourlyRate: number }) =>
        t.vehicleType === ticket.vehicle.type,
    );
    const baseRate = tariff ? tariff.baseRate : ticket.parking.baseRate;
    const hourlyRate = tariff ? tariff.hourlyRate : 0;

    const totalAmount = this.calcularMonto(
      tariff ?? null,
      durationMinutes,
      baseRate,
      hourlyRate,
    );

    const exit = await this.prisma.exit.create({
      data: {
        ticketId: ticket.id,
        exitTime,
        durationMinutes,
        totalAmount,
      },
    });

    await this.prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: 'PENDING_PAYMENT' },
    });

    const paymentOptions = await this.getPaymentOptions();

    return {
      ticket,
      exit,
      message: 'Salida registrada con éxito',
      paymentOptions,
    };
  }

  /**
   * Obtiene un resumen de tickets activos y cerrados para el dashboard operativo.
   */
  async obtenerResumenTickets() {
    const fechaCierreJornada = await this.obtenerFechaCierreJornada();

    const [ticketsActivos, ticketsCerrados] = await Promise.all([
      this.prisma.ticket.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { entryTime: 'desc' },
        include: {
          vehicle: true,
          parking: true,
        },
      }),
      this.prisma.ticket.findMany({
        where: {
          status: {
            in: ['CLOSED', 'PENDING_PAYMENT'],
          },
          ...(fechaCierreJornada
            ? {
                exit: {
                  is: {
                    exitTime: {
                      gte: fechaCierreJornada,
                    },
                  },
                },
              }
            : {}),
        },
        orderBy: { entryTime: 'desc' },
        include: {
          vehicle: true,
          parking: true,
          exit: true,
        },
      }),
    ]);

    return {
      activos: ticketsActivos,
      cerrados: ticketsCerrados,
      paymentOptions: await this.getPaymentOptions(),
    };
  }

  /**
   * Cierra la jornada operativa actual.
   * Desde este punto, el listado de "Vehículos con salida" se reinicia,
   * pero se conservan siempre los vehículos activos sin salida.
   */
  async cerrarJornadaOperativa(userId?: string) {
    const now = new Date();
    const config = await this.prisma.systemConfig.findUnique({
      where: { id: this.CONFIG_ID },
      select: { parametrosOperacion: true },
    });

    const fechaCierreAnterior = this.obtenerFechaCierreDesdeConfig(
      config?.parametrosOperacion,
    );

    const [activosPendientes, salidasArchivadas] = await Promise.all([
      this.prisma.ticket.count({
        where: { status: 'ACTIVE' },
      }),
      this.prisma.ticket.count({
        where: {
          status: 'CLOSED',
          exit: {
            is: {
              ...(fechaCierreAnterior
                ? {
                    exitTime: {
                      gte: fechaCierreAnterior,
                      lt: now,
                    },
                  }
                : { exitTime: { lt: now } }),
            },
          },
        },
      }),
    ]);

    const parametrosActuales = this.extraerObjetoJson(
      config?.parametrosOperacion,
    );

    const parametrosOperacion = {
      ...parametrosActuales,
      cierreJornadaAt: now.toISOString(),
      cierreJornadaUserId: userId ?? null,
    };

    await this.prisma.systemConfig.upsert({
      where: { id: this.CONFIG_ID },
      update: {
        parametrosOperacion: this.toJsonValue(parametrosOperacion),
      },
      create: {
        id: this.CONFIG_ID,
        capacidadTotal: 0,
        minutosCortesia: 0,
        parametrosOperacion: this.toJsonValue(parametrosOperacion),
      },
    });

    return {
      fechaCierre: now,
      activosPendientes,
      salidasArchivadas,
      mensaje:
        activosPendientes > 0
          ? 'Jornada cerrada. Se limpió el listado de salidas, pero permanecen visibles los vehículos activos sin salida.'
          : 'Jornada cerrada. El listado de salidas fue reiniciado.',
    };
  }

  /**
   * Garantiza que el parqueadero exista antes de mutar información.
   */
  private async ensureParkingExists(parkingId: string) {
    const parking = await this.prisma.parking.findUnique({
      where: { id: parkingId },
    });
    if (!parking) {
      throw new NotFoundException('Parqueadero no encontrado');
    }
    return parking;
  }

  /**
   * Calcula el cobro final combinando tarifas base, nocturnas, diarias o planas.
   */
  private calcularMonto(
    tarifa: {
      dayRate: number | null;
      nightRate: number | null;
      nightStart: string | null;
      nightEnd: string | null;
      flatRate: number | null;
    } | null,
    durationMinutes: number,
    baseRate: number,
    hourlyRate: number,
  ) {
    if (tarifa?.flatRate && tarifa.flatRate > 0) {
      return tarifa.flatRate;
    }

    const ahora = new Date();
    if (
      tarifa?.nightRate &&
      tarifa.nightStart &&
      tarifa.nightEnd &&
      this.estaEnHorarioNocturno(tarifa.nightStart, tarifa.nightEnd, ahora)
    ) {
      return tarifa.nightRate;
    }

    if (tarifa?.dayRate && durationMinutes >= 60 * 24) {
      const dias = Math.ceil(durationMinutes / (60 * 24));
      return dias * tarifa.dayRate;
    }

    const horasFacturables = Math.max(1, Math.ceil(durationMinutes / 60));
    return baseRate + (horasFacturables - 1) * hourlyRate;
  }

  /**
   * Evalúa si la hora actual cae dentro del rango nocturno configurado.
   */
  private estaEnHorarioNocturno(inicio: string, fin: string, fecha: Date) {
    const inicioMinutos = this.convertirAHoraReferencia(inicio);
    const finMinutos = this.convertirAHoraReferencia(fin);
    const actualMinutos = fecha.getHours() * 60 + fecha.getMinutes();

    if (inicioMinutos === null || finMinutos === null) {
      return false;
    }

    if (inicioMinutos <= finMinutos) {
      return actualMinutos >= inicioMinutos && actualMinutos < finMinutos;
    }

    return actualMinutos >= inicioMinutos || actualMinutos < finMinutos;
  }

  private convertirAHoraReferencia(valor: string) {
    const [hora, minuto] = valor.split(':').map((n) => Number(n));
    if (Number.isNaN(hora) || Number.isNaN(minuto)) {
      return null;
    }
    return hora * 60 + minuto;
  }

  private toJsonValue<T>(
    value: T | null | undefined,
  ): Prisma.InputJsonValue | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return Prisma.JsonNull as any;
    }
    return value as unknown as Prisma.InputJsonValue;
  }

  private async getPaymentOptions() {
    const defaults = {
      aceptaEfectivo: true,
      aceptaQr: false,
      aceptaTarjeta: true,
      aceptaEnLinea: false,
    };

    const config = await this.prisma.systemConfig.findUnique({
      where: { id: this.CONFIG_ID },
      select: { metodosPago: true },
    });

    if (!config?.metodosPago || typeof config.metodosPago !== 'object') {
      return defaults;
    }

    const raw = config.metodosPago as Record<string, unknown>;
    return {
      aceptaEfectivo:
        typeof raw.aceptaEfectivo === 'boolean'
          ? raw.aceptaEfectivo
          : defaults.aceptaEfectivo,
      aceptaQr:
        typeof raw.aceptaQr === 'boolean' ? raw.aceptaQr : defaults.aceptaQr,
      aceptaTarjeta:
        typeof raw.aceptaTarjeta === 'boolean'
          ? raw.aceptaTarjeta
          : defaults.aceptaTarjeta,
      aceptaEnLinea:
        typeof raw.aceptaEnLinea === 'boolean'
          ? raw.aceptaEnLinea
          : defaults.aceptaEnLinea,
    };
  }

  private async obtenerFechaCierreJornada() {
    const config = await this.prisma.systemConfig.findUnique({
      where: { id: this.CONFIG_ID },
      select: { parametrosOperacion: true },
    });
    return this.obtenerFechaCierreDesdeConfig(config?.parametrosOperacion);
  }

  private obtenerFechaCierreDesdeConfig(
    value: Prisma.JsonValue | null | undefined,
  ) {
    const parametros = this.extraerObjetoJson(value);
    const cierre = parametros.cierreJornadaAt;
    if (typeof cierre !== 'string') {
      return null;
    }

    const fecha = new Date(cierre);
    if (Number.isNaN(fecha.getTime())) {
      return null;
    }

    return fecha;
  }

  private extraerObjetoJson(value: Prisma.JsonValue | null | undefined) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {} as Record<string, unknown>;
    }
    return value as Record<string, unknown>;
  }
}

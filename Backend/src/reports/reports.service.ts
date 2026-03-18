import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AttendanceReportDto } from './dto/attendance-report.dto';
import { ClientBillingDto } from './dto/client-billing.dto';
import { DateRangeDto } from './dto/date-range.dto';
import { MonthlyStatusDto } from './dto/monthly-status.dto';
import { VehiclesPeriodDto } from './dto/vehicles-period.dto';

type Range = { from: Date; to: Date };

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async listClientOptions() {
    return this.prisma.user.findMany({
      where: { role: 'CLIENT', isActive: true },
      select: {
        id: true,
        fullName: true,
        email: true,
        documentType: true,
        documentNumber: true,
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async getWorkersOnCurrentShift() {
    const now = new Date();
    const shift = this.resolveCurrentShiftWindow(now);

    const attendances = await this.prisma.attendance.findMany({
      where: {
        checkIn: {
          gte: shift.from,
          lte: shift.to,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            isActive: true,
            documentType: true,
            documentNumber: true,
          },
        },
      },
      orderBy: { checkIn: 'desc' },
    });

    const present = attendances
      .filter((item) => item.user.role !== 'CLIENT')
      .map((item) => ({
        attendanceId: item.id,
        userId: item.userId,
        nombre: item.user.fullName,
        correo: item.user.email,
        rol: item.user.role,
        ingreso: item.checkIn,
        salida: item.checkOut,
        presente: !item.checkOut,
      }));

    return {
      turno: shift.shiftName,
      horaServidor: now,
      rango: {
        inicio: shift.from,
        fin: shift.to,
      },
      totalPresentes: present.filter((row) => row.presente).length,
      totalRegistros: present.length,
      registros: present,
    };
  }

  async getVehiclesByPeriod(dto: VehiclesPeriodDto) {
    const baseDate = dto.date ? this.parseDateInput(dto.date, false) : new Date();
    const range = this.resolvePeriodRange(dto.period, baseDate);

    const tickets = await this.prisma.ticket.findMany({
      where: {
        entryTime: {
          gte: range.from,
          lte: range.to,
        },
      },
      select: {
        id: true,
        entryTime: true,
        exit: {
          select: {
            totalAmount: true,
            exitTime: true,
          },
        },
        vehicle: {
          select: {
            type: true,
          },
        },
      },
      orderBy: { entryTime: 'asc' },
    });

    const buckets = new Map<string, { totalVehiculos: number; totalCobrado: number }>();

    for (const ticket of tickets) {
      const bucket = this.resolveBucket(dto.period, ticket.entryTime);
      const current = buckets.get(bucket) ?? { totalVehiculos: 0, totalCobrado: 0 };
      current.totalVehiculos += 1;
      current.totalCobrado += ticket.exit?.totalAmount ?? 0;
      buckets.set(bucket, current);
    }

    const detalle = Array.from(buckets.entries()).map(([bucket, data]) => ({
      bucket,
      total: data.totalVehiculos,
      totalVehiculos: data.totalVehiculos,
      totalCobrado: Number(data.totalCobrado.toFixed(2)),
    }));

    const totalCobrado = tickets.reduce((acc, item) => acc + (item.exit?.totalAmount ?? 0), 0);
    const totalVehiculosConCobro = tickets.filter((item) => Boolean(item.exit)).length;

    return {
      periodo: dto.period,
      rango: {
        inicio: range.from,
        fin: range.to,
      },
      totalVehiculos: tickets.length,
      totalVehiculosConCobro,
      totalCobrado: Number(totalCobrado.toFixed(2)),
      porPeriodo: detalle,
    };
  }

  async getBillingTotal(dto: DateRangeDto) {
    const range = this.resolveDateRange(dto);

    const exits = await this.prisma.exit.findMany({
      where: {
        exitTime: {
          gte: range.from,
          lte: range.to,
        },
      },
      select: {
        id: true,
        exitTime: true,
        totalAmount: true,
      },
      orderBy: { exitTime: 'asc' },
    });

    const total = exits.reduce((acc, row) => acc + row.totalAmount, 0);

    return {
      rango: {
        inicio: range.from,
        fin: range.to,
      },
      totalFacturado: total,
      totalTransacciones: exits.length,
      detalle: exits,
      fuente: 'Exit.totalAmount',
    };
  }

  async getBillingByClient(dto: ClientBillingDto) {
    const range = this.resolveDateRange(dto);

    const client = await this.prisma.user.findUnique({
      where: { id: dto.clientId },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
      },
    });

    if (!client || client.role !== 'CLIENT') {
      throw new NotFoundException('Cliente no encontrado');
    }

    const contracts = await this.prisma.contract.findMany({
      where: {
        userId: dto.clientId,
        OR: [
          {
            lastPaymentDate: {
              gte: range.from,
              lte: range.to,
            },
          },
          {
            startDate: {
              gte: range.from,
              lte: range.to,
            },
          },
        ],
      },
      select: {
        id: true,
        planName: true,
        monthlyFee: true,
        lastPaymentDate: true,
        nextPaymentDate: true,
        status: true,
      },
      orderBy: { lastPaymentDate: 'asc' },
    });

    const payments = await this.prisma.payment.findMany({
      where: {
        userId: dto.clientId,
        createdAt: {
          gte: range.from,
          lte: range.to,
        },
      },
      select: {
        id: true,
        amount: true,
        status: true,
        method: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const movimientos = [
      ...contracts.map((contract) => ({
        tipo: 'MENSUALIDAD',
        referencia: contract.id,
        fecha: contract.lastPaymentDate ?? contract.nextPaymentDate,
        estado: contract.status,
        descripcion: contract.planName,
        monto: contract.monthlyFee,
      })),
      ...payments.map((payment) => ({
        tipo: 'PAGO',
        referencia: payment.id,
        fecha: payment.createdAt,
        estado: payment.status,
        descripcion: `Pago ${payment.method}`,
        monto: payment.amount,
      })),
    ].sort((a, b) => new Date(a.fecha ?? 0).getTime() - new Date(b.fecha ?? 0).getTime());

    const totalAcumulado = movimientos.reduce((acc, row) => acc + row.monto, 0);

    return {
      cliente: client,
      rango: {
        inicio: range.from,
        fin: range.to,
      },
      totalAcumulado,
      movimientos,
    };
  }

  async getMonthlyPaymentStatus(dto: MonthlyStatusDto) {
    const statusFilter = dto.status ?? 'todos';

    const contracts = await this.prisma.contract.findMany({
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            contactPhone: true,
            documentType: true,
            documentNumber: true,
          },
        },
        parking: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { endDate: 'asc' },
    });

    const mapped = contracts.map((contract) => {
      const state = this.mapMonthlyState(contract.status, contract.endDate);
      return {
        contractId: contract.id,
        clienteId: contract.user.id,
        cliente: contract.user.fullName,
        correo: contract.user.email,
        telefono: contract.user.contactPhone,
        documento: contract.user.documentNumber
          ? `${contract.user.documentType || 'Doc'}: ${contract.user.documentNumber}`
          : 'Sin registro',
        parqueadero: contract.parking.name,
        plan: contract.planName,
        mensualidad: contract.monthlyFee,
        fechaVencimiento: contract.endDate,
        fechaUltimoPago: contract.lastPaymentDate,
        estadoSistema: contract.status,
        estadoPago: state,
      };
    });

    const filtered = mapped.filter((row) => {
      if (statusFilter === 'todos') return true;
      if (statusFilter === 'al_dia') return row.estadoPago === 'AL_DIA';
      return row.estadoPago === 'ATRASADO';
    });

    return {
      filtro: statusFilter,
      total: filtered.length,
      registros: filtered,
    };
  }

  async getAttendanceReport(dto: AttendanceReportDto) {
    const range = this.resolveDateRange(dto);

    let userFilter: any = undefined;
    if (dto.userId) {
      userFilter = { id: dto.userId };
    } else if (dto.documentNumber) {
      userFilter = { documentNumber: { contains: dto.documentNumber, mode: 'insensitive' } };
    }

    const records = await this.prisma.attendance.findMany({
      where: {
        ...(userFilter ? { user: userFilter } : {}),
        checkIn: {
          gte: range.from,
          lte: range.to,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            documentType: true,
            documentNumber: true,
          },
        },
      },
      orderBy: { checkIn: 'asc' },
    });

    const detalles = records.map((record) => {
      const end = record.checkOut ?? new Date();
      const minutes = Math.max(0, Math.round((end.getTime() - record.checkIn.getTime()) / 60000));

      return {
        attendanceId: record.id,
        userId: record.user.id,
        nombre: record.user.fullName,
        correo: record.user.email,
        rol: record.user.role,
        documento: record.user.documentNumber
          ? `${record.user.documentType || 'Doc'}: ${record.user.documentNumber}`
          : 'Sin registro',
        ingreso: record.checkIn,
        salida: record.checkOut,
        horasTrabajadas: Number((minutes / 60).toFixed(2)),
      };
    });

    const totalHoras = detalles.reduce((acc, row) => acc + row.horasTrabajadas, 0);

    return {
      rango: {
        inicio: range.from,
        fin: range.to,
      },
      totalRegistros: detalles.length,
      totalHoras: Number(totalHoras.toFixed(2)),
      registros: detalles,
    };
  }

  async getIncomeByVehicleType(dto: DateRangeDto) {
    const range = this.resolveDateRange(dto);

    const exits = await this.prisma.exit.findMany({
      where: {
        exitTime: {
          gte: range.from,
          lte: range.to,
        },
      },
      select: {
        id: true,
        totalAmount: true,
        exitTime: true,
        ticket: {
          select: {
            vehicle: {
              select: {
                type: true,
              },
            },
          },
        },
      },
      orderBy: { exitTime: 'asc' },
    });

    const grouped = new Map<string, { total: number; cantidad: number }>();

    exits.forEach((item) => {
      const tipo = item.ticket.vehicle.type;
      const current = grouped.get(tipo) ?? { total: 0, cantidad: 0 };
      current.total += item.totalAmount;
      current.cantidad += 1;
      grouped.set(tipo, current);
    });

    const detalle = Array.from(grouped.entries()).map(([tipoVehiculo, data]) => ({
      tipoVehiculo,
      totalIngresos: Number(data.total.toFixed(2)),
      cantidadServicios: data.cantidad,
    }));

    const totalIngresos = detalle.reduce((acc, row) => acc + row.totalIngresos, 0);

    return {
      rango: {
        inicio: range.from,
        fin: range.to,
      },
      totalIngresos: Number(totalIngresos.toFixed(2)),
      desglose: detalle,
    };
  }

  async getPeakHoursAndDays(dto: DateRangeDto) {
    const range = this.resolveDateRange(dto, 30);

    const tickets = await this.prisma.ticket.findMany({
      where: {
        entryTime: {
          gte: range.from,
          lte: range.to,
        },
      },
      select: {
        entryTime: true,
      },
      orderBy: { entryTime: 'asc' },
    });

    const hourly = Array.from({ length: 24 }, (_, hour) => ({
      hora: `${String(hour).padStart(2, '0')}:00`,
      ingresos: 0,
    }));

    const weekDays = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const daily = weekDays.map((dia) => ({ dia, ingresos: 0 }));

    tickets.forEach((ticket) => {
      const date = new Date(ticket.entryTime);
      hourly[date.getHours()].ingresos += 1;
      daily[date.getDay()].ingresos += 1;
    });

    const topHour = [...hourly].sort((a, b) => b.ingresos - a.ingresos)[0] ?? null;
    const topDay = [...daily].sort((a, b) => b.ingresos - a.ingresos)[0] ?? null;

    return {
      rango: {
        inicio: range.from,
        fin: range.to,
      },
      totalIngresosVehiculares: tickets.length,
      porHora: hourly,
      porDiaSemana: daily,
      horaPico: topHour,
      diaPico: topDay,
    };
  }

  private resolveDateRange(
    dto: { from?: string; to?: string },
    fallbackDays = 7,
  ): Range {
    const now = new Date();
    const to = dto.to ? this.parseDateInput(dto.to, true) : now;
    const from = dto.from
      ? this.parseDateInput(dto.from, false)
      : new Date(to.getTime() - fallbackDays * 24 * 60 * 60 * 1000);

    if (from.getTime() > to.getTime()) {
      return { from: to, to: from };
    }

    return {
      from,
      to,
    };
  }

  private parseDateInput(value: string, endOfDay: boolean): Date {
    const onlyDate = /^\d{4}-\d{2}-\d{2}$/.test(value);
    if (onlyDate) {
      const [year, month, day] = value.split('-').map(Number);
      if (endOfDay) {
        return new Date(year, month - 1, day, 23, 59, 59, 999);
      }
      return new Date(year, month - 1, day, 0, 0, 0, 0);
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return new Date();
    }

    return parsed;
  }

  private resolvePeriodRange(period: 'day' | 'week' | 'month', date: Date): Range {
    if (period === 'day') {
      const from = new Date(date);
      from.setHours(0, 0, 0, 0);
      const to = new Date(date);
      to.setHours(23, 59, 59, 999);
      return { from, to };
    }

    if (period === 'week') {
      const from = new Date(date);
      const day = from.getDay();
      const diffToMonday = (day + 6) % 7;
      from.setDate(from.getDate() - diffToMonday);
      from.setHours(0, 0, 0, 0);

      const to = new Date(from);
      to.setDate(from.getDate() + 6);
      to.setHours(23, 59, 59, 999);
      return { from, to };
    }

    const from = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
    const to = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    return { from, to };
  }

  private resolveBucket(period: 'day' | 'week' | 'month', date: Date): string {
    if (period === 'day') {
      return `${String(date.getHours()).padStart(2, '0')}:00`;
    }

    if (period === 'week') {
      const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
      return days[date.getDay()];
    }

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate(),
    ).padStart(2, '0')}`;
  }

  private resolveCurrentShiftWindow(now: Date) {
    const hour = now.getHours();
    const baseDate = new Date(now);
    baseDate.setMinutes(0, 0, 0);

    // ES: Turno maniana 06:00-13:59, tarde 14:00-21:59, noche 22:00-05:59.
    if (hour >= 6 && hour < 14) {
      const from = new Date(baseDate);
      from.setHours(6, 0, 0, 0);
      const to = new Date(baseDate);
      to.setHours(13, 59, 59, 999);
      return { shiftName: 'maniana', from, to };
    }

    if (hour >= 14 && hour < 22) {
      const from = new Date(baseDate);
      from.setHours(14, 0, 0, 0);
      const to = new Date(baseDate);
      to.setHours(21, 59, 59, 999);
      return { shiftName: 'tarde', from, to };
    }

    const from = new Date(baseDate);
    const to = new Date(baseDate);

    if (hour >= 22) {
      from.setHours(22, 0, 0, 0);
      to.setDate(to.getDate() + 1);
      to.setHours(5, 59, 59, 999);
    } else {
      from.setDate(from.getDate() - 1);
      from.setHours(22, 0, 0, 0);
      to.setHours(5, 59, 59, 999);
    }

    return { shiftName: 'noche', from, to };
  }

  private mapMonthlyState(status: string, endDate: Date) {
    if (status === 'EXPIRED' || status === 'PAYMENT_PENDING') {
      return 'ATRASADO';
    }

    if (endDate.getTime() < Date.now()) {
      return 'ATRASADO';
    }

    return 'AL_DIA';
  }
}

import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuditOperation, AuditResult, Role } from '@prisma/client';
import { Response } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { RequireScreenPermission } from '../common/decorators/screen-permission.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuditService } from '../audit/audit.service';
import { PermissionsService } from '../permissions/permissions.service';
import { AttendanceReportDto } from './dto/attendance-report.dto';
import { ClientBillingDto } from './dto/client-billing.dto';
import { DateRangeDto } from './dto/date-range.dto';
import { ExportReportDto } from './dto/export-report.dto';
import { MonthlyStatusDto } from './dto/monthly-status.dto';
import { VehiclesPeriodDto } from './dto/vehicles-period.dto';
import { ReportsExportService } from './reports-export.service';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN_PARKING, Role.OPERATOR, Role.AUDITOR)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly reportsExportService: ReportsExportService,
    private readonly auditService: AuditService,
    private readonly permissionsService: PermissionsService,
  ) {}

  @Get('workers/present')
  @RequireScreenPermission('ver-reporte-trabajadores')
  async getWorkersOnShift(@Request() req: any) {
    const result = await this.reportsService.getWorkersOnCurrentShift();
    this.logView(req, 'reports_workers_present', result);
    return result;
  }

  @Get('clients')
  @RequireScreenPermission('ver-reporte-facturacion')
  async listClients(@Request() req: any) {
    const result = await this.reportsService.listClientOptions();
    this.logView(req, 'reports_clients', { total: result.length });
    return result;
  }

  @Get('vehicles/count')
  @RequireScreenPermission('ver-reporte-vehiculos')
  async getVehiclesCount(@Query() dto: VehiclesPeriodDto, @Request() req: any) {
    const result = await this.reportsService.getVehiclesByPeriod(dto);
    this.logView(req, 'reports_vehicles_count', { filtros: dto, total: result.totalVehiculos });
    return result;
  }

  @Get('billing/total')
  @RequireScreenPermission('ver-reporte-facturacion')
  async getBillingTotal(@Query() dto: DateRangeDto, @Request() req: any) {
    const result = await this.reportsService.getBillingTotal(dto);
    this.logView(req, 'reports_billing_total', {
      filtros: dto,
      totalFacturado: result.totalFacturado,
    });
    return result;
  }

  @Get('billing/client')
  @RequireScreenPermission('ver-reporte-facturacion')
  async getBillingByClient(@Query() dto: ClientBillingDto, @Request() req: any) {
    const result = await this.reportsService.getBillingByClient(dto);
    this.logView(req, 'reports_billing_client', {
      filtros: dto,
      totalAcumulado: result.totalAcumulado,
    });
    return result;
  }

  @Get('monthly-payments/status')
  @RequireScreenPermission('ver-reporte-mensualidades')
  async getMonthlyStatus(@Query() dto: MonthlyStatusDto, @Request() req: any) {
    const result = await this.reportsService.getMonthlyPaymentStatus(dto);
    this.logView(req, 'reports_monthly_status', { filtros: dto, total: result.total });
    return result;
  }

  @Get('attendance')
  @RequireScreenPermission('ver-reporte-asistencia')
  async getAttendance(@Query() dto: AttendanceReportDto, @Request() req: any) {
    const result = await this.reportsService.getAttendanceReport(dto);
    this.logView(req, 'reports_attendance', { filtros: dto, total: result.totalRegistros });
    return result;
  }

  @Get('income/by-vehicle')
  @RequireScreenPermission('ver-reporte-ingresos-grafico')
  async getIncomeByVehicle(@Query() dto: DateRangeDto, @Request() req: any) {
    const result = await this.reportsService.getIncomeByVehicleType(dto);
    this.logView(req, 'reports_income_by_vehicle', {
      filtros: dto,
      totalIngresos: result.totalIngresos,
    });
    return result;
  }

  @Get('peak')
  @RequireScreenPermission('ver-reporte-horas-pico')
  async getPeakIndicators(@Query() dto: DateRangeDto, @Request() req: any) {
    const result = await this.reportsService.getPeakHoursAndDays(dto);
    this.logView(req, 'reports_peak', {
      filtros: dto,
      total: result.totalIngresosVehiculares,
    });
    return result;
  }

  @Get('export')
  @RequireScreenPermission(['acceso-reportes'])
  async exportReport(
    @Query() dto: ExportReportDto,
    @Request() req: { user?: { userId?: string; role?: Role; email?: string } },
    @Res() res: Response,
  ) {
    const requiredScreen = this.resolveScreenForReportType(dto.reportType);
    const userId = req.user?.userId;
    const role = req.user?.role;

    if (!userId || !role) {
      throw new ForbiddenException('Token invalido para validar permisos de exportacion.');
    }

    const canExport = await this.permissionsService.canUserViewScreen(
      userId,
      role,
      requiredScreen,
    );

    if (!canExport) {
      throw new ForbiddenException('No tienes permisos para exportar este tipo de reporte.');
    }

    const data = await this.resolveReportForExport(dto);
    const rows = this.normalizeRows(data);
    const title = `Reporte ${dto.reportType}`;
    const file = await this.reportsExportService.buildFile(dto.format, title, rows);
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const fileName = `${dto.reportType}-${stamp}.${file.extension}`;

    this.auditService.log({
      operation: AuditOperation.EXPORT,
      entity: `reports_${dto.reportType}`,
      result: AuditResult.SUCCESS,
      metadata: {
        format: dto.format,
        filters: this.auditService.sanitizePayload(dto),
        rows: rows.length,
      },
      context: this.auditService.buildContextFromRequest(req),
    });

    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(file.body);
  }

  private resolveScreenForReportType(
    reportType: ExportReportDto['reportType'],
  ): string {
    if (reportType === 'trabajadores') return 'ver-reporte-trabajadores';
    if (reportType === 'vehiculos') return 'ver-reporte-vehiculos';
    if (reportType === 'facturacion-total' || reportType === 'facturacion-cliente') {
      return 'ver-reporte-facturacion';
    }
    if (reportType === 'mensualidades') return 'ver-reporte-mensualidades';
    if (reportType === 'asistencia') return 'ver-reporte-asistencia';
    if (reportType === 'ingresos-por-tipo') return 'ver-reporte-ingresos-grafico';
    return 'ver-reporte-horas-pico';
  }

  private async resolveReportForExport(dto: ExportReportDto) {
    switch (dto.reportType) {
      case 'trabajadores':
        return this.reportsService.getWorkersOnCurrentShift();
      case 'vehiculos':
        return this.reportsService.getVehiclesByPeriod({
          period: dto.period ?? 'day',
          date: dto.date,
          limit: dto.limit,
        });
      case 'facturacion-total':
        return this.reportsService.getBillingTotal(dto);
      case 'facturacion-cliente':
        if (!dto.clientId) {
          throw new BadRequestException('Debe enviar clientId para exportar facturacion por cliente.');
        }
        return this.reportsService.getBillingByClient({
          clientId: dto.clientId,
          from: dto.from,
          to: dto.to,
        });
      case 'mensualidades':
        return this.reportsService.getMonthlyPaymentStatus({
          status: dto.status,
        });
      case 'asistencia':
        return this.reportsService.getAttendanceReport({
          userId: dto.userId,
          from: dto.from,
          to: dto.to,
        });
      case 'ingresos-por-tipo':
        return this.reportsService.getIncomeByVehicleType(dto);
      default:
        return this.reportsService.getPeakHoursAndDays(dto);
    }
  }

  private normalizeRows(data: Record<string, any>) {
    if (Array.isArray(data.registros)) {
      return data.registros;
    }
    if (Array.isArray(data.detalle)) {
      return data.detalle;
    }
    if (Array.isArray(data.desglose)) {
      return data.desglose;
    }
    if (Array.isArray(data.porPeriodo)) {
      return data.porPeriodo;
    }
    if (Array.isArray(data.movimientos)) {
      return data.movimientos;
    }
    if (Array.isArray(data.porHora)) {
      return data.porHora;
    }
    return [data];
  }

  private logView(req: any, entity: string, metadata: Record<string, unknown>) {
    this.auditService.log({
      operation: AuditOperation.VIEW,
      entity,
      result: AuditResult.SUCCESS,
      metadata: this.auditService.sanitizePayload(metadata),
      context: this.auditService.buildContextFromRequest(req),
    });
  }
}

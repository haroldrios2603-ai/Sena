import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  Patch,
  Request,
} from '@nestjs/common';
import { ParkingService } from './parking.service';
import { AuthGuard } from '@nestjs/passport';
import { EntryDto } from './dto/entry.dto';
import { ExitDto } from './dto/exit.dto';
import { CreateParkingDto } from './dto/create-parking.dto';
import { UpdateParkingDto } from './dto/update-parking.dto';
import { UpdateParkingStatusDto } from './dto/update-parking-status.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditOperation, AuditResult, Role } from '@prisma/client';
import { RequireScreenPermission } from '../common/decorators/screen-permission.decorator';
import { AuditService } from '../audit/audit.service';

/**
 * Controlador encargado de gestionar las operaciones de parqueadero.
 * Todas las rutas están protegidas por JWT.
 */
@Controller('parking')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ParkingController {
  constructor(
    private readonly parkingService: ParkingService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Crea una nueva sede operativa. Solo administradores pueden gestionarla.
   */
  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN_PARKING)
  @RequireScreenPermission('settings-config')
  async createParking(@Body() data: CreateParkingDto, @Request() req: any) {
    const created = await this.parkingService.createParking(data);
    this.auditService.log({
      operation: AuditOperation.CREATE,
      entity: 'parking',
      recordId: created.id,
      newValues: created,
      result: AuditResult.SUCCESS,
      context: this.auditService.buildContextFromRequest(req),
    });
    return created;
  }

  /**
   * Actualiza los datos generales de una sede.
   */
  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN_PARKING)
  @RequireScreenPermission('settings-config')
  async updateParking(
    @Param('id') id: string,
    @Body() data: UpdateParkingDto,
    @Request() req: any,
  ) {
    const updated = await this.parkingService.updateParking(id, data);
    this.auditService.log({
      operation: AuditOperation.UPDATE,
      entity: 'parking',
      recordId: id,
      newValues: updated,
      result: AuditResult.SUCCESS,
      context: this.auditService.buildContextFromRequest(req),
    });
    return updated;
  }

  /**
   * Permite activar o suspender temporalmente un parqueadero.
   */
  @Patch(':id/estado')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN_PARKING)
  @RequireScreenPermission('settings-config')
  async updateParkingStatus(
    @Param('id') id: string,
    @Body() data: UpdateParkingStatusDto,
    @Request() req: any,
  ) {
    const updated = await this.parkingService.updateParkingStatus(id, data.activo);
    this.auditService.log({
      operation: AuditOperation.UPDATE,
      entity: 'parking_status',
      recordId: id,
      newValues: updated,
      result: AuditResult.SUCCESS,
      context: this.auditService.buildContextFromRequest(req),
    });
    return updated;
  }

  /**
   * Registra el ingreso de un vehículo al sistema.
   * @param data DTO con placa, tipo de vehículo e ID del parqueadero.
   */
  @Post('entry')
  @RequireScreenPermission('operations-dashboard')
  async registerEntry(@Body() data: EntryDto, @Request() req: any) {
    const result = await this.parkingService.registerEntry(
      data.placa,
      data.vehicleType,
      data.parkingId,
    );
    this.auditService.log({
      operation: AuditOperation.CREATE,
      entity: 'parking_entry',
      recordId: result?.id,
      newValues: { placa: data.placa, parkingId: data.parkingId },
      result: AuditResult.SUCCESS,
      context: this.auditService.buildContextFromRequest(req),
    });
    return result;
  }

  /**
   * Registra la salida de un vehículo y calcula el cobro.
   * @param data DTO con la placa del vehículo.
   */
  @Post('exit')
  @RequireScreenPermission('operations-dashboard')
  async registerExit(@Body() data: ExitDto, @Request() req: any) {
    const result = await this.parkingService.registerExit(data.placa);
    this.auditService.log({
      operation: AuditOperation.UPDATE,
      entity: 'parking_exit',
      newValues: { placa: data.placa, exitId: result?.exit?.id },
      result: AuditResult.SUCCESS,
      context: this.auditService.buildContextFromRequest(req),
    });
    return result;
  }

  /**
   * Cierra la jornada diaria y reinicia el listado de vehículos con salida.
   * Los vehículos activos sin salida permanecen visibles en operación.
   */
  @Post('jornada/cerrar')
  @RequireScreenPermission('operations-dashboard')
  async cerrarJornada(@Request() req: any) {
    const result = await this.parkingService.cerrarJornadaOperativa(
      req?.user?.userId,
    );

    this.auditService.log({
      operation: AuditOperation.UPDATE,
      entity: 'parking_daily_closure',
      result: AuditResult.SUCCESS,
      metadata: {
        fechaCierre: result.fechaCierre,
        activosPendientes: result.activosPendientes,
        salidasArchivadas: result.salidasArchivadas,
      },
      context: this.auditService.buildContextFromRequest(req),
    });

    return result;
  }

  /**
   * Obtiene todos los parqueaderos registrados en el sistema.
   */
  @Get()
  @RequireScreenPermission([
    'operations-dashboard',
    'clients-management',
    'settings-config',
  ])
  async getAllParkings(@Request() req: any) {
    const items = await this.parkingService.findAll();
    this.auditService.log({
      operation: AuditOperation.VIEW,
      entity: 'parking',
      result: AuditResult.SUCCESS,
      metadata: { count: items.length },
      context: this.auditService.buildContextFromRequest(req),
    });
    return items;
  }

  /**
   * Obtiene los detalles de un parqueadero por su ID.
   * @param id Identificador único del parqueadero.
   */
  /**
   * Retorna el resumen de vehículos con ingreso activo y egresos registrados.
   */
  @Get('tickets/resumen')
  @RequireScreenPermission('operations-dashboard')
  async obtenerResumenTickets(@Request() req: any) {
    const result = await this.parkingService.obtenerResumenTickets();
    this.auditService.log({
      operation: AuditOperation.VIEW,
      entity: 'parking_tickets_summary',
      result: AuditResult.SUCCESS,
      metadata: {
        activos: result?.activos?.length ?? 0,
        cerrados: result?.cerrados?.length ?? 0,
      },
      context: this.auditService.buildContextFromRequest(req),
    });
    return result;
  }

  @Get(':id')
  @RequireScreenPermission([
    'operations-dashboard',
    'clients-management',
    'settings-config',
  ])
  async getParkingById(@Param('id') id: string) {
    return this.parkingService.findOne(id);
  }
}

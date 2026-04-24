import { Body, Controller, Get, Put, Request, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import {
  UpdateMetodosPagoDto,
  UpdateGeneralConfigDto,
  UpdateTarifasDto,
} from './dto/update-config.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditOperation, AuditResult, Role } from '@prisma/client';
import { RequireScreenPermission } from '../common/decorators/screen-permission.decorator';
import { AuditService } from '../audit/audit.service';

/**
 * Expone los endpoints administrativos para configurar el sistema.
 */
@Controller('settings')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN_PARKING, Role.OPERATOR)
@RequireScreenPermission('settings-config')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Devuelve la configuración completa junto con sedes y tarifas activas.
   */
  @Get()
  async obtenerConfiguracion(@Request() req: any) {
    const result = await this.settingsService.obtenerConfiguracionCompleta();
    this.auditService.log({
      operation: AuditOperation.VIEW,
      entity: 'settings',
      result: AuditResult.SUCCESS,
      context: this.auditService.buildContextFromRequest(req),
    });
    return result;
  }

  /**
   * Actualiza parámetros generales como capacidades, horarios o políticas.
   */
  @Put('general')
  async actualizarGeneral(@Body() dto: UpdateGeneralConfigDto, @Request() req: any) {
    const before = await this.settingsService.obtenerConfiguracionCompleta();
    const result = await this.settingsService.actualizarConfiguracion(dto);
    this.auditService.log({
      operation: AuditOperation.UPDATE,
      entity: 'settings_general',
      previousValues: before.configuracion,
      newValues: result,
      result: AuditResult.SUCCESS,
      context: this.auditService.buildContextFromRequest(req),
    });
    return result;
  }

  /**
   * Sincroniza las tarifas por tipo de vehículo.
   */
  @Put('tarifas')
  async actualizarTarifas(@Body() dto: UpdateTarifasDto, @Request() req: any) {
    const before = await this.settingsService.obtenerConfiguracionCompleta();
    const result = await this.settingsService.actualizarTarifas(dto);
    this.auditService.log({
      operation: AuditOperation.UPDATE,
      entity: 'settings_tariffs',
      previousValues: before.tarifas,
      newValues: result,
      result: AuditResult.SUCCESS,
      context: this.auditService.buildContextFromRequest(req),
    });
    return result;
  }

  /**
   * Actualiza únicamente la configuración de métodos de pago.
   */
  @Put('metodos-pago')
  async actualizarMetodosPago(
    @Body() dto: UpdateMetodosPagoDto,
    @Request() req: any,
  ) {
    const before = await this.settingsService.obtenerConfiguracionCompleta();
    const result = await this.settingsService.actualizarMetodosPago(dto);

    this.auditService.log({
      operation: AuditOperation.UPDATE,
      entity: 'settings_payment_methods',
      previousValues: before.configuracion.metodosPago,
      newValues: result.metodosPago,
      result: AuditResult.SUCCESS,
      context: this.auditService.buildContextFromRequest(req),
    });

    return result;
  }
}

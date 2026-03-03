import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import {
  UpdateGeneralConfigDto,
  UpdateTarifasDto,
} from './dto/update-config.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

/**
 * Expone los endpoints administrativos para configurar el sistema.
 */
@Controller('settings')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * Devuelve la configuración completa junto con sedes y tarifas activas.
   */
  @Get()
  obtenerConfiguracion() {
    return this.settingsService.obtenerConfiguracionCompleta();
  }

  /**
   * Actualiza parámetros generales como capacidades, horarios o políticas.
   */
  @Put('general')
  actualizarGeneral(@Body() dto: UpdateGeneralConfigDto) {
    return this.settingsService.actualizarConfiguracion(dto);
  }

  /**
   * Sincroniza las tarifas por tipo de vehículo.
   */
  @Put('tarifas')
  actualizarTarifas(@Body() dto: UpdateTarifasDto) {
    return this.settingsService.actualizarTarifas(dto);
  }
}

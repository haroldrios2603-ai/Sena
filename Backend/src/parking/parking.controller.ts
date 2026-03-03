import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  Patch,
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
import { Role } from '@prisma/client';

/**
 * Controlador encargado de gestionar las operaciones de parqueadero.
 * Todas las rutas están protegidas por JWT.
 */
@Controller('parking')
@UseGuards(AuthGuard('jwt'))
export class ParkingController {
  constructor(private readonly parkingService: ParkingService) {}

  /**
   * Crea una nueva sede operativa. Solo administradores pueden gestionarla.
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN_PARKING)
  async createParking(@Body() data: CreateParkingDto) {
    return this.parkingService.createParking(data);
  }

  /**
   * Actualiza los datos generales de una sede.
   */
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN_PARKING)
  async updateParking(@Param('id') id: string, @Body() data: UpdateParkingDto) {
    return this.parkingService.updateParking(id, data);
  }

  /**
   * Permite activar o suspender temporalmente un parqueadero.
   */
  @Patch(':id/estado')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN_PARKING)
  async updateParkingStatus(
    @Param('id') id: string,
    @Body() data: UpdateParkingStatusDto,
  ) {
    return this.parkingService.updateParkingStatus(id, data.activo);
  }

  /**
   * Registra el ingreso de un vehículo al sistema.
   * @param data DTO con placa, tipo de vehículo e ID del parqueadero.
   */
  @Post('entry')
  async registerEntry(@Body() data: EntryDto) {
    return this.parkingService.registerEntry(
      data.placa,
      data.vehicleType,
      data.parkingId,
    );
  }

  /**
   * Registra la salida de un vehículo y calcula el cobro.
   * @param data DTO con la placa del vehículo.
   */
  @Post('exit')
  async registerExit(@Body() data: ExitDto) {
    return this.parkingService.registerExit(data.placa);
  }

  /**
   * Obtiene todos los parqueaderos registrados en el sistema.
   */
  @Get()
  async getAllParkings() {
    return this.parkingService.findAll();
  }

  /**
   * Obtiene los detalles de un parqueadero por su ID.
   * @param id Identificador único del parqueadero.
   */
  /**
   * Retorna el resumen de vehículos con ingreso activo y egresos registrados.
   */
  @Get('tickets/resumen')
  async obtenerResumenTickets() {
    return this.parkingService.obtenerResumenTickets();
  }

  @Get(':id')
  async getParkingById(@Param('id') id: string) {
    return this.parkingService.findOne(id);
  }
}

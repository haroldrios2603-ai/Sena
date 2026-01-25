import { Controller, Post, Body, UseGuards, Get, Param } from '@nestjs/common';
import { ParkingService } from './parking.service';
import { AuthGuard } from '@nestjs/passport';

/**
 * Controlador encargado de gestionar las operaciones de parqueadero.
 * Todas las rutas están protegidas por JWT.
 */
@Controller('parking')
@UseGuards(AuthGuard('jwt'))
export class ParkingController {
    constructor(private readonly parkingService: ParkingService) { }

    /**
     * Registra el ingreso de un vehículo al sistema.
     * @param data Objeto con placa, tipo de vehículo e ID del parqueadero.
     */
    @Post('entry')
    async registerEntry(@Body() data: { placa: string; vehicleType: string; parkingId: string }) {
        return this.parkingService.registerEntry(data.placa, data.vehicleType, data.parkingId);
    }

    /**
     * Registra la salida de un vehículo y calcula el cobro.
     * @param data Objeto con la placa del vehículo.
     */
    @Post('exit')
    async registerExit(@Body() data: { placa: string }) {
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
    @Get(':id')
    async getParkingById(@Param('id') id: string) {
        return this.parkingService.findOne(id);
    }
}

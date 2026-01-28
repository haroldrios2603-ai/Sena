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
     * Registra un nuevo parqueadero. (RF 1.1)
     */
    @Post()
    async createParking(@Body() data: { name: string; address: string; capacity: number; baseRate: number }) {
        return this.parkingService.createParking(data);
    }

    /**
     * Configura o actualiza la tarifa para un tipo de vehículo. (RF 1.2)
     */
    @Post(':id/tariffs')
    async setTariff(
        @Param('id') id: string,
        @Body() data: { vehicleType: string; baseRate: number; hourlyRate: number }
    ) {
        return this.parkingService.setTariff(id, data.vehicleType, data.baseRate, data.hourlyRate);
    }

    /**
     * Obtiene el detalle de un parqueadero específico.
     */
    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.parkingService.findOne(id);
    }

    /**
     * Obtiene la lista de todos los parqueaderos.
     */
    @Get()
    async findAll() {
        return this.parkingService.findAll();
    }
}

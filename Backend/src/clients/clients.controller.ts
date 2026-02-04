import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { RenewContractDto } from './dto/renew-contract.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

/**
 * Controlador para gestión de clientes con mensualidades.
 */
@Controller('clients')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN_PARKING)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  /**
   * Registra un cliente y su contrato mensual.
   */
  @Post()
  create(@Body() createClientDto: CreateClientDto) {
    return this.clientsService.createClientWithContract(createClientDto);
  }

  /**
   * Lista contratos activos y su estado actual.
   */
  @Get('contracts')
  findContracts() {
    return this.clientsService.listContracts();
  }

  /**
   * Devuelve alertas pendientes por vencimiento o pago.
   */
  @Get('contracts/alerts')
  findAlerts() {
    return this.clientsService.listAlerts();
  }

  /**
   * Registra la renovación de un contrato.
   */
  @Patch('contracts/:id/renew')
  renewContract(
    @Param('id') id: string,
    @Body() renewContractDto: RenewContractDto,
  ) {
    return this.clientsService.renewContract(id, renewContractDto);
  }
}

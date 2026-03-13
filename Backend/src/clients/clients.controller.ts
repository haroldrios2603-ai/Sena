import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { RenewContractDto } from './dto/renew-contract.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditOperation, AuditResult, Role } from '@prisma/client';
import { RequireScreenPermission } from '../common/decorators/screen-permission.decorator';
import { AuditService } from '../audit/audit.service';

/**
 * Controlador para gestión de clientes con mensualidades.
 */
@Controller('clients')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN_PARKING)
@RequireScreenPermission('clients-management')
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Registra un cliente y su contrato mensual.
   */
  @Post()
  async create(@Body() createClientDto: CreateClientDto, @Request() req: any) {
    const created = await this.clientsService.createClientWithContract(createClientDto);
    this.auditService.log({
      operation: AuditOperation.CREATE,
      entity: 'clients_contracts',
      recordId: (created as any)?.id ?? (created as any)?.user?.id,
      newValues: created,
      result: AuditResult.SUCCESS,
      context: this.auditService.buildContextFromRequest(req),
    });
    return created;
  }

  /**
   * Lista contratos activos y su estado actual.
   */
  @Get('contracts')
  async findContracts(@Request() req: any) {
    const items = await this.clientsService.listContracts();
    this.auditService.log({
      operation: AuditOperation.VIEW,
      entity: 'clients_contracts',
      result: AuditResult.SUCCESS,
      metadata: { count: items.length },
      context: this.auditService.buildContextFromRequest(req),
    });
    return items;
  }

  /**
   * Devuelve alertas pendientes por vencimiento o pago.
   */
  @Get('contracts/alerts')
  async findAlerts(@Request() req: any) {
    const items = await this.clientsService.listAlerts();
    this.auditService.log({
      operation: AuditOperation.VIEW,
      entity: 'clients_alerts',
      result: AuditResult.SUCCESS,
      metadata: { count: items.length },
      context: this.auditService.buildContextFromRequest(req),
    });
    return items;
  }

  /**
   * Registra la renovación de un contrato.
   */
  @Patch('contracts/:id/renew')
  renewContract(
    @Param('id') id: string,
    @Body() renewContractDto: RenewContractDto,
    @Request() req: any,
  ) {
    return this.clientsService.renewContract(id, renewContractDto).then((result) => {
      this.auditService.log({
        operation: AuditOperation.UPDATE,
        entity: 'clients_contracts',
        recordId: id,
        newValues: result,
        result: AuditResult.SUCCESS,
        context: this.auditService.buildContextFromRequest(req),
      });
      return result;
    });
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { RenewContractDto } from './dto/renew-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditOperation, AuditResult, Role } from '@prisma/client';
import { RequireScreenPermission } from '../common/decorators/screen-permission.decorator';
import { AuditService } from '../audit/audit.service';
import { ListContractsDto } from './dto/list-contracts.dto';

/**
 * Controlador para gestión de clientes con mensualidades.
 */
@Controller('clients')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN_PARKING, Role.OPERATOR)
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
  async findContracts(@Query() filters: ListContractsDto, @Request() req: any) {
    const items = await this.clientsService.listContracts(filters);
    this.auditService.log({
      operation: AuditOperation.VIEW,
      entity: 'clients_contracts',
      result: AuditResult.SUCCESS,
      metadata: {
        count: items.length,
        filters: this.auditService.sanitizePayload(filters),
      },
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

  /**
   * Edita datos de cliente y contrato mensual existente.
   */
  @Patch('contracts/:id')
  async updateContract(
    @Param('id') id: string,
    @Body() updateContractDto: UpdateContractDto,
    @Request() req: any,
  ) {
    const previous = await this.clientsService.findContractById(id);
    const updated = await this.clientsService.updateContract(id, updateContractDto);
    this.auditService.log({
      operation: AuditOperation.UPDATE,
      entity: 'clients_contracts',
      recordId: id,
      previousValues: previous,
      newValues: updated,
      result: AuditResult.SUCCESS,
      context: this.auditService.buildContextFromRequest(req),
    });
    return updated;
  }

  /**
   * Archiva un contrato y, si aplica, desactiva el usuario cliente asociado.
   */
  @Delete('contracts/:id')
  @RequireScreenPermission('clients-delete')
  async removeContract(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const previous = await this.clientsService.findContractById(id);
    const result = await this.clientsService.deleteContract(id);
    this.auditService.log({
      operation: AuditOperation.DELETE,
      entity: 'clients_contracts',
      recordId: id,
      previousValues: previous,
      newValues: result,
      result: AuditResult.SUCCESS,
      context: this.auditService.buildContextFromRequest(req),
    });
    return result;
  }

  /**
   * Restaura un contrato archivado y reactiva el usuario cliente cuando aplique.
   */
  @Post('contracts/:id/restore')
  @RequireScreenPermission('clients-delete')
  async restoreContract(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const previous = await this.clientsService.findContractById(id);
    const result = await this.clientsService.restoreContract(id);
    const updated = await this.clientsService.findContractById(id);
    this.auditService.log({
      operation: AuditOperation.UPDATE,
      entity: 'clients_contracts',
      recordId: id,
      previousValues: previous,
      newValues: {
        ...updated,
        restoreResult: result,
      },
      result: AuditResult.SUCCESS,
      context: this.auditService.buildContextFromRequest(req),
      metadata: { action: 'restore' },
    });
    return result;
  }
}

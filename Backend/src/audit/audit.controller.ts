import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role, AuditOperation, AuditResult } from '@prisma/client';
import type { Response } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { RequireScreenPermission } from '../common/decorators/screen-permission.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuditService } from './audit.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';
import { ExportAuditLogsDto } from './dto/export-audit-logs.dto';

@Controller('audit')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.AUDITOR)
@RequireScreenPermission('admin-audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  async listLogs(@Query() query: QueryAuditLogsDto) {
    return this.auditService.findAll(query);
  }

  @Get('logs/:id')
  async getLogById(@Param('id') id: string) {
    const item = await this.auditService.findById(id);
    if (!item) {
      throw new NotFoundException('Registro de auditoría no encontrado');
    }
    return item;
  }

  @Get('export')
  async exportLogs(
    @Query() query: ExportAuditLogsDto,
    @Request() req: { user: { userId: string; email?: string } },
    @Res() res: Response,
  ) {
    const exportResult = await this.auditService.exportLogs(query);

    this.auditService.log({
      operation: AuditOperation.EXPORT,
      entity: 'audit_logs',
      result: AuditResult.SUCCESS,
      metadata: {
        format: query.format ?? 'csv',
        limit: query.limit ?? 1000,
      },
      context: {
        userId: req.user.userId,
        userEmail: req.user.email,
      },
    });

    res.setHeader('Content-Type', exportResult.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${exportResult.fileName}"`,
    );
    return res.send(exportResult.body);
  }
}

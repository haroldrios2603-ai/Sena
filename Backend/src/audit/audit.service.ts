import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { AuditOperation, AuditResult, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { ExportAuditLogsDto } from './dto/export-audit-logs.dto';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';
import { AuditContext, AuditLogInput } from './audit.types';

@Injectable()
export class AuditService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuditService.name);
  private retentionTimer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.scheduleRetentionCleanup();
  }

  onModuleDestroy() {
    if (this.retentionTimer) {
      clearInterval(this.retentionTimer);
    }
  }

  log(input: AuditLogInput) {
    setImmediate(async () => {
      try {
        await this.prisma.auditLog.create({
          data: {
            operation: input.operation,
            entity: input.entity,
            recordId: input.recordId,
            previousValues: this.sanitizePayload(input.previousValues),
            newValues: this.sanitizePayload(input.newValues),
            result: input.result,
            errorCode: input.errorCode,
            errorMessage: input.errorMessage,
            metadata: this.sanitizePayload(input.metadata),
            userId: input.context?.userId,
            userEmail: input.context?.userEmail,
            ipAddress: input.context?.ipAddress,
            userAgent: input.context?.userAgent,
            endpoint: input.context?.endpoint,
            method: input.context?.method,
            requestParams: this.sanitizePayload(input.context?.requestParams),
            responseTimeMs: input.context?.responseTimeMs ?? undefined,
          },
        });
      } catch (error) {
        this.logger.error('Falló el registro de auditoría', error as Error);
      }
    });
  }

  async findAll(query: QueryAuditLogsDto) {
    const where = this.buildWhere(query);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const skip = (page - 1) * pageSize;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  findById(id: string) {
    return this.prisma.auditLog.findUnique({ where: { id } });
  }

  async exportLogs(query: ExportAuditLogsDto) {
    const where = this.buildWhere(query);
    const format = query.format ?? 'csv';
    const limit = query.limit ?? 1000;

    const rows = await this.prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    if (format === 'json') {
      return {
        contentType: 'application/json',
        body: JSON.stringify(rows, null, 2),
        fileName: `audit-logs-${new Date().toISOString()}.json`,
      };
    }

    const header = [
      'FechaHora',
      'UsuarioCorreo',
      'Operacion',
      'Entidad',
      'Resultado',
      'ResumenEvento',
      'CodigoError',
      'MensajeError',
      'Endpoint',
      'Metodo',
      'TiempoRespuestaMs',
      'UsuarioId',
      'IP',
      'UserAgent',
      'RegistroId',
      'Id',
      'ParametrosSolicitud',
      'ValoresPrevios',
      'ValoresNuevos',
      'Metadatos',
    ];

    const lines = rows.map((row) =>
      [
        row.timestamp.toISOString(),
        row.userEmail,
        row.operation,
        row.entity,
        row.result,
        this.buildAuditSummary(row),
        row.errorCode,
        row.errorMessage,
        row.endpoint,
        row.method,
        row.responseTimeMs,
        row.userId,
        row.ipAddress,
        row.userAgent,
        row.recordId,
        row.id,
        this.formatJsonForCsv(row.requestParams),
        this.formatJsonForCsv(row.previousValues),
        this.formatJsonForCsv(row.newValues),
        this.formatJsonForCsv(row.metadata),
      ]
        .map((field) => this.csvEscape(this.normalizeCsvValue(field)))
        .join(','),
    );

    return {
      contentType: 'text/csv',
      body: `\uFEFF${[header.join(','), ...lines].join('\r\n')}`,
      fileName: `audit-logs-${new Date().toISOString()}.csv`,
    };
  }

  buildContextFromRequest(
    req: {
      user?: { userId?: string; email?: string };
      ip?: string;
      headers?: Record<string, unknown>;
      originalUrl?: string;
      method?: string;
      params?: Record<string, unknown>;
      query?: Record<string, unknown>;
      _auditStartMs?: number;
    },
    extra?: Partial<AuditContext>,
  ): AuditContext {
    const now = Date.now();
    const userAgentRaw = req.headers?.['user-agent'];
    const userAgent =
      typeof userAgentRaw === 'string' ? userAgentRaw : undefined;

    return {
      userId: req.user?.userId,
      userEmail: req.user?.email,
      ipAddress: req.ip,
      userAgent,
      endpoint: req.originalUrl,
      method: req.method,
      requestParams: {
        params: this.sanitizePayload(req.params ?? {}),
        query: this.sanitizePayload(req.query ?? {}),
      } as Prisma.InputJsonValue,
      responseTimeMs: req._auditStartMs ? now - req._auditStartMs : undefined,
      ...extra,
    };
  }

  sanitizePayload(value: unknown): Prisma.InputJsonValue | undefined {
    if (typeof value === 'undefined') {
      return undefined;
    }

    const sensitiveKeys = [
      'password',
      'passwordhash',
      'token',
      'accesstoken',
      'authorization',
      'apikey',
      'secret',
      'newpassword',
      'code',
      'tokenhash',
      'cardnumber',
      'cvv',
    ];

    const visit = (input: unknown): unknown => {
      if (Array.isArray(input)) {
        return input.map((item) => visit(item));
      }

      if (input && typeof input === 'object') {
        const output: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(
          input as Record<string, unknown>,
        )) {
          const normalized = key.toLowerCase();
          const isSensitive = sensitiveKeys.some((s) => normalized.includes(s));
          output[key] = isSensitive ? '[REDACTED]' : visit(val);
        }
        return output;
      }

      return input;
    };

    return visit(value) as Prisma.InputJsonValue;
  }

  private buildWhere(query: QueryAuditLogsDto): Prisma.AuditLogWhereInput {
    const where: Prisma.AuditLogWhereInput = {};

    if (query.userId) where.userId = query.userId;
    if (query.userEmail)
      where.userEmail = { contains: query.userEmail, mode: 'insensitive' };
    if (query.operation) where.operation = query.operation;
    if (query.entity)
      where.entity = { contains: query.entity, mode: 'insensitive' };
    if (query.recordId) where.recordId = query.recordId;
    if (query.result) where.result = query.result;

    if (query.from || query.to) {
      where.timestamp = {
        gte: query.from ? new Date(query.from) : undefined,
        lte: query.to ? new Date(query.to) : undefined,
      };
    }

    return where;
  }

  private csvEscape(value: string) {
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  private normalizeCsvValue(value: unknown) {
    if (value === null || typeof value === 'undefined') {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    return String(value);
  }

  private formatJsonForCsv(value: unknown) {
    if (value === null || typeof value === 'undefined') {
      return '';
    }

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  private buildAuditSummary(row: {
    operation: AuditOperation;
    entity: string;
    result: AuditResult;
    userEmail: string | null;
    endpoint: string | null;
    errorMessage: string | null;
  }) {
    const actor = row.userEmail?.trim() ? row.userEmail : 'sistema';
    const endpoint = row.endpoint?.trim() ? ` en ${row.endpoint}` : '';
    const operationPhrase = this.getOperationPhrase(row.operation);
    const resultPhrase =
      row.result === AuditResult.SUCCESS ? 'con resultado exitoso' : 'con resultado fallido';
    const error = row.errorMessage?.trim() ? ` Error: ${row.errorMessage}` : '';

    return `${operationPhrase} sobre ${row.entity} por ${actor}${endpoint}, ${resultPhrase}.${error}`;
  }

  private getOperationPhrase(operation: AuditOperation) {
    switch (operation) {
      case AuditOperation.CREATE:
        return 'Creacion de registro';
      case AuditOperation.UPDATE:
        return 'Actualizacion de registro';
      case AuditOperation.DELETE:
        return 'Eliminacion de registro';
      case AuditOperation.VIEW:
        return 'Consulta de informacion';
      case AuditOperation.LOGIN:
        return 'Inicio de sesion';
      case AuditOperation.LOGOUT:
        return 'Cierre de sesion';
      case AuditOperation.LOGIN_FAILED:
        return 'Intento de inicio de sesion fallido';
      case AuditOperation.FORBIDDEN:
        return 'Intento de acceso denegado';
      case AuditOperation.PASSWORD_CHANGE:
        return 'Cambio de contrasena';
      case AuditOperation.EXPORT:
        return 'Exportacion de informacion';
      default:
        return 'Operacion de auditoria';
    }
  }

  private scheduleRetentionCleanup() {
    const retentionDays = Number(process.env.AUDIT_RETENTION_DAYS ?? '365');
    const intervalHours = Number(process.env.AUDIT_RETENTION_CHECK_HOURS ?? '24');

    if (retentionDays <= 0) {
      return;
    }

    this.retentionTimer = setInterval(() => {
      void this.purgeOlderThanDays(retentionDays);
    }, Math.max(1, intervalHours) * 60 * 60 * 1000);
  }

  private async purgeOlderThanDays(days: number) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    try {
      const result = await this.prisma.auditLog.deleteMany({
        where: { timestamp: { lt: cutoff } },
      });

      if (result.count > 0) {
        this.log({
          operation: AuditOperation.DELETE,
          entity: 'audit_logs_retention',
          result: AuditResult.SUCCESS,
          metadata: {
            deletedCount: result.count,
            retentionDays: days,
            cutoff: cutoff.toISOString(),
          } as Prisma.InputJsonValue,
          context: { userId: null, userEmail: 'system' },
        });
      }
    } catch (error) {
      this.logger.error('Falló la política de retención de auditoría', error as Error);
    }
  }
}

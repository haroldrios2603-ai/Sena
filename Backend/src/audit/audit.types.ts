/**
 * Tipos y constantes usadas en el módulo de auditoría.
 */
import { AuditOperation, AuditResult } from '@prisma/client';
import { Prisma } from '@prisma/client';

/**
 * Tipo AuditContext para definir la estructura de datos utilizada en audit.
 */
/**
 * Tipo AuditContext para definir la estructura de datos utilizada en audit.
 */
/**
 * Tipo AuditContext para definir la estructura de datos utilizada en audit.
 */
export type AuditContext = {
  userId?: string | null;
  userEmail?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  endpoint?: string | null;
  method?: string | null;
  requestParams?: Prisma.InputJsonValue | null;
  responseTimeMs?: number | null;
};

/**
 * Tipo AuditLogInput para definir la estructura de datos utilizada en audit.
 */
/**
 * Tipo AuditLogInput para definir la estructura de datos utilizada en audit.
 */
/**
 * Tipo AuditLogInput para definir la estructura de datos utilizada en audit.
 */
export type AuditLogInput = {
  operation: AuditOperation;
  entity: string;
  recordId?: string | null;
  previousValues?: Prisma.InputJsonValue | null;
  newValues?: Prisma.InputJsonValue | null;
  result: AuditResult;
  errorCode?: string | null;
  errorMessage?: string | null;
  metadata?: Prisma.InputJsonValue | null;
  context?: AuditContext;
};

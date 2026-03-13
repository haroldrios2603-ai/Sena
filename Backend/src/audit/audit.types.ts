import { AuditOperation, AuditResult } from '@prisma/client';
import { Prisma } from '@prisma/client';

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

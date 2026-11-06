-- Create enums for audit operations and result.
CREATE TYPE "AuditOperation" AS ENUM (
  'CREATE',
  'UPDATE',
  'DELETE',
  'VIEW',
  'LOGIN',
  'LOGOUT',
  'LOGIN_FAILED',
  'FORBIDDEN',
  'PASSWORD_CHANGE',
  'EXPORT'
);

CREATE TYPE "AuditResult" AS ENUM (
  'SUCCESS',
  'FAILURE'
);

-- Create immutable audit logs table.
CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT,
  "userEmail" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "operation" "AuditOperation" NOT NULL,
  "entity" TEXT NOT NULL,
  "recordId" TEXT,
  "previousValues" JSONB,
  "newValues" JSONB,
  "result" "AuditResult" NOT NULL,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "endpoint" TEXT,
  "method" TEXT,
  "requestParams" JSONB,
  "responseTimeMs" INTEGER,
  "metadata" JSONB,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_operation_idx" ON "AuditLog"("operation");
CREATE INDEX "AuditLog_entity_idx" ON "AuditLog"("entity");
CREATE INDEX "AuditLog_recordId_idx" ON "AuditLog"("recordId");
CREATE INDEX "AuditLog_result_idx" ON "AuditLog"("result");

ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

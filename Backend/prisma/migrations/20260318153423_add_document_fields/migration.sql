-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CEDULA', 'TARJETA_IDENTIDAD', 'NIT', 'PASAPORTE', 'PEP');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "documentNumber" TEXT,
ADD COLUMN     "documentType" "DocumentType";

-- CreateIndex
CREATE INDEX "User_documentNumber_idx" ON "User"("documentNumber");

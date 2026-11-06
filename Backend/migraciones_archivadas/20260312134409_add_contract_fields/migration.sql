-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastPaymentDate" TIMESTAMP(3),
ADD COLUMN     "monthlyFee" DOUBLE PRECISION,
ADD COLUMN     "nextPaymentDate" TIMESTAMP(3),
ADD COLUMN     "planName" TEXT NOT NULL DEFAULT 'Mensualidad';

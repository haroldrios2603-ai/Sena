/*
  Warnings:

  - You are about to drop the column `estado` on the `ContractAlert` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ContractAlert" DROP COLUMN "estado",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING';

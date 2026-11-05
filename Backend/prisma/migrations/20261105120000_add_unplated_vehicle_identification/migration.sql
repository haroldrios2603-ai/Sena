-- Permite vehículos sin placa y conserva un identificador único para cada registro.
ALTER TABLE "Vehicle" ADD COLUMN "identificationCode" TEXT;

-- Los vehículos existentes usan su placa como identificador histórico.
UPDATE "Vehicle"
SET "identificationCode" = "plate"
WHERE "identificationCode" IS NULL;

ALTER TABLE "Vehicle" ALTER COLUMN "identificationCode" SET NOT NULL;
ALTER TABLE "Vehicle" ALTER COLUMN "plate" DROP NOT NULL;

CREATE UNIQUE INDEX "Vehicle_identificationCode_key" ON "Vehicle"("identificationCode");

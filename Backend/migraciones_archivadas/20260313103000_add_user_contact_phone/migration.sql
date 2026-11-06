-- Add nullable contact phone for client contact data
ALTER TABLE "User"
ADD COLUMN "contactPhone" TEXT;

-- Index to speed up contract filtering by phone
CREATE INDEX "User_contactPhone_idx" ON "User"("contactPhone");

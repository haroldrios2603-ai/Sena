-- Create table for application screens/modules.
CREATE TABLE "AppScreen" (
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "route" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AppScreen_pkey" PRIMARY KEY ("key")
);

-- Create role-level screen permissions.
CREATE TABLE "RoleScreenPermission" (
  "id" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "screenKey" TEXT NOT NULL,
  "canView" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RoleScreenPermission_pkey" PRIMARY KEY ("id")
);

-- Create user-level screen permissions.
CREATE TABLE "UserScreenPermission" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "screenKey" TEXT NOT NULL,
  "canView" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserScreenPermission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RoleScreenPermission_role_screenKey_key"
  ON "RoleScreenPermission"("role", "screenKey");
CREATE INDEX "RoleScreenPermission_role_idx"
  ON "RoleScreenPermission"("role");
CREATE INDEX "RoleScreenPermission_screenKey_idx"
  ON "RoleScreenPermission"("screenKey");

CREATE UNIQUE INDEX "UserScreenPermission_userId_screenKey_key"
  ON "UserScreenPermission"("userId", "screenKey");
CREATE INDEX "UserScreenPermission_userId_idx"
  ON "UserScreenPermission"("userId");
CREATE INDEX "UserScreenPermission_screenKey_idx"
  ON "UserScreenPermission"("screenKey");

ALTER TABLE "RoleScreenPermission"
  ADD CONSTRAINT "RoleScreenPermission_screenKey_fkey"
  FOREIGN KEY ("screenKey") REFERENCES "AppScreen"("key")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserScreenPermission"
  ADD CONSTRAINT "UserScreenPermission_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserScreenPermission"
  ADD CONSTRAINT "UserScreenPermission_screenKey_fkey"
  FOREIGN KEY ("screenKey") REFERENCES "AppScreen"("key")
  ON DELETE CASCADE ON UPDATE CASCADE;

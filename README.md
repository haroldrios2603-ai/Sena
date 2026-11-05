# RM Parking - Sistema de Gestion de Parqueaderos

Plataforma para administrar parqueaderos con modulos operativos, control de usuarios y clientes, auditoria, reportes y flujo de pagos por QR.

## Arquitectura del Monorepo

- `Backend/`: API REST (NestJS + Prisma + PostgreSQL).
- `Frontend/`: Aplicacion web (React + Vite + TypeScript).
- `QA/`: pruebas E2E y UX con Playwright.
- `docs/`: tickets y documentacion tecnica de tareas.
- `Documentador/`: manuales funcionales y guias operativas.
- `ops/`: scripts de soporte operativo.

## Requisitos

- Node.js 18 o superior.
- npm 10 o superior.
- Docker y Docker Compose.

## Variables de Entorno

1. Usar `.env.example` como referencia de variables base.
2. Para desarrollo local mixto (recomendado):
	- Base de datos en Docker.
	- Backend y Frontend en local.
3. Variables importantes del backend:
	- `DATABASE_URL`
	- `JWT_SECRET`
	- `FRONTEND_BASE_URL`
	- `WOMPI_PUBLIC_KEY`
	- `WOMPI_INTEGRITY_SECRET`

## Levantar el Proyecto

### Opcion A - Todo en Docker

```bash
docker compose up -d
```

### Opcion B - Mixto (DB en Docker y apps en local)

```bash
docker compose up -d db

cd Backend
npm install
npm run start:dev

cd ../Frontend
npm install
npm run dev -- --host
```

## Persistencia, migraciones y respaldos de datos

### Persistencia local

PostgreSQL usa el volumen Docker `postgres_data`, por lo que los datos sobreviven a `docker compose restart` y a recrear los contenedores. No ejecutes `docker compose down -v` si deseas conservar la base: ese comando elimina el volumen.

### Preparar otro equipo

1. Copia el repositorio y crea el archivo `.env` local a partir de `.env.example`.
2. Ejecuta `docker compose up -d db`.
3. Aplica la estructura con `docker compose up -d backend` y `docker compose exec backend npx prisma migrate deploy`.
4. Para una instalación demo nueva, ejecuta `docker compose exec backend npx prisma db seed`. El seed es idempotente para los usuarios y la sede demo.
5. Levanta Frontend y verifica `http://localhost:3000/api/docs` y `http://localhost:5173`.

Para trasladar datos reales, no uses el seed: copia un respaldo creado con `ops/database_backup.ps1` y restáuralo con `ops/database_restore.ps1 -BackupFile <archivo.dump>`. Los respaldos contienen información sensible y están excluidos por `.gitignore`.

### Respaldo y restauración en Windows PowerShell

```powershell
docker compose up -d db
.\ops\database_backup.ps1 -OutputDirectory .\backups
.\ops\database_restore.ps1 -BackupFile .\backups\rmparking-AAAAMMDD-HHMMSS.dump
```

La restauración reemplaza los datos actuales y exige escribir `RESTAURAR`. Antes de restaurar producción crea un respaldo adicional y valida el archivo en una instancia aislada.

### Producción

- Ejecuta `npx prisma migrate deploy` durante el despliegue para aplicar únicamente migraciones versionadas.
- No ejecutes `prisma db seed` en producción salvo que exista una decisión operativa explícita.
- Programa respaldos periódicos de PostgreSQL, conserva varias generaciones y prueba periódicamente la restauración.
- Guarda `DATABASE_URL`, contraseñas y claves externas en el gestor de secretos del ambiente, nunca en Git.

## URLs Locales

- Backend (Swagger): `http://localhost:3000/api/docs`
- Frontend: `http://localhost:5173`
- Base de datos PostgreSQL: `localhost:5432`

## Funcionalidades Implementadas

- Autenticacion JWT y recuperacion de contrasena.
- Gestion de usuarios, clientes y contratos.
- Registro de ingreso/salida de vehiculos con calculo de cobro.
- Auditoria de acciones de usuario.
- Reportes operativos y exportables.
- Configuracion general, tarifas y metodos de pago.
- Flujo de pago QR con integracion Wompi Sandbox.

## Pruebas

### Backend/Frontend (compilacion)

```bash
cd Backend
npm run build

cd ../Frontend
npm run build
```

### QA E2E

```bash
cd QA
npm install
npx playwright install
npx playwright test --reporter=line
```

## Documentacion Complementaria

- Manual administrativo: `Documentador/MANUAL_ADMIN.md`
- Manual de operador: `Documentador/MANUAL_OPERADOR.md`
- Arquitectura tecnica: `Documentador/Arquitectura_Tecnica.md`
- Recuperacion de contrasena: `Documentador/AUTH_PASSWORD_RESET_API.md`
- Tareas por sprint: `docs/tasks/`

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

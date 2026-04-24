# Backend RM Parking

API REST para la plataforma RM Parking. Incluye autenticacion, operacion de parqueaderos, gestion de usuarios y clientes, auditoria, reportes y pagos por QR.

## Stack Tecnologico

- NestJS
- Prisma ORM
- PostgreSQL
- JWT (autenticacion)
- Swagger (`/api/docs`)

## Estructura Principal

- `src/auth/`: login, perfil, cierre de sesion y recuperacion de contrasena.
- `src/parking/`: ingreso y salida de vehiculos, calculo de cobro.
- `src/users/`: administracion de usuarios.
- `src/clients/`: contratos, alertas y renovaciones.
- `src/settings/`: configuracion general y tarifas.
- `src/reports/`: indicadores y exportacion de reportes.
- `src/audit/`: bitacora/auditoria.
- `src/payments/`: flujo de pago QR y webhook Wompi.
- `prisma/`: esquema, migraciones y seed.

## Requisitos

- Node.js 18+
- npm 10+
- Base de datos PostgreSQL accesible desde `DATABASE_URL`

## Variables de Entorno Clave

- `DATABASE_URL`
- `JWT_SECRET`
- `PORT` (por defecto 3000)
- `FRONTEND_BASE_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `PASSWORD_RESET_DELIVERY_OVERRIDE` (opcional, solo pruebas)
- `WOMPI_PUBLIC_KEY`
- `WOMPI_INTEGRITY_SECRET`

## Ejecucion Local

```bash
npm install
npm run start:dev
```

Documentacion de API:

- `http://localhost:3000/api/docs`

## Scripts Utiles

```bash
# compilacion
npm run build

# modo desarrollo
npm run start:dev

# pruebas unitarias
npm run test

# pruebas e2e de backend
npm run test:e2e

# cobertura
npm run test:cov
```

## Base de Datos

```bash
# aplicar migraciones
npx prisma migrate deploy

# regenerar cliente prisma
npx prisma generate

# seed de datos iniciales
npx prisma db seed
```

## Endpoints Relevantes

- `POST /auth/login`
- `POST /parking/entry`
- `POST /parking/exit`
- `GET /reports/*`
- `POST /payments/wompi/exit/:exitId/intent`
- `GET /payments/public/:paymentId`
- `POST /payments/public/:paymentId/checkout`
- `POST /payments/wompi/webhook`

## Notas de Operacion

- Para entorno mixto recomendado: mantener solo la base de datos en Docker y ejecutar este backend en local.
- Si se actualizan variables en `.env`, reiniciar el proceso para aplicar cambios.

# RM Parking - Sistema de Gestión de Parqueaderos

Sistema integral para la administración de parqueaderos con soporte para IA, tickets QR y control financiero.

## Estructura del Proyecto

- `/Backend`: API construida con NestJS y Prisma (PostgreSQL).
- `/Frontend`: Interfaz de usuario construida con React + Vite + Tailwind CSS.
- `/QA`: Entorno de pruebas con Playwright.
- `/docs`: Documentación técnica y manuales.

## Requisitos Previos

- Docker y Docker Compose
- Node.js (v18+)
- NPM o PNPM

## Inicio Rápido

1. Clonar el repositorio.
2. Configurar variables de entorno: `cp .env.example .env`.
3. Levantar servicios: `docker-compose up -d`.
4. El backend estará disponible en `http://localhost:3000/api/docs` (Swagger).
5. El frontend estará disponible en `http://localhost:5173`.

## Pruebas

Para ejecutar las pruebas de QA:
```bash
cd QA
npm install
npm test
```

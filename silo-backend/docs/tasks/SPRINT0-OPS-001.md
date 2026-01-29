# TICKET: Infraestructura Base (DevOps)
**ID:** SPRINT0-OPS-001
**Rol:** DevOps
**Sprint:** 0

## Descripción
Configurar el entorno de desarrollo local con Docker Compose y preparar el pipeline de CI básico.

## Criterios de Aceptación
- [ ] `docker-compose.yml` finalizado (App, DB, Adminer/PgAdmin).
- [ ] Variables de entorno `.env.example` definidas.
- [ ] Workflow de GitHub Actions para CI (Lint + Test) creado.
- [ ] Script de "Health Check" para verificar servicios arriba.

## Evidencia Requerida
- Output de `docker-compose up -d`.
- Screenshot de ejecución de GitHub Actions (o simulación local con act).

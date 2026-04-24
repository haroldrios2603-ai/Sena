# Pruebas E2E/UX (Playwright)

## Alcance actual
- `tests/sanity.spec.ts`: valida que la SPA cargue (título en `/` y texto "Bienvenido" en `/login`).
- `tests/auth-recovery.spec.ts`: cubre toda la UX de recuperación de contraseña:
  - Visualización del enlace permanentemente.
  - Validación de correo obligatorio antes de solicitar código.
  - Flujo completo simulando respuestas del backend mediante `page.route`.
- `tests/admin-clients-api.spec.ts`: valida vía API que los módulos de `UsersModule` y `ClientsModule` funcionen end-to-end (login, creación de usuarios, cambio de roles/estado, registro de clientes, alertas y renovación de contratos).

- `tests/admin-management.spec.ts`: escenarios administrativos sobre navegación y operaciones de gestión.
- `tests/export` (si aplica en ejecución actual): validación de artefactos exportados.

## Preparación
1. Arrancar los contenedores `db`, `backend` y `frontend` (`docker compose up -d db backend frontend`).
2. La sección `frontend` del `docker-compose.yml` ya incluye `CHOKIDAR_USEPOLLING=1` y `WATCHPACK_POLLING=true`, por lo que los cambios del login/SPA se reflejan sin reiniciar (si ya estaba en ejecución antes de este cambio, reiniciar una vez con `docker compose restart frontend`).
3. Instalar dependencias en `QA/` (una sola vez): `npm install`.
4. Instalar navegadores de Playwright: `npx playwright install`.

> Nota: tambien es valido el modo mixto (DB en Docker y backend/frontend en local).

## Ejecución
- Comando principal: `cd QA && npx playwright test --reporter=line`.
- Para depurar una sola spec: `npx playwright test tests/auth-recovery.spec.ts --project=chromium --reporter=line`.

## Resultados de Referencia

### Ejecución 2026-02-03
```
Running 5 tests using 2 workers
  5 passed (21.5s)
```
- Reporte HTML disponible en `QA/playwright-report/index.html` (se genera en cada corrida).

### Estado actual
- La suite fue ampliada respecto a la corrida de referencia.
- Se recomienda registrar en este documento cada nueva corrida con fecha y resumen para mantener trazabilidad.

## Próximos pasos sugeridos
1. Integrar ejecución automática en CI (GitHub Actions) con reporte adjunto.
2. Añadir cobertura para pagos QR (flujo público y webhook simulado).
3. Habilitar captura de video/screenshot solo en fallas para acelerar diagnósticos.
4. Definir umbral mínimo de pruebas obligatorias antes de merge a `main`.

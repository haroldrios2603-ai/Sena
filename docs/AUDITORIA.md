# Modulo de Auditoria

## Resumen
Este modulo registra eventos criticos de seguridad y trazabilidad en la tabla `AuditLog`.

Se registran, entre otros:
- Operaciones de creacion/actualizacion en modulos administrativos.
- Consultas sensibles (usuarios, contratos, configuraciones, permisos, auditoria).
- Login exitoso y fallido.
- Logout.
- Intentos prohibidos (403) por rol o permiso de pantalla.
- Exportaciones de auditoria.

## Modelo de datos
Migracion: `Backend/prisma/migrations/20260313110000_add_audit_logs/migration.sql`.

Tabla principal: `AuditLog`.
Campos destacados:
- `timestamp` en UTC.
- `userId`, `userEmail`, `ipAddress`, `userAgent`.
- `operation`, `entity`, `recordId`, `result`.
- `previousValues`, `newValues`, `metadata` (JSON).
- `endpoint`, `method`, `requestParams`, `responseTimeMs`.

## Seguridad y privacidad
- El servicio aplica mascara a campos sensibles (`password`, `token`, `authorization`, etc.).
- No existen endpoints para editar o eliminar logs manualmente.
- Los endpoints de consulta/exportacion estan protegidos por:
  - roles: `SUPER_ADMIN` o `AUDITOR`.
  - permiso de pantalla: `admin-audit-logs`.

## Retencion
Configurable por variables de entorno:
- `AUDIT_RETENTION_DAYS` (default: `365`).
- `AUDIT_RETENTION_CHECK_HOURS` (default: `24`).

Se ejecuta limpieza automatica por antiguedad.

## Endpoints
- `GET /audit/logs` filtros + paginacion.
- `GET /audit/logs/:id` detalle.
- `GET /audit/export?format=csv|json&limit=...` exportacion.

## Frontend
Ruta: `/admin/auditoria`.
Incluye:
- filtros (fechas, usuario, operacion, entidad, resultado, recordId),
- paginacion,
- columnas seleccionables,
- detalle JSON formateado,
- exportacion CSV/JSON.

## Permisos por perfil
Se agrega pantalla catalogada:
- clave: `admin-audit-logs`
- ruta: `/admin/auditoria`

Puede gestionarse desde `Permisos por perfil`.

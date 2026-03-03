# Recuperación de contraseña - Backend

## Objetivo
Implementar un flujo seguro para recuperar contraseñas desde la API de autenticación. Requiere tokens temporales con expiración y registro de uso.

## Estructura de datos
- **Tabla:** `PasswordResetToken`
  - `id`: UUID auto generado.
  - `userId`: referencia a `User`.
  - `email`: redundancia para búsquedas rápidas y auditoría.
  - `tokenHash`: hash `bcrypt` del código enviado.
  - `expiresAt`: fecha y hora de expiración (15 minutos por defecto).
  - `usedAt`: marca cuándo se consumió el código.
  - `createdAt`: auditoría.
- Índices en `userId`, `email`, `expiresAt` para acelerar búsquedas.

## Endpoints expuestos
1. `POST /auth/password/request`
   - **Body:** `{ "email": "usuario@dominio.com" }`.
   - Acciones: invalida códigos previos, genera uno nuevo y lo almacena hasheado.
   - Respuesta genérica para evitar filtrado de información.
   - El envío real del código (email/SMS) queda pendiente de integrar con un proveedor externo; actualmente se registra en logs del backend.

2. `POST /auth/password/reset`
   - **Body:** `{ "email": "usuario@dominio.com", "code": "ABC123", "newPassword": "NuevaClave$2026" }`.
   - Validaciones: usuario existente, token vigente/no usado, coincidencia del código.
   - Si es válido, se hashea la nueva contraseña y se marca el token con `usedAt`.

## Consideraciones de seguridad
- Los códigos se guardan con `bcrypt`, jamás en texto plano.
- El mensaje del endpoint `/auth/password/request` siempre es el mismo, independiente de que el correo exista o no.
- Se invalidan tokens previos activos para el usuario antes de crear uno nuevo.
- Quedan pendientes límites de intentos y bloqueo temporal ante múltiples fallos; se documenta como mejora futura.

## Migraciones
- Carpeta `Backend/prisma/migrations/20260129_password_reset` contiene el SQL para crear la tabla e índices.
- Ejecutar `./ops/prisma_orchestrator.sh migrate` aplicará la migración mediante `prisma migrate deploy` dentro del contenedor.

## Pasos de verificación
1. Solicitar un código: `curl -X POST http://localhost:3000/auth/password/request -d '{"email":"admin@rmparking.com"}' -H "Content-Type: application/json"`.
2. Revisar logs del contenedor backend para obtener el código (temporal hasta integrar proveedor de correo).
3. Confirmar el código: `curl -X POST http://localhost:3000/auth/password/reset ...` con los datos del paso anterior.
4. Intentar iniciar sesión con la nueva contraseña y validar que el token se marcó con `usedAt`.

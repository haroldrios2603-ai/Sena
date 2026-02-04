# Gestión de usuarios y clientes

## 1. Administración de usuarios y roles (implementado)
- El módulo `UsersModule` expone endpoints protegidos por `AuthGuard + RolesGuard` y sólo accesibles a `SUPER_ADMIN`.
- Endpoints:
  - `POST /users`: crea usuario, hashea contraseña temporal y asigna rol.
  - `GET /users`: lista usuarios con filtros opcionales `role` e `isActive`.
  - `PATCH /users/:id/role`: reasigna rol.
  - `PATCH /users/:id/status`: activa/desactiva la cuenta.
- Toda la lógica vive en `Backend/src/users`, apoyándose en `PrismaService` y bcrypt.
- El frontend deberá consumir estos endpoints para la consola de administración.

## 2. Gestión de clientes con mensualidad (implementado)
- El módulo `ClientsModule` ofrece:
  - `POST /clients`: crea o reutiliza un usuario `Role.CLIENT` y genera contrato mensual.
  - `GET /clients/contracts`: lista contratos con usuario, estacionamiento y alertas pendientes.
  - `GET /clients/contracts/alerts`: devuelve únicamente las alertas pendientes tras sincronizar estados.
  - `PATCH /clients/contracts/:id/renew`: registra pago y nueva fecha de expiración.
- Prisma ahora incluye campos adicionales en `Contract` (`planName`, `monthlyFee`, `isRecurring`, `lastPaymentDate`, `nextPaymentDate`) y el modelo `ContractAlert` con índice único `contractId+alertType`.
- `ClientsService` genera alertas cuando faltan ≤5 días o ya expiró el contrato; al renovar se resuelven automáticamente.

## 3. Alertas y recordatorios
- Actualmente las alertas se sincronizan cada vez que se consultan los endpoints anteriores.
- Próxima iteración: agendar un cron interno (o job en Ops) que invoque `ClientsService.syncContractStatuses` diariamente y envíe notificaciones por correo/SMS.

## 4. Próximos pasos
1. Construir UI en el Dashboard (tabla de usuarios con formularios modales y pantalla de clientes con alertas en tarjetas/badges).
2. Registrar acciones críticas en una tabla de auditoría (`Report` o futura `AuditLog`).
3. Integrar notificaciones reales (correo/SMS) para alertas de contratos.
4. Añadir pruebas e2e (Playwright) que validen: creación de usuario por SUPER_ADMIN, creación/renovación de cliente y visibilidad de alertas.

# Arquitectura técnica y catálogo de APIs - RM Parking

**Fecha de revisión:** 7 de octubre de 2026
**Fuente principal:** controladores y DTO de `Backend/src/`, módulos registrados en `Backend/src/app.module.ts` y consumidores de `Frontend/src/`.

## 1. Propósito y alcance

Este documento resume la arquitectura técnica y cataloga las APIs HTTP que expone el Backend. Se identifican **59 endpoints de aplicación** en diez áreas de API: aplicación, autenticación, parqueaderos, usuarios, clientes, configuración, permisos, auditoría, reportes y pagos.

Los endpoints se expresan como ruta relativa a la raíz del Backend. La aplicación no configura un prefijo global `/api`: por ejemplo, el inicio de sesión es `POST /auth/login`, no `POST /api/auth/login`. La interfaz Swagger sí está publicada en `/api/docs`.

## 2. Arquitectura

| Componente | Tecnología | Responsabilidad |
|---|---|---|
| Backend | Node.js, NestJS, TypeScript y Express | API REST, validación, autorización, reglas de negocio e integraciones. |
| Frontend | React, TypeScript, Vite, React Router y Axios | SPA operativa y administrativa; consume la API REST. |
| Persistencia | PostgreSQL y Prisma ORM/Client | Datos de usuarios, sedes, vehículos, tickets, pagos, contratos, asistencia, configuración, permisos y auditoría. |
| QA | Playwright | Pruebas de navegador e integración API. |
| Infraestructura local | Docker Compose | PostgreSQL, Backend, Frontend y Adminer. |

El `AppModule` registra `DatabaseModule`, `AuthModule`, `ParkingModule`, `UsersModule`, `ClientsModule`, `SettingsModule`, `PermissionsModule`, `AuditModule`, `ReportsModule` y `PaymentsModule`. Los módulos de dominio interactúan con PostgreSQL por `PrismaService`; las integraciones externas incluyen SMTP para recuperación de contraseña y Wompi para checkout/webhook.

## 3. Direcciones base y convenciones HTTP

| Uso | Dirección predeterminada |
|---|---|
| API Backend | `http://localhost:3000` |
| Swagger UI | `http://localhost:3000/api/docs` |
| Frontend Vite | `http://localhost:5173` |
| PostgreSQL en el host | `localhost:5432` |
| Adminer | `http://localhost:8080` |

La URL del API consumida por Frontend se configura con `VITE_API_URL`; el valor local de respaldo es `http://localhost:3000`. En Docker, el Backend usa `DATABASE_URL` para conectarse al host de base de datos `db:5432` dentro de la red Compose.

### 3.1 Encabezados y validación comunes

- Solicitudes JSON: `Content-Type: application/json`.
- Autenticación de rutas protegidas: `Authorization: Bearer <JWT>`.
- Webhook Wompi: `x-wompi-signature` obligatorio.
- Exportaciones: respuestas descargables con `Content-Disposition` y `Content-Type`.
- `ValidationPipe` global transforma DTO, elimina propiedades no permitidas y rechaza propiedades desconocidas (`transform`, `whitelist`, `forbidNonWhitelisted`).
- CORS permite GET, POST, PUT, PATCH, DELETE y OPTIONS. Los orígenes de producción dependen de `ALLOWED_ORIGINS`.
- El formato exacto de errores depende de la excepción y del filtro global `AllExceptionsFilter`. Casos usuales: 400 validación/solicitud, 401 token o credenciales, 403 autorización, 404 recurso ausente y 429 límite de solicitudes.
- Throttling global: 30 solicitudes por 60 segundos para `default` y 10 por 60 segundos para `auth`. Revisar decoradores por ruta al diagnosticar límites.

### 3.2 Niveles de acceso indicados en las tablas

- **Pública:** no requiere JWT.
- **JWT:** requiere token válido; cuando se indica, además aplica rol y/o permiso de pantalla.
- Los nombres de rol corresponden a `SUPER_ADMIN`, `ADMIN_PARKING`, `OPERATOR`, `AUDITOR` y `CLIENT`.
- El permiso de pantalla se evalúa en Backend por `RolesGuard`. En endpoints con permiso declarado en el método, ese valor reemplaza el permiso de pantalla definido en la clase; el rol de clase continúa aplicándose.

## 4. Catálogo de APIs y endpoints

### 4.1 Aplicación y autenticación

| Método y endpoint | Acceso | Entrada | Respuesta/efecto |
|---|---|---|---|
| `GET /` | Pública | Ninguna | Mensaje devuelto por `AppService`; comprobación HTTP básica. |
| `GET /favicon.ico` | Pública | Ninguna | Respuesta HTTP 204 sin contenido. |
| `POST /auth/register` | Pública; límite `auth` | JSON `RegisterDto`: `fullName`, `email`, `password`; `role` opcional | `{message, userId}`. **Atención:** el DTO admite rol y el servicio lo persiste; no exponer públicamente sin controlar la asignación de roles. |
| `POST /auth/login` | Pública; límite `auth` | JSON `LoginDto`: `email`, `password` | `{accessToken, attendanceId, checkIn, attendanceAction}`; crea o reutiliza asistencia abierta. |
| `GET /auth/me` | JWT; excluida del throttling general | Bearer JWT | Perfil sin hash: identidad, rol, estado, documento, fechas y `permissions` efectivos. |
| `POST /auth/logout` | JWT; excluida del throttling general | Bearer JWT; sin body | Resultado del cierre de sesión y de asistencia, si había turno abierto. El JWT emitido no se revoca en servidor. |
| `POST /auth/password/request` | Pública; límite `auth` | JSON `{email}` | Mensaje genérico para no revelar existencia de la cuenta; en desarrollo sin SMTP puede retornar `debugCode`. |
| `POST /auth/password/reset` | Pública; límite `auth` | JSON `{email, code, newPassword}` | Confirmación de cambio de contraseña; código temporal de seis caracteres y nueva clave con política de complejidad. |

El registro y el login normalizan el email. Registro exige nombre, correo y contraseña robusta; `role` es opcional y por defecto se usa `OPERATOR` cuando no se envía. El perfil de sesión utiliza `GET /auth/me`.

### 4.2 Operación de parqueaderos

Todas estas rutas exigen JWT. La creación/edición/activación requiere rol SUPER_ADMIN o ADMIN_PARKING y permiso `settings-config`. Las rutas operativas requieren el permiso `operations-dashboard`; la consulta de sedes también admite los permisos de clientes o configuración indicados.

| Método y endpoint | Acceso adicional | Entrada | Respuesta/efecto |
|---|---|---|---|
| `POST /parking` | Roles SUPER_ADMIN/ADMIN_PARKING; `settings-config` | `CreateParkingDto`: `nombre`, `direccion`, `capacidad`, `tarifaBase`; opcionales `activo`, `tiposVehiculo`, `horario` | Sede creada, con identificador y datos configurados. |
| `PATCH /parking/:id` | Roles SUPER_ADMIN/ADMIN_PARKING; `settings-config` | Parcial de los campos de creación | Sede actualizada. |
| `PATCH /parking/:id/estado` | Roles SUPER_ADMIN/ADMIN_PARKING; `settings-config` | `{activo: boolean}` | Sede con estado actualizado. |
| `POST /parking/entry` | `operations-dashboard` | `EntryDto`: `{placa, vehicleType, parkingId}`; tipo CAR, MOTORCYCLE o VAN | Ticket de ingreso asociado a vehículo y sede. Placa normalizada a mayúsculas; sede UUID. |
| `POST /parking/exit` | `operations-dashboard` | `ExitDto`: `{placa}` | `{ticket, exit, message, paymentOptions?}`; calcula duración e importe de salida. |
| `POST /parking/jornada/cerrar` | `operations-dashboard` | Sin body; identidad derivada del JWT | `{fechaCierre, activosPendientes, salidasArchivadas, mensaje}`. |
| `GET /parking` | Uno de `operations-dashboard`, `clients-management`, `settings-config` | Ninguna | Arreglo de sedes. |
| `GET /parking/tickets/resumen` | `operations-dashboard` | Ninguna | `{activos, cerrados}` con tickets operativos. |
| `GET /parking/:id` | Uno de `operations-dashboard`, `clients-management`, `settings-config` | Parámetro `id` | Datos de la sede solicitada. |

### 4.3 Administración de usuarios

Todas las rutas exigen JWT, rol SUPER_ADMIN y permiso `users-management`, excepto eliminación/restauración, que requieren permiso de pantalla `users-delete` (el rol SUPER_ADMIN se mantiene).

| Método y endpoint | Entrada | Respuesta/efecto |
|---|---|---|
| `POST /users` | `CreateUserDto`: `fullName`, `email`, `contactPhone`, `password`, `role`, `documentType`, `documentNumber` | Usuario creado sin exponer el hash. La contraseña se almacena hasheada. |
| `GET /users` | Query opcional: `role`, `isActive`, `fullName`, `email`, `contactPhone`, `documentNumber` | Arreglo de usuarios filtrados. `isActive` se envía como string `true` o `false`. |
| `PATCH /users/:id` | Campos opcionales de `UpdateUserDto`: identidad/contacto, rol, estado y documento | Usuario actualizado. |
| `PATCH /users/:id/role` | `{role}` | Usuario con rol actualizado. |
| `PATCH /users/:id/status` | `{isActive}` | Usuario activado o desactivado. |
| `DELETE /users/:id` | Parámetro `id`; sin body | Archivo lógico del usuario o rechazo por dependencias/reglas de servicio. |
| `POST /users/:id/restore` | Parámetro `id`; sin body | Restauración del usuario archivado. |

Roles permitidos: valores enum `SUPER_ADMIN`, `ADMIN_PARKING`, `OPERATOR`, `AUDITOR`, `CLIENT`. Tipos de documento: `CEDULA`, `TARJETA_IDENTIDAD`, `NIT`, `PASAPORTE`, `PEP`. El teléfono y el documento tienen validaciones de formato/longitud en DTO.

### 4.4 Clientes y contratos mensuales

Todas las rutas exigen JWT, uno de los roles SUPER_ADMIN/ADMIN_PARKING/OPERATOR y permiso `clients-management`. Para archivo/restauración, el permiso de pantalla requerido pasa a ser `clients-delete`.

| Método y endpoint | Entrada | Respuesta/efecto |
|---|---|---|
| `POST /clients` | `CreateClientDto`: `fullName`, `email`, `contactPhone`, `parkingId`, `startDate`, `endDate`, `monthlyFee`, `documentType`, `documentNumber`; `planName` opcional | Contrato de mensualidad y entidades relacionadas de cliente/sede. Documento y fechas son obligatorios según DTO actual. |
| `GET /clients/contracts` | Query opcional: `fullName`, `email`, `contactPhone`, `parkingId`, `parkingName`, `planName`, `status`, `documentNumber` | Lista de contratos con cliente, parqueadero y alertas relacionadas. |
| `GET /clients/contracts/alerts` | Ninguna | Lista de alertas relacionadas con contratos. |
| `PATCH /clients/contracts/:id/renew` | `{newEndDate, paymentDate, monthlyFee?}` | Contrato renovado; fechas ISO y valor opcional no negativo. |
| `PATCH /clients/contracts/:id` | Campos opcionales del cliente/contrato: nombre, correo, teléfono, sede, fechas, cuota, plan, recurrencia y documento | Contrato y datos relacionados actualizados. |
| `DELETE /clients/contracts/:id` | Parámetro `id`; sin body | Archivo del contrato y posible desactivación del cliente asociado; devuelve indicadores de archivo/eliminación. |
| `POST /clients/contracts/:id/restore` | Parámetro `id`; sin body | Restaura contrato y, cuando aplique, el cliente asociado. |

Estados filtrables del contrato: `ACTIVE`, `EXPIRED`, `EXPIRING_SOON`, `PAYMENT_PENDING`, `CANCELLED`.

### 4.5 Configuración y tarifas

Todas las rutas requieren JWT, rol SUPER_ADMIN/ADMIN_PARKING/OPERATOR y permiso `settings-config`.

| Método y endpoint | Entrada | Respuesta/efecto |
|---|---|---|
| `GET /settings` | Ninguna | `{configuracion, parkings, tarifas}`. |
| `PUT /settings/general` | `UpdateGeneralConfigDto`: `capacidadTotal` requerido; opcionales capacidad por tipo, horarios, cortesía, tarifas especiales, métodos de pago, facturación, mensajes, parámetros operativos, seguridad e integraciones | Configuración general guardada. Los campos anidados se validan como DTO. |
| `PUT /settings/tarifas` | `{aplicarATodos, parkingId?, tarifas[]}`; tarifa con tipo, base/hora requeridas y valores opcionales día/noche/horas/plana | Tarifas sincronizadas para una o varias sedes. |
| `PUT /settings/metodos-pago` | `{metodosPago: {aceptaEfectivo, aceptaTarjeta, aceptaEnLinea, aceptaQr, notas?}}` | Configuración de medios de pago actualizada. |

Las sedes se crean/actualizan mediante `POST /parking` y `PATCH /parking/:id`, no mediante rutas `/settings/parkings`.

### 4.6 Permisos por pantalla

Todas las rutas requieren JWT. Las operaciones de administración requieren además SUPER_ADMIN y `settings-permissions-profiles`.

| Método y endpoint | Acceso adicional | Entrada | Respuesta/efecto |
|---|---|---|---|
| `GET /permissions/me` | Solo JWT | Ninguna | Permisos efectivos del usuario autenticado. |
| `GET /permissions/screens` | SUPER_ADMIN; `settings-permissions-profiles` | Ninguna | Catálogo de pantallas habilitadas. |
| `GET /permissions/roles/:role` | SUPER_ADMIN; `settings-permissions-profiles` | Rol enum como parámetro | Permisos asociados al rol. |
| `PUT /permissions/roles/:role` | SUPER_ADMIN; `settings-permissions-profiles` | `{permissions: [{screenKey, canView}]}` | Permisos del rol actualizados. |
| `GET /permissions/users/:userId` | SUPER_ADMIN; `settings-permissions-profiles` | Parámetro `userId` | Usuario y sus permisos de pantalla. |
| `PUT /permissions/users/:userId` | SUPER_ADMIN; `settings-permissions-profiles` | `{permissions: [{screenKey, canView}]}` | Permisos explícitos del usuario actualizados. |

Un rol inválido en la ruta produce error de solicitud. Los permisos efectivos pueden combinar permisos de rol y excepciones por usuario según `PermissionsService`.

### 4.7 Auditoría

Todas las rutas requieren JWT, rol SUPER_ADMIN/AUDITOR y permiso `admin-audit-logs`.

| Método y endpoint | Entrada | Respuesta/efecto |
|---|---|---|
| `GET /audit/logs` | Query: `from`, `to`, `userId`, `userEmail`, `operation`, `entity`, `recordId`, `result`, `page`, `pageSize` | `{items, total, page, pageSize, totalPages}` ordenado por fecha descendente; tamaño máximo de página 200. |
| `GET /audit/logs/:id` | Parámetro `id` | Registro de auditoría o 404. |
| `GET /audit/export` | Filtros anteriores más `format=csv|json` y `limit` (máximo 5000) | Descarga CSV o JSON; por defecto CSV y hasta 1000 filas. |

Operaciones válidas: `CREATE`, `UPDATE`, `DELETE`, `VIEW`, `LOGIN`, `LOGOUT`, `LOGIN_FAILED`, `FORBIDDEN`, `PASSWORD_CHANGE`, `EXPORT`. Resultados: `SUCCESS`, `FAILURE`.

### 4.8 Reportes

Todas las rutas requieren JWT y uno de los roles SUPER_ADMIN/ADMIN_PARKING/OPERATOR/AUDITOR. Cada reporte verifica el permiso de pantalla que se indica.

| Método y endpoint | Permiso adicional | Entrada principal | Respuesta/efecto |
|---|---|---|---|
| `GET /reports/workers/present` | `ver-reporte-trabajadores` | Ninguna | Trabajadores en turno y datos de asistencia. |
| `GET /reports/clients` | `ver-reporte-facturacion` | Ninguna | Opciones de clientes para filtros. |
| `GET /reports/vehicles/count` | `ver-reporte-vehiculos` | Query `period=day|week|month`; `date?`; `limit?` | Conteo de vehículos para el periodo. |
| `GET /reports/billing/total` | `ver-reporte-facturacion` | Query `from?`, `to?`, `limit?` según DTO | Total facturado para el intervalo. |
| `GET /reports/billing/client` | `ver-reporte-facturacion` | Query `clientId` UUID requerido, `from?`, `to?` | Facturación asociada al cliente y total acumulado. |
| `GET /reports/monthly-payments/status` | `ver-reporte-mensualidades` | Query `status=todos|al_dia|atrasados` opcional | Estado/listado y total de mensualidades. |
| `GET /reports/attendance` | `ver-reporte-asistencia` | Query `userId?`, `documentNumber?`, `from?`, `to?` | Registros y total de asistencia según filtros. |
| `GET /reports/income/by-vehicle` | `ver-reporte-ingresos-grafico` | Query `from?`, `to?`, `limit?` | Ingresos agrupados por tipo de vehículo. |
| `GET /reports/peak` | `ver-reporte-horas-pico` | Query `from?`, `to?`, `limit?` | Indicadores de horas/días pico. |
| `GET /reports/export` | `acceso-reportes` y permiso específico inferido del tipo | Query `reportType`, `format` y filtros aplicables | Archivo Excel, PDF o Word; queda evento de exportación en auditoría. |

Valores de `reportType`: `trabajadores`, `vehiculos`, `facturacion-total`, `facturacion-cliente`, `mensualidades`, `asistencia`, `ingresos-por-tipo`, `horas-pico`. Valores de `format`: `excel`, `pdf`, `word`. Los filtros posibles incluyen `from`, `to`, `date`, `period`, `status`, `userId`, `documentNumber`, `clientId` y `limit`; su aplicación depende del tipo de reporte.

### 4.9 Pagos y Wompi

No hay guardias globales en `PaymentsController`. Las rutas de intención y efectivo requieren JWT y permiso `operations-dashboard`; las rutas públicas de consulta/checkout no requieren JWT. El webhook autentica mediante firma `x-wompi-signature`.

| Método y endpoint | Acceso | Entrada | Respuesta/efecto |
|---|---|---|---|
| `POST /payments/wompi/exit/:exitId/intent` | JWT; `operations-dashboard` | `CreateExitPaymentIntentDto`: `expiresInMinutes?` (5-120), `overrideAmount?` positivo | Intención con `paymentId`, `amount`, `currency`, `status`, `expiresAt`, `paymentPageUrl` y `qrImageUrl`. Crea/reutiliza un pago pendiente. |
| `POST /payments/exit/:exitId/cash` | JWT; `operations-dashboard` | Parámetro `exitId`; sin body | Registra/actualiza pago en efectivo y cierra ticket; devuelve ID, monto, método, estado y mensaje. |
| `GET /payments/public/:paymentId` | Pública | Parámetro `paymentId` | Datos públicos del pago: monto, método, estado, moneda COP, referencia y métodos disponibles. |
| `POST /payments/public/:paymentId/checkout` | Pública | `{method, customerEmail?, customerName?, phoneNumber?}`. Método: `NEQUI`, `CARD`, `BANK_ACCOUNT` | `{paymentId, checkoutUrl}` para redirección al checkout alojado. Requiere `WOMPI_PUBLIC_KEY` y `WOMPI_INTEGRITY_SECRET`. |
| `POST /payments/wompi/webhook` | Pública con firma obligatoria | JSON del evento Wompi y header `x-wompi-signature` | Valida la firma, actualiza el pago y, al confirmarse, cierra el ticket relacionado. Firma inválida: 401. |

La imagen QR devuelta por la intención se forma con el servicio externo `api.qrserver.com`; el checkout Wompi usa `WOMPI_CHECKOUT_BASE_URL` y retorna a `FRONTEND_BASE_URL`. La prueba E2E de interfaz intercepta API/proveedor y no equivale a validar el webhook real de Wompi.

## 5. Consumidores Frontend por servicio

La instancia Axios de `Frontend/src/api.ts` añade `Authorization: Bearer` cuando hay JWT en `localStorage`. Los servicios Frontend se organizan así:

| Servicio/consumidor | API Backend consumida |
|---|---|
| `auth.service.ts` | `/auth/login`, `/auth/logout`, `/auth/me`, `/auth/password/request`, `/auth/password/reset`. |
| `Dashboard.tsx` | Operación: `/parking`, `/parking/entry`, `/parking/exit`, `/parking/jornada/cerrar`, resumen de tickets y pagos. |
| `users.service.ts` | `/users` y `/users/:id` para consulta, creación, actualización, rol, estado, archivo y restauración. |
| `clients.service.ts` | `/clients`, `/clients/contracts`, alertas, renovación, actualización, archivo y restauración. |
| `config.service.ts` | `/settings`, configuración general, tarifas, medios de pago y `/parking` para sedes. |
| `permissions.service.ts` | `/permissions/me`, pantallas, permisos por rol y por usuario. |
| `audit.service.ts` | `/audit/logs`, `/audit/logs/:id`, `/audit/export`. |
| `reports.service.ts` | Consultas `/reports/*` y exportaciones por `/reports/export`. |
| `payments.service.ts` | Intención/efectivo y consulta/checkout público `/payments/*`. |

Las rutas Frontend son rutas de interfaz, no endpoints del Backend. Por ejemplo, `/pago/:paymentId` renderiza checkout y llama a `/payments/public/:paymentId`.

## 6. Integraciones no REST

- **PostgreSQL/Prisma:** persistencia mediante `DATABASE_URL`; no es una API HTTP pública.
- **SMTP/Nodemailer:** entrega de correo de recuperación. Requiere configuración SMTP real para enviar correo; la ruta HTTP es `POST /auth/password/request`.
- **Wompi:** checkout externo creado como URL, retorno del navegador y webhook recibido por `POST /payments/wompi/webhook`.
- **QR Server:** entrega remota de la imagen QR, usando el URL público de pago como dato codificado.
- **Adminer:** herramienta local de administración PostgreSQL en Compose, no endpoint de negocio.

## 7. Seguridad y observaciones

1. `POST /auth/register` es público y admite `role` opcional. El servicio usa ese rol al crear la cuenta; restringir el registro o forzar rol seguro antes de exposición pública.
2. Los endpoints protegidos aplican JWT más rol/permisos según las tablas; permisos visuales de React no sustituyen el control del Backend.
3. La firma de webhook implementada usa HMAC SHA-256 sobre el JSON serializado del payload. Validar que coincida con el formato de firma configurado en la cuenta Wompi antes de producción.
4. El frontend guarda el JWT en `localStorage`; el logout local no revoca en servidor un token previamente emitido.
5. El comportamiento de CORS cambia por `NODE_ENV`; en producción definir explícitamente `ALLOWED_ORIGINS`.
6. No usar claves de ejemplo, secretos de desarrollo o credenciales demo en despliegues.

## 8. Esquema de uso

Ejemplo de solicitud JSON a una ruta protegida:

```http
POST /parking/entry HTTP/1.1
Host: localhost:3000
Authorization: Bearer <JWT>
Content-Type: application/json

{
	"placa": "ABC123",
	"vehicleType": "CAR",
	"parkingId": "<UUID-DE-SEDE>"
}
```

La ruta exige `operations-dashboard`; el Backend valida DTO, autorización y reglas de dominio antes de persistir y devolver el ticket.

## 9. Fuentes para mantener el catálogo

- `Backend/src/main.ts`: bootstrap, CORS, validación, Swagger y puerto.
- `Backend/src/app.module.ts`: módulos y throttling global.
- `Backend/src/*/*.controller.ts`: rutas HTTP y autorización.
- `Backend/src/*/dto/`: formatos y validación de entradas.
- `Backend/src/*/*.service.ts`: forma y semántica de las respuestas.
- `Backend/prisma/schema.prisma`: entidades y relaciones.
- `Frontend/src/api.ts`, `Frontend/src/services/`, `Frontend/src/pages/` y `Frontend/src/components/`: consumidores cliente.
- `docker-compose.yml`: servicios y puertos locales.

Al agregar o cambiar un decorador HTTP (`@Get`, `@Post`, `@Put`, `@Patch`, `@Delete`), actualizar la sección del servicio correspondiente y volver a contrastar la ruta con DTO, protección y consumidor Frontend.

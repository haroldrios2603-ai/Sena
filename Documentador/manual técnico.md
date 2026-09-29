# Manual técnico de RM Parking

**Versión documental:** 1.0

**Fecha de revisión:** 29 de septiembre de 2026

**Sistema:** RM Parking

**Estado de la documentación:** consolidación del estado presente en el repositorio; no equivale a certificación de producción.

## 1. Objetivo, alcance y fuentes

Este manual describe arquitectura, módulos, configuración, persistencia, ejecución, seguridad, pruebas y operación técnica de RM Parking. Se verificó contra el código y archivos de infraestructura disponibles en el repositorio. Los nombres de variables se documentan sin copiar valores secretos.

Para contratos de entrada/salida, operaciones por endpoint y componentes Frontend, consultar [modulos integrados.md](modulos%20integrados.md), que complementa este manual.

### 1.1 Fuentes existentes revisadas en `Documentador`

| Documento existente | Clasificación | Uso y vigencia respecto del código actual |
|---|---|---|
| [Arquitectura_Tecnica.md](Arquitectura_Tecnica.md) | Documento técnico base | Describe cliente-servidor, NestJS, React, PostgreSQL, Prisma, JWT y Docker. Es una síntesis útil, pero no inventaría todos los módulos ni contratos; se amplía en este manual. |
| [componentes.md](componentes.md) | Inventario parcial de componentes | Complementa el mapa Frontend, pero contiene un inventario resumido y no registra todas las entradas/salidas. La fuente actual es `Frontend/src/`. |
| [AUTH_PASSWORD_RESET_API.md](AUTH_PASSWORD_RESET_API.md) | Referencia técnica de API | Documenta recuperación de contraseña. Algunas rutas de migración citadas allí no coinciden con las carpetas actuales; prevalecen el esquema y migraciones reales. |
| [RECUPERACION_PASSWORD.md](RECUPERACION_PASSWORD.md) | Manual técnico/funcional de una integración | Aporta configuración SMTP y flujo de recuperación. Debe leerse junto al servicio/notificador vigente; el envío requiere SMTP para correo real. |
| [QA_E2E.md](QA_E2E.md) | Guía técnica de pruebas | Describe preparación Playwright. La lista actual confirmada está en `QA/tests/`; el contenido histórico de resultados no es evidencia de una corrida actual. |
| [SPRINT0-BACK-001.md](SPRINT0-BACK-001.md) | Ticket técnico histórico | Requisitos de setup Backend; casillas y evidencias son criterios del ticket, no prueba por sí mismos del estado final. |
| [SPRINT0-BDA-001.md](SPRINT0-BDA-001.md) | Ticket de datos histórico | Define entregables esperados de modelo/diccionario. El modelo vigente se consulta en `Backend/prisma/schema.prisma`. |
| [SPRINT0-FRONT-001.md](SPRINT0-FRONT-001.md) | Ticket técnico histórico | Requisitos de setup Frontend. No sustituye el inventario de rutas y componentes presente. |
| [SPRINT0-OPS-001.md](SPRINT0-OPS-001.md) | Ticket técnico/DevOps histórico | Requisitos de Compose, variables, CI y health check. La configuración efectiva está en `docker-compose.yml`, `.env.example` y `.github/workflows/ci.yml`. |
| [SPRINT0-QA-001.md](SPRINT0-QA-001.md) | Ticket QA histórico | Plan/requisitos; no describe por sí solo el resultado vigente de las pruebas. |
| [AUDIT_COMPLETO.md](AUDIT_COMPLETO.md) | Auditoría y propuestas técnicas | Contiene hallazgos y alternativas de despliegue. Es una captura histórica; sus propuestas no deben confundirse con componentes implementados. |
| [SOLUCIONES_PRACTICAS.md](SOLUCIONES_PRACTICAS.md) | Recetario de propuestas | Útil como antecedente, pero valida cada recomendación contra el código actual antes de aplicar. No es especificación de la arquitectura desplegada. |
| [PLAN_ACCION_INMEDIATO.md](PLAN_ACCION_INMEDIATO.md) | Plan de trabajo | Lista tareas y sugerencias técnicas; no constituye estado de implementación. |
| [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md), [RESUMEN_EJECUTIVO.md](RESUMEN_EJECUTIVO.md), [INDICE_DOCUMENTOS.md](INDICE_DOCUMENTOS.md) | Reportes e índice históricos | Pueden contener evaluación temporal, rutas o conteos antiguos. El índice tiene referencias de ubicación anteriores; los archivos presentes en `Documentador/` y el código son la fuente actual. |
| [MANUAL_ADMIN.md](MANUAL_ADMIN.md), [MANUAL_OPERADOR.md](MANUAL_OPERADOR.md), [Guia_Operador.md](Guia_Operador.md), [GESTION_USUARIOS_CLIENTES.md](GESTION_USUARIOS_CLIENTES.md) | Manuales de usuario/operación | Documentación funcional. No son manuales de instalación, arquitectura ni despliegue. |
| [PROJECT_BRIEF.md](PROJECT_BRIEF.md), [team_charter.md](team_charter.md), [plan de riesgos.md](plan%20de%20riesgos.md) | Producto, equipo y riesgos | Contexto y visión. Las capacidades planeadas (IA, LPR, móvil o despliegue por sedes) no se consideran implementadas sin código de integración. |
| [INSTRUCCIONES_GIT.md](INSTRUCCIONES_GIT.md) | Instrucciones de repositorio | Texto operacional de Git, no manual técnico de la aplicación; además contiene contexto anterior a la configuración Git observada. |
| [SPRINT0-DOC-001.md](SPRINT0-DOC-001.md) | Ticket documental histórico | Requisitos para producir documentación, no manual técnico de runtime. |

**Selección de manuales técnicos existentes:** los documentos directamente técnicos que deben identificarse y conservarse como referencias complementarias son `Arquitectura_Tecnica.md`, `componentes.md`, `AUTH_PASSWORD_RESET_API.md`, `RECUPERACION_PASSWORD.md` y `QA_E2E.md`. Los tickets BACK/BDA/FRONT/OPS/QA son antecedentes técnicos, pero no documentación final “as-built”. `AUDIT_COMPLETO.md` y `SOLUCIONES_PRACTICAS.md` son auditoría/propuestas y necesitan cotejo con el código.

## 2. Resumen de arquitectura

RM Parking es un monorepo con cuatro superficies principales:

| Superficie | Tecnología actual | Propósito |
|---|---|---|
| `Backend/` | Node.js 20 en Docker; NestJS 11; TypeScript; Express | API REST, reglas de negocio, validación, autenticación y conectores. |
| `Frontend/` | React 19, TypeScript, Vite 7, React Router 7, Axios, Tailwind CSS | SPA para login, operación, administración, reportes, auditoría, permisos y checkout público. |
| Persistencia | PostgreSQL 15 Alpine en Compose; Prisma ORM/Client 5.22 | Almacenamiento relacional y migraciones. |
| `QA/` | Playwright Test | E2E de interfaz y API en ambiente local. |

Dependencias de integración: navegador → Frontend → API REST → Prisma → PostgreSQL. La pasarela de pagos es Wompi mediante URL de checkout alojada y webhook. La recuperación de contraseñas puede usar SMTP. La composición de módulos y cada endpoint se detalla en [modulos integrados.md](modulos%20integrados.md).

## 3. Inventario funcional y técnico

El Backend registra en `AppModule` los módulos de base de datos, autenticación, parqueaderos, usuarios, clientes, configuración, permisos, auditoría, reportes y pagos. La capa transversal `common` proporciona guardias, decoradores, filtro y utilidades. Swagger se publica en `/api/docs`.

El Frontend dispone de rutas de login y pago públicas; el resto del dashboard está protegido por sesión. Los permisos de pantalla se verifican en el cliente para navegación y en el servidor mediante guardias. La interfaz no reemplaza la autorización del Backend.

La SPA consume la API mediante Axios. El interceptor incorpora el JWT almacenado en `localStorage`; después de una mutación exitosa emite `rmparking:data-updated`, que algunas vistas usan para refrescar sus datos.

## 4. Servidores, contenedores y puertos

### 4.1 Configuración de Docker Compose identificada

| Servicio | Imagen/compilación | Puerto expuesto en el host | Función y límites |
|---|---|---:|---|
| `db` | `postgres:15-alpine` | `5432:5432` | PostgreSQL, volumen persistente `postgres_data`, zona horaria `America/Bogota`, health check con `pg_isready`. |
| `adminer` | `adminer` | `8080:8080` | Administración web de la base de datos; depende de `db`. No se configura autenticación propia en Compose. |
| `backend` | `Backend/Dockerfile`, Node 20 slim | `${PORT:-3000}:3000` | NestJS; espera que DB esté saludable. El health check consulta `http://localhost:3000/api/docs`. Monta `Backend/src` y `Backend/prisma`. |
| `frontend` | `Frontend/Dockerfile`, Node 20 Alpine | `5173:5173` | Servidor Vite con `--host`; recibe `VITE_API_URL`, usa polling y monta `Frontend/src` y `Frontend/public`. |

Compose define red puente `rmparking-net`. Dentro de esa red, el host de PostgreSQL para Backend es `db:5432`; desde el host de desarrollo, es `localhost:5432`. Frontend usa por defecto `http://localhost:3000` para llamar al Backend desde el navegador.

### 4.2 Direcciones locales documentadas

- Frontend Vite: `http://localhost:5173`.
- API Backend: `http://localhost:3000`.
- Swagger/OpenAPI UI: `http://localhost:3000/api/docs`.
- PostgreSQL local publicado: `localhost:5432`.
- Adminer: `http://localhost:8080`.
- Checkout público del Frontend: `/pago/:paymentId`.

Los puertos son configuración local del repositorio; no son nombres DNS ni direcciones de servidores remotos.

### 4.3 Observaciones operativas sobre contenedores

- El Compose predeterminado usa `NODE_ENV=development`; el comando del Backend inicia `nest start --watch` salvo que el valor sea `production`.
- El Dockerfile Frontend ejecuta `npm run dev -- --host`; no construye ni sirve una aplicación estática de producción. El Compose actual no es, por sí solo, una configuración de publicación productiva.
- El Backend tiene health check HTTP sobre Swagger, no sobre un endpoint `/health` dedicado. No hay health check configurado para Frontend ni Adminer.
- PostgreSQL y Adminer se publican en interfaces del host. No deben exponerse directamente a Internet ni reutilizarse con credenciales de ejemplo.
- El Dockerfile Backend ejecuta `prisma db push --skip-generate --accept-data-loss || true` durante la construcción de imagen. Este paso tolera fallos y puede aceptar pérdida de datos; no usarlo como estrategia productiva de migración. Para despliegues controlados se deben revisar y aplicar migraciones con `prisma migrate deploy`.
- Los volúmenes montados de código son apropiados para iteración local, no para una imagen inmutable de producción.

## 5. Configuración y variables de entorno

El repositorio contiene `.env.example` y se identificó un `.env` local dentro de Backend. Los valores locales no se reproducen en este manual. El Compose toma variables de sustitución desde el entorno/archivo `.env` de su raíz y también define algunas variables explícitamente para el contenedor. Debe verificarse cómo se inyectan en cada modalidad de ejecución; `AppModule` no registra `ConfigModule` de Nest.

| Variable | Uso | Requisito/valor predeterminado documentado |
|---|---|---|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Inicialización de PostgreSQL y construcción de `DATABASE_URL` | Compose usa valores de desarrollo predeterminados. Sustituirlos en cualquier entorno compartido o productivo. |
| `DB_HOST`, `DB_PORT` | Host/puerto DB descriptivos usados en Compose | Contenedor: `db`, `5432`; host local: `localhost`, `5432`. La URL Prisma se determina por `DATABASE_URL`. |
| `DATABASE_URL` | Conexión Prisma PostgreSQL | Obligatoria para conectar; formato `postgresql://usuario:contraseña@host:puerto/base`. Codificar caracteres especiales de la contraseña en URL. No incluir credenciales en el repositorio. |
| `PORT` | Puerto del Backend | Predeterminado `3000`; en Compose el host puede remapearse, mientras el contenedor escucha en `3000`. |
| `NODE_ENV` | Modo de ejecución y decisiones de seguridad | Compose/example usa `development`; para producción el código exige secreto JWT válido y aplica CORS de producción. |
| `JWT_SECRET` | Firma y validación JWT | En producción requiere al menos 32 caracteres. Usar valor aleatorio gestionado como secreto. El fallback del código solo es para desarrollo. El valor incluido en el ejemplo es inseguro para producción. |
| `JWT_EXPIRATION`, `REFRESH_TOKEN_EXPIRATION` | Aparecen en el `.env` local identificado | No se encontraron lecturas de estas variables en la configuración actual. JWT tiene `expiresIn: 10h`; tampoco se encontró flujo de refresh token. No asumir que estas variables alteran el runtime. |
| `ALLOWED_ORIGINS` | Orígenes CORS en producción | Lista separada por comas. En modo no producción se permiten los orígenes localhost configurados en `main.ts`. Definir los dominios exactos del despliegue. |
| `VITE_API_URL` | URL pública del API que usa el navegador | Predeterminado en Frontend: `http://localhost:3000`. Debe apuntar a la URL alcanzable desde el navegador, no a un nombre interno de contenedor. |
| `FRONTEND_BASE_URL` | URL de retorno que se incorpora al checkout Wompi | Predeterminado `http://localhost:5173`; configurar dominio HTTPS desplegado si se publica. |
| `SMTP_HOST`, `SMTP_PORT` | Transporte de correo de Nodemailer | Sin host/puerto no se crea transporte; puerto 465 activa TLS seguro según el servicio. Puerto de ejemplo 587. |
| `SMTP_USER`, `SMTP_PASS` | Autenticación SMTP opcional | Se usa autenticación si se configuran ambos. Mantener fuera del repositorio. |
| `SMTP_FROM` | Remitente de recuperación | Fallback a `SMTP_USER` y, luego, a dirección local de desarrollo. Configurar remitente permitido por el proveedor. |
| `PASSWORD_RESET_DELIVERY_OVERRIDE` | Fuerza buzón receptor en pruebas controladas | Dejar vacío en operación normal. El `.env.example` actual viene precargado con un receptor de prueba; limpiarlo antes de distribuir o usar como plantilla. |
| `WOMPI_PUBLIC_KEY` | Clave pública usada en URL checkout | Requerida para iniciar checkout; usar credencial del ambiente Wompi correspondiente. |
| `WOMPI_INTEGRITY_SECRET` | Firma de checkout y verificación del webhook | Requerida para checkout y webhook; secreto sensible. No registrar su valor ni exponerlo en Frontend. |
| `WOMPI_CHECKOUT_BASE_URL` | Base opcional de checkout | En código: `https://checkout.wompi.co/p/`. |
| `ADMINER_DESIGN` | Tema de Adminer | Solo presentación; no afecta persistencia ni seguridad. |
| `AUDIT_RETENTION_DAYS` | Retención de eventos de auditoría | Código usa 365 días si no se configura; el valor 0 evita el recorte según servicio. |
| `AUDIT_RETENTION_CHECK_HOURS` | Frecuencia del proceso de retención | Código usa 24 horas como valor predeterminado. Estas variables no aparecen en la configuración Compose revisada; deben inyectarse al proceso para sustituir los valores internos. |
| `QA_API_URL` | URL API utilizada por pruebas de contrato Playwright | Predeterminado `http://localhost:3000`. |
| `QA_ADMIN_EMAIL`, `QA_ADMIN_PASSWORD` | Cuenta usada por prueba API de administración | Si no se definen, la prueba usa credenciales demo asociadas al seed. Solo para instancia desechable/no productiva. |
| `CI` | Ajusta reintentos/workers en Playwright config | En GitHub Actions actual no se ejecuta Playwright QA. |

### 5.1 Manejo de secretos

- No copiar secretos reales a documentación, control de versiones, capturas, logs ni resultados QA.
- Generar un `JWT_SECRET` aleatorio de al menos 32 caracteres en producción; no usar valores de ejemplo ni fallback de desarrollo.
- No versionar archivos `.env` con credenciales. Revisar permisos y rotar cualquier secreto que haya sido expuesto previamente.
- Mantener `PASSWORD_RESET_DELIVERY_OVERRIDE` vacío salvo una prueba deliberada, temporal y controlada.
- El archivo `.env.example` debe contener placeholders inocuos, no destinatarios reales ni contraseñas de despliegue.

## 6. Base de datos y persistencia

### 6.1 Motor y conexión

- Motor: PostgreSQL; Compose fija imagen `postgres:15-alpine`.
- ORM: Prisma 5.22; schema en `Backend/prisma/schema.prisma`.
- Fuente de conexión: `DATABASE_URL` con proveedor `postgresql`.
- La generación de Prisma Client usa binarios `native`, Debian OpenSSL 3 y Linux musl OpenSSL 3.
- La zona horaria de Compose es `America/Bogota`; los campos temporales de Prisma son `DateTime` y se serializan en JSON como fechas ISO.
- Volumen Compose: `postgres_data`, montado en `/var/lib/postgresql/data`.

### 6.2 Entidades y ownership

El esquema define estos modelos: `User`, `AppScreen`, `RoleScreenPermission`, `UserScreenPermission`, `Parking`, `Tariff`, `SystemConfig`, `Vehicle`, `Ticket`, `Exit`, `Payment`, `Contract`, `ContractAlert`, `Attendance`, `Report`, `PasswordResetToken` y `AuditLog`.

Relaciones centrales:

- Usuario tiene vehículos, contratos, asistencias, pagos, reportes, tokens de recuperación, permisos personales y logs.
- Sede tiene tarifas, tickets y contratos.
- Vehículo tiene tickets; cada ticket corresponde a sede/vehículo y puede tener una salida.
- Salida pertenece a un ticket y puede vincular un pago; pago puede relacionarse con usuario.
- Contrato pertenece a cliente (`User`) y sede; posee alertas.
- `AppScreen` se relaciona con permisos de rol y permisos específicos de usuario.
- Auditoría puede retener el log si el usuario se elimina (`SetNull`); no se modela como relación editable de negocio.

Enums relevantes: roles (`SUPER_ADMIN`, `ADMIN_PARKING`, `OPERATOR`, `AUDITOR`, `CLIENT`), tipos de documento, operación de auditoría y resultado de auditoría. Varios estados/métodos de negocio (`Ticket.status`, `Payment.status`, `Contract.status`, método de pago) son strings, no enums Prisma.

### 6.3 Migraciones, generación y seed

Las carpetas de migración incluidas son:

1. `20260312134026_init`
2. `20260312134409_add_contract_fields`
3. `20260312134512_rename_alert_status_field`
4. `20260312193000_add_profile_permissions`
5. `20260312204924_align_password_reset_and_contract_alert_message`
6. `20260313103000_add_user_contact_phone`
7. `20260313110000_add_audit_logs`
8. `20260313143000_reports_indexes`
9. `20260318153423_add_document_fields`

Comandos principales desde `Backend/`:

```bash
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
```

El script `ops/prisma_orchestrator.sh` permite `migrate`, `push`, `seed` y `studio` dentro del contenedor Backend. En Windows, ejecutar el `.sh` desde Git Bash/WSL; también se puede invocar `docker compose exec backend npx prisma migrate deploy` directamente.

`Backend/prisma/seed.ts` crea dos usuarios demo y una sede/tarifas de ejemplo. El script contiene una contraseña predeterminada débil y datos de demostración: no ejecutar seed en una base productiva y rotar/eliminar esas cuentas en instalaciones de prueba compartidas.

## 7. API, validación y documentación interactiva

- Framework HTTP: NestJS sobre Express.
- Swagger: `/api/docs`; descripción/título RM Parking API, versión declarada `1.0`.
- No se observó `setGlobalPrefix('api')`; por eso los controladores usan `/auth`, `/parking`, etc., directamente en la raíz.
- `ValidationPipe` global habilita `whitelist`, `forbidNonWhitelisted` y `transform`.
- CORS admite credenciales, métodos GET/POST/PUT/PATCH/DELETE/OPTIONS, y headers `Content-Type`, `Authorization`, `X-WOMPI-SIGNATURE`. Expone `Content-Disposition` y `Content-Type` para descargas.
- Un filtro global normaliza excepciones HTTP.
- Throttling global declara `default`: 30 por 60 s y `auth`: 10 por 60 s. Las rutas de autenticación aplican el límite auth; algunas rutas JWT están marcadas con `SkipThrottle`.
- El middleware de entrada almacena hora de inicio para contexto de auditoría.

La especificación completa por método, protección, parámetros de entrada y respuesta está en [modulos integrados.md](modulos%20integrados.md).

## 8. Identidad, autorización y auditoría

### 8.1 JWT y sesión

- Login valida email y hash bcrypt; genera un token firmado con sujeto, email y rol.
- Expiración firmada: 10 horas. No hay refresh token ni revocación server-side de JWT en el código revisado.
- `JwtStrategy` extrae token de `Authorization: Bearer` y verifica rol/expiración.
- El Frontend conserva token en `localStorage`, recupera el perfil al iniciar y mantiene una expiración local de 10 horas.
- Login crea o reutiliza un registro de asistencia abierto; logout cierra la asistencia activa.

### 8.2 Control de acceso

- `RolesGuard` evalúa roles requeridos y permiso(s) de pantalla declarados por decorador.
- Roles operativos modelados: SUPER_ADMIN, ADMIN_PARKING, OPERATOR, AUDITOR y CLIENT.
- El permiso por pantalla puede provenir de perfil de rol o de asignación individual; el servicio calcula permisos efectivos.
- El registro `POST /auth/register` se encuentra expuesto sin guardia. Su DTO permite `role` opcional y el servicio lo usa al crear la cuenta. Antes de publicar la API debe limitarse el registro público y evitar que un solicitante asigne roles privilegiados.
- La autorización de API es la barrera efectiva; ocultar una pantalla en React no protege por sí solo el recurso.

### 8.3 Auditoría

El módulo registra operaciones, entidad, usuario/correo, IP, agente, endpoint/método, parámetros sanitizados, valores anteriores/nuevos, resultado, error, duración y metadatos. Se auditan accesos, fallos, denegaciones, mutaciones de módulos, cierres de jornada y exportaciones. Los logs se consultan con filtros/paginación y se exportan a CSV/JSON.

La retención usa `AUDIT_RETENTION_DAYS` (365 días por defecto) y `AUDIT_RETENTION_CHECK_HOURS` (24 h por defecto). Confirmar inyección de estas variables al contenedor si se requieren políticas diferentes.

## 9. Integraciones externas

### 9.1 Wompi

1. Un operador crea intención de pago para una salida autorizada. El Backend crea/reutiliza registro `Payment` pendiente y produce referencia, monto y URL de pago.
2. El usuario abre la ruta pública `/pago/:paymentId`; el Frontend consulta datos públicos y permite método disponible.
	La respuesta de intención también incluye una imagen QR servida por `api.qrserver.com`; el navegador solicita la imagen a ese tercero con la URL pública de pago como parámetro.
3. El Backend exige `WOMPI_PUBLIC_KEY` y `WOMPI_INTEGRITY_SECRET`, convierte COP a centavos y calcula firma de integridad para URL de checkout.
4. El navegador se redirige a `WOMPI_CHECKOUT_BASE_URL`; Wompi retorna al `FRONTEND_BASE_URL`.
5. Wompi notifica `POST /payments/wompi/webhook` con `x-wompi-signature`; el Backend valida la HMAC antes de actualizar el pago y cerrar ticket cuando se confirme.

Hay además una ruta de pago en efectivo autenticada. El control de métodos habilitados se toma de `SystemConfig.metodosPago`. El checkout público define `NEQUI`, `CARD`, `BANK_ACCOUNT` como opciones.

**Antes de producción:** confirmar ambiente y llaves reales, URL de retorno HTTPS, disponibilidad desde Internet del webhook, esquema oficial de firma, eventos/estados admitidos, idempotencia y escenarios de pago duplicado/fallido. El código de validación actual firma `JSON.stringify(payload)` con HMAC SHA-256; esta implementación debe probarse contra el mecanismo de firma configurado en Wompi. Existe una prueba E2E de la interfaz de checkout con API y proveedor simulados; no se identificó una prueba E2E que valide Backend/BD junto con un evento webhook real de Sandbox.

### 9.2 SMTP y recuperación

El módulo crea un transporte Nodemailer solo si recibe host y puerto válidos. Puede usar usuario/contraseña; puerto 465 habilita `secure`. El remitente se resuelve desde `SMTP_FROM`, luego `SMTP_USER` o dirección local de desarrollo.

El código de recuperación tiene expiración y se persiste hasheado. Se invalidan códigos anteriores al crear una solicitud nueva y los códigos confirmados quedan marcados como usados. Sin SMTP, `sendRecoveryCode` devuelve falso: en desarrollo se admite `debugCode`; producción no debe entregar el código en respuesta. Para envío real se requieren credenciales de un proveedor SMTP. No configurar `PASSWORD_RESET_DELIVERY_OVERRIDE` de forma permanente.

### 9.3 Otras integraciones

- **Servicio externo de QR:** se devuelve una URL de imagen de `api.qrserver.com` con la dirección pública de pago codificada en `data`. No se genera la imagen dentro del Backend. Evaluar disponibilidad y privacidad del proveedor; no incluir datos personales en esa URL.
- Adminer es interfaz de mantenimiento local para PostgreSQL, no una integración funcional de negocio.
- No se encontró proveedor de correo alternativo, almacenamiento de objetos, servicio de SMS, webhook de vigilancia implementado, LPR, cámaras, app móvil ni servicio de IA conectado.

## 10. Frontend y experiencia de ejecución

- Entrada: `Frontend/src/main.tsx`; renderiza `App` dentro de `StrictMode` e inicializa i18next.
- Routing: React Router con login, checkout, rutas protegidas y vistas del dashboard.
- HTTP: Axios; `VITE_API_URL`, JSON, Bearer token y evento de actualización tras mutaciones.
- Idioma: i18next con recursos en español (`es`) en `Frontend/src/i18n.ts`.
- Reportes: Recharts; exportaciones procesadas como Blob por el navegador.
- Exportaciones Backend: ExcelJS, PDFKit y `docx` para XLSX, PDF y Word.
- Iconografía: Lucide React.
- CSS: Tailwind CSS, CSS de aplicación y configuración Vite.

Componentes principales y contratos de datos: `Login`, `Dashboard`, `PaymentCheckoutPage`, `AuditLogs`, `PermissionsProfiles`, `UserManagementPanel`, `ClientManagementPanel`, `ConfigPanel`, `ReportsPanel`, rutas guardadas, contexto de autenticación y servicios API. Ver tabla entrada/salida en [modulos integrados.md](modulos%20integrados.md).

## 11. Pruebas, QA y CI

### 11.1 Pruebas automatizadas identificadas

| Área | Herramienta/ubicación | Cobertura declarada por los archivos |
|---|---|---|
| Backend unitario | Jest, `Backend/src/**/*.spec.ts` | Servicios/controladores/utilidades con pruebas presentes. Comandos en `Backend/package.json`. |
| Backend E2E | Jest/Supertest, `Backend/test/` y `test/jest-e2e.json` | Configuración disponible; ejecutar `npm run test:e2e` con servicios y variables requeridos. |
| Auditoría | Jest, `jest.audit.config.js` | Suite específica bajo `src/audit`; cobertura con umbrales declarados en esa configuración. |
| Frontend | `npm run build` y `npm run lint` | No se identificó script de pruebas unitarias de UI en `Frontend/package.json`. |
| QA navegador/API | Playwright en `QA/tests/` | Archivos presentes: `sanity.spec.ts`, `auth-recovery.spec.ts`, `admin-management.spec.ts`, `admin-clients-api.spec.ts` y `payments-wompi.spec.ts`. Configuración Chromium, base URL `http://localhost:5173`; API de contrato usa `QA_API_URL` o localhost:3000. |
| CI | GitHub Actions, `.github/workflows/ci.yml` | Dos jobs en Ubuntu instalan dependencias y ejecutan build/test de Backend y Frontend con Node 18. No levanta PostgreSQL, no inyecta `DATABASE_URL` y no ejecuta la carpeta QA. |

La prueba `admin-clients-api.spec.ts` exige una instancia real con un admin y al menos una sede. Crea/modifica/archiva/restaura cuentas y contratos; ejecutarla únicamente contra una base de pruebas desechable y con respaldo de datos necesarios. Sus credenciales predeterminadas son de demostración.

La prueba [payments-wompi.spec.ts](../QA/tests/payments-wompi.spec.ts) recorre el checkout en Chromium, intercepta las respuestas de API y la página de checkout Sandbox, y valida método, correo, importe y parámetros de redirección. No crea transacciones ni valida Backend/BD, firma del webhook o liquidación real de Wompi.

### 11.2 Comandos de comprobación

```bash
cd Backend
npm ci
npm run build
npm test -- --runInBand
npm run test:e2e
```

```bash
cd Frontend
npm ci
npm run build
npm run lint
```

```bash
cd QA
npm ci
npx playwright install chromium
npx playwright test --reporter=line
```

Ejecutar pruebas selectivas con `npx playwright test tests/nombre.spec.ts`. La suite Playwright espera servicios levantados; `playwright.config.ts` no inicia servidores automáticamente.

## 12. Instalación y arranque local

### 12.1 Requisitos observados

- Node.js 18+ y npm 10+ según README raíz; Docker y Docker Compose para modalidad en contenedores.
- Los Dockerfiles emplean Node.js 20. Para mantener paridad local se recomienda Node 20, aunque CI todavía fija Node 18.
- Conexión de red al registry npm y, si se usa Wompi/correo, salida a los proveedores configurados.

### 12.2 Stack completo en Docker

Desde raíz del repositorio, con archivo de variables local válido y no versionado:

```bash
docker compose up -d --build
docker compose ps
```

Para revisar logs:

```bash
docker compose logs -f db backend frontend
```

El Frontend se abre en `http://localhost:5173`; API/Swagger en `http://localhost:3000/api/docs`. El servicio de base de datos debe estar saludable antes de Backend.

### 12.3 Modalidad mixta

1. Levantar PostgreSQL con `docker compose up -d db`.
2. Instalar dependencias Backend y arrancar `npm run start:dev` desde `Backend/`.
3. Instalar dependencias Frontend y arrancar `npm run dev -- --host` desde `Frontend/`.
4. Configurar `DATABASE_URL` para conexión host-local y `VITE_API_URL=http://localhost:3000`.

La API debe poder alcanzar DB y el navegador debe poder alcanzar API. No usar `db` como hostname desde el navegador: ese nombre solo existe dentro de la red Compose.

### 12.4 Migraciones y datos

Aplicar `npx prisma migrate deploy` antes de habilitar el Backend sobre una base existente. Regenerar Prisma Client después de cambios en schema/migraciones. Usar `db seed` solo en desarrollo/pruebas recién creadas.

## 13. Seguridad y endurecimiento pendiente

Estas observaciones describen riesgos concretos del código/configuración observados; no son certificación ni análisis exhaustivo de penetración:

1. **Registro público con rol seleccionable:** `/auth/register` no exige JWT y admite `role` en el DTO, luego se persiste. Restringir registro y asignación de roles antes de exponer públicamente.
2. **Credenciales de ejemplo:** Compose y `.env.example` contienen valores de desarrollo previsibles; reemplazarlos y gestionar secretos fuera del repositorio.
3. **Override de recuperación:** el `.env.example` trae un receptor de prueba precargado. Borrar el valor y mantener la variable vacía salvo ejecución controlada.
4. **Seed inseguro:** datos demo y contraseña simple. Prohibir seed en producción, rotar cuentas y retirar usuarios de demostración.
5. **Migración al construir imagen:** el Dockerfile Backend ejecuta `db push --accept-data-loss` y oculta errores con `|| true`. Quitar esa operación del pipeline productivo y aplicar migraciones revisadas.
6. **Firma Wompi:** verificar conformidad exacta con el algoritmo/payload configurado por Wompi; no habilitar pagos productivos hasta completar prueba end-to-end de firma e idempotencia.
7. **HTTP local:** Compose publica servicios por HTTP sin proxy TLS. Un despliegue público necesita TLS, proxy/reverse proxy, política de red y CORS de dominio exacto.
8. **Adminer/PostgreSQL publicados:** limitar acceso a red privada/VPN y no exponer puertos directamente.
9. **Datos en localStorage:** el JWT está accesible a JavaScript del origen. Aplicar mitigaciones XSS/CSP y valorar estrategia de sesión acorde al modelo de amenazas.
10. **Sesión:** el cierre de sesión elimina token del navegador, pero no invalida un JWT ya emitido en servidor; un token robado permanece válido hasta expiración.

## 14. Ambientes identificados y no identificados

| Ambiente | ¿Identificado? | Evidencia y alcance |
|---|---|---|
| Desarrollo local | Sí | Compose predeterminado con `NODE_ENV=development`, Vite y Nest en modo watch; README también contempla modalidad mixta. |
| Pruebas unitarias Backend | Sí | Jest con `NODE_ENV=test` en ciertos tests y scripts de paquete. Es modo de pruebas del proceso, no servidor/base de QA independiente. |
| QA E2E local | Sí, como procedimiento | Playwright apunta por defecto a localhost:5173 y el test API a localhost:3000; requiere que los servicios estén levantados. No existe un archivo de configuración de entorno QA dedicado ni una DB QA separada identificada. |
| Integración continua | Sí | GitHub Actions ejecuta instalación, build y test Backend/Frontend. El workflow no provisiona PostgreSQL ni ejecuta Playwright. Sus ramas configuradas son `main` y `develop`; verificar alineación con la rama de trabajo vigente. |
| Staging/Preproducción | **No identificado** | No se encontró host, URL, Compose de staging, workflow de despliegue ni configuración de DB de preproducción. |
| Producción desplegada | **No identificada** | El código tiene ramas de seguridad para `NODE_ENV=production`, pero no se encontró servidor, dominio, proveedor cloud, manifiesto de despliegue ni conexión productiva documentada. |
| Base de datos de pruebas aislada | **No identificada** | QA por defecto llama a localhost y la prueba API modifica datos; no hay `DATABASE_URL` de QA independiente ni servicio PostgreSQL del workflow. |

Por lo tanto, sí hay **configuración de desarrollo**, **pruebas locales** y **CI**, pero no evidencia en el repositorio de ambientes desplegados de pruebas, staging o producción. Antes de ejecutar QA, configurar una base aislada y desecharla/restaurarla después.

## 15. Monitoreo, fallos y soporte

- Docker Compose verifica PostgreSQL con `pg_isready`; Backend consulta Swagger como señal de vida.
- No se identificó endpoint de salud dedicado, sistema de métricas, APM, agregador central de logs, alertas externas ni rotación de logs de aplicación.
- El Backend dispone de filtro global de excepciones y auditoría de acciones. La auditoría no reemplaza logs técnicos de infraestructura.
- Para diagnóstico inicial revisar `docker compose ps`, `docker compose logs db backend frontend`, conectividad a `DATABASE_URL`, estado de migraciones y `/api/docs`.
- Si falla correo, comprobar las variables SMTP y los registros de servicio; sin SMTP no se completa entrega real.
- Si falla pago, comprobar método QR habilitado, claves Wompi, URL de retorno, firma y disponibilidad pública del webhook; nunca marcar un pago como confirmado manualmente sin evidencia del proveedor.

## 16. Límites conocidos y decisiones de documentación

- Se documentó lo implementado en el repositorio; la visión de producto y los tickets no se promocionan a funcionalidades conectadas.
- Las exportaciones de reportes se generan como descarga de respuesta; el modelo `Report` existe, pero no se concluye que todos los exports queden guardados en almacenamiento persistente.
- Los campos JSON de configuración pueden almacenar datos de integración descriptivos. Solo se consideran operativos aquellos conectores que tienen código y ruta documentados.
- La documentación histórica contiene fechas, resultados, ubicaciones o migraciones que pueden no corresponder al código actual. Antes de usarlos como procedimiento, confirmar contra archivos fuente.
- No se reproduce el contenido del `.env` local ni claves, contraseñas, correo de override o URLs privadas.

## 17. Referencias técnicas del repositorio

- `README.md`: visión del monorepo, URLs locales, arranque y funcionalidades.
- `docker-compose.yml`: servicios, red, volúmenes, puertos y health checks.
- `Backend/package.json`, `Frontend/package.json`, `QA/package.json`: dependencias y comandos.
- `Backend/src/main.ts`, `Backend/src/app.module.ts`: bootstrap, CORS, validación, Swagger y módulos.
- `Backend/prisma/schema.prisma`, `Backend/prisma/migrations/`, `Backend/prisma/seed.ts`: modelo, cambios de BD y datos demo.
- `Frontend/src/App.tsx`, `Frontend/src/api.ts`, `Frontend/src/services/`: rutas y contrato HTTP cliente.
- `QA/playwright.config.ts`, `QA/tests/`: automatización funcional/API.
- `.github/workflows/ci.yml`: integración continua.
- `ops/prisma_orchestrator.sh`: administración de migraciones y utilidades Prisma en Compose.
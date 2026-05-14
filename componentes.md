# Inventario de Componentes del Proyecto (Frontend)

Este documento clasifica los componentes utilizados por tipo: HTML, CSS y JavaScript (incluyendo componentes React en TSX).

## 1. Componentes HTML

### 1.1 Plantilla HTML base

| Componente HTML | Archivo | Funcion |
|---|---|---|
| `html`, `head`, `body` | `Frontend/index.html` | Estructura base del documento web. |
| `meta charset` | `Frontend/index.html` | Define codificacion UTF-8. |
| `meta viewport` | `Frontend/index.html` | Habilita comportamiento responsive en moviles. |
| `link rel="icon"` | `Frontend/index.html` | Configura favicon del sitio. |
| `title` | `Frontend/index.html` | Titulo mostrado en la pestana del navegador. |
| `div#root` | `Frontend/index.html` | Punto de montaje de la aplicacion React. |
| `script type="module"` | `Frontend/index.html` | Carga el entrypoint `src/main.tsx`. |

### 1.2 Elementos HTML usados en componentes React (TSX)

| Tipo de elemento | Funcion principal en el proyecto | Archivos donde aparece |
|---|---|---|
| `main`, `section`, `header` | Estructura semantica de pantallas (checkout, auditoria, reportes, dashboard). | `Frontend/src/pages/PaymentCheckoutPage.tsx`, `Frontend/src/pages/AuditLogs.tsx`, `Frontend/src/components/reports/ReportsPanel.tsx` |
| `div`, `span`, `p` | Contenedores visuales, etiquetas, mensajes, KPIs y layout. | Presente en todos los paneles TSX |
| `h1`, `h2`, `h3` | Titulos y jerarquia visual de modulos. | `Frontend/src/pages/*`, `Frontend/src/components/*` |
| `form`, `label`, `input`, `select`, `option`, `button` | Formularios de login, filtros, configuracion, CRUD y acciones operativas. | `Frontend/src/pages/Login.tsx`, `Frontend/src/components/admin/*.tsx`, `Frontend/src/components/reports/ReportsPanel.tsx` |
| `a`, `Link` (renderiza `<a>`) | Navegacion interna y acciones de recuperacion/login. | `Frontend/src/pages/Login.tsx`, `Frontend/src/pages/PermissionsProfiles.tsx` |
| `table`, `thead`, `tbody`, `tr`, `th`, `td` | Tablas de permisos, auditoria y reportes. | `Frontend/src/pages/PermissionsProfiles.tsx`, `Frontend/src/pages/AuditLogs.tsx`, `Frontend/src/components/reports/ReportsPanel.tsx` |

## 2. Componentes CSS

## 2.1 CSS global y de diseno base

| Componente CSS | Archivo | Funcion |
|---|---|---|
| Estilos de raiz (`:root`, `body`, `#root`) | `Frontend/src/App.css` | Define tipografia base, colores globales y fondo general de la app. |
| Capas Tailwind (`@tailwind base/components/utilities`) | `Frontend/src/index.css` | Activa motor de Tailwind para utilidades y componentes reutilizables. |
| Capa base (`@layer base`) | `Frontend/src/index.css` | Estilo global de `body` y de seleccion de texto (`::selection`). |

### 2.2 Clases CSS reutilizables (design system interno)

Clases definidas en `Frontend/src/index.css` y usadas transversalmente:

- Layout: `.dashboard-shell`
- Cards/Paneles: `.panel-card`, `.panel-card__header`, `.panel-card__title`
- Formularios: `.input-field`, `.form-label`
- Botones: `.btn-primary`, `.btn-outline`, `.btn`, `.btn-action`, `.btn-suspend`, `.btn-suspend--danger`, `.btn-suspend--success`, `.btn-tariff-save`
- Elementos de estado: `.pill`, `.kpi-value`, `.kpi-label`

Funcion general: uniformar apariencia de dashboard, modulos administrativos y reportes sin duplicar estilos en cada componente.

### 2.3 CSS especializado por modulo

| Archivo | Componente CSS | Funcion |
|---|---|---|
| `Frontend/src/features/auth/login.css` | Estilos del flujo de login y recuperacion (`.login-wrapper`, `.login-form`, `.error-banner`, `.recovery-*`, etc.) | Crea la experiencia visual dedicada del modulo de autenticacion, con animacion de fondo, estados de error y recuperacion de contrasena. |

## 3. Componentes JavaScript / TypeScript (React)

Nota: el frontend de este proyecto esta implementado mayoritariamente en TypeScript (`.ts`/`.tsx`).

### 3.1 Componentes React de enrutamiento y bootstrap

| Componente | Archivo | Funcion |
|---|---|---|
| `App` | `Frontend/src/App.tsx` | Define rutas publicas/protegidas y ensambla la aplicacion. |
| `main.tsx` (bootstrap) | `Frontend/src/main.tsx` | Monta React en `#root`, carga estilos globales e i18n. |
| `AuthProvider` | `Frontend/src/context/AuthContext.tsx` | Administra sesion, expiracion, login/logout y estado de usuario. |
| `ProtectedRoute` | `Frontend/src/components/ProtectedRoute.tsx` | Restringe rutas para usuarios autenticados. |
| `PermissionRoute` | `Frontend/src/components/PermissionRoute.tsx` | Restringe rutas por permisos de pantalla. |

### 3.2 Paginas y paneles funcionales

| Componente | Archivo | Funcion |
|---|---|---|
| `Login` | `Frontend/src/pages/Login.tsx` | Inicio de sesion y flujo de recuperacion de contrasena. |
| `Dashboard` | `Frontend/src/pages/Dashboard.tsx` | Hub operativo: ingresos/salidas, KPIs y acceso a modulos. |
| `PaymentCheckoutPage` | `Frontend/src/pages/PaymentCheckoutPage.tsx` | Checkout publico para pagos QR/Wompi y polling de estado. |
| `AuditLogs` | `Frontend/src/pages/AuditLogs.tsx` | Consulta, filtrado y exportacion de auditoria. |
| `PermissionsProfiles` | `Frontend/src/pages/PermissionsProfiles.tsx` | Gestion de permisos por rol y por usuario. |
| `UserManagementPanel` | `Frontend/src/components/admin/UserManagementPanel.tsx` | CRUD administrativo de usuarios y estados. |
| `ClientManagementPanel` | `Frontend/src/components/admin/ClientManagementPanel.tsx` | Gestion de clientes, contratos, alertas y renovaciones. |
| `ConfigPanel` | `Frontend/src/components/admin/ConfigPanel.tsx` | Parametros generales, metodos de pago, tarifas y sedes. |
| `ConfirmActionModal` | `Frontend/src/components/admin/ConfirmActionModal.tsx` | Modal de confirmacion para acciones criticas. |
| `ReportsPanel` | `Frontend/src/components/reports/ReportsPanel.tsx` | Reportes tabulares/graficos y exportaciones. |

### 3.3 Archivos JavaScript de configuracion del frontend

| Archivo JS | Funcion |
|---|---|
| `Frontend/tailwind.config.js` | Configura Tailwind (paths de escaneo, tema, plugins). |
| `Frontend/postcss.config.js` | Configura pipeline de CSS con Tailwind + Autoprefixer. |
| `Frontend/eslint.config.js` | Define reglas de calidad y lint para TS/TSX, React Hooks y React Refresh. |

## 4. Resumen funcional por tipo

## 4. Componentes por Pantalla Solicitada

### 4.1 Pantalla de Usuarios

Pantalla principal: `Frontend/src/components/admin/UserManagementPanel.tsx` (se renderiza desde `Dashboard` cuando `activeView === 'users'`).

#### HTML utilizado

- `section`, `div`, `header`, `h1/h2`, `p`: estructura de panel y jerarquia visual.
- `form`, `label`, `input`, `select`, `option`: alta y edicion de usuarios.
- `button`: crear usuario, actualizar rol, activar/inactivar, editar, eliminar.
- `table`, `thead`, `tbody`, `tr`, `th`, `td`: listado de usuarios con filtros y acciones.

#### CSS utilizado

- Clases reutilizables de `Frontend/src/index.css`:
- `.panel-card`, `.panel-card__header`, `.panel-card__title`
- `.form-label`, `.input-field`
- `.btn-primary`, `.btn-outline`, `.btn-action`, `.btn-suspend`, `.btn-suspend--danger`, `.btn-suspend--success`
- `.pill`

#### JavaScript/TypeScript utilizado

- Componente: `UserManagementPanel`
- Soporte de UI: `ConfirmActionModal`
- Servicios y hooks: `usersService`, `useAutoDismiss`, `useAuth`
- Permisos: `hasScreenPermission`, `SCREEN_KEYS`
- Auto-refresh: escucha `DATA_UPDATED_EVENT`

Funcion: administrar ciclo de vida de usuarios (crear, listar, filtrar, editar, activar/inactivar y eliminar con confirmacion).

### 4.2 Pantalla de Registro de Vehiculos (Entrada)

Pantalla principal: `Frontend/src/pages/Dashboard.tsx` en la vista `operations`.

#### HTML utilizado

- `form` de entrada con `onSubmit={handleEntry}`.
- `label` + `input` para placa (`plateEntry`).
- `input` tipo radio para tipo de vehiculo (`CAR`, `MOTORCYCLE`).
- `select` + `option` para elegir parqueadero.
- `button` de envio: "Registrar entrada".
- `div`, `span`, `p` para mensajes/KPIs y feedback.

#### CSS utilizado

- `.panel-card`, `.panel-card__title` para bloques operativos.
- `.form-label`, `.input-field` para captura de datos.
- `.btn-primary` para accion principal de registro.
- `.pill`, `.kpi-value`, `.kpi-label` para estado operativo y metricas.

#### JavaScript/TypeScript utilizado

- Estado y normalizacion: `plateEntry`, `vehicleTypeEntry`, `selectedParkingId`, `normalizePlateInput`.
- Logica de envio: `handleEntry`.
- API: `api.post('/parking/entry', ...)`.
- Refresco y resumen: `cargarResumenTickets`.

Funcion: registrar ingreso de vehiculos con validacion de placa, tipo y parqueadero, y actualizar el estado operativo.

### 4.3 Pantalla de Salida de Vehiculos

Pantalla principal: `Frontend/src/pages/Dashboard.tsx` en la vista `operations`.

#### HTML utilizado

- `form` de salida con `onSubmit={handleExit}`.
- `label` + `input` para placa (`plateExit`).
- `button` de envio para registrar salida.
- `button` adicionales para cobrar en efectivo o generar pago QR cuando aplica.
- `div`, `p`, `span` para mostrar detalle de la ultima salida y estados de pago.
- Listas/tablas visuales de tickets activos/cerrados para control operativo.

#### CSS utilizado

- `.panel-card`, `.panel-card__title` para bloques de salida y resumen.
- `.form-label`, `.input-field` para busqueda y captura de placa.
- `.btn-primary`, `.btn-outline`, `.btn-action` para acciones de salida/cobro.
- `.pill`, `.kpi-value`, `.kpi-label` para indicadores y conteos.

#### JavaScript/TypeScript utilizado

- Estado y normalizacion: `plateExit`, `lastExit`, `normalizePlateInput` (salida con maximo 7 para legado).
- Logica de salida: `handleExit`.
- Pagos asociados: `handleGenerateExitPayment`, `handleRegisterExitCashPayment`, `paymentsService`.
- API: `api.post('/parking/exit', ...)` y endpoints de pagos.
- Refresco operativo: `cargarResumenTickets`, filtros `ticketsActivos/ticketsCerrados`.

Funcion: registrar salida de vehiculos, mostrar liquidacion, y completar cierre del ticket mediante pago efectivo o QR.

## 5. Resumen funcional por tipo

- HTML: aporta estructura semantica, formularios, tablas y puntos de montaje de la SPA.
- CSS: define identidad visual global + componentes de interfaz reutilizables + estilos especializados de login.
- JavaScript/TypeScript: implementa logica de negocio de UI, rutas, permisos, estado de sesion y configuracion de tooling.

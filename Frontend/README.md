# Frontend RM Parking

Aplicacion web principal de RM Parking. Incluye interfaz operativa, administracion, reportes y pantalla publica para pagos por QR.

## Stack Tecnologico

- React 19
- Vite
- TypeScript
- Tailwind CSS
- Axios

## Estructura Relevante

- `src/pages/`: paginas principales (login, dashboard, auditoria, pago QR).
- `src/components/`: componentes por modulo.
- `src/services/`: clientes HTTP para backend.
- `src/context/`: estado de autenticacion.
- `src/hooks/`: hooks reutilizables.
- `src/utils/`: utilidades compartidas.

## Requisitos

- Node.js 18+
- npm 10+
- Backend disponible en `VITE_API_URL`

## Variables de Entorno

- `VITE_API_URL` (por defecto `http://localhost:3000`)

## Ejecucion Local

```bash
npm install
npm run dev -- --host
```

Aplicacion disponible en:

- `http://localhost:5173`

## Scripts

```bash
# desarrollo
npm run dev

# build de produccion
npm run build

# previsualizar build
npm run preview

# lint
npm run lint
```

## Flujos Funcionales

- Login y control de permisos por modulo.
- Operacion de ingreso/salida de vehiculos.
- Gestion de usuarios y clientes.
- Configuracion de parametros, tarifas y metodos de pago.
- Reportes administrativos.
- Pantalla publica de pago QR: `/pago/:paymentId`.

## Integracion con Backend

- Cliente base en `src/api.ts`.
- Interceptor de token JWT para rutas protegidas.
- Servicios de dominio en `src/services/`.

## Notas

- Para desarrollo mixto recomendado: backend local + frontend local + base de datos en Docker.
- Si cambias `VITE_API_URL`, reinicia el servidor de desarrollo de Vite.

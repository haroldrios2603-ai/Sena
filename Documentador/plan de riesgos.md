# Plan de riesgos

## Contexto
Este documento define los riesgos principales para llevar el proyecto a un modelo multiplataforma (web, escritorio y movil) manteniendo una sola base funcional, buen rendimiento y trazabilidad operativa.

## Objetivo
- Reducir fallas en guardado, edicion y operacion diaria.
- Asegurar experiencia usable en escritorio y pantallas moviles.
- Mantener seguridad, auditoria y continuidad del servicio.

## Alcance
- Frontend React (web actual)
- Empaquetado escritorio (Tauri/Electron)
- Empaquetado movil (Capacitor)
- Backend NestJS + Prisma + PostgreSQL
- Seguridad, auditoria y despliegue

## Matriz de riesgos priorizada

### R1. Inconsistencias entre plataformas
- Probabilidad: Alta
- Impacto: Alto
- Senal temprana: flujos que funcionan en web y fallan en movil/escritorio
- Mitigacion:
  - Definir un set unico de contratos API y validaciones
  - Matriz de pruebas cruzadas por plataforma y resolucion
  - Checklist de release por flujo critico (login, crear, editar, renovar, auditar)
- Contingencia:
  - Feature flags para desactivar funciones inestables por plataforma

### R2. UX pobre en pantallas pequenas
- Probabilidad: Alta
- Impacto: Alto
- Senal temprana: modales cortados, tablas ilegibles, botones dificiles de tocar
- Mitigacion:
  - Diseno mobile-first para formularios, tablas y modales
  - Scroll interno en overlays y jerarquia visual por prioridad
  - Controles tactiles con area minima recomendada
- Contingencia:
  - Version simplificada del flujo en movil para tareas criticas

### R3. Fallas en red y sesion en movil
- Probabilidad: Media
- Impacto: Alto
- Senal temprana: errores al volver del background, tokens expirados sin manejo claro
- Mitigacion:
  - Politica robusta de refresh token
  - Manejo explicito de reconexion y reintentos idempotentes
  - Mensajeria de estado (sincronizando, guardado pendiente, reintentar)
- Contingencia:
  - Cola local temporal para acciones no criticas con reenvio controlado

### R4. Seguridad de credenciales y datos sensibles
- Probabilidad: Media
- Impacto: Muy alto
- Senal temprana: tokens expuestos, secretos en cliente, CORS abierto en produccion
- Mitigacion:
  - Secretos solo en backend
  - HTTPS obligatorio y cabeceras de seguridad
  - Rotacion de llaves y politicas de sesion por plataforma
- Contingencia:
  - Revocacion masiva de sesiones + auditoria de incidente

### R5. Regresiones en guardado/edicion
- Probabilidad: Media
- Impacto: Muy alto
- Senal temprana: cambios no persistidos o persistidos parcialmente
- Mitigacion:
  - Pruebas de contrato API y pruebas E2E de flujos de negocio
  - Validacion backend centralizada y transacciones en operaciones compuestas
  - Monitoreo de errores de escritura y alertas por endpoint
- Contingencia:
  - Rollback de version + scripts de reconciliacion de datos

### R6. Auditoria incompleta de cambios
- Probabilidad: Media
- Impacto: Alto
- Senal temprana: acciones de update sin rastro o sin before/after
- Mitigacion:
  - Estandar obligatorio de auditoria para CREATE/UPDATE/DELETE
  - Revisiones de PR con checklist de trazabilidad
  - Pruebas automatizadas que validen eventos de auditoria en flujos criticos
- Contingencia:
  - Registro forense temporal en logs de aplicacion mientras se corrige

### R7. Dependencia de hardware/camara para futuras integraciones ALPR
- Probabilidad: Media
- Impacto: Alto
- Senal temprana: latencia alta, lecturas duplicadas o no confiables
- Mitigacion:
  - Abstraccion por proveedor y cola asincrona de eventos
  - Umbral de confianza + confirmacion humana en casos ambiguos
  - Pruebas en ambiente real por sede
- Contingencia:
  - Modo manual operativo sin bloqueo del negocio

### R8. Distribucion y actualizaciones de escritorio
- Probabilidad: Media
- Impacto: Medio-Alto
- Senal temprana: instalaciones fallidas, bloqueos por firma, versiones fragmentadas
- Mitigacion:
  - Pipeline de build firmado
  - Estrategia de auto-update con canales (stable/canary)
  - Politica minima de version soportada
- Contingencia:
  - Instalador offline de emergencia + guia de rollback

## Riesgos tecnicos por fase

### Fase 1 (Web robusta + responsive)
- Riesgo dominante: UX movil y regresiones de formularios
- Gate de salida:
  - Build estable
  - Pruebas backend verdes
  - Smoke E2E en login/crear/editar/renovar/auditoria

### Fase 2 (Empaquetado movil)
- Riesgo dominante: sesion, permisos nativos y red inestable
- Gate de salida:
  - Pruebas en Android real
  - Validacion de reconexion y expiracion de token

### Fase 3 (Empaquetado escritorio)
- Riesgo dominante: distribucion, actualizacion y firma
- Gate de salida:
  - Instalador firmado
  - Upgrade sin perdida de configuracion

## Controles transversales
- Checklist de release por modulo
- Politica de feature flags
- Telemetria de errores y tiempos de API
- Backups y pruebas de restauracion
- Monitor de auditoria para operaciones criticas

## KPI de riesgo (seguimiento semanal)
- Tasa de errores en guardado/edicion
- Tiempo promedio de recuperacion ante incidente
- Porcentaje de flujos con auditoria completa
- Defectos responsive por version
- Defectos criticos por plataforma

## Criterios de aceptacion del plan
- Cero bloqueantes en flujos criticos de negocio
- Auditoria verificable para cambios de usuarios, clientes y configuraciones
- Usabilidad valida en desktop y movil
- Procedimiento de rollback probado y documentado

## Responsables sugeridos
- Lider tecnico: arquitectura y estandares de integracion
- Backend: contratos API, transacciones, auditoria
- Frontend: UX responsive y consistencia de formularios
- QA: cobertura funcional y de dispositivos
- DevOps: despliegue, observabilidad y rollback

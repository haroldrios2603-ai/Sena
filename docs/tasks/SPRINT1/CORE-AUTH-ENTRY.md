# TICKET: Integración Login y JWT
**ID:** SPRINT1-AUTH-001
**Rol:** Backend + Frontend
**Sprint:** 1
**Estado:** Completado

## Descripción
Asegurar que el flujo de autenticación esté completo. El frontend debe enviar credenciales, recibir el JWT y guardarlo para peticiones subsecuentes.

## Criterios de Aceptación
- [x] Endpoint `/auth/login` valida contra la BD (usa el seed).
- [x] Frontend maneja el estado de autenticación (Context/Store).
- [x] Protección de rutas en el Frontend (solo Dashboard si está logueado).

---

# TICKET: Registro de Ingreso de Vehículo
**ID:** SPRINT1-CORE-001
**Rol:** Backend + Frontend
**Sprint:** 1
**Estado:** Completado

## Descripción
Implementar el formulario de ingreso. El operario ingresa placa y tipo de vehículo. El sistema genera un Ticket.

## Criterios de Aceptación
- [x] Endpoint `POST /parking/entry` crea un ticket en estado `ACTIVE`.
- [x] Frontend muestra formulario de ingreso con validación de placa.
- [x] Notificación de éxito al registrar ingreso.

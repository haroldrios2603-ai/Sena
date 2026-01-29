# TICKET: Integración Login y JWT
**ID:** SPRINT1-AUTH-001
**Rol:** Backend + Frontend
**Sprint:** 1

## Descripción
Asegurar que el flujo de autenticación esté completo. El frontend debe enviar credenciales, recibir el JWT y guardarlo para peticiones subsecuentes.

## Criterios de Aceptación
- [ ] Endpoint `/auth/login` valida contra la BD (usa el seed).
- [ ] Frontend maneja el estado de autenticación (Context/Store).
- [ ] Protección de rutas en el Frontend (solo Dashboard si está logueado).

---

# TICKET: Registro de Ingreso de Vehículo
**ID:** SPRINT1-CORE-001
**Rol:** Backend + Frontend
**Sprint:** 1

## Descripción
Implementar el formulario de ingreso. El operario ingresa placa y tipo de vehículo. El sistema genera un Ticket.

## Criterios de Aceptación
- [ ] Endpoint `POST /parking/entry` crea un ticket en estado `ACTIVE`.
- [ ] Frontend muestra formulario de ingreso con validación de placa.
- [ ] Notificación de éxito al registrar ingreso.

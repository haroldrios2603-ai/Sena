# Flujo de recuperación de contraseña

## Resumen funcional
- El formulario de inicio de sesión ahora incluye el enlace **¿Olvidaste tu contraseña?**.
- El usuario debe ingresar primero su correo en el campo de email.
- Al pulsar el enlace se invoca `authService.requestPasswordReset`, que enviará la solicitud al backend (endpoint pendiente: `POST /auth/password/request`).
- Tras obtener respuesta positiva se le informa que se envió un código y aparecen los nuevos campos para ingresar dicho código y definir la nueva contraseña.
- Al confirmar, se llama a `authService.confirmPasswordReset` (endpoint pendiente: `POST /auth/password/reset`).
- Si el backend confirma el cambio, el frontend muestra un mensaje y sugiere iniciar sesión con la nueva clave.

## Consideraciones técnicas
- El backend ahora cuenta con los endpoints reales:
	- `POST /auth/password/request`: genera un código alfanumérico, lo guarda en la tabla `PasswordResetToken` y deja listo el envío (actualmente se registra en logs; falta integrar proveedor de email/SMS).
	- `POST /auth/password/reset`: valida código vigente, actualiza la contraseña con `bcrypt` y marca el token como usado.
- Las tablas se extendieron con el modelo `PasswordResetToken` (migración `password-reset-tokens`).
- El flujo se diseñó para no interferir con el inicio de sesión tradicional: se puede cancelar la recuperación en cualquier momento y continuar con el login.
- Los nuevos campos y botones sólo aparecen cuando el código ha sido solicitado exitosamente.
- Todo el código relacionado incluye comentarios en español.

## Próximos pasos backend
1. Integrar servicio de notificaciones (correo/SMS) que envíe el código generado.
2. Agregar límites de intentos y rate limiting para evitar abuso del endpoint.
3. Opcional: almacenar IP/agente para auditoría en `PasswordResetToken`.

## Próximos pasos frontend
1. Integrar estados de error específicos que provengan del backend (token expirado, código inválido, etc.).
2. Incorporar feedback visual adicional (temporizador para reenviar código, máscaras de contraseña configurables).
3. Una vez listos los endpoints, eliminar la etiqueta de "pendiente" en los comentarios del servicio.

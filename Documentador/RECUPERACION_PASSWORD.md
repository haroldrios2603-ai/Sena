# Flujo de recuperación de contraseña

## Resumen funcional
- El formulario de inicio de sesión ahora incluye el enlace **¿Olvidaste tu contraseña?**.
- El usuario debe ingresar primero su correo en el campo de email.
- Al pulsar el enlace se invoca `authService.requestPasswordReset`, que envía la solicitud a `POST /auth/password/request`.
- Tras obtener respuesta positiva se le informa que se envió un código y aparecen los nuevos campos para ingresar dicho código y definir la nueva contraseña.
- Al confirmar, se llama a `authService.confirmPasswordReset` en `POST /auth/password/reset`.
- Si el backend confirma el cambio, el frontend muestra un mensaje y sugiere iniciar sesión con la nueva clave.

## Consideraciones técnicas
- El backend ahora cuenta con los endpoints reales:
	- `POST /auth/password/request`: genera un código alfanumérico, lo guarda en la tabla `PasswordResetToken` y dispara el flujo de notificación configurado.
	- `POST /auth/password/reset`: valida código vigente, actualiza la contraseña con `bcrypt` y marca el token como usado.
- Las tablas se extendieron con el modelo `PasswordResetToken` (migración `password-reset-tokens`).
- El flujo se diseñó para no interferir con el inicio de sesión tradicional: se puede cancelar la recuperación en cualquier momento y continuar con el login.
- Los nuevos campos y botones sólo aparecen cuando el código ha sido solicitado exitosamente.
- Todo el código relacionado incluye comentarios en español.

## Configuración obligatoria para entorno real
- Definir variables SMTP en `Backend/.env`:
	- `SMTP_HOST`
	- `SMTP_PORT`
	- `SMTP_USER`
	- `SMTP_PASS`
	- `SMTP_FROM`
- En pruebas controladas se puede usar `PASSWORD_RESET_DELIVERY_OVERRIDE` para redirigir todos los correos a una sola bandeja.
- Si `PASSWORD_RESET_DELIVERY_OVERRIDE` está vacío, cada código se envía al correo real solicitado por el usuario.

## Mejoras recomendadas de backend
1. Agregar límites de intentos y rate limiting para evitar abuso del endpoint.
2. Añadir bloqueo temporal por múltiples intentos fallidos.
3. Registrar IP/agente/dispositivo para mejorar trazabilidad de seguridad.

## Mejoras recomendadas de frontend
1. Integrar estados de error específicos que provengan del backend (token expirado, código inválido, etc.).
2. Incorporar feedback visual adicional (temporizador para reenviar código, máscaras de contraseña configurables).
3. Añadir mensajes de accesibilidad para lectores de pantalla en formularios de recuperación.

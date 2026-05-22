import { SetMetadata } from '@nestjs/common';

export const SCREEN_PERMISSION_KEY = 'screen_permission_key';

/**
 * Decorador para declarar permisos de pantalla requeridos por un handler.
 *
 * - `screenKey` puede ser una clave única o un arreglo de claves válidas para ese handler.
 * - Un guard (ej. `ScreenPermissionGuard`) consultará esta metadata para autorizar acceso.
 */
export const RequireScreenPermission = (screenKey: string | string[]) =>
  SetMetadata(SCREEN_PERMISSION_KEY, screenKey);

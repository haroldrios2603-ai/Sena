import { SetMetadata } from '@nestjs/common';

export const SCREEN_PERMISSION_KEY = 'screen_permission_key';

export const RequireScreenPermission = (screenKey: string) =>
  SetMetadata(SCREEN_PERMISSION_KEY, screenKey);

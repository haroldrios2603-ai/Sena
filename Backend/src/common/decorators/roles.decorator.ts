import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

/**
 * Decorador para declarar los roles autorizados en un handler específico.
 * ES: Usa metadata reflejada para que RolesGuard evalúe la petición actual.
 */
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);

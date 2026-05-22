/**
 * Decorador para asignar roles permitidos a handlers.
 */
import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

/**
 * Decorador para declarar los roles autorizados en un handler específico.
 *
 * Uso:
 * - Añadir `@Roles(Role.SUPER_ADMIN, Role.ADMIN)` sobre controladores o handlers.
 * - `RolesGuard` leerá esta metadata y validará el rol del usuario autenticado.
 */
/**
 * Constante Roles utilizada en la configuración o la lógica de decorators.
 */
/**
 * Constante Roles utilizada en la configuración o la lógica de decorators.
 */
/**
 * Constante Roles utilizada en la configuración o la lógica de decorators.
 */
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);

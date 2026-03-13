import { Role } from '@prisma/client';

export type ScreenDefinition = {
  key: string;
  name: string;
  description: string;
  route: string;
};

export const APP_SCREEN_DEFINITIONS: ScreenDefinition[] = [
  {
    key: 'operations-dashboard',
    name: 'Operación diaria',
    description: 'Registro de entradas, salidas y seguimiento operativo.',
    route: '/dashboard',
  },
  {
    key: 'settings-config',
    name: 'Configuración',
    description: 'Parámetros operativos, tarifas y sedes.',
    route: '/dashboard',
  },
  {
    key: 'users-management',
    name: 'Usuarios',
    description: 'Gestión de usuarios, roles y estados.',
    route: '/dashboard',
  },
  {
    key: 'clients-management',
    name: 'Clientes',
    description: 'Contratos y alertas de clientes mensuales.',
    route: '/dashboard',
  },
  {
    key: 'settings-permissions-profiles',
    name: 'Permisos por perfil',
    description: 'Asignación de permisos de visualización por rol o usuario.',
    route: '/settings/permissions-profiles',
  },
  {
    key: 'admin-audit-logs',
    name: 'Auditoría',
    description: 'Consulta de trazabilidad y eventos críticos del sistema.',
    route: '/admin/auditoria',
  },
];

export const DEFAULT_ROLE_SCREEN_PERMISSIONS: Record<Role, string[]> = {
  SUPER_ADMIN: APP_SCREEN_DEFINITIONS.map((screen) => screen.key),
  ADMIN_PARKING: ['operations-dashboard', 'clients-management'],
  OPERATOR: ['operations-dashboard'],
  AUDITOR: ['operations-dashboard', 'admin-audit-logs'],
  CLIENT: [],
};

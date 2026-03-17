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
    key: 'acceso-reportes',
    name: 'Reportes',
    description: 'Acceso general al módulo de reportes operativos.',
    route: '/reportes',
  },
  {
    key: 'ver-reporte-trabajadores',
    name: 'Reporte de trabajadores en turno',
    description: 'Visualiza trabajadores presentes en el turno actual.',
    route: '/reportes',
  },
  {
    key: 'ver-reporte-vehiculos',
    name: 'Reporte de vehículos',
    description: 'Consulta cantidad de vehículos por día, semana y mes.',
    route: '/reportes',
  },
  {
    key: 'ver-reporte-facturacion',
    name: 'Reporte de facturación',
    description: 'Consulta facturación total y detalle por cliente.',
    route: '/reportes',
  },
  {
    key: 'ver-reporte-mensualidades',
    name: 'Reporte de mensualidades',
    description: 'Consulta estado de pagos de planes mensuales.',
    route: '/reportes',
  },
  {
    key: 'ver-reporte-asistencia',
    name: 'Reporte de asistencia',
    description: 'Consulta entradas, salidas y horas trabajadas por empleado.',
    route: '/reportes',
  },
  {
    key: 'ver-reporte-ingresos-grafico',
    name: 'Reporte de ingresos por tipo',
    description: 'Consulta ingresos por tipo de vehículo con gráficos.',
    route: '/reportes',
  },
  {
    key: 'ver-reporte-horas-pico',
    name: 'Reporte de horas y días pico',
    description: 'Consulta afluencia por hora y día de la semana.',
    route: '/reportes',
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
  ADMIN_PARKING: [
    'operations-dashboard',
    'clients-management',
    'acceso-reportes',
    'ver-reporte-trabajadores',
    'ver-reporte-vehiculos',
    'ver-reporte-facturacion',
    'ver-reporte-mensualidades',
    'ver-reporte-asistencia',
    'ver-reporte-ingresos-grafico',
    'ver-reporte-horas-pico',
  ],
  OPERATOR: ['operations-dashboard', 'acceso-reportes', 'ver-reporte-vehiculos'],
  AUDITOR: [
    'operations-dashboard',
    'admin-audit-logs',
    'acceso-reportes',
    'ver-reporte-trabajadores',
    'ver-reporte-vehiculos',
    'ver-reporte-facturacion',
    'ver-reporte-mensualidades',
    'ver-reporte-asistencia',
    'ver-reporte-ingresos-grafico',
    'ver-reporte-horas-pico',
  ],
  CLIENT: [],
};

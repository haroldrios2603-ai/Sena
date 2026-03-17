import type { Role } from './context/types';

export const SCREEN_KEYS = {
    OPERATIONS: 'operations-dashboard',
    SETTINGS: 'settings-config',
    USERS: 'users-management',
    CLIENTS: 'clients-management',
    REPORTS_ACCESS: 'acceso-reportes',
    REPORTS_WORKERS: 'ver-reporte-trabajadores',
    REPORTS_VEHICLES: 'ver-reporte-vehiculos',
    REPORTS_BILLING: 'ver-reporte-facturacion',
    REPORTS_MONTHLY: 'ver-reporte-mensualidades',
    REPORTS_ATTENDANCE: 'ver-reporte-asistencia',
    REPORTS_INCOME: 'ver-reporte-ingresos-grafico',
    REPORTS_PEAK: 'ver-reporte-horas-pico',
    PERMISSIONS_PROFILES: 'settings-permissions-profiles',
    AUDIT_LOGS: 'admin-audit-logs',
} as const;

const LEGACY_ROLE_DEFAULTS: Record<Role, string[]> = {
    SUPER_ADMIN: Object.values(SCREEN_KEYS),
    ADMIN_PARKING: [
        SCREEN_KEYS.OPERATIONS,
        SCREEN_KEYS.CLIENTS,
        SCREEN_KEYS.REPORTS_ACCESS,
        SCREEN_KEYS.REPORTS_WORKERS,
        SCREEN_KEYS.REPORTS_VEHICLES,
        SCREEN_KEYS.REPORTS_BILLING,
        SCREEN_KEYS.REPORTS_MONTHLY,
        SCREEN_KEYS.REPORTS_ATTENDANCE,
        SCREEN_KEYS.REPORTS_INCOME,
        SCREEN_KEYS.REPORTS_PEAK,
    ],
    OPERATOR: [SCREEN_KEYS.OPERATIONS, SCREEN_KEYS.REPORTS_ACCESS, SCREEN_KEYS.REPORTS_VEHICLES],
    AUDITOR: [
        SCREEN_KEYS.OPERATIONS,
        SCREEN_KEYS.AUDIT_LOGS,
        SCREEN_KEYS.REPORTS_ACCESS,
        SCREEN_KEYS.REPORTS_WORKERS,
        SCREEN_KEYS.REPORTS_VEHICLES,
        SCREEN_KEYS.REPORTS_BILLING,
        SCREEN_KEYS.REPORTS_MONTHLY,
        SCREEN_KEYS.REPORTS_ATTENDANCE,
        SCREEN_KEYS.REPORTS_INCOME,
        SCREEN_KEYS.REPORTS_PEAK,
    ],
    CLIENT: [],
};

export const hasScreenPermission = (
    role: Role | undefined,
    explicitPermissions: string[] | undefined,
    screenKey: string,
) => {
    if (Array.isArray(explicitPermissions) && explicitPermissions.length > 0) {
        return explicitPermissions.includes(screenKey);
    }
    if (!role) {
        return false;
    }
    return LEGACY_ROLE_DEFAULTS[role]?.includes(screenKey) ?? false;
};

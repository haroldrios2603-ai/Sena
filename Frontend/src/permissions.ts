import type { Role } from './context/types';

export const SCREEN_KEYS = {
    OPERATIONS: 'operations-dashboard',
    SETTINGS: 'settings-config',
    USERS: 'users-management',
    CLIENTS: 'clients-management',
    PERMISSIONS_PROFILES: 'settings-permissions-profiles',
    AUDIT_LOGS: 'admin-audit-logs',
} as const;

const LEGACY_ROLE_DEFAULTS: Record<Role, string[]> = {
    SUPER_ADMIN: Object.values(SCREEN_KEYS),
    ADMIN_PARKING: [SCREEN_KEYS.OPERATIONS, SCREEN_KEYS.CLIENTS],
    OPERATOR: [SCREEN_KEYS.OPERATIONS],
    AUDITOR: [SCREEN_KEYS.OPERATIONS, SCREEN_KEYS.AUDIT_LOGS],
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

/**
 * Servicio que contiene la lógica de negocio para services.
 */
import api from '../api';
import type { Role } from '../context/types';

/**
 * Interfaz AppScreen que define la forma de datos usada en services.
 */
/**
 * Interfaz AppScreen que define la forma de datos usada en services.
 */
/**
 * Interfaz AppScreen que define la forma de datos usada en services.
 */
export interface AppScreen {
    key: string;
    name: string;
    description?: string;
    route?: string;
    isActive: boolean;
}

/**
 * Interfaz ScreenPermission que define la forma de datos usada en services.
 */
/**
 * Interfaz ScreenPermission que define la forma de datos usada en services.
 */
/**
 * Interfaz ScreenPermission que define la forma de datos usada en services.
 */
export interface ScreenPermission {
    screenKey: string;
    screenName?: string;
    route?: string;
    canView: boolean;
    source?: string;
    inherited?: boolean;
}

/**
 * Interfaz UserPermissionsResponse que define la forma de datos usada en services.
 */
/**
 * Interfaz UserPermissionsResponse que define la forma de datos usada en services.
 */
/**
 * Interfaz UserPermissionsResponse que define la forma de datos usada en services.
 */
export interface UserPermissionsResponse {
    user: {
        id: string;
        email: string;
        fullName: string;
        role: Role;
    };
    permissions: ScreenPermission[];
}

const permissionsService = {
    async getScreens() {
        const response = await api.get<AppScreen[]>('/permissions/screens');
        return response.data;
    },
    async getRolePermissions(role: Role) {
        const response = await api.get<ScreenPermission[]>(`/permissions/roles/${role}`);
        return response.data;
    },
    async saveRolePermissions(role: Role, permissions: Array<{ screenKey: string; canView: boolean }>) {
        const response = await api.put<ScreenPermission[]>(`/permissions/roles/${role}`, { permissions });
        return response.data;
    },
    async getUserPermissions(userId: string) {
        const response = await api.get<UserPermissionsResponse>(`/permissions/users/${userId}`);
        return response.data;
    },
    async saveUserPermissions(userId: string, permissions: Array<{ screenKey: string; canView: boolean }>) {
        const response = await api.put<UserPermissionsResponse>(`/permissions/users/${userId}`, { permissions });
        return response.data;
    },
    async getMyEffectivePermissions() {
        const response = await api.get<{ allowedScreenKeys: string[] }>('/permissions/me');
        return response.data;
    },
};

export default permissionsService;

import api from '../api';
import type { Role, User, DocumentType } from '../context/types';

export interface CreateUserPayload {
    fullName: string;
    email: string;
    contactPhone: string;
    password: string;
    role: Role;
    documentType?: DocumentType;
    documentNumber?: string;
}

export interface UserFilters {
    role?: Role;
    isActive?: 'true' | 'false';
    fullName?: string;
    email?: string;
    contactPhone?: string;
    documentNumber?: string;
}

export interface UpdateUserPayload {
    fullName?: string;
    email?: string;
    contactPhone?: string;
    role?: Role;
    isActive?: boolean;
    documentType?: DocumentType | null;
    documentNumber?: string | null;
}

const usersService = {
    /**
     * Recupera la lista de usuarios administrativos con filtros opcionales.
     */
    async listUsers(filters?: UserFilters) {
        const response = await api.get<User[]>('/users', { params: filters });
        return response.data;
    },

    /**
     * Crea un nuevo usuario operativo.
     */
    async createUser(payload: CreateUserPayload) {
        const response = await api.post<User>('/users', payload);
        return response.data;
    },

    /**
     * Cambia el rol del usuario indicado.
     */
    async updateUserRole(userId: string, role: Role) {
        const response = await api.patch<User>(`/users/${userId}/role`, { role });
        return response.data;
    },

    /**
     * Activa o desactiva la cuenta del usuario.
     */
    async updateUserStatus(userId: string, isActive: boolean) {
        const response = await api.patch<User>(`/users/${userId}/status`, { isActive });
        return response.data;
    },

    /**
     * Actualiza los datos generales de un usuario.
     */
    async updateUser(userId: string, payload: UpdateUserPayload) {
        const response = await api.patch<User>(`/users/${userId}`, payload);
        return response.data;
    },

    /**
     * Archiva un usuario administrativo.
     */
    async deleteUser(userId: string) {
        const response = await api.delete<{ id: string; deleted: boolean; archived: boolean }>(`/users/${userId}`);
        return response.data;
    },

    /**
     * Restaura un usuario archivado.
     */
    async restoreUser(userId: string) {
        const response = await api.post<{ id: string; restored: boolean }>(`/users/${userId}/restore`);
        return response.data;
    },
};

export default usersService;

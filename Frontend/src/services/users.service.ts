import api from '../api';
import type { Role, User } from '../context/types';

export interface CreateUserPayload {
    fullName: string;
    email: string;
    password: string;
    role: Role;
}

export interface UserFilters {
    role?: Role;
    isActive?: 'true' | 'false';
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
};

export default usersService;

/**
 * Servicio que contiene la lógica de negocio para services.
 */
import api from '../api';

/**
 * Tipo AuditOperation para definir la estructura de datos utilizada en services.
 */
/**
 * Tipo AuditOperation para definir la estructura de datos utilizada en services.
 */
/**
 * Tipo AuditOperation para definir la estructura de datos utilizada en services.
 */
export type AuditOperation =
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'VIEW'
    | 'LOGIN'
    | 'LOGOUT'
    | 'LOGIN_FAILED'
    | 'FORBIDDEN'
    | 'PASSWORD_CHANGE'
    | 'EXPORT';

/**
 * Tipo AuditResult para definir la estructura de datos utilizada en services.
 */
/**
 * Tipo AuditResult para definir la estructura de datos utilizada en services.
 */
/**
 * Tipo AuditResult para definir la estructura de datos utilizada en services.
 */
export type AuditResult = 'SUCCESS' | 'FAILURE';

/**
 * Interfaz AuditLogItem que define la forma de datos usada en services.
 */
/**
 * Interfaz AuditLogItem que define la forma de datos usada en services.
 */
/**
 * Interfaz AuditLogItem que define la forma de datos usada en services.
 */
export interface AuditLogItem {
    id: string;
    timestamp: string;
    userId?: string | null;
    userEmail?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    operation: AuditOperation;
    entity: string;
    recordId?: string | null;
    previousValues?: unknown;
    newValues?: unknown;
    result: AuditResult;
    errorCode?: string | null;
    errorMessage?: string | null;
    endpoint?: string | null;
    method?: string | null;
    requestParams?: unknown;
    responseTimeMs?: number | null;
    metadata?: unknown;
}

/**
 * Interfaz AuditListResponse que define la forma de datos usada en services.
 */
/**
 * Interfaz AuditListResponse que define la forma de datos usada en services.
 */
/**
 * Interfaz AuditListResponse que define la forma de datos usada en services.
 */
export interface AuditListResponse {
    items: AuditLogItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

/**
 * Interfaz AuditFilters que define la forma de datos usada en services.
 */
/**
 * Interfaz AuditFilters que define la forma de datos usada en services.
 */
/**
 * Interfaz AuditFilters que define la forma de datos usada en services.
 */
export interface AuditFilters {
    from?: string;
    to?: string;
    userId?: string;
    userEmail?: string;
    operation?: AuditOperation;
    entity?: string;
    recordId?: string;
    result?: AuditResult;
    page?: number;
    pageSize?: number;
}

const auditService = {
    async list(filters: AuditFilters) {
        const response = await api.get<AuditListResponse>('/audit/logs', { params: filters });
        return response.data;
    },
    async getById(id: string) {
        const response = await api.get<AuditLogItem>(`/audit/logs/${id}`);
        return response.data;
    },
    async exportLogs(format: 'csv' | 'json', filters: AuditFilters) {
        const response = await api.get('/audit/export', {
            params: { ...filters, format },
            responseType: 'blob',
        });
        return response.data as Blob;
    },
};

export default auditService;

import api from '../api';

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

export type AuditResult = 'SUCCESS' | 'FAILURE';

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

export interface AuditListResponse {
    items: AuditLogItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

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

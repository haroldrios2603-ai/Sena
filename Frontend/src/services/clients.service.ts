/**
 * Servicio que contiene la lógica de negocio para services.
 */
import api from '../api';
import type { DocumentType } from '../context/types';

/**
 * Interfaz CreateClientPayload que define la forma de datos usada en services.
 */
/**
 * Interfaz CreateClientPayload que define la forma de datos usada en services.
 */
/**
 * Interfaz CreateClientPayload que define la forma de datos usada en services.
 */
export interface CreateClientPayload {
    fullName: string;
    email: string;
    contactPhone: string;
    parkingId: string;
    startDate: string;
    endDate: string;
    monthlyFee: number;
    planName?: string;
    documentType?: DocumentType;
    documentNumber?: string;
}

/**
 * Interfaz ContractFilters que define la forma de datos usada en services.
 */
/**
 * Interfaz ContractFilters que define la forma de datos usada en services.
 */
/**
 * Interfaz ContractFilters que define la forma de datos usada en services.
 */
export interface ContractFilters {
    fullName?: string;
    email?: string;
    contactPhone?: string;
    parkingId?: string;
    parkingName?: string;
    planName?: string;
    status?: 'ACTIVE' | 'EXPIRED' | 'EXPIRING_SOON' | 'PAYMENT_PENDING' | 'CANCELLED';
    documentNumber?: string;
}

/**
 * Interfaz RenewContractPayload que define la forma de datos usada en services.
 */
/**
 * Interfaz RenewContractPayload que define la forma de datos usada en services.
 */
/**
 * Interfaz RenewContractPayload que define la forma de datos usada en services.
 */
export interface RenewContractPayload {
    newEndDate: string;
    paymentDate: string;
    monthlyFee?: number;
}

/**
 * Interfaz UpdateContractPayload que define la forma de datos usada en services.
 */
/**
 * Interfaz UpdateContractPayload que define la forma de datos usada en services.
 */
/**
 * Interfaz UpdateContractPayload que define la forma de datos usada en services.
 */
export interface UpdateContractPayload {
    fullName?: string;
    email?: string;
    contactPhone?: string;
    parkingId?: string;
    startDate?: string;
    endDate?: string;
    lastPaymentDate?: string;
    nextPaymentDate?: string;
    monthlyFee?: number;
    planName?: string;
    isRecurring?: boolean;
    documentType?: DocumentType | null;
    documentNumber?: string | null;
}

/**
 * Interfaz ContractAlert que define la forma de datos usada en services.
 */
/**
 * Interfaz ContractAlert que define la forma de datos usada en services.
 */
/**
 * Interfaz ContractAlert que define la forma de datos usada en services.
 */
export interface ContractAlert {
    id: string;
    alertType: string;
    message: string;
    status: string;
    createdAt: string;
    resolvedAt?: string | null;
}

/**
 * Interfaz ContractRecord que define la forma de datos usada en services.
 */
/**
 * Interfaz ContractRecord que define la forma de datos usada en services.
 */
/**
 * Interfaz ContractRecord que define la forma de datos usada en services.
 */
export interface ContractRecord {
    id: string;
    parkingId: string;
    userId: string;
    startDate: string;
    endDate: string;
    status: string;
    planName: string;
    monthlyFee: number;
    isRecurring: boolean;
    lastPaymentDate?: string | null;
    nextPaymentDate?: string | null;
    user: {
        id: string;
        fullName: string;
        email: string;
        contactPhone?: string | null;
        documentType?: DocumentType | null;
        documentNumber?: string | null;
    };
    parking: {
        id: string;
        name: string;
        address?: string | null;
    };
    alerts: ContractAlert[];
}

/**
 * Interfaz AlertRecord que define la forma de datos usada en services.
 */
/**
 * Interfaz AlertRecord que define la forma de datos usada en services.
 */
/**
 * Interfaz AlertRecord que define la forma de datos usada en services.
 */
export interface AlertRecord extends ContractAlert {
    contract: ContractRecord;
}

const clientsService = {
    /**
     * Registra un cliente con un contrato mensual.
     */
    async createClient(payload: CreateClientPayload) {
        const response = await api.post<ContractRecord>('/clients', payload);
        return response.data;
    },

    /**
     * Lista los contratos vigentes junto con usuario y parqueadero.
     */
    async listContracts(filters?: ContractFilters) {
        const response = await api.get<ContractRecord[]>('/clients/contracts', {
            params: filters,
        });
        return response.data;
    },

    /**
     * Recupera alertas activas relacionadas con contratos.
     */
    async listAlerts() {
        const response = await api.get<AlertRecord[]>('/clients/contracts/alerts');
        return response.data;
    },

    /**
     * Renueva el contrato indicado con nueva fecha y datos de pago.
     */
    async renewContract(contractId: string, payload: RenewContractPayload) {
        const response = await api.patch<ContractRecord>(`/clients/contracts/${contractId}/renew`, payload);
        return response.data;
    },

    /**
     * Actualiza datos editables del cliente y su contrato.
     */
    async updateContract(contractId: string, payload: UpdateContractPayload) {
        const response = await api.patch<ContractRecord>(`/clients/contracts/${contractId}`, payload);
        return response.data;
    },

    /**
     * Archiva un contrato y, si aplica, desactiva el cliente asociado.
     */
    async deleteContract(contractId: string) {
        const response = await api.delete<{
            contractId: string;
            userId: string;
            userArchived: boolean;
            archived: boolean;
            deleted: boolean;
        }>(`/clients/contracts/${contractId}`);
        return response.data;
    },

    /**
     * Restaura un contrato archivado.
     */
    async restoreContract(contractId: string) {
        const response = await api.post<{
            contractId: string;
            userId: string;
            userRestored: boolean;
            restored: boolean;
        }>(`/clients/contracts/${contractId}/restore`);
        return response.data;
    },
};

export default clientsService;

import api from '../api';

export interface CreateClientPayload {
    fullName: string;
    email: string;
    parkingId: string;
    startDate: string;
    endDate: string;
    monthlyFee: number;
    planName?: string;
}

export interface RenewContractPayload {
    newEndDate: string;
    paymentDate: string;
    monthlyFee?: number;
}

export interface ContractAlert {
    id: string;
    alertType: string;
    message: string;
    status: string;
    createdAt: string;
    resolvedAt?: string | null;
}

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
    };
    parking: {
        id: string;
        name: string;
        address?: string | null;
    };
    alerts: ContractAlert[];
}

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
    async listContracts() {
        const response = await api.get<ContractRecord[]>('/clients/contracts');
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
};

export default clientsService;

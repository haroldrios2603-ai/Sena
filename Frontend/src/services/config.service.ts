import api from '../api';

export interface TarifaConfigurada {
    id?: string;
    parkingId?: string;
    vehicleType: string;
    baseRate: number;
    hourlyRate: number;
    dayRate?: number | null;
    nightRate?: number | null;
    nightStart?: string | null;
    nightEnd?: string | null;
    flatRate?: number | null;
}

export interface ParqueaderoConfigurado {
    id: string;
    name: string;
    address: string;
    capacity: number;
    baseRate: number;
    isActive: boolean;
    vehicleTypes?: string[] | null;
    operationHours?: { apertura?: string; cierre?: string } | null;
    updatedAt?: string;
    tariffs: TarifaConfigurada[];
}

export interface ConfiguracionSistema {
    id: string;
    capacidadTotal: number;
    capacidadPorTipo?: unknown;
    horariosAtencion?: unknown;
    minutosCortesia: number;
    tarifasEspeciales?: unknown;
    metodosPago?: unknown;
    politicasFacturacion?: unknown;
    mensajesOperativos?: unknown;
    parametrosOperacion?: unknown;
    seguridad?: unknown;
    integraciones?: unknown;
}

export interface RespuestaConfiguracion {
    configuracion: ConfiguracionSistema;
    parkings: ParqueaderoConfigurado[];
    tarifas: TarifaConfigurada[];
}

export interface CrearParqueaderoPayload {
    nombre: string;
    direccion: string;
    capacidad: number;
    tarifaBase: number;
    tiposVehiculo?: string[];
    horario?: { apertura: string; cierre: string };
}

export interface ActualizarParqueaderoPayload {
    nombre?: string;
    direccion?: string;
    capacidad?: number;
    tarifaBase?: number;
    tiposVehiculo?: string[];
    horario?: { apertura: string; cierre: string };
}

export interface ConfiguracionGeneralPayload {
    capacidadTotal: number;
    capacidadPorTipo?: Array<{ tipo: string; capacidad: number }>;
    horariosAtencion?: { apertura: string; cierre: string };
    minutosCortesia?: number;
    tarifasEspeciales?: Array<{ nombre: string; aplica: string; recargoPorcentaje: number }>;
    metodosPago?: {
        aceptaEfectivo: boolean;
        aceptaTarjeta: boolean;
        aceptaEnLinea: boolean;
        aceptaQr: boolean;
        notas?: string;
    };
    politicasFacturacion?: {
        nit: string;
        razonSocial: string;
        prefijo?: string;
        consecutivo?: number;
        ivaPorcentaje: number;
        retencionPorcentaje?: number;
    };
    mensajesOperativos?: {
        mensajeIngreso: string;
        mensajeSalida: string;
        avisoLegal?: string;
    };
    parametrosOperacion?: {
        limiteHoras: number;
        penalidadTicket: number;
        alertaAforoPorcentaje: number;
    };
    seguridad?: {
        permiteEdicionOperadores: boolean;
        expiracionSesionMinutos: number;
    };
    integraciones?: {
        pasarelaPago?: string;
        apiKeyPagos?: string;
        webhookVigilancia?: string;
    };
}

export interface ActualizarTarifasPayload {
    aplicarATodos: boolean;
    parkingId?: string;
    tarifas: Array<{
        tipoVehiculo: string;
        tarifaBase: number;
        tarifaHora: number;
        tarifaDia?: number;
        tarifaNocturna?: number;
        horaInicioNocturna?: string;
        horaFinNocturna?: string;
        tarifaPlana?: number;
    }>;
}

const configService = {
    async obtenerConfiguracion() {
        const response = await api.get<RespuestaConfiguracion>('/settings');
        return response.data;
    },
    async actualizarConfiguracion(payload: ConfiguracionGeneralPayload) {
        const response = await api.put('/settings/general', payload);
        return response.data;
    },
    async actualizarTarifas(payload: ActualizarTarifasPayload) {
        const response = await api.put('/settings/tarifas', payload);
        return response.data;
    },
    async crearParqueadero(payload: CrearParqueaderoPayload) {
        const response = await api.post<ParqueaderoConfigurado>('/parking', payload);
        return response.data;
    },
    async actualizarParqueadero(parkingId: string, payload: ActualizarParqueaderoPayload) {
        const response = await api.patch<ParqueaderoConfigurado>(`/parking/${parkingId}`, payload);
        return response.data;
    },
    async actualizarEstadoParqueadero(parkingId: string, activo: boolean) {
        const response = await api.patch<ParqueaderoConfigurado>(`/parking/${parkingId}/estado`, { activo });
        return response.data;
    },
};

export default configService;

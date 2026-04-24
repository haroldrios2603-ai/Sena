import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import { Link } from 'react-router-dom';
import {
    AlertCircle,
    Building2,
    Loader2,
    PlusCircle,
    Save,
    Settings,
    ShieldCheck,
} from 'lucide-react';
import configService, {
    type ActualizarParqueaderoPayload,
    type ActualizarTarifasPayload,
    type ParqueaderoConfigurado,
    type RespuestaConfiguracion,
    type TarifaConfigurada,
} from '../../services/config.service';
import { useAutoDismiss } from '../../hooks/useAutoDismiss';
import { announceSettingsUpdated } from '../../utils/settingsRefresh';
import ConfirmActionModal from './ConfirmActionModal';

interface MensajeEstado {
    texto: string;
    tipo: 'success' | 'error' | '';
}

interface TarifaFormulario {
    tipoVehiculo: string;
    tarifaBase: number;
    tarifaHora: number;
    tarifaDia?: number;
    tarifaNocturna?: number;
    horaInicioNocturna?: string;
    horaFinNocturna?: string;
    tarifaPlana?: number;
}

interface CapacidadTipoFormulario {
    tipo: string;
    capacidad: number;
}

interface TarifaEspecialFormulario {
    nombre: string;
    aplica: string;
    recargoPorcentaje: number;
}

interface ConfiguracionFormulario {
    capacidadTotal: number;
    capacidadPorTipo: CapacidadTipoFormulario[];
    horariosAtencion: { apertura: string; cierre: string };
    minutosCortesia: number;
    tarifasEspeciales: TarifaEspecialFormulario[];
    metodosPago: {
        aceptaEfectivo: boolean;
        aceptaTarjeta: boolean;
        aceptaEnLinea: boolean;
        aceptaQr: boolean;
        notas?: string;
    };
    politicasFacturacion: {
        nit: string;
        razonSocial: string;
        prefijo?: string;
        consecutivo?: number;
        ivaPorcentaje: number;
        retencionPorcentaje?: number;
    };
    mensajesOperativos: {
        mensajeIngreso: string;
        mensajeSalida: string;
        avisoLegal?: string;
    };
    parametrosOperacion: {
        limiteHoras: number;
        penalidadTicket: number;
        alertaAforoPorcentaje: number;
    };
    seguridad: {
        permiteEdicionOperadores: boolean;
        expiracionSesionMinutos: number;
    };
    integraciones: {
        pasarelaPago?: string;
        apiKeyPagos?: string;
        webhookVigilancia?: string;
    };
}

interface ParqueaderoEditable {
    nombre: string;
    direccion: string;
    capacidad: number;
    tarifaBase: number;
    tiposVehiculo: string;
    apertura?: string;
    cierre?: string;
}

type SeccionConfiguracion =
    | 'menu'
    | 'parametros-generales'
    | 'tarifario-avanzado'
    | 'sedes-parqueaderos';

type EliminacionPendiente =
    | {
        tipo: 'capacidad';
        index: number;
    }
    | {
        tipo: 'tarifa-especial';
        index: number;
    }
    | {
        tipo: 'tarifa';
        index: number;
    };

const etiquetasSeccion: Record<Exclude<SeccionConfiguracion, 'menu'>, { titulo: string; descripcion: string }> = {
    'parametros-generales': {
        titulo: 'Parámetros generales',
        descripcion: 'Capacidades, horarios y políticas operativas',
    },
    'tarifario-avanzado': {
        titulo: 'Tarifario avanzado',
        descripcion: 'Gestiona montos hora, día y nocturnos por tipo',
    },
    'sedes-parqueaderos': {
        titulo: 'Sedes y parqueaderos',
        descripcion: 'Controla información por sede y su estado',
    },
};


interface ConfigPanelProps {
    seccionActiva: SeccionConfiguracion;
}

const configuracionVacia: ConfiguracionFormulario = {
    capacidadTotal: 0,
    capacidadPorTipo: [
        { tipo: 'CAR', capacidad: 0 },
        { tipo: 'MOTORCYCLE', capacidad: 0 },
    ],
    horariosAtencion: { apertura: '06:00', cierre: '22:00' },
    minutosCortesia: 0,
    tarifasEspeciales: [],
    metodosPago: {
        aceptaEfectivo: true,
        aceptaTarjeta: true,
        aceptaEnLinea: false,
        aceptaQr: false,
        notas: '',
    },
    politicasFacturacion: {
        nit: '',
        razonSocial: '',
        prefijo: 'RM',
        consecutivo: 1,
        ivaPorcentaje: 19,
        retencionPorcentaje: 0,
    },
    mensajesOperativos: {
        mensajeIngreso: 'Bienvenido, recuerda respetar la velocidad interna.',
        mensajeSalida: 'Gracias por visitarnos.',
        avisoLegal: 'Este parqueadero no se hace responsable por objetos dejados dentro del vehículo.',
    },
    parametrosOperacion: {
        limiteHoras: 24,
        penalidadTicket: 25000,
        alertaAforoPorcentaje: 80,
    },
    seguridad: {
        permiteEdicionOperadores: false,
        expiracionSesionMinutos: 120,
    },
    integraciones: {
        pasarelaPago: '',
        apiKeyPagos: '',
        webhookVigilancia: '',
    },
};

const tarifasBase: TarifaFormulario[] = [
    {
        tipoVehiculo: 'CAR',
        tarifaBase: 5000,
        tarifaHora: 3000,
        tarifaDia: 25000,
        tarifaNocturna: 15000,
        horaInicioNocturna: '22:00',
        horaFinNocturna: '06:00',
        tarifaPlana: undefined,
    },
    {
        tipoVehiculo: 'MOTORCYCLE',
        tarifaBase: 2000,
        tarifaHora: 1000,
        tarifaDia: 10000,
        tarifaNocturna: 6000,
        horaInicioNocturna: '22:00',
        horaFinNocturna: '06:00',
        tarifaPlana: undefined,
    },
];

const mensajeError = (error: unknown, fallback: string) => {
    if (isAxiosError<{ message?: string }>(error)) {
        return error.response?.data?.message ?? fallback;
    }
    return fallback;
};

const ConfigPanel = ({ seccionActiva }: ConfigPanelProps) => {
    const [cargando, setCargando] = useState(true);
    const [mensaje, setMensaje] = useState<MensajeEstado>({ texto: '', tipo: '' });
    const [configGeneral, setConfigGeneral] = useState<ConfiguracionFormulario>(configuracionVacia);
    const [tarifas, setTarifas] = useState<TarifaFormulario[]>(tarifasBase);
    const [parqueaderos, setParqueaderos] = useState<ParqueaderoConfigurado[]>([]);
    const [edicionesParqueaderos, setEdicionesParqueaderos] = useState<Record<string, ParqueaderoEditable>>({});
    const [aplicarTarifasEnTodos, setAplicarTarifasEnTodos] = useState(true);
    const [parqueaderoObjetivo, setParqueaderoObjetivo] = useState('');
    const [guardandoGeneral, setGuardandoGeneral] = useState(false);
    const [guardandoMetodosPago, setGuardandoMetodosPago] = useState(false);
    const [guardandoTarifas, setGuardandoTarifas] = useState(false);
    const [guardandoParqueadero, setGuardandoParqueadero] = useState(false);
    const [eliminacionPendiente, setEliminacionPendiente] = useState<EliminacionPendiente | null>(null);
    const [nuevoParqueadero, setNuevoParqueadero] = useState<ParqueaderoEditable>({
        nombre: '',
        direccion: '',
        capacidad: 0,
        tarifaBase: 0,
        tiposVehiculo: 'CAR,MOTORCYCLE',
        apertura: '06:00',
        cierre: '22:00',
    });

    useAutoDismiss(Boolean(mensaje.texto), () => setMensaje({ texto: '', tipo: '' }), 5000);

    const prepararEstadoInicial = useCallback((respuesta: RespuestaConfiguracion) => {
        const capacidades = extraerLista<CapacidadTipoFormulario>(respuesta.configuracion.capacidadPorTipo) ?? configuracionVacia.capacidadPorTipo;
        const horarios = extraerObjeto<{ apertura: string; cierre: string }>(
            respuesta.configuracion.horariosAtencion,
        ) ?? configuracionVacia.horariosAtencion;
        const especiales = extraerLista<TarifaEspecialFormulario>(respuesta.configuracion.tarifasEspeciales) ?? [];
        const metodosPago = extraerObjeto<ConfiguracionFormulario['metodosPago']>(
            respuesta.configuracion.metodosPago,
        ) ?? configuracionVacia.metodosPago;
        const facturacion = extraerObjeto<ConfiguracionFormulario['politicasFacturacion']>(
            respuesta.configuracion.politicasFacturacion,
        ) ?? configuracionVacia.politicasFacturacion;
        const mensajesConf = extraerObjeto<ConfiguracionFormulario['mensajesOperativos']>(
            respuesta.configuracion.mensajesOperativos,
        ) ?? configuracionVacia.mensajesOperativos;
        const operacion = extraerObjeto<ConfiguracionFormulario['parametrosOperacion']>(
            respuesta.configuracion.parametrosOperacion,
        ) ?? configuracionVacia.parametrosOperacion;
        const seguridad = extraerObjeto<ConfiguracionFormulario['seguridad']>(
            respuesta.configuracion.seguridad,
        ) ?? configuracionVacia.seguridad;
        const integraciones = extraerObjeto<ConfiguracionFormulario['integraciones']>(
            respuesta.configuracion.integraciones,
        ) ?? configuracionVacia.integraciones;

        setConfigGeneral({
            capacidadTotal: respuesta.configuracion.capacidadTotal,
            capacidadPorTipo: capacidades,
            horariosAtencion: horarios,
            minutosCortesia: respuesta.configuracion.minutosCortesia ?? 0,
            tarifasEspeciales: especiales,
            metodosPago,
            politicasFacturacion: facturacion,
            mensajesOperativos: mensajesConf,
            parametrosOperacion: operacion,
            seguridad,
            integraciones,
        });

        const tarifasNormalizadas = normalizarTarifas(respuesta.tarifas);
        setTarifas(tarifasNormalizadas.length ? tarifasNormalizadas : tarifasBase);

        setParqueaderos(respuesta.parkings);
        setParqueaderoObjetivo(respuesta.parkings[0]?.id ?? '');
        setEdicionesParqueaderos(construirEstadoEdicion(respuesta.parkings));
    }, []);

    const cargarConfiguracion = useCallback(async () => {
        setCargando(true);
        setMensaje({ texto: '', tipo: '' });
        try {
            const data = await configService.obtenerConfiguracion();
            prepararEstadoInicial(data);
        } catch (error) {
            setMensaje({
                texto: mensajeError(error, 'No se pudo cargar la configuración'),
                tipo: 'error',
            });
        } finally {
            setCargando(false);
        }
    }, [prepararEstadoInicial]);

    useEffect(() => {
        void cargarConfiguracion();
    }, [cargarConfiguracion]);

    const extraerLista = <T,>(valor: unknown): T[] | undefined => {
        if (Array.isArray(valor)) {
            return valor as T[];
        }
        return undefined;
    };

    const extraerObjeto = <T,>(valor: unknown): T | undefined => {
        if (valor && typeof valor === 'object') {
            return valor as T;
        }
        return undefined;
    };

    const normalizarTarifas = (lista: TarifaConfigurada[]) => {
        const mapa = new Map<string, TarifaFormulario>();
        lista.forEach((tarifa) => {
            if (!mapa.has(tarifa.vehicleType)) {
                mapa.set(tarifa.vehicleType, {
                    tipoVehiculo: tarifa.vehicleType,
                    tarifaBase: tarifa.baseRate,
                    tarifaHora: tarifa.hourlyRate,
                    tarifaDia: tarifa.dayRate ?? undefined,
                    tarifaNocturna: tarifa.nightRate ?? undefined,
                    horaInicioNocturna: tarifa.nightStart ?? '22:00',
                    horaFinNocturna: tarifa.nightEnd ?? '06:00',
                    tarifaPlana: tarifa.flatRate ?? undefined,
                });
            }
        });
        return Array.from(mapa.values());
    };

    const construirEstadoEdicion = (lista: ParqueaderoConfigurado[]) => {
        const base: Record<string, ParqueaderoEditable> = {};
        lista.forEach((parking) => {
            base[parking.id] = {
                nombre: parking.name,
                direccion: parking.address,
                capacidad: parking.capacity,
                tarifaBase: parking.baseRate,
                tiposVehiculo: Array.isArray(parking.vehicleTypes)
                    ? parking.vehicleTypes.join(',')
                    : 'CAR,MOTORCYCLE',
                apertura: parking.operationHours?.apertura ?? '06:00',
                cierre: parking.operationHours?.cierre ?? '22:00',
            };
        });
        return base;
    };

    const actualizarCapacidadPorTipo = (index: number, campo: keyof CapacidadTipoFormulario, valor: string) => {
        setConfigGeneral((prev) => {
            const copia = [...prev.capacidadPorTipo];
            copia[index] = {
                ...copia[index],
                [campo]: campo === 'capacidad' ? Number(valor) : valor,
            };
            return { ...prev, capacidadPorTipo: copia };
        });
    };

    const agregarCapacidad = () => {
        setConfigGeneral((prev) => ({
            ...prev,
            capacidadPorTipo: [...prev.capacidadPorTipo, { tipo: 'NUEVO', capacidad: 0 }],
        }));
    };

    const eliminarCapacidad = (index: number) => {
        setConfigGeneral((prev) => ({
            ...prev,
            capacidadPorTipo: prev.capacidadPorTipo.filter((_, idx) => idx !== index),
        }));
    };

    const solicitarEliminacionCapacidad = (index: number) => {
        setEliminacionPendiente({ tipo: 'capacidad', index });
    };

    const agregarTarifaEspecial = () => {
        setConfigGeneral((prev) => ({
            ...prev,
            tarifasEspeciales: [
                ...prev.tarifasEspeciales,
                { nombre: 'Festivo', aplica: 'Domingos y festivos', recargoPorcentaje: 20 },
            ],
        }));
    };

    const actualizarTarifaEspecial = (index: number, campo: keyof TarifaEspecialFormulario, valor: string) => {
        setConfigGeneral((prev) => {
            const copia = [...prev.tarifasEspeciales];
            copia[index] = {
                ...copia[index],
                [campo]: campo === 'recargoPorcentaje' ? Number(valor) : valor,
            };
            return { ...prev, tarifasEspeciales: copia };
        });
    };

    const eliminarTarifaEspecial = (index: number) => {
        setConfigGeneral((prev) => ({
            ...prev,
            tarifasEspeciales: prev.tarifasEspeciales.filter((_, idx) => idx !== index),
        }));
    };

    const solicitarEliminacionTarifaEspecial = (index: number) => {
        setEliminacionPendiente({ tipo: 'tarifa-especial', index });
    };

    const agregarTarifa = () => {
        setTarifas((prev) => ([
            ...prev,
            {
                tipoVehiculo: 'NUEVO',
                tarifaBase: 0,
                tarifaHora: 0,
                tarifaDia: undefined,
                tarifaNocturna: undefined,
                horaInicioNocturna: '22:00',
                horaFinNocturna: '06:00',
                tarifaPlana: undefined,
            },
        ]));
    };

    const actualizarTarifa = (index: number, campo: keyof TarifaFormulario, valor: string) => {
        setTarifas((prev) => {
            const copia = [...prev];
            copia[index] = {
                ...copia[index],
                [campo]: campo.startsWith('tarifa') || campo === 'tarifaHora'
                    ? Number(valor)
                    : valor,
            } as TarifaFormulario;
            return copia;
        });
    };

    const eliminarTarifa = (index: number) => {
        setTarifas((prev) => prev.filter((_, idx) => idx !== index));
    };

    const solicitarEliminacionTarifa = (index: number) => {
        setEliminacionPendiente({ tipo: 'tarifa', index });
    };

    const cancelarEliminacionPendiente = () => {
        if (!eliminacionPendiente) {
            return;
        }

        setEliminacionPendiente(null);
        setMensaje({
            texto: 'No se eliminó el registro: operación cancelada por el operador.',
            tipo: 'error',
        });
    };

    const confirmarEliminacionPendiente = () => {
        if (!eliminacionPendiente) {
            return;
        }

        // ES: Resolvemos la acción de eliminación según el tipo de registro seleccionado en el modal.
        const { tipo, index } = eliminacionPendiente;

        if (tipo === 'capacidad') {
            if (!configGeneral.capacidadPorTipo[index]) {
                setMensaje({ texto: 'No se pudo eliminar el registro: capacidad no encontrada.', tipo: 'error' });
                setEliminacionPendiente(null);
                return;
            }
            eliminarCapacidad(index);
            setMensaje({ texto: 'Registro eliminado correctamente.', tipo: 'success' });
            setEliminacionPendiente(null);
            return;
        }

        if (tipo === 'tarifa-especial') {
            if (!configGeneral.tarifasEspeciales[index]) {
                setMensaje({ texto: 'No se pudo eliminar el registro: tarifa especial no encontrada.', tipo: 'error' });
                setEliminacionPendiente(null);
                return;
            }
            eliminarTarifaEspecial(index);
            setMensaje({ texto: 'Registro eliminado correctamente.', tipo: 'success' });
            setEliminacionPendiente(null);
            return;
        }

        if (!tarifas[index]) {
            setMensaje({ texto: 'No se pudo eliminar el registro: tarifa no encontrada.', tipo: 'error' });
            setEliminacionPendiente(null);
            return;
        }

        eliminarTarifa(index);
        setMensaje({ texto: 'Registro eliminado correctamente.', tipo: 'success' });
        setEliminacionPendiente(null);
    };

    const mensajeEliminacionPendiente = useMemo(() => {
        if (!eliminacionPendiente) {
            return '';
        }

        if (eliminacionPendiente.tipo === 'capacidad') {
            const registro = configGeneral.capacidadPorTipo[eliminacionPendiente.index];
            const nombre = registro?.tipo || 'este tipo de capacidad';
            return `¿Deseas eliminar el registro de capacidad ${nombre}?`;
        }

        if (eliminacionPendiente.tipo === 'tarifa-especial') {
            const registro = configGeneral.tarifasEspeciales[eliminacionPendiente.index];
            const nombre = registro?.nombre || 'esta tarifa especial';
            return `¿Deseas eliminar la tarifa especial ${nombre}?`;
        }

        const registro = tarifas[eliminacionPendiente.index];
        const nombre = registro?.tipoVehiculo || 'este tipo de tarifa';
        return `¿Deseas eliminar la tarifa de ${nombre}?`;
    }, [eliminacionPendiente, configGeneral.capacidadPorTipo, configGeneral.tarifasEspeciales, tarifas]);

    const actualizarMetodosPago = (campo: keyof ConfiguracionFormulario['metodosPago'], valor: string | boolean) => {
        setConfigGeneral((prev) => ({
            ...prev,
            metodosPago: {
                ...prev.metodosPago,
                [campo]: typeof valor === 'boolean' ? valor : valor,
            },
        }));
    };

    const actualizarPolitica = (campo: keyof ConfiguracionFormulario['politicasFacturacion'], valor: string) => {
        setConfigGeneral((prev) => ({
            ...prev,
            politicasFacturacion: {
                ...prev.politicasFacturacion,
                [campo]: campo.includes('Porcentaje') || campo === 'consecutivo' ? Number(valor) : valor,
            },
        }));
    };

    const actualizarMensajes = (campo: keyof ConfiguracionFormulario['mensajesOperativos'], valor: string) => {
        setConfigGeneral((prev) => ({
            ...prev,
            mensajesOperativos: { ...prev.mensajesOperativos, [campo]: valor },
        }));
    };

    const actualizarParametrosOperacion = (campo: keyof ConfiguracionFormulario['parametrosOperacion'], valor: string) => {
        setConfigGeneral((prev) => ({
            ...prev,
            parametrosOperacion: {
                ...prev.parametrosOperacion,
                [campo]: Number(valor),
            },
        }));
    };

    const actualizarSeguridad = (campo: keyof ConfiguracionFormulario['seguridad'], valor: string | boolean) => {
        setConfigGeneral((prev) => ({
            ...prev,
            seguridad: {
                ...prev.seguridad,
                [campo]: typeof valor === 'boolean' ? valor : Number(valor),
            },
        }));
    };

    const actualizarIntegraciones = (campo: keyof ConfiguracionFormulario['integraciones'], valor: string) => {
        setConfigGeneral((prev) => ({
            ...prev,
            integraciones: {
                ...prev.integraciones,
                [campo]: valor,
            },
        }));
    };

    const actualizarEdicionParqueadero = (
        id: string,
        campo: keyof ParqueaderoEditable,
        valor: string,
    ) => {
        setEdicionesParqueaderos((prev) => {
            const actual = prev[id] ?? {
                nombre: '',
                direccion: '',
                capacidad: 0,
                tarifaBase: 0,
                tiposVehiculo: 'CAR,MOTORCYCLE',
                apertura: '06:00',
                cierre: '22:00',
            };
            return {
                ...prev,
                [id]: {
                    ...actual,
                    [campo]: campo === 'capacidad' || campo === 'tarifaBase'
                        ? Number(valor)
                        : valor,
                },
            };
        });
    };

    const payloadConfiguracion = useMemo(() => ({
        capacidadTotal: configGeneral.capacidadTotal,
        capacidadPorTipo: configGeneral.capacidadPorTipo,
        horariosAtencion: configGeneral.horariosAtencion,
        minutosCortesia: configGeneral.minutosCortesia,
        tarifasEspeciales: configGeneral.tarifasEspeciales,
        metodosPago: configGeneral.metodosPago,
        politicasFacturacion: configGeneral.politicasFacturacion,
        mensajesOperativos: configGeneral.mensajesOperativos,
        parametrosOperacion: configGeneral.parametrosOperacion,
        seguridad: configGeneral.seguridad,
        integraciones: configGeneral.integraciones,
    }), [configGeneral]);

    const guardarConfiguracionGeneral = async (event: React.FormEvent) => {
        event.preventDefault();
        setGuardandoGeneral(true);
        setMensaje({ texto: '', tipo: '' });
        try {
            await configService.actualizarConfiguracion(payloadConfiguracion);
            setMensaje({ texto: 'Configuración general guardada correctamente', tipo: 'success' });
            await cargarConfiguracion();
            announceSettingsUpdated();
        } catch (error) {
            setMensaje({ texto: mensajeError(error, 'Error al guardar la configuración'), tipo: 'error' });
        } finally {
            setGuardandoGeneral(false);
        }
    };

    const guardarTarifas = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!aplicarTarifasEnTodos && !parqueaderoObjetivo) {
            setMensaje({ texto: 'Selecciona una sede para aplicar las tarifas', tipo: 'error' });
            return;
        }
        setGuardandoTarifas(true);
        setMensaje({ texto: '', tipo: '' });
        const payload: ActualizarTarifasPayload = {
            aplicarATodos: aplicarTarifasEnTodos,
            parkingId: aplicarTarifasEnTodos ? undefined : parqueaderoObjetivo,
            tarifas: tarifas.map((tarifa) => ({
                tipoVehiculo: tarifa.tipoVehiculo,
                tarifaBase: tarifa.tarifaBase,
                tarifaHora: tarifa.tarifaHora,
                tarifaDia: tarifa.tarifaDia,
                tarifaNocturna: tarifa.tarifaNocturna,
                horaInicioNocturna: tarifa.horaInicioNocturna,
                horaFinNocturna: tarifa.horaFinNocturna,
                tarifaPlana: tarifa.tarifaPlana,
            })),
        };

        try {
            await configService.actualizarTarifas(payload);
            setMensaje({ texto: 'Tarifas sincronizadas con éxito', tipo: 'success' });
            await cargarConfiguracion();
            announceSettingsUpdated();
        } catch (error) {
            setMensaje({ texto: mensajeError(error, 'No se pudieron guardar las tarifas'), tipo: 'error' });
        } finally {
            setGuardandoTarifas(false);
        }
    };

    const guardarMetodosPago = async () => {
        setGuardandoMetodosPago(true);
        setMensaje({ texto: '', tipo: '' });
        try {
            await configService.actualizarMetodosPago(configGeneral.metodosPago);
            setMensaje({ texto: 'Métodos de pago guardados correctamente', tipo: 'success' });
            await cargarConfiguracion();
            announceSettingsUpdated();
        } catch (error) {
            setMensaje({ texto: mensajeError(error, 'No se pudieron guardar los métodos de pago'), tipo: 'error' });
        } finally {
            setGuardandoMetodosPago(false);
        }
    };

    const crearParqueadero = async (event: React.FormEvent) => {
        event.preventDefault();
        setGuardandoParqueadero(true);
        setMensaje({ texto: '', tipo: '' });
        try {
            await configService.crearParqueadero({
                nombre: nuevoParqueadero.nombre,
                direccion: nuevoParqueadero.direccion,
                capacidad: nuevoParqueadero.capacidad,
                tarifaBase: nuevoParqueadero.tarifaBase,
                tiposVehiculo: nuevoParqueadero.tiposVehiculo.split(',').map((item) => item.trim()).filter(Boolean),
                horario: { apertura: nuevoParqueadero.apertura ?? '06:00', cierre: nuevoParqueadero.cierre ?? '22:00' },
            });
            setMensaje({ texto: 'Parqueadero creado', tipo: 'success' });
            setNuevoParqueadero({ ...nuevoParqueadero, nombre: '', direccion: '', capacidad: 0, tarifaBase: 0 });
            await cargarConfiguracion();
            announceSettingsUpdated();
        } catch (error) {
            setMensaje({ texto: mensajeError(error, 'No se pudo crear el parqueadero'), tipo: 'error' });
        } finally {
            setGuardandoParqueadero(false);
        }
    };

    const guardarParqueadero = async (id: string) => {
        const datos = edicionesParqueaderos[id];
        if (!datos) return;
        setGuardandoParqueadero(true);
        setMensaje({ texto: '', tipo: '' });
        const payload: ActualizarParqueaderoPayload = {
            nombre: datos.nombre,
            direccion: datos.direccion,
            capacidad: datos.capacidad,
            tarifaBase: datos.tarifaBase,
            tiposVehiculo: datos.tiposVehiculo.split(',').map((item) => item.trim()).filter(Boolean),
            horario: { apertura: datos.apertura ?? '06:00', cierre: datos.cierre ?? '22:00' },
        };
        try {
            await configService.actualizarParqueadero(id, payload);
            setMensaje({ texto: 'Parqueadero actualizado', tipo: 'success' });
            await cargarConfiguracion();
            announceSettingsUpdated();
        } catch (error) {
            setMensaje({ texto: mensajeError(error, 'No se pudo actualizar la sede'), tipo: 'error' });
        } finally {
            setGuardandoParqueadero(false);
        }
    };

    const cambiarEstadoParqueadero = async (id: string, activo: boolean) => {
        setGuardandoParqueadero(true);
        setMensaje({ texto: '', tipo: '' });
        try {
            await configService.actualizarEstadoParqueadero(id, activo);
            setMensaje({ texto: 'Estado del parqueadero actualizado', tipo: 'success' });
            await cargarConfiguracion();
            announceSettingsUpdated();
        } catch (error) {
            setMensaje({ texto: mensajeError(error, 'No se pudo cambiar el estado de la sede'), tipo: 'error' });
        } finally {
            setGuardandoParqueadero(false);
        }
    };

    if (cargando) {
        return (
            <div className="panel-card flex items-center justify-center gap-3 text-slate-500">
                <Loader2 className="animate-spin" size={20} />
                <span>Cargando configuración...</span>
            </div>
        );
    }

    return (
        <section className="space-y-8">
            <header className="flex flex-col gap-2">
                <span className="pill bg-indigo-100 text-indigo-700 w-fit">
                    <Settings size={16} /> Configuración avanzada
                </span>
                <h2 className="text-3xl font-semibold text-slate-900">Parámetros del sistema</h2>
                <p className="text-sm text-slate-500 max-w-3xl">
                    Administra tarifas, capacidades, políticas y sedes desde un único módulo centralizado. Los cambios se aplican en caliente para todos los usuarios autorizados.
                </p>
            </header>

            {seccionActiva === 'menu' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Link to="/dashboard/settings/parametros-generales" className="panel-card text-left space-y-3 hover:border-indigo-300 transition-colors block">
                            <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                                <Save size={16} />
                            </div>
                            <h3 className="panel-card__title">Parámetros generales</h3>
                            <p className="text-xs text-slate-500">Capacidades, horarios y políticas operativas.</p>
                            <span className="btn-outline !w-auto px-3 py-2 text-xs">Abrir sección</span>
                        </Link>

                        <Link to="/dashboard/settings/tarifario-avanzado" className="panel-card text-left space-y-3 hover:border-indigo-300 transition-colors block">
                            <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                                <Settings size={16} />
                            </div>
                            <h3 className="panel-card__title">Tarifario avanzado</h3>
                            <p className="text-xs text-slate-500">Tarifas por tipo, jornada y sede.</p>
                            <span className="btn-outline !w-auto px-3 py-2 text-xs">Abrir sección</span>
                        </Link>

                        <Link to="/dashboard/settings/sedes-parqueaderos" className="panel-card text-left space-y-3 hover:border-indigo-300 transition-colors block">
                            <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                                <Building2 size={16} />
                            </div>
                            <h3 className="panel-card__title">Sedes y parqueaderos</h3>
                            <p className="text-xs text-slate-500">Administración de sedes, estado y capacidad.</p>
                            <span className="btn-outline !w-auto px-3 py-2 text-xs">Abrir sección</span>
                        </Link>
                    </div>

                    <div className="panel-card flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-sm font-semibold text-slate-900">Permisos por perfil</p>
                            <p className="text-xs text-slate-500">
                                Configura qué pantallas puede visualizar cada rol y usuario.
                            </p>
                        </div>
                        <Link
                            to="/settings/permissions-profiles"
                            className="btn-primary w-auto px-4 py-2 text-sm"
                        >
                            Gestionar permisos
                        </Link>
                    </div>

                    <div className="panel-card flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-sm font-semibold text-slate-900">Auditoría</p>
                            <p className="text-xs text-slate-500">
                                Consulta eventos críticos, accesos y cambios sensibles del sistema.
                            </p>
                        </div>
                        <Link
                            to="/admin/auditoria"
                            className="btn-outline !w-auto px-4 py-2 text-sm"
                        >
                            Ver auditoría
                        </Link>
                    </div>
                </>
            )}

            {mensaje.texto && (
                <div
                    className={`rounded-2xl border p-4 flex items-center gap-3 ${
                        mensaje.tipo === 'success'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                            : 'border-rose-200 bg-rose-50 text-rose-900'
                    }`}
                >
                    {mensaje.tipo === 'success' ? <ShieldCheck size={18} /> : <AlertCircle size={18} />}
                    <span className="text-sm font-medium">{mensaje.texto}</span>
                </div>
            )}

            {seccionActiva !== 'menu' && (
                <div className="panel-card flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">Configuración / Sección</p>
                        <h3 className="panel-card__title mt-1">{etiquetasSeccion[seccionActiva].titulo}</h3>
                        <p className="text-xs text-slate-500">{etiquetasSeccion[seccionActiva].descripcion}</p>
                    </div>
                    <Link to="/dashboard/settings" className="btn-outline !w-auto px-4 py-2 text-sm">
                        Volver al menú de configuración
                    </Link>
                </div>
            )}

            {seccionActiva === 'parametros-generales' && (
            <form onSubmit={guardarConfiguracionGeneral} className="panel-card space-y-6">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                        <Save size={16} />
                    </div>
                    <div>
                        <h3 className="panel-card__title">Parámetros generales</h3>
                        <p className="text-xs text-slate-500">Capacidades, horarios y políticas operativas</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="form-label">Capacidad total</label>
                        <input
                            type="number"
                            min={0}
                            className="input-field"
                            value={configGeneral.capacidadTotal}
                            onChange={(event) =>
                                setConfigGeneral({ ...configGeneral, capacidadTotal: Number(event.target.value) })
                            }
                            required
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            Define el límite general de vehículos autorizados simultáneamente.
                        </p>
                    </div>
                    <div>
                        <label className="form-label">Minutos de cortesía</label>
                        <input
                            type="number"
                            min={0}
                            className="input-field"
                            value={configGeneral.minutosCortesia}
                            onChange={(event) =>
                                setConfigGeneral({
                                    ...configGeneral,
                                    minutosCortesia: Number(event.target.value),
                                })
                            }
                        />
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between">
                        <label className="form-label">Capacidades por tipo</label>
                        <button type="button" className="btn-outline !w-auto" onClick={agregarCapacidad}>
                            <PlusCircle size={14} /> Añadir tipo
                        </button>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3">
                        {configGeneral.capacidadPorTipo.map((item, index) => (
                            <div key={`${item.tipo}-${index}`} className="border rounded-2xl p-4 space-y-2">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={item.tipo}
                                        onChange={(event) =>
                                            actualizarCapacidadPorTipo(index, 'tipo', event.target.value.toUpperCase())
                                        }
                                        placeholder="Tipo (CAR, MOTO, etc.)"
                                    />
                                    <input
                                        type="number"
                                        min={0}
                                        className="input-field"
                                        value={item.capacidad}
                                        onChange={(event) =>
                                            actualizarCapacidadPorTipo(index, 'capacidad', event.target.value)
                                        }
                                    />
                                </div>
                                {configGeneral.capacidadPorTipo.length > 1 && (
                                    <button
                                        type="button"
                                        className="text-xs text-rose-600"
                                        onClick={() => solicitarEliminacionCapacidad(index)}
                                    >
                                        Eliminar
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="form-label">Horario de apertura</label>
                        <input
                            type="time"
                            className="input-field"
                            value={configGeneral.horariosAtencion.apertura}
                            onChange={(event) =>
                                setConfigGeneral({
                                    ...configGeneral,
                                    horariosAtencion: {
                                        ...configGeneral.horariosAtencion,
                                        apertura: event.target.value,
                                    },
                                })
                            }
                        />
                    </div>
                    <div>
                        <label className="form-label">Horario de cierre</label>
                        <input
                            type="time"
                            className="input-field"
                            value={configGeneral.horariosAtencion.cierre}
                            onChange={(event) =>
                                setConfigGeneral({
                                    ...configGeneral,
                                    horariosAtencion: {
                                        ...configGeneral.horariosAtencion,
                                        cierre: event.target.value,
                                    },
                                })
                            }
                        />
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between">
                        <label className="form-label">Tarifas especiales</label>
                        <button type="button" className="btn-outline !w-auto" onClick={agregarTarifaEspecial}>
                            <PlusCircle size={14} /> Añadir condición
                        </button>
                    </div>
                    <div className="space-y-3 mt-3">
                        {configGeneral.tarifasEspeciales.length === 0 && (
                            <p className="text-sm text-slate-400">
                                No hay condiciones especiales registradas.
                            </p>
                        )}
                        {configGeneral.tarifasEspeciales.map((item, index) => (
                            <div key={`${item.nombre}-${index}`} className="border rounded-2xl p-4 grid gap-3 md:grid-cols-3">
                                <input
                                    type="text"
                                    className="input-field"
                                    value={item.nombre}
                                    onChange={(event) => actualizarTarifaEspecial(index, 'nombre', event.target.value)}
                                    placeholder="Nombre"
                                />
                                <input
                                    type="text"
                                    className="input-field"
                                    value={item.aplica}
                                    onChange={(event) => actualizarTarifaEspecial(index, 'aplica', event.target.value)}
                                    placeholder="Descripción"
                                />
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min={0}
                                        className="input-field"
                                        value={item.recargoPorcentaje}
                                        onChange={(event) =>
                                            actualizarTarifaEspecial(index, 'recargoPorcentaje', event.target.value)
                                        }
                                    />
                                    <span className="text-xs text-slate-500">% recargo</span>
                                </div>
                                <button
                                    type="button"
                                    className="text-xs text-rose-600 md:col-span-3 text-left"
                                    onClick={() => solicitarEliminacionTarifaEspecial(index)}
                                >
                                    Eliminar
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <label className="form-label">Métodos de pago aceptados</label>
                            <button
                                type="button"
                                className="btn-outline !w-auto px-3 py-2 text-xs"
                                onClick={() => void guardarMetodosPago()}
                                disabled={guardandoMetodosPago}
                            >
                                {guardandoMetodosPago && <Loader2 size={14} className="animate-spin" />} Guardar métodos
                            </button>
                        </div>
                        {[
                            { label: 'Efectivo en taquilla', campo: 'aceptaEfectivo' as const },
                            { label: 'Tarjeta física', campo: 'aceptaTarjeta' as const },
                            { label: 'Pago en línea', campo: 'aceptaEnLinea' as const },
                            { label: 'QR / wallets', campo: 'aceptaQr' as const },
                        ].map((opcion) => (
                            <label key={opcion.campo} className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4"
                                    checked={configGeneral.metodosPago[opcion.campo]}
                                    onChange={(event) => actualizarMetodosPago(opcion.campo, event.target.checked)}
                                />
                                {opcion.label}
                            </label>
                        ))}
                        <textarea
                            className="input-field"
                            rows={3}
                            placeholder="Notas adicionales para taquilla"
                            value={configGeneral.metodosPago.notas ?? ''}
                            onChange={(event) => actualizarMetodosPago('notas', event.target.value)}
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="form-label">Datos de facturación</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Razón social"
                            value={configGeneral.politicasFacturacion.razonSocial}
                            onChange={(event) => actualizarPolitica('razonSocial', event.target.value)}
                        />
                        <input
                            type="text"
                            className="input-field"
                            placeholder="NIT"
                            value={configGeneral.politicasFacturacion.nit}
                            onChange={(event) => actualizarPolitica('nit', event.target.value)}
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="text"
                                className="input-field"
                                placeholder="Prefijo"
                                value={configGeneral.politicasFacturacion.prefijo ?? ''}
                                onChange={(event) => actualizarPolitica('prefijo', event.target.value.toUpperCase())}
                            />
                            <input
                                type="number"
                                min={1}
                                className="input-field"
                                placeholder="Consecutivo"
                                value={configGeneral.politicasFacturacion.consecutivo ?? 1}
                                onChange={(event) => actualizarPolitica('consecutivo', event.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-slate-500">IVA %</label>
                                <input
                                    type="number"
                                    min={0}
                                    className="input-field"
                                    value={configGeneral.politicasFacturacion.ivaPorcentaje}
                                    onChange={(event) => actualizarPolitica('ivaPorcentaje', event.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500">Retención %</label>
                                <input
                                    type="number"
                                    min={0}
                                    className="input-field"
                                    value={configGeneral.politicasFacturacion.retencionPorcentaje ?? 0}
                                    onChange={(event) => actualizarPolitica('retencionPorcentaje', event.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <label className="form-label">Mensajes operativos</label>
                        <textarea
                            className="input-field"
                            rows={2}
                            placeholder="Mensaje de ingreso"
                            value={configGeneral.mensajesOperativos.mensajeIngreso}
                            onChange={(event) => actualizarMensajes('mensajeIngreso', event.target.value)}
                        />
                        <textarea
                            className="input-field"
                            rows={2}
                            placeholder="Mensaje de salida"
                            value={configGeneral.mensajesOperativos.mensajeSalida}
                            onChange={(event) => actualizarMensajes('mensajeSalida', event.target.value)}
                        />
                        <textarea
                            className="input-field"
                            rows={2}
                            placeholder="Aviso legal"
                            value={configGeneral.mensajesOperativos.avisoLegal ?? ''}
                            onChange={(event) => actualizarMensajes('avisoLegal', event.target.value)}
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="form-label">Parámetros operativos</label>
                        <div>
                            <label className="text-xs text-slate-500">Límite máximo de horas</label>
                            <input
                                type="number"
                                min={1}
                                className="input-field"
                                value={configGeneral.parametrosOperacion.limiteHoras}
                                onChange={(event) => actualizarParametrosOperacion('limiteHoras', event.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-500">Penalidad por ticket perdido</label>
                            <input
                                type="number"
                                min={0}
                                className="input-field"
                                value={configGeneral.parametrosOperacion.penalidadTicket}
                                onChange={(event) => actualizarParametrosOperacion('penalidadTicket', event.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-500">Alerta de aforo (%)</label>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                className="input-field"
                                value={configGeneral.parametrosOperacion.alertaAforoPorcentaje}
                                onChange={(event) => actualizarParametrosOperacion('alertaAforoPorcentaje', event.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <label className="form-label">Seguridad</label>
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                className="h-4 w-4"
                                checked={configGeneral.seguridad.permiteEdicionOperadores}
                                onChange={(event) => actualizarSeguridad('permiteEdicionOperadores', event.target.checked)}
                            />
                            Permitir ajustes manuales de operadores
                        </label>
                        <div>
                            <label className="text-xs text-slate-500">Expiración de sesión (minutos)</label>
                            <input
                                type="number"
                                min={15}
                                className="input-field"
                                value={configGeneral.seguridad.expiracionSesionMinutos}
                                onChange={(event) => actualizarSeguridad('expiracionSesionMinutos', event.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <label className="form-label">Integraciones</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Pasarela de pago"
                            value={configGeneral.integraciones.pasarelaPago ?? ''}
                            onChange={(event) => actualizarIntegraciones('pasarelaPago', event.target.value)}
                        />
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Clave de API"
                            value={configGeneral.integraciones.apiKeyPagos ?? ''}
                            onChange={(event) => actualizarIntegraciones('apiKeyPagos', event.target.value)}
                        />
                        <input
                            type="text"
                            className="input-field"
                            placeholder="URL de webhook de vigilancia"
                            value={configGeneral.integraciones.webhookVigilancia ?? ''}
                            onChange={(event) => actualizarIntegraciones('webhookVigilancia', event.target.value)}
                        />
                    </div>
                </div>

                <div className="flex justify-end">
                    <button type="submit" className="btn flex items-center gap-2" disabled={guardandoGeneral}>
                        {guardandoGeneral && <Loader2 size={16} className="animate-spin" />} Guardar parámetros
                    </button>
                </div>
            </form>
            )}

            {seccionActiva === 'tarifario-avanzado' && (
            <form onSubmit={guardarTarifas} className="panel-card space-y-6">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                        <Settings size={16} />
                    </div>
                    <div>
                        <h3 className="panel-card__title">Tarifario avanzado</h3>
                        <p className="text-xs text-slate-500">Gestiona montos hora, día y nocturnos por tipo.</p>
                    </div>
                </div>

                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={aplicarTarifasEnTodos}
                            onChange={(event) => setAplicarTarifasEnTodos(event.target.checked)}
                        />
                        Aplicar a todas las sedes
                    </label>
                    {!aplicarTarifasEnTodos && (
                        <select
                            className="input-field"
                            value={parqueaderoObjetivo}
                            onChange={(event) => setParqueaderoObjetivo(event.target.value)}
                        >
                            {parqueaderos.map((parking) => (
                                <option key={parking.id} value={parking.id}>
                                    {parking.name}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <div className="space-y-4">
                    {tarifas.map((tarifa, index) => (
                        <div key={`${tarifa.tipoVehiculo}-${index}`} className="border rounded-2xl p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <input
                                    type="text"
                                    className="input-field"
                                    value={tarifa.tipoVehiculo}
                                    onChange={(event) =>
                                        actualizarTarifa(index, 'tipoVehiculo', event.target.value.toUpperCase())
                                    }
                                />
                                {tarifas.length > 1 && (
                                    <button
                                        type="button"
                                        className="text-xs text-rose-600"
                                        onClick={() => solicitarEliminacionTarifa(index)}
                                    >
                                        Eliminar
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs text-slate-500">Tarifa base</label>
                                    <input
                                        type="number"
                                        min={0}
                                        className="input-field"
                                        value={tarifa.tarifaBase}
                                        onChange={(event) => actualizarTarifa(index, 'tarifaBase', event.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500">Tarifa por hora</label>
                                    <input
                                        type="number"
                                        min={0}
                                        className="input-field"
                                        value={tarifa.tarifaHora}
                                        onChange={(event) => actualizarTarifa(index, 'tarifaHora', event.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500">Tarifa diaria</label>
                                    <input
                                        type="number"
                                        min={0}
                                        className="input-field"
                                        value={tarifa.tarifaDia ?? 0}
                                        onChange={(event) => actualizarTarifa(index, 'tarifaDia', event.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs text-slate-500">Tarifa nocturna</label>
                                    <input
                                        type="number"
                                        min={0}
                                        className="input-field"
                                        value={tarifa.tarifaNocturna ?? 0}
                                        onChange={(event) => actualizarTarifa(index, 'tarifaNocturna', event.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500">Inicio nocturno</label>
                                    <input
                                        type="time"
                                        className="input-field"
                                        value={tarifa.horaInicioNocturna}
                                        onChange={(event) => actualizarTarifa(index, 'horaInicioNocturna', event.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500">Fin nocturno</label>
                                    <input
                                        type="time"
                                        className="input-field"
                                        value={tarifa.horaFinNocturna}
                                        onChange={(event) => actualizarTarifa(index, 'horaFinNocturna', event.target.value)}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500">Tarifa plana</label>
                                <input
                                    type="number"
                                    min={0}
                                    className="input-field"
                                    value={tarifa.tarifaPlana ?? 0}
                                    onChange={(event) => actualizarTarifa(index, 'tarifaPlana', event.target.value)}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex flex-wrap gap-3 justify-between">
                    <button type="button" className="btn-action" onClick={agregarTarifa}>
                        <PlusCircle size={14} /> Agregar tipo
                    </button>
                    <button
                        type="submit"
                        className="btn-tariff-save"
                        disabled={guardandoTarifas || (!aplicarTarifasEnTodos && !parqueaderoObjetivo)}
                    >
                        {guardandoTarifas && <Loader2 size={16} className="animate-spin" />} Guardar tarifas
                    </button>
                </div>
            </form>
            )}

            {seccionActiva === 'sedes-parqueaderos' && (
            <section className="panel-card space-y-6">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                        <Building2 size={16} />
                    </div>
                    <div>
                        <h3 className="panel-card__title">Sedes y parqueaderos</h3>
                        <p className="text-xs text-slate-500">Controla información por sede y su estado.</p>
                    </div>
                </div>

                {parqueaderos.length === 0 && (
                    <p className="text-sm text-slate-400">Aún no hay sedes registradas.</p>
                )}

                <div className="space-y-4">
                    {parqueaderos.map((parking) => {
                        const edicion = edicionesParqueaderos[parking.id];
                        return (
                            <div key={parking.id} className="border rounded-2xl p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-slate-900">{parking.name}</p>
                                        <p className="text-xs text-slate-500">{parking.address}</p>
                                    </div>
                                    <span className={`pill ${parking.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {parking.isActive ? 'Activa' : 'Suspendida'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={edicion?.nombre ?? ''}
                                        onChange={(event) =>
                                            actualizarEdicionParqueadero(parking.id, 'nombre', event.target.value)
                                        }
                                        placeholder="Nombre comercial"
                                    />
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={edicion?.direccion ?? ''}
                                        onChange={(event) =>
                                            actualizarEdicionParqueadero(parking.id, 'direccion', event.target.value)
                                        }
                                        placeholder="Dirección"
                                    />
                                    <div>
                                        <label className="text-xs text-slate-500">
                                            Capacidad operativa (impacta KPI "Capacidad")
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            className="input-field"
                                            value={edicion?.capacidad ?? 0}
                                            onChange={(event) =>
                                                actualizarEdicionParqueadero(parking.id, 'capacidad', event.target.value)
                                            }
                                            placeholder="Capacidad"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500">
                                            Tarifa base sede (impacta KPI "Tarifa base")
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            className="input-field"
                                            value={edicion?.tarifaBase ?? 0}
                                            onChange={(event) =>
                                                actualizarEdicionParqueadero(parking.id, 'tarifaBase', event.target.value)
                                            }
                                            placeholder="Tarifa base"
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={edicion?.tiposVehiculo ?? ''}
                                        onChange={(event) =>
                                            actualizarEdicionParqueadero(parking.id, 'tiposVehiculo', event.target.value)
                                        }
                                        placeholder="Tipos de vehículo (coma)"
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <input
                                            type="time"
                                            className="input-field"
                                            value={edicion?.apertura ?? '06:00'}
                                            onChange={(event) =>
                                                actualizarEdicionParqueadero(parking.id, 'apertura', event.target.value)
                                            }
                                        />
                                        <input
                                            type="time"
                                            className="input-field"
                                            value={edicion?.cierre ?? '22:00'}
                                            onChange={(event) =>
                                                actualizarEdicionParqueadero(parking.id, 'cierre', event.target.value)
                                            }
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-3 justify-between">
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            className="btn-action"
                                            onClick={() => guardarParqueadero(parking.id)}
                                            disabled={guardandoParqueadero}
                                        >
                                            Guardar
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn-suspend ${parking.isActive ? 'btn-suspend--danger' : 'btn-suspend--success'}`}
                                            onClick={() => cambiarEstadoParqueadero(parking.id, !parking.isActive)}
                                            disabled={guardandoParqueadero}
                                        >
                                            {parking.isActive ? 'Suspender' : 'Reactivar'}
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-500 self-center">
                                        Actualizado {parking.updatedAt ? new Date(parking.updatedAt).toLocaleDateString() : 'sin registro'}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <form onSubmit={crearParqueadero} className="border border-dashed rounded-2xl p-4 space-y-4">
                    <p className="font-semibold">Registrar nueva sede</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Nombre"
                            value={nuevoParqueadero.nombre}
                            onChange={(event) => setNuevoParqueadero({ ...nuevoParqueadero, nombre: event.target.value })}
                            required
                        />
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Dirección"
                            value={nuevoParqueadero.direccion}
                            onChange={(event) => setNuevoParqueadero({ ...nuevoParqueadero, direccion: event.target.value })}
                            required
                        />
                        <div>
                            <label className="text-xs text-slate-500">
                                Capacidad operativa (impacta KPI "Capacidad")
                            </label>
                            <input
                                type="number"
                                min={0}
                                className="input-field"
                                placeholder="Capacidad"
                                value={nuevoParqueadero.capacidad}
                                onChange={(event) => setNuevoParqueadero({ ...nuevoParqueadero, capacidad: Number(event.target.value) })}
                                required
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-500">
                                Tarifa base sede (impacta KPI "Tarifa base")
                            </label>
                            <input
                                type="number"
                                min={0}
                                className="input-field"
                                placeholder="Tarifa base"
                                value={nuevoParqueadero.tarifaBase}
                                onChange={(event) => setNuevoParqueadero({ ...nuevoParqueadero, tarifaBase: Number(event.target.value) })}
                                required
                            />
                        </div>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Tipos de vehículo"
                            value={nuevoParqueadero.tiposVehiculo}
                            onChange={(event) => setNuevoParqueadero({ ...nuevoParqueadero, tiposVehiculo: event.target.value })}
                            required
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="time"
                                className="input-field"
                                value={nuevoParqueadero.apertura}
                                onChange={(event) => setNuevoParqueadero({ ...nuevoParqueadero, apertura: event.target.value })}
                            />
                            <input
                                type="time"
                                className="input-field"
                                value={nuevoParqueadero.cierre}
                                onChange={(event) => setNuevoParqueadero({ ...nuevoParqueadero, cierre: event.target.value })}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" className="btn" disabled={guardandoParqueadero}>
                            {guardandoParqueadero ? 'Guardando...' : 'Crear sede'}
                        </button>
                    </div>
                </form>
            </section>
            )}

            <ConfirmActionModal
                isOpen={Boolean(eliminacionPendiente)}
                title="Confirmar eliminación"
                message={mensajeEliminacionPendiente}
                confirmText="Aceptar"
                cancelText="Cancelar"
                onConfirm={confirmarEliminacionPendiente}
                onCancel={cancelarEliminacionPendiente}
            />
        </section>
    );
};

export default ConfigPanel;

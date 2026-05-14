import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { isAxiosError } from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import api from '../api';
import {
    AlertCircle,
    LogOut,
    Car,
    ArrowRightLeft,
    Clock,
    DollarSign,
    CheckCircle,
    Loader2,
    Shield,
    CreditCard,
    Settings,
    Menu,
    X,
    ChevronDown,
    ChevronLeft,
} from 'lucide-react';
import UserManagementPanel from '../components/admin/UserManagementPanel';
import ClientManagementPanel from '../components/admin/ClientManagementPanel';
import ConfigPanel from '../components/admin/ConfigPanel';
import AuditLogs from './AuditLogs';
import ReportsPanel from '../components/reports/ReportsPanel';
import PermissionsProfiles from './PermissionsProfiles';
import { hasScreenPermission, SCREEN_KEYS } from '../permissions';
import { useAutoDismiss } from '../hooks/useAutoDismiss';
import { SETTINGS_UPDATED_EVENT } from '../utils/settingsRefresh';
import { DATA_UPDATED_EVENT } from '../utils/dataRefresh';
import {
    paymentsService,
    type ExitCashPaymentResponse,
    type ExitPaymentIntentResponse,
} from '../services/payments.service';

type VehicleType = 'CAR' | 'MOTORCYCLE';

type Tariff = {
    vehicleType: VehicleType;
    baseRate: number;
    hourlyRate: number;
};

type Parking = {
    id: string;
    name: string;
    address?: string;
    capacity?: number;
    baseRate?: number;
    tariffs?: Tariff[];
};

type Vehicle = {
    id: string;
    plate: string;
    type: VehicleType;
};

type Ticket = {
    id: string;
    ticketCode: string;
    status: 'ACTIVE' | 'CLOSED';
    entryTime: string;
    parking?: Parking;
    vehicle: Vehicle;
};

type ExitRecord = {
    id: string;
    exitTime: string;
    durationMinutes: number;
    totalAmount: number;
};

type ExitResponse = {
    ticket: Ticket;
    exit: ExitRecord;
    message: string;
    paymentOptions?: {
        aceptaEfectivo?: boolean;
        aceptaQr?: boolean;
        aceptaTarjeta?: boolean;
        aceptaEnLinea?: boolean;
    };
};

type TicketConSalida = Ticket & { exit?: ExitRecord | null };

type ResumenTicketsResponse = {
    activos: Ticket[];
    cerrados: TicketConSalida[];
};

type CierreJornadaResponse = {
    fechaCierre: string;
    activosPendientes: number;
    salidasArchivadas: number;
    mensaje: string;
};

type MessageState = {
    text: string;
    type: 'success' | 'error' | 'info' | '';
};

type ApiErrorResponse = {
    message?: string;
};

type DashboardView = 'operations' | 'config' | 'users' | 'clients' | 'audit' | 'reports' | 'permissions-profiles';
type ConfigSection = 'menu' | 'parametros-generales' | 'tarifario-avanzado' | 'sedes-parqueaderos';

type MenuItem = {
    key: string;
    view: DashboardView;
    label: string;
    description: string;
    icon: React.ReactNode;
    accent: string;
    route?: string;
};

const getErrorMessage = (error: unknown, fallback: string) => {
    if (isAxiosError<ApiErrorResponse>(error)) {
        return error.response?.data?.message ?? fallback;
    }
    return fallback;
};

const currencyFormatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
});

const roleLabelMap: Record<string, string> = {
    SUPER_ADMIN: 'Super admin',
    ADMIN_PARKING: 'Administrador sede',
    OPERATOR: 'Operador',
    AUDITOR: 'Auditor',
    CLIENT: 'Cliente',
};

const obtenerSeccionConfiguracionDesdeRuta = (pathname: string): ConfigSection | null => {
    if (pathname === '/dashboard/settings' || pathname === '/dashboard/settings/') {
        return 'menu';
    }

    if (!pathname.startsWith('/dashboard/settings/')) {
        return null;
    }

    const seccion = pathname.replace('/dashboard/settings/', '');
    if (seccion === 'parametros-generales') {
        return 'parametros-generales';
    }
    if (seccion === 'tarifario-avanzado') {
        return 'tarifario-avanzado';
    }
    if (seccion === 'sedes-parqueaderos') {
        return 'sedes-parqueaderos';
    }

    return null;
};

/**
 * Componente Dashboard renovado con mayor jerarquía visual.
 * Presenta KPIs operativos, formularios, y contexto de actividad reciente.
 */
const Dashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [plateEntry, setPlateEntry] = useState('');
    const [plateExit, setPlateExit] = useState('');
    const [vehicleTypeEntry, setVehicleTypeEntry] = useState<VehicleType>('CAR');
    const [parkings, setParkings] = useState<Parking[]>([]);
    const [selectedParkingId, setSelectedParkingId] = useState('');
    const [message, setMessage] = useState<MessageState>({ text: '', type: '' });
    const [lastExit, setLastExit] = useState<ExitResponse | null>(null);
    const [loadingParkings, setLoadingParkings] = useState(true);
    const [activeView, setActiveView] = useState<DashboardView>('operations');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [ticketsActivos, setTicketsActivos] = useState<Ticket[]>([]);
    const [ticketsCerrados, setTicketsCerrados] = useState<TicketConSalida[]>([]);
    const [filtroBusqueda, setFiltroBusqueda] = useState('');
    const [filtroPlaca, setFiltroPlaca] = useState('');
    const [isSyncingSettings, setIsSyncingSettings] = useState(false);
    const [exitPaymentIntent, setExitPaymentIntent] = useState<ExitPaymentIntentResponse | null>(null);
    const [exitCashPayment, setExitCashPayment] = useState<ExitCashPaymentResponse | null>(null);
    const [generatingExitPayment, setGeneratingExitPayment] = useState(false);
    const [registeringCashPayment, setRegisteringCashPayment] = useState(false);
    const [cerrandoJornada, setCerrandoJornada] = useState(false);

    const clearMessage = useCallback(() => setMessage({ text: '', type: '' }), []);

    useAutoDismiss(Boolean(message.text), clearMessage, 5000);

    const cargarResumenTickets = useCallback(async () => {
        try {
            const response = await api.get<ResumenTicketsResponse>('/parking/tickets/resumen');
            setTicketsActivos(response.data.activos ?? []);
            setTicketsCerrados(response.data.cerrados ?? []);
        } catch (err: unknown) {
            console.error('Error al consultar el resumen de tickets', err);
            setMessage({
                text: getErrorMessage(err, 'No se pudo cargar el resumen de tickets'),
                type: 'error',
            });
        }
    }, []);

    const canViewOperations = hasScreenPermission(
        user?.role,
        user?.permissions,
        SCREEN_KEYS.OPERATIONS,
    );
    const canManageSettings = hasScreenPermission(
        user?.role,
        user?.permissions,
        SCREEN_KEYS.SETTINGS,
    );
    const canManageUsers = hasScreenPermission(
        user?.role,
        user?.permissions,
        SCREEN_KEYS.USERS,
    );
    const canManageClients = hasScreenPermission(
        user?.role,
        user?.permissions,
        SCREEN_KEYS.CLIENTS,
    );
    const canManagePermissionsProfiles = hasScreenPermission(
        user?.role,
        user?.permissions,
        SCREEN_KEYS.PERMISSIONS_PROFILES,
    );
    const canViewAuditLogs = hasScreenPermission(
        user?.role,
        user?.permissions,
        SCREEN_KEYS.AUDIT_LOGS,
    );
    const canAccessReports = hasScreenPermission(
        user?.role,
        user?.permissions,
        SCREEN_KEYS.REPORTS_ACCESS,
    );

    const configSection = useMemo(
        () => obtenerSeccionConfiguracionDesdeRuta(location.pathname) ?? 'menu',
        [location.pathname],
    );

    const availableViews = useMemo(() => {
        const views: DashboardView[] = [];
        if (canViewOperations) views.push('operations');
        if (canManageSettings) views.push('config');
        if (canManageUsers) views.push('users');
        if (canManageClients) views.push('clients');
        if (canViewAuditLogs) views.push('audit');
        if (canAccessReports) views.push('reports');
        if (canManagePermissionsProfiles) views.push('permissions-profiles');
        return views;
    }, [
        canAccessReports,
        canManageClients,
        canManagePermissionsProfiles,
        canManageSettings,
        canManageUsers,
        canViewAuditLogs,
        canViewOperations,
    ]);

    useEffect(() => {
        if (!availableViews.includes(activeView)) {
            setActiveView(availableViews[0] ?? 'operations');
        }
    }, [activeView, availableViews]);

    useEffect(() => {
        // ES: Permitimos cerrar el menú con la tecla ESC para mejorar la accesibilidad.
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setSidebarOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const viewMeta: Record<DashboardView, { label: string; description: string; icon: React.ReactNode; accent: string }> = {
        operations: {
            label: 'Operación diaria',
            description: 'Registro de tickets, aforo y cobros',
            icon: <ArrowRightLeft size={16} />,
            accent: 'text-slate-900',
        },
        config: {
            label: 'Configuración',
            description: 'Tarifas, sedes y políticas del sistema',
            icon: <Settings size={16} />,
            accent: 'text-amber-700',
        },
        users: {
            label: 'Usuarios',
            description: 'Roles, accesos y estados',
            icon: <Shield size={16} />,
            accent: 'text-indigo-700',
        },
        clients: {
            label: 'Clientes',
            description: 'Contratos mensuales y alertas',
            icon: <CreditCard size={16} />,
            accent: 'text-emerald-700',
        },
        audit: {
            label: 'Auditoría',
            description: 'Trazabilidad detallada de acciones del sistema',
            icon: <Shield size={16} />,
            accent: 'text-rose-700',
        },
        reports: {
            label: 'Reportes',
            description: 'Visualizaciones y reportes operativos del parqueadero',
            icon: <DollarSign size={16} />,
            accent: 'text-cyan-700',
        },
        'permissions-profiles': {
            label: 'Permisos por perfil',
            description: 'Control de visualización por rol y usuario',
            icon: <Shield size={16} />,
            accent: 'text-indigo-700',
        },
    };

    const menuItems: MenuItem[] = availableViews.map((view) => ({
        key: view,
        view,
        ...viewMeta[view],
        route:
            view === 'operations'
                ? '/dashboard'
                : view === 'config'
                    ? '/dashboard/settings'
                    : view === 'users'
                        ? '/dashboard/users'
                        : view === 'clients'
                            ? '/dashboard/clients'
                            : view === 'reports'
                                ? '/dashboard/reports'
                                    : view === 'permissions-profiles'
                                        ? '/dashboard/settings/permissions-profiles'
                                : undefined,
    }));

    useEffect(() => {
        if (location.pathname === '/admin/auditoria' && canViewAuditLogs) {
            setActiveView('audit');
            return;
        }

        if (
            location.pathname === '/dashboard' ||
            location.pathname === '/dashboard/' ||
            location.pathname === '/dashboard/operations'
        ) {
            if (!canViewOperations) {
                setMessage({ text: 'No tienes permisos para acceder a Operación diaria.', type: 'error' });
                navigate('/dashboard', { replace: true });
                return;
            }
            setActiveView('operations');
            return;
        }

        if (location.pathname === '/dashboard/reports') {
            if (!canAccessReports) {
                setMessage({ text: 'No tienes permisos para acceder a Reportes.', type: 'error' });
                navigate('/dashboard', { replace: true });
                return;
            }
            setActiveView('reports');
            return;
        }

        if (location.pathname === '/dashboard/users') {
            if (!canManageUsers) {
                setMessage({ text: 'No tienes permisos para acceder a Usuarios.', type: 'error' });
                navigate('/dashboard', { replace: true });
                return;
            }
            setActiveView('users');
            return;
        }

        if (location.pathname === '/dashboard/clients') {
            if (!canManageClients) {
                setMessage({ text: 'No tienes permisos para acceder a Clientes.', type: 'error' });
                navigate('/dashboard', { replace: true });
                return;
            }
            setActiveView('clients');
            return;
        }

        if (location.pathname === '/dashboard/settings/permissions-profiles') {
            if (!canManagePermissionsProfiles) {
                setMessage({ text: 'No tienes permisos para acceder a Permisos por perfil.', type: 'error' });
                navigate('/dashboard', { replace: true });
                return;
            }
            setActiveView('permissions-profiles');
            return;
        }

        if (location.pathname.startsWith('/dashboard/settings')) {
            if (!canManageSettings) {
                setMessage({ text: 'No tienes permisos para acceder a configuración.', type: 'error' });
                navigate('/dashboard', { replace: true });
                return;
            }

            const seccion = obtenerSeccionConfiguracionDesdeRuta(location.pathname);
            if (!seccion) {
                // ES: Protegemos la navegación redirigiendo a un destino válido cuando la subruta no existe.
                setMessage({ text: 'La sección de configuración no existe. Te llevamos al menú.', type: 'error' });
                navigate('/dashboard/settings', { replace: true });
                return;
            }

            setActiveView('config');
            return;
        }

        if (location.pathname.startsWith('/dashboard')) {
            setActiveView(availableViews[0] ?? 'operations');
        }
    }, [
        availableViews,
        canAccessReports,
        canManageClients,
        canManagePermissionsProfiles,
        canManageSettings,
        canManageUsers,
        canViewAuditLogs,
        canViewOperations,
        location.pathname,
        navigate,
    ]);

    useEffect(() => {
        let isMounted = true;

        const fetchParkings = async () => {
            setLoadingParkings(true);
            try {
                const res = await api.get<Parking[]>('/parking');
                setParkings(res.data);
                if (res.data.length > 0) {
                    setSelectedParkingId(res.data[0].id);
                }
            } catch (err: unknown) {
                console.error('Error al consultar parqueaderos', err);
                setMessage({
                    text: getErrorMessage(err, 'No se pudo cargar la lista de parqueaderos'),
                    type: 'error',
                });
            } finally {
                setLoadingParkings(false);
            }
        };

        const refreshOperationalData = async () => {
            if (isMounted) {
                setIsSyncingSettings(true);
            }
            try {
                const tasks: Array<Promise<void>> = [];
                if (canViewOperations || canManageClients || canManageSettings) {
                    tasks.push(fetchParkings());
                }
                if (canViewOperations) {
                    tasks.push(cargarResumenTickets());
                }

                if (tasks.length) {
                    await Promise.all(tasks);
                }
            } finally {
                if (isMounted) {
                    setIsSyncingSettings(false);
                }
            }
        };

        if (canViewOperations || canManageClients || canManageSettings) {
            void fetchParkings();
        }
        if (canViewOperations) {
            void cargarResumenTickets();
        }

        window.addEventListener(SETTINGS_UPDATED_EVENT, refreshOperationalData);
        window.addEventListener(DATA_UPDATED_EVENT, refreshOperationalData);

        return () => {
            isMounted = false;
            window.removeEventListener(SETTINGS_UPDATED_EVENT, refreshOperationalData);
            window.removeEventListener(DATA_UPDATED_EVENT, refreshOperationalData);
        };
    }, [canManageClients, canManageSettings, canViewOperations, cargarResumenTickets]);

    const fechaFormatter = useMemo(() => new Intl.DateTimeFormat('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }), []);

    const formatCurrency = (value: number) => currencyFormatter.format(Math.max(0, value));
    const formatDateTime = (value: string) => fechaFormatter.format(new Date(value));
    const normalizePlateInput = (value: string, maxLength: number, fieldLabel: 'entrada' | 'salida') => {
        const normalized = value.toUpperCase().replace(/\s+/g, '');
        if (normalized.length > maxLength) {
            setMessage({
                text:
                    fieldLabel === 'salida'
                        ? 'Para salida, el máximo permitido es 7 caracteres (soporte para placas legadas).'
                        : 'Para ingreso, el máximo de dígitos/caracteres permitidos para la placa es 6.',
                type: 'info',
            });
            return normalized.slice(0, maxLength);
        }
        return normalized;
    };
    const formatElapsedTime = (value: string) => {
        const diffMinutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / (1000 * 60)));
        const days = Math.floor(diffMinutes / (60 * 24));
        const hours = Math.floor((diffMinutes % (60 * 24)) / 60);
        const minutes = diffMinutes % 60;
        const segments: string[] = [];
        if (days) segments.push(`${days}d`);
        if (hours) segments.push(`${hours}h`);
        if (minutes || (!days && !hours)) segments.push(`${minutes}m`);
        return segments.join(' ') || '0m';
    };

    const kpiSummary = useMemo(() => {
        const totalSites = parkings.length;
        const totalCapacity = parkings.reduce(
            (acc, parking) => acc + (parking.capacity || 0),
            0,
        );
        const avgBaseRate = totalSites > 0
            ? parkings.reduce((acc, parking) => acc + (parking.baseRate || 0), 0) / totalSites
            : 0;

        const latestClosedTicket = ticketsCerrados.reduce<TicketConSalida | null>((latest, ticket) => {
            if (!ticket.exit) {
                return latest;
            }

            if (!latest?.exit) {
                return ticket;
            }

            const currentExitTime = new Date(ticket.exit.exitTime).getTime();
            const latestExitTime = new Date(latest.exit.exitTime).getTime();
            return currentExitTime > latestExitTime ? ticket : latest;
        }, null);

        const lastAmount = latestClosedTicket?.exit?.totalAmount ?? lastExit?.exit?.totalAmount ?? null;

        return {
            totalSites,
            totalCapacity,
            avgBaseRate,
            lastAmount,
        };
    }, [parkings, ticketsCerrados, lastExit]);

    const aplicarFiltroPlaca = () => setFiltroPlaca(filtroBusqueda.trim());
    const limpiarFiltroPlaca = () => {
        setFiltroBusqueda('');
        setFiltroPlaca('');
    };

    const filtroNormalizado = filtroPlaca.trim().toUpperCase();

    const ticketsActivosFiltrados = useMemo(() => {
        if (!filtroNormalizado) return ticketsActivos;
        return ticketsActivos.filter((ticket) =>
            ticket.vehicle?.plate.toUpperCase().includes(filtroNormalizado)
        );
    }, [ticketsActivos, filtroNormalizado]);

    const ticketsCerradosFiltrados = useMemo(() => {
        if (!filtroNormalizado) return ticketsCerrados;
        return ticketsCerrados.filter((ticket) =>
            ticket.vehicle?.plate.toUpperCase().includes(filtroNormalizado)
        );
    }, [ticketsCerrados, filtroNormalizado]);

    const handleEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        clearMessage();

        if (!selectedParkingId) {
            setMessage({ text: 'Seleccione un parqueadero antes de registrar', type: 'error' });
            return;
        }

        try {
            await api.post('/parking/entry', {
                placa: plateEntry,
                vehicleType: vehicleTypeEntry,
                parkingId: selectedParkingId,
            });
            setMessage({
                text: `Ingreso registrado para la placa ${plateEntry}`,
                type: 'success',
            });
            setPlateEntry('');
            await cargarResumenTickets();
        } catch (err: unknown) {
            setMessage({
                text: getErrorMessage(err, 'Error al registrar el ingreso'),
                type: 'error',
            });
        }
    };

    const handleExit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearMessage();
        setLastExit(null);
        setExitPaymentIntent(null);
        setExitCashPayment(null);

        try {
            const res = await api.post<ExitResponse>('/parking/exit', { placa: plateExit });
            setMessage({ text: 'Salida procesada con éxito', type: 'success' });
            setLastExit(res.data);
            setPlateExit('');
            await cargarResumenTickets();
        } catch (err: unknown) {
            setMessage({
                text: getErrorMessage(err, 'Error al registrar la salida'),
                type: 'error',
            });
        }
    };

    const handleCreateExitPaymentIntent = async () => {
        const exitId = lastExit?.exit?.id;
        if (!exitId) {
            setMessage({ text: 'No hay una salida válida para generar el pago.', type: 'error' });
            return;
        }

        try {
            setGeneratingExitPayment(true);
            const data = await paymentsService.createExitWompiIntent(exitId);
            setExitPaymentIntent(data);
            setMessage({ text: 'QR de pago generado correctamente.', type: 'success' });
        } catch (err: unknown) {
            setMessage({
                text: getErrorMessage(err, 'No fue posible generar el QR de pago.'),
                type: 'error',
            });
        } finally {
            setGeneratingExitPayment(false);
        }
    };

    const handleRegisterCashPayment = async () => {
        const exitId = lastExit?.exit?.id;
        if (!exitId) {
            setMessage({ text: 'No hay una salida válida para registrar el pago.', type: 'error' });
            return;
        }

        try {
            setRegisteringCashPayment(true);
            const data = await paymentsService.registerExitCashPayment(exitId);
            setExitCashPayment(data);
            setMessage({ text: data.message || 'Pago en efectivo registrado correctamente.', type: 'success' });
        } catch (err: unknown) {
            setMessage({
                text: getErrorMessage(err, 'No fue posible registrar el pago en efectivo.'),
                type: 'error',
            });
        } finally {
            setRegisteringCashPayment(false);
        }
    };

    const handleCerrarJornada = async () => {
        clearMessage();

        try {
            setCerrandoJornada(true);
            // ES: Cierra la jornada diaria para reiniciar el listado de salidas
            // sin afectar los vehículos que aún siguen activos en parqueadero.
            const response = await api.post<CierreJornadaResponse>('/parking/jornada/cerrar');
            await cargarResumenTickets();

            const detallePendientes =
                response.data.activosPendientes > 0
                    ? ` Quedan ${response.data.activosPendientes} vehículo(s) sin salida registrada.`
                    : '';

            setMessage({
                text: `${response.data.mensaje}${detallePendientes}`,
                type: 'success',
            });
        } catch (err: unknown) {
            setMessage({
                text: getErrorMessage(err, 'No fue posible cerrar la jornada.'),
                type: 'error',
            });
        } finally {
            setCerrandoJornada(false);
        }
    };

    useEffect(() => {
        if (exitCashPayment?.status !== 'COMPLETED') {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            setLastExit(null);
            setExitCashPayment(null);
            setExitPaymentIntent(null);
        }, 5000);

        return () => window.clearTimeout(timeoutId);
    }, [exitCashPayment]);

    return (
        <div className="min-h-screen bg-slate-100 flex">
            {sidebarOpen && (
                <button
                    type="button"
                    className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm"
                    aria-label="Cerrar menú"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
            <aside
                className={`fixed left-0 top-0 z-40 flex h-full w-72 flex-col border-r border-slate-800 bg-slate-900 text-white transition-transform duration-300 sm:w-80 ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
                    <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">RM Parking</p>
                        <p className="text-lg font-semibold text-white">Centro de Control</p>
                    </div>
                    <button
                        type="button"
                        className="rounded-full border border-white/10 p-2 text-white/70 hover:text-white"
                        aria-label="Colapsar menú"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <ChevronLeft size={18} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-6">
                    {/* ES: Menú lateral encargado de cambiar las vistas principales sin afectar el contenido existente. */}
                    <ul className="space-y-4">
                        {menuItems.map((item) => {
                            const isActive = activeView === item.view;
                            return (
                                <li key={item.key}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (item.view === 'audit') {
                                                setActiveView('audit');
                                                navigate('/admin/auditoria');
                                            } else if (item.route) {
                                                setActiveView(item.view);
                                                navigate(item.route);
                                            } else {
                                                setActiveView(item.view);
                                                if (location.pathname !== '/dashboard') {
                                                    navigate('/dashboard');
                                                }
                                            }
                                            setSidebarOpen(false);
                                        }}
                                        className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                                            isActive
                                                ? 'border-white/10 bg-white/10 text-white'
                                                : 'border-white/5 text-slate-300 hover:border-white/10 hover:bg-slate-800/80'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 font-semibold">
                                                {item.icon}
                                                {item.label}
                                            </div>
                                            <ChevronDown
                                                size={16}
                                                className={`transform transition ${isActive ? 'rotate-180' : 'rotate-0'}`}
                                            />
                                        </div>
                                        {isActive && (
                                            <p className="mt-2 text-xs text-slate-400">{item.description}</p>
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
                <div className="border-t border-slate-800 px-6 py-5 text-xs text-slate-400">
                    {/* ES: Pie informativo para mantener coherencia visual en el menú lateral. */}
                    Versión operativa · {new Date().getFullYear()}
                </div>
            </aside>
            <div className="flex-1 flex flex-col">
                <header className="bg-slate-900 text-white shadow-xl">
                <div className="dashboard-shell flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <button
                                type="button"
                                className="mb-4 inline-flex items-center gap-2 rounded-2xl border border-white/20 px-3 py-2 text-sm font-semibold text-white"
                                aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
                                onClick={() => setSidebarOpen((prev) => !prev)}
                            >
                                {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
                                Menú
                            </button>
                        <span className="pill bg-white/10 text-white">Panel operativo</span>
                        <h1 className="text-3xl font-semibold mt-2">RM Parking · Centro de Control</h1>
                        <p className="text-slate-300 max-w-2xl">
                            Supervisa el flujo de vehículos, controla el aforo y visualiza cobros en un tablero cohesivo.
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-xs uppercase text-slate-400">{user?.role ? roleLabelMap[user.role] ?? user.role : 'Perfil'}</p>
                            <p className="text-lg font-semibold">{user?.fullName || 'Sesión no identificada'}</p>
                        </div>
                        <button
                            onClick={logout}
                            className="h-12 w-12 rounded-2xl border border-white/20 flex items-center justify-center hover:bg-white/10 transition"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
                </header>

                <main className="dashboard-shell flex-1 space-y-10">
                {activeView === 'operations' && canViewOperations && (
                    <>
                        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                            <article className="panel-card">
                                <span className="pill"><ArrowRightLeft size={16} /> Operación</span>
                                <p className="kpi-value mt-4">{kpiSummary.totalSites}</p>
                                <p className="text-sm text-slate-500">Parqueaderos habilitados</p>
                            </article>
                            <article className="panel-card">
                                <span className="pill"><Car size={16} /> Capacidad</span>
                                <p className="kpi-value mt-4">{kpiSummary.totalCapacity}</p>
                                <p className="text-sm text-slate-500">Cupos totales configurados</p>
                                <p className="text-xs text-slate-400 mt-1">Origen: Configuracion / Capacidad operativa</p>
                            </article>
                            <article className="panel-card">
                                <span className="pill"><DollarSign size={16} /> Tarifa base</span>
                                <p className="kpi-value mt-4">
                                    {kpiSummary.avgBaseRate > 0 ? formatCurrency(kpiSummary.avgBaseRate) : 'Sin datos'}
                                </p>
                                <p className="text-sm text-slate-500">Promedio por parqueadero</p>
                                <p className="text-xs text-slate-400 mt-1">Origen: Configuracion / Tarifa base sede</p>
                            </article>
                            <article className="panel-card">
                                <span className="pill"><Clock size={16} /> Último cobro</span>
                                <p className="kpi-value mt-4">
                                    {kpiSummary.lastAmount !== null ? formatCurrency(kpiSummary.lastAmount) : 'Aún sin registros'}
                                </p>
                                <p className="text-sm text-slate-500">Actualizado al último egreso</p>
                            </article>
                        </section>

                        {isSyncingSettings && (
                            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sky-900 flex items-center gap-2">
                                <Loader2 size={16} className="animate-spin" />
                                <span className="text-sm font-medium">Actualizando datos con la nueva configuración...</span>
                            </div>
                        )}

                        {message.text && (
                            <div
                                className={`rounded-2xl border p-4 flex items-start gap-3 ${
                                    message.type === 'success'
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                                        : message.type === 'info'
                                            ? 'border-sky-200 bg-sky-50 text-sky-900'
                                        : 'border-rose-200 bg-rose-50 text-rose-900'
                                }`}
                            >
                                {message.type === 'success' && <CheckCircle size={20} className="mt-0.5" />}
                                {message.type === 'info' && <AlertCircle size={20} className="mt-0.5" />}
                                <span className="text-sm font-medium leading-relaxed">{message.text}</span>
                            </div>
                        )}

                        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="panel-card">
                                <div className="panel-card__header">
                                    <div>
                                        <span className="pill"><Car size={16} /> Entrada</span>
                                        <h2 className="panel-card__title mt-2">Registrar ingreso</h2>
                                    </div>
                                    <span className="text-xs text-slate-400">Última placa: {plateEntry || 'S/N'}</span>
                                </div>
                                <form onSubmit={handleEntry} className="space-y-5">
                                    <div>
                                        <label className="form-label">Placa del vehículo</label>
                                        <input
                                            type="text"
                                            value={plateEntry}
                                            onChange={(e) => {
                                                setPlateEntry(normalizePlateInput(e.target.value, 6, 'entrada'));
                                            }}
                                            className="input-field uppercase tracking-widest"
                                            placeholder="ABC123"
                                            maxLength={6}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="form-label">Tipo de vehículo</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {(['CAR', 'MOTORCYCLE'] as const).map((type) => (
                                                <label
                                                    key={type}
                                                    className={`cursor-pointer rounded-xl border px-4 py-3 text-center text-sm font-semibold transition ${
                                                        vehicleTypeEntry === type
                                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                                                            : 'border-slate-200 text-slate-500'
                                                    }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        value={type}
                                                        checked={vehicleTypeEntry === type}
                                                        onChange={() => setVehicleTypeEntry(type)}
                                                        className="sr-only"
                                                    />
                                                    {type === 'CAR' ? 'Carro' : 'Moto'}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="form-label">Parqueadero</label>
                                        <select
                                            value={selectedParkingId}
                                            onChange={(e) => setSelectedParkingId(e.target.value)}
                                            className="input-field appearance-none"
                                            required
                                        >
                                            {parkings.map((parking) => (
                                                <option key={parking.id} value={parking.id}>
                                                    {parking.name}
                                                </option>
                                            ))}
                                        </select>
                                        {!parkings.length && (
                                            <p className="text-xs text-rose-500 mt-2">No hay parqueaderos configurados.</p>
                                        )}
                                    </div>
                                    <button type="submit" className="btn-primary">Registrar entrada</button>
                                </form>
                            </div>

                            <div className="panel-card">
                                <div className="panel-card__header">
                                    <div>
                                        <span className="pill"><Clock size={16} /> Salida</span>
                                        <h2 className="panel-card__title mt-2">Registrar salida</h2>
                                    </div>
                                </div>
                                <form onSubmit={handleExit} className="space-y-5">
                                    <div>
                                        <label className="form-label">Placa</label>
                                        <input
                                            type="text"
                                            value={plateExit}
                                            onChange={(e) => {
                                                setPlateExit(normalizePlateInput(e.target.value, 7, 'salida'));
                                            }}
                                            className="input-field uppercase tracking-widest"
                                            placeholder="ABC123"
                                            maxLength={7}
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="btn-primary bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
                                    >
                                        Registrar salida
                                    </button>
                                </form>

                                {lastExit ? (
                                    <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 space-y-3">
                                        <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                                            <DollarSign size={18} /> Resumen de cobro
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-sm text-emerald-900">
                                            <span>Placa</span>
                                            <span className="font-semibold text-right">
                                                {lastExit.ticket?.vehicle?.plate || 'N/D'}
                                            </span>
                                            <span>Duración</span>
                                            <span className="font-semibold text-right">
                                                {lastExit.exit?.durationMinutes} min
                                            </span>
                                            <span>Monto total</span>
                                            <span className="font-bold text-right">
                                                {formatCurrency(lastExit.exit?.totalAmount || 0)}
                                            </span>
                                        </div>
                                        {(lastExit.paymentOptions?.aceptaEfectivo ?? true) && (
                                            <button
                                                type="button"
                                                onClick={() => void handleRegisterCashPayment()}
                                                disabled={registeringCashPayment || exitCashPayment?.status === 'COMPLETED'}
                                                className="mt-2 w-full rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                                            >
                                                {registeringCashPayment
                                                    ? 'Registrando pago en efectivo...'
                                                    : exitCashPayment?.status === 'COMPLETED'
                                                        ? 'Pago en efectivo registrado'
                                                        : 'Registrar pago recibido (efectivo)'}
                                            </button>
                                        )}

                                        {lastExit.paymentOptions?.aceptaQr && (
                                            <button
                                                type="button"
                                                onClick={() => void handleCreateExitPaymentIntent()}
                                                disabled={generatingExitPayment || exitCashPayment?.status === 'COMPLETED'}
                                                className="mt-2 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
                                            >
                                                {generatingExitPayment
                                                    ? 'Generando QR de pago...'
                                                    : 'Generar QR de pago (Wompi Sandbox)'}
                                            </button>
                                        )}

                                        {!lastExit.paymentOptions?.aceptaQr && (
                                            <p className="text-xs text-slate-500">
                                                El pago por QR no está habilitado en configuración.
                                            </p>
                                        )}

                                        {lastExit.paymentOptions?.aceptaEfectivo === false && (
                                            <p className="text-xs text-slate-500">
                                                El pago en efectivo no está habilitado en configuración.
                                            </p>
                                        )}

                                        {exitCashPayment && (
                                            <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-3 text-sm text-slate-700">
                                                <p className="font-semibold text-slate-900">Pago confirmado en caja</p>
                                                <p>Método: {exitCashPayment.method}</p>
                                                <p>Estado: {exitCashPayment.status}</p>
                                                <p>Monto: {formatCurrency(exitCashPayment.amount)}</p>
                                            </div>
                                        )}

                                        {exitPaymentIntent && (
                                            <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-3 text-sm text-slate-700">
                                                <p className="font-semibold text-slate-900">Link de pago para el cliente</p>
                                                <a
                                                    href={exitPaymentIntent.paymentPageUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="mt-1 block break-all text-emerald-700 underline"
                                                >
                                                    {exitPaymentIntent.paymentPageUrl}
                                                </a>
                                                <img
                                                    src={exitPaymentIntent.qrImageUrl}
                                                    alt="QR de pago"
                                                    className="mx-auto mt-3 h-48 w-48 rounded-lg border border-slate-200"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="mt-6 text-sm text-slate-400">
                                        El resumen aparecerá tras el próximo egreso.
                                    </p>
                                )}
                            </div>
                        </section>

                        <section className="panel-card space-y-6">
                            <div className="panel-card__header">
                                <div>
                                    <span className="pill"><Car size={16} /> Seguimiento</span>
                                    <h2 className="panel-card__title mt-2">Estado de vehículos</h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => void handleCerrarJornada()}
                                    disabled={cerrandoJornada}
                                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                                >
                                    {cerrandoJornada ? 'Cerrando jornada...' : 'Cerrar jornada'}
                                </button>
                            </div>
                            <div className="space-y-3">
                                <label className="form-label">Buscar por placa</label>
                                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                                    <input
                                        type="text"
                                        value={filtroBusqueda}
                                        onChange={(e) => setFiltroBusqueda(e.target.value.toUpperCase())}
                                        className="input-field uppercase tracking-widest md:max-w-xs"
                                        placeholder="Filtra por placa"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={aplicarFiltroPlaca}
                                            className="btn-primary whitespace-nowrap w-auto rounded-2xl px-4 py-2 text-sm"
                                        >
                                            Buscar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={limpiarFiltroPlaca}
                                            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                                        >
                                            Limpiar
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="border border-slate-100 rounded-2xl p-4 bg-white/80">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-slate-900">Vehículos en el parqueadero</h3>
                                        <span className="pill">{ticketsActivosFiltrados.length}</span>
                                    </div>
                                    {ticketsActivosFiltrados.length ? (
                                        <ul className="mt-4 space-y-3">
                                            {ticketsActivosFiltrados.map((ticket) => (
                                                <li
                                                    key={ticket.id}
                                                    className="rounded-xl border border-slate-100 p-3 text-sm text-slate-700"
                                                >
                                                    <div className="flex items-center justify-between font-semibold text-slate-900">
                                                        <span>{ticket.vehicle?.plate}</span>
                                                        <span>{formatElapsedTime(ticket.entryTime)}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        Ingreso: {formatDateTime(ticket.entryTime)}
                                                    </p>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="mt-4 text-sm text-slate-400">No hay vehículos activos que coincidan con el filtro.</p>
                                    )}
                                </div>
                                <div className="border border-slate-100 rounded-2xl p-4 bg-white/80">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-slate-900">Vehículos con salida</h3>
                                        <span className="pill">{ticketsCerradosFiltrados.length}</span>
                                    </div>
                                    {ticketsCerradosFiltrados.length ? (
                                        <ul className="mt-4 space-y-3">
                                            {ticketsCerradosFiltrados.map((ticket) => (
                                                <li
                                                    key={ticket.id}
                                                    className="rounded-xl border border-slate-100 p-3 text-sm text-slate-700"
                                                >
                                                    <div className="flex items-center justify-between font-semibold text-slate-900">
                                                        <span>{ticket.vehicle?.plate}</span>
                                                        <span>{ticket.exit ? formatDateTime(ticket.exit.exitTime) : 'Sin hora'}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        Ingreso: {formatDateTime(ticket.entryTime)}
                                                    </p>
                                                    {ticket.exit && (
                                                        <p className="text-xs text-slate-500">
                                                            Salida: {formatDateTime(ticket.exit.exitTime)}
                                                        </p>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="mt-4 text-sm text-slate-400">No hay registros cerrados que coincidan con el filtro.</p>
                                    )}
                                </div>
                            </div>
                        </section>

                        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="panel-card">
                                <div className="panel-card__header">
                                    <h2 className="panel-card__title">Parqueaderos configurados</h2>
                                    <span className="pill">{parkings.length} activos</span>
                                </div>
                                {loadingParkings ? (
                                    <p className="text-sm text-slate-400">Cargando información...</p>
                                ) : parkings.length ? (
                                    <ul className="space-y-4">
                                        {parkings.map((parking) => (
                                            <li
                                                key={parking.id}
                                                className="border border-slate-100 rounded-xl p-4 flex flex-col gap-2"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <p className="font-semibold text-slate-900">{parking.name}</p>
                                                    <span className="pill">
                                                        {parking.capacity ?? 'Sin dato'} cupos
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-500">
                                                    {parking.address || 'Sin dirección registrada'}
                                                </p>
                                                <p className="text-xs text-slate-400 uppercase">
                                                    Tarifa base {parking.baseRate ? formatCurrency(parking.baseRate) : 'por definir'}
                                                </p>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                                        Configure al menos un parqueadero para habilitar el registro de movimientos.
                                    </div>
                                )}
                            </div>

                            <div className="panel-card">
                                <div className="panel-card__header">
                                    <h2 className="panel-card__title">Actividad reciente</h2>
                                    <span className="pill">Tiempo real</span>
                                </div>
                                {lastExit ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-500">Ticket</span>
                                            <span className="font-semibold text-slate-900">
                                                {lastExit.ticket?.ticketCode || 'N/D'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-500">Vehículo</span>
                                            <span className="font-semibold text-slate-900">
                                                {lastExit.ticket?.vehicle?.plate || 'N/D'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-500">Parqueadero</span>
                                            <span className="font-semibold text-slate-900">
                                                {lastExit.ticket?.parking?.name || 'N/D'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs uppercase text-slate-500">Cobro</p>
                                                <p className="text-2xl font-semibold text-slate-900">
                                                    {formatCurrency(lastExit.exit?.totalAmount || 0)}
                                                </p>
                                            </div>
                                            <span className="pill">
                                                <Clock size={16} /> {lastExit.exit?.durationMinutes} min
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-400">
                                        Aún no se registran egresos en esta sesión. Utilice el formulario de salida para ver el detalle aquí.
                                    </p>
                                )}
                            </div>
                        </section>
                    </>
                )}

                {activeView === 'config' && canManageSettings && <ConfigPanel seccionActiva={configSection} />}

                {activeView === 'users' && canManageUsers && <UserManagementPanel />}

                {activeView === 'clients' && canManageClients && (
                    <ClientManagementPanel parkings={parkings} loadingParkings={loadingParkings} />
                )}

                {activeView === 'audit' && canViewAuditLogs && <AuditLogs embedded />}

                {activeView === 'reports' && canAccessReports && <ReportsPanel />}

                {activeView === 'permissions-profiles' && canManagePermissionsProfiles && <PermissionsProfiles embedded />}

                {!availableViews.length && (
                    <section className="panel-card">
                        <h2 className="panel-card__title">Sin módulos habilitados</h2>
                        <p className="mt-2 text-sm text-slate-500">
                            Tu perfil no tiene permisos de visualización configurados. Contacta al administrador.
                        </p>
                    </section>
                )}
            </main>
        </div>
        {/* ES: Cierre del contenedor principal que agrupa menú lateral y contenido. */}
    </div>
    );
};

export default Dashboard;

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { isAxiosError } from 'axios';
import { useAuth } from '../context/useAuth';
import api from '../api';
import {
    LogOut,
    Car,
    ArrowRightLeft,
    Clock,
    DollarSign,
    CheckCircle,
    Shield,
    CreditCard,
    Menu,
    X,
    ChevronDown,
    ChevronLeft,
} from 'lucide-react';
import UserManagementPanel from '../components/admin/UserManagementPanel';
import ClientManagementPanel from '../components/admin/ClientManagementPanel';

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
};

type TicketConSalida = Ticket & { exit?: ExitRecord | null };

type ResumenTicketsResponse = {
    activos: Ticket[];
    cerrados: TicketConSalida[];
};

type MessageState = {
    text: string;
    type: 'success' | 'error' | '';
};

type ApiErrorResponse = {
    message?: string;
};

type DashboardView = 'operations' | 'users' | 'clients';

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

/**
 * Componente Dashboard renovado con mayor jerarquía visual.
 * Presenta KPIs operativos, formularios, y contexto de actividad reciente.
 */
const Dashboard = () => {
    const { user, logout } = useAuth();
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

    const clearMessage = useCallback(() => setMessage({ text: '', type: '' }), []);

    const cargarResumenTickets = useCallback(async () => {
        try {
            const response = await api.get<ResumenTicketsResponse>('/parking/tickets/resumen');
            setTicketsActivos(response.data.activos ?? []);
            setTicketsCerrados(response.data.cerrados ?? []);
        } catch (err: unknown) {
            console.error('Error fetching ticket summary', err);
            setMessage({
                text: getErrorMessage(err, 'No se pudo cargar el resumen de tickets'),
                type: 'error',
            });
        }
    }, []);

    const role = user?.role;
    const canManageUsers = role === 'SUPER_ADMIN';
    const canManageClients = role === 'SUPER_ADMIN' || role === 'ADMIN_PARKING';

    const availableViews = useMemo(() => {
        const views: DashboardView[] = ['operations'];
        if (canManageUsers) views.push('users');
        if (canManageClients) views.push('clients');
        return views;
    }, [canManageClients, canManageUsers]);

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
    };

    const menuItems = availableViews.map((view) => ({
        key: view,
        view,
        ...viewMeta[view],
    }));

    useEffect(() => {
        const fetchParkings = async () => {
            setLoadingParkings(true);
            try {
                const res = await api.get<Parking[]>('/parking');
                setParkings(res.data);
                if (res.data.length > 0) {
                    setSelectedParkingId(res.data[0].id);
                }
            } catch (err: unknown) {
                console.error('Error fetching parkings', err);
                setMessage({
                    text: getErrorMessage(err, 'No se pudo cargar la lista de parqueaderos'),
                    type: 'error',
                });
            } finally {
                setLoadingParkings(false);
            }
        };
        fetchParkings();
        cargarResumenTickets();
    }, [cargarResumenTickets]);

    const fechaFormatter = useMemo(() => new Intl.DateTimeFormat('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }), []);

    const formatCurrency = (value: number) => currencyFormatter.format(Math.max(0, value));
    const formatDateTime = (value: string) => fechaFormatter.format(new Date(value));
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
        const lastAmount = lastExit?.exit?.totalAmount ?? null;

        return {
            totalSites,
            totalCapacity,
            avgBaseRate,
            lastAmount,
        };
    }, [parkings, lastExit]);

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
                                            setActiveView(item.view);
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
                            <p className="text-xs uppercase text-slate-400">Operario</p>
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
                {activeView === 'operations' && (
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
                            </article>
                            <article className="panel-card">
                                <span className="pill"><DollarSign size={16} /> Tarifa base</span>
                                <p className="kpi-value mt-4">
                                    {kpiSummary.avgBaseRate > 0 ? formatCurrency(kpiSummary.avgBaseRate) : 'Sin datos'}
                                </p>
                                <p className="text-sm text-slate-500">Promedio por parqueadero</p>
                            </article>
                            <article className="panel-card">
                                <span className="pill"><Clock size={16} /> Último cobro</span>
                                <p className="kpi-value mt-4">
                                    {kpiSummary.lastAmount !== null ? formatCurrency(kpiSummary.lastAmount) : 'Aún sin registros'}
                                </p>
                                <p className="text-sm text-slate-500">Actualizado al último egreso</p>
                            </article>
                        </section>

                        {message.text && (
                            <div
                                className={`rounded-2xl border p-4 flex items-start gap-3 ${
                                    message.type === 'success'
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                                        : 'border-rose-200 bg-rose-50 text-rose-900'
                                }`}
                            >
                                {message.type === 'success' && <CheckCircle size={20} className="mt-0.5" />}
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
                                    <span className="text-xs text-slate-400">Última placa: {plateEntry || 'N/A'}</span>
                                </div>
                                <form onSubmit={handleEntry} className="space-y-5">
                                    <div>
                                        <label className="form-label">Placa del vehículo</label>
                                        <input
                                            type="text"
                                            value={plateEntry}
                                            onChange={(e) => {
                                                clearMessage();
                                                setPlateEntry(e.target.value.toUpperCase());
                                            }}
                                            className="input-field uppercase tracking-widest"
                                            placeholder="ABC123"
                                            maxLength={8}
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
                                                clearMessage();
                                                setPlateExit(e.target.value.toUpperCase());
                                            }}
                                            className="input-field uppercase tracking-widest"
                                            placeholder="ABC123"
                                            maxLength={8}
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
                            </div>
                            <div className="space-y-3">
                                <label className="form-label">Buscar por placa</label>
                                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                                    <input
                                        type="text"
                                        value={filtroBusqueda}
                                        onChange={(e) => setFiltroBusqueda(e.target.value.toUpperCase())}
                                        className="input-field uppercase tracking-widest"
                                        placeholder="Filtra por placa"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={aplicarFiltroPlaca}
                                            className="btn-primary whitespace-nowrap"
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

                {activeView === 'users' && canManageUsers && <UserManagementPanel />}

                {activeView === 'clients' && canManageClients && (
                    <ClientManagementPanel parkings={parkings} loadingParkings={loadingParkings} />
                )}
            </main>
        </div>
        {/* ES: Cierre del contenedor principal que agrupa menú lateral y contenido. */}
    </div>
    );
};

export default Dashboard;

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import {
    AlertTriangle,
    BellRing,
    ClipboardPlus,
    Loader2,
    RefreshCw,
    CalendarCheck,
} from 'lucide-react';
import clientsService, {
    type AlertRecord,
    type ContractRecord,
} from '../../services/clients.service';

interface ClientManagementPanelProps {
    parkings: Array<{ id: string; name: string }>;
    loadingParkings: boolean;
}

interface MessageState {
    text: string;
    type: 'success' | 'error' | '';
}

const moneyFormatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
});

const toInputDate = (value: string | Date) => {
    const date = typeof value === 'string' ? new Date(value) : value;
    return date.toISOString().split('T')[0];
};

const getDefaultPeriod = () => {
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setDate(today.getDate() + 30);
    return { today: toInputDate(today), nextMonth: toInputDate(nextMonth) };
};

const getErrorMessage = (error: unknown, fallback: string) => {
    if (isAxiosError<{ message?: string }>(error)) {
        return error.response?.data?.message ?? fallback;
    }
    return fallback;
};

const statusTokens: Record<string, { label: string; classes: string }> = {
    ACTIVE: { label: 'Activo', classes: 'bg-emerald-100 text-emerald-700' },
    EXPIRED: { label: 'Vencido', classes: 'bg-rose-100 text-rose-700' },
    EXPIRING_SOON: { label: 'Por vencer', classes: 'bg-amber-100 text-amber-700' },
};

const ClientManagementPanel = ({ parkings, loadingParkings }: ClientManagementPanelProps) => {
    const period = useMemo(() => getDefaultPeriod(), []);
    const [contracts, setContracts] = useState<ContractRecord[]>([]);
    const [alerts, setAlerts] = useState<AlertRecord[]>([]);
    const [loadingContracts, setLoadingContracts] = useState(true);
    const [loadingAlerts, setLoadingAlerts] = useState(true);
    const [creating, setCreating] = useState(false);
    const [renewing, setRenewing] = useState(false);
    const [message, setMessage] = useState<MessageState>({ text: '', type: '' });
    const [newClientData, setNewClientData] = useState({
        fullName: '',
        email: '',
        parkingId: '',
        startDate: period.today,
        endDate: period.nextMonth,
        monthlyFee: '',
        planName: 'Mensualidad',
    });
    const [renewalData, setRenewalData] = useState({
        contractId: '',
        newEndDate: '',
        paymentDate: period.today,
        monthlyFee: '',
    });

    const loadContracts = useCallback(async () => {
        setLoadingContracts(true);
        try {
            const data = await clientsService.listContracts();
            setContracts(data);
        } catch (error) {
            setMessage({
                text: getErrorMessage(error, 'No se pudieron cargar los contratos'),
                type: 'error',
            });
        } finally {
            setLoadingContracts(false);
        }
    }, []);

    const loadAlerts = useCallback(async () => {
        setLoadingAlerts(true);
        try {
            const data = await clientsService.listAlerts();
            setAlerts(data);
        } catch (error) {
            setMessage({
                text: getErrorMessage(error, 'No se pudieron cargar las alertas'),
                type: 'error',
            });
        } finally {
            setLoadingAlerts(false);
        }
    }, []);

    useEffect(() => {
        loadContracts();
        loadAlerts();
    }, [loadContracts, loadAlerts]);

    useEffect(() => {
        if (parkings.length && !newClientData.parkingId) {
            setNewClientData((prev) => ({ ...prev, parkingId: parkings[0].id }));
        }
    }, [parkings, newClientData.parkingId]);

    const syncRenewalDefaults = useCallback(
        (contractId: string) => {
            const contract = contracts.find((item) => item.id === contractId);
            if (!contract) {
                return;
            }
            setRenewalData({
                contractId,
                newEndDate: toInputDate(contract.endDate),
                paymentDate: period.today,
                monthlyFee: contract.monthlyFee ? String(contract.monthlyFee) : '',
            });
        },
        [contracts, period.today],
    );

    useEffect(() => {
        if (contracts.length && !renewalData.contractId) {
            syncRenewalDefaults(contracts[0].id);
        }
    }, [contracts, renewalData.contractId, syncRenewalDefaults]);

    const handleCreateClient = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setMessage({ text: '', type: '' });
        const monthlyFeeValue = Number(newClientData.monthlyFee);
        if (Number.isNaN(monthlyFeeValue)) {
            setMessage({ text: 'La mensualidad debe ser un valor numérico', type: 'error' });
            return;
        }
        if (!newClientData.parkingId) {
            setMessage({ text: 'Selecciona un parqueadero para continuar', type: 'error' });
            return;
        }
        setCreating(true);
        try {
            await clientsService.createClient({
                fullName: newClientData.fullName,
                email: newClientData.email,
                parkingId: newClientData.parkingId,
                startDate: newClientData.startDate,
                endDate: newClientData.endDate,
                monthlyFee: monthlyFeeValue,
                planName: newClientData.planName || undefined,
            });
            setMessage({ text: 'Cliente registrado y contrato creado', type: 'success' });
            setNewClientData((prev) => ({
                ...prev,
                fullName: '',
                email: '',
                startDate: period.today,
                endDate: period.nextMonth,
                monthlyFee: '',
            }));
            await Promise.all([loadContracts(), loadAlerts()]);
        } catch (error) {
            setMessage({
                text: getErrorMessage(error, 'Error al registrar el cliente'),
                type: 'error',
            });
        } finally {
            setCreating(false);
        }
    };

    const handleRenewContract = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setMessage({ text: '', type: '' });
        if (!renewalData.contractId) {
            setMessage({ text: 'Selecciona un contrato para renovar', type: 'error' });
            return;
        }
        const payload: { newEndDate: string; paymentDate: string; monthlyFee?: number } = {
            newEndDate: renewalData.newEndDate,
            paymentDate: renewalData.paymentDate,
        };
        if (renewalData.monthlyFee) {
            const newFee = Number(renewalData.monthlyFee);
            if (Number.isNaN(newFee)) {
                setMessage({ text: 'El nuevo valor debe ser numérico', type: 'error' });
                return;
            }
            payload.monthlyFee = newFee;
        }
        setRenewing(true);
        try {
            await clientsService.renewContract(renewalData.contractId, payload);
            setMessage({ text: 'Contrato renovado correctamente', type: 'success' });
            await Promise.all([loadContracts(), loadAlerts()]);
            syncRenewalDefaults(renewalData.contractId);
        } catch (error) {
            setMessage({
                text: getErrorMessage(error, 'No se pudo renovar el contrato'),
                type: 'error',
            });
        } finally {
            setRenewing(false);
        }
    };

    return (
        <section className="space-y-6">
            <header className="flex flex-col gap-2">
                <span className="pill bg-emerald-100 text-emerald-700 w-fit">
                    <BellRing size={14} /> Clientes con mensualidad
                </span>
                <h2 className="text-3xl font-semibold text-slate-900">Contratos y alertas</h2>
                <p className="text-sm text-slate-500 max-w-3xl">
                    Orquesta la cartera de clientes corporativos: registra nuevas mensualidades, controla los pagos y recibe alertas
                    automáticas cuando un contrato está por vencer.
                </p>
            </header>

            {message.text && (
                <div
                    className={`rounded-2xl border p-4 flex items-center gap-3 ${
                        message.type === 'success'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                            : 'border-rose-200 bg-rose-50 text-rose-900'
                    }`}
                >
                    {message.type === 'success' ? <CalendarCheck size={18} /> : <AlertTriangle size={18} />}
                    <span className="text-sm font-medium">{message.text}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <form onSubmit={handleCreateClient} className="panel-card space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center">
                            <ClipboardPlus size={18} />
                        </div>
                        <div>
                            <h3 className="panel-card__title">Nuevo cliente</h3>
                            <p className="text-xs text-slate-500">Genera contrato y credenciales</p>
                        </div>
                    </div>
                    <div>
                        <label className="form-label">Nombre completo</label>
                        <input
                            className="input-field"
                            type="text"
                            value={newClientData.fullName}
                            onChange={(event) => setNewClientData({ ...newClientData, fullName: event.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="form-label">Correo de contacto</label>
                        <input
                            className="input-field lowercase"
                            type="email"
                            value={newClientData.email}
                            onChange={(event) => setNewClientData({ ...newClientData, email: event.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="form-label">Parqueadero asignado</label>
                        <select
                            className="input-field"
                            value={newClientData.parkingId}
                            onChange={(event) => setNewClientData({ ...newClientData, parkingId: event.target.value })}
                            disabled={loadingParkings || !parkings.length}
                            required
                        >
                            {parkings.length ? (
                                parkings.map((parking) => (
                                    <option key={parking.id} value={parking.id}>
                                        {parking.name}
                                    </option>
                                ))
                            ) : (
                                <option value="">Sin parqueaderos disponibles</option>
                            )}
                        </select>
                        {!parkings.length && (
                            <p className="text-xs text-rose-500 mt-2">Carga parqueaderos desde el módulo operativo.</p>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="form-label">Inicio</label>
                            <input
                                className="input-field"
                                type="date"
                                value={newClientData.startDate}
                                onChange={(event) => setNewClientData({ ...newClientData, startDate: event.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="form-label">Fin</label>
                            <input
                                className="input-field"
                                type="date"
                                value={newClientData.endDate}
                                onChange={(event) => setNewClientData({ ...newClientData, endDate: event.target.value })}
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="form-label">Plan</label>
                        <input
                            className="input-field"
                            type="text"
                            value={newClientData.planName}
                            onChange={(event) => setNewClientData({ ...newClientData, planName: event.target.value })}
                            placeholder="Mensualidad, Corporativo, etc."
                        />
                    </div>
                    <div>
                        <label className="form-label">Mensualidad (COP)</label>
                        <input
                            className="input-field"
                            type="number"
                            min="0"
                            step="1000"
                            value={newClientData.monthlyFee}
                            onChange={(event) => setNewClientData({ ...newClientData, monthlyFee: event.target.value })}
                            required
                        />
                    </div>
                    <button type="submit" className="btn-primary" disabled={creating || !parkings.length}>
                        {creating ? (
                            <span className="flex items-center gap-2">
                                <Loader2 size={16} className="animate-spin" /> Registrando
                            </span>
                        ) : (
                            'Registrar cliente'
                        )}
                    </button>
                </form>

                <form onSubmit={handleRenewContract} className="panel-card space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                            <RefreshCw size={18} />
                        </div>
                        <div>
                            <h3 className="panel-card__title">Renovar contrato</h3>
                            <p className="text-xs text-slate-500">Actualiza fechas y pagos</p>
                        </div>
                    </div>
                    <div>
                        <label className="form-label">Contrato</label>
                        <select
                            className="input-field"
                            value={renewalData.contractId}
                            onChange={(event) => {
                                const contractId = event.target.value;
                                setRenewalData((prev) => ({ ...prev, contractId }));
                                syncRenewalDefaults(contractId);
                            }}
                            disabled={!contracts.length}
                            required
                        >
                            {contracts.length ? (
                                contracts.map((contract) => (
                                    <option key={contract.id} value={contract.id}>
                                        {contract.user.fullName} · {contract.parking.name}
                                    </option>
                                ))
                            ) : (
                                <option value="">Sin contratos</option>
                            )}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="form-label">Nuevo fin</label>
                            <input
                                className="input-field"
                                type="date"
                                value={renewalData.newEndDate}
                                onChange={(event) => setRenewalData({ ...renewalData, newEndDate: event.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="form-label">Pago recibido</label>
                            <input
                                className="input-field"
                                type="date"
                                value={renewalData.paymentDate}
                                onChange={(event) => setRenewalData({ ...renewalData, paymentDate: event.target.value })}
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="form-label">Nuevo valor (opcional)</label>
                        <input
                            className="input-field"
                            type="number"
                            min="0"
                            step="500"
                            value={renewalData.monthlyFee}
                            onChange={(event) => setRenewalData({ ...renewalData, monthlyFee: event.target.value })}
                            placeholder="Se conserva si se deja vacío"
                        />
                    </div>
                    <button type="submit" className="btn-primary" disabled={renewing || !contracts.length}>
                        {renewing ? (
                            <span className="flex items-center gap-2">
                                <Loader2 size={16} className="animate-spin" /> Renovando
                            </span>
                        ) : (
                            'Guardar renovación'
                        )}
                    </button>
                </form>

                <article className="panel-card space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                            <BellRing size={18} />
                        </div>
                        <div>
                            <h3 className="panel-card__title">Alertas activas</h3>
                            <p className="text-xs text-slate-500">Vencimientos en tiempo real</p>
                        </div>
                    </div>
                    {loadingAlerts ? (
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Loader2 size={16} className="animate-spin" /> Analizando contratos...
                        </div>
                    ) : alerts.length ? (
                        <ul className="space-y-3">
                            {alerts.map((alert) => (
                                <li key={alert.id} className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-900">
                                    <p className="font-semibold flex items-center gap-2">
                                        <AlertTriangle size={14} /> {alert.contract.user.fullName}
                                    </p>
                                    <p className="text-xs text-rose-700">
                                        {alert.contract.parking.name} · {alert.alertType === 'EXPIRED' ? 'Contrato vencido' : 'Por vencer'}
                                    </p>
                                    <p className="text-xs mt-1 leading-relaxed">{alert.message}</p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-slate-500">No hay alertas pendientes. Todos los contratos están al día.</p>
                    )}
                </article>
            </div>

            <article className="panel-card space-y-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <span className="pill bg-slate-900 text-white">Inventario de contratos</span>
                        <h3 className="panel-card__title mt-2">Detalle completo</h3>
                    </div>
                    <button
                        type="button"
                        className="btn-outline !w-auto px-4"
                        onClick={() => {
                            loadContracts();
                            loadAlerts();
                        }}
                        disabled={loadingContracts}
                    >
                        <RefreshCw size={16} className={loadingContracts ? 'animate-spin' : ''} />
                        Sincronizar
                    </button>
                </div>
                {loadingContracts ? (
                    <div className="flex items-center justify-center py-10 text-slate-500">
                        <Loader2 size={20} className="animate-spin" />
                        <span className="ml-2 text-sm font-medium">Consultando contratos...</span>
                    </div>
                ) : contracts.length ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {contracts.map((contract) => {
                            const token = statusTokens[contract.status] || {
                                label: contract.status,
                                classes: 'bg-slate-100 text-slate-600',
                            };
                            return (
                                <article key={contract.id} className="border border-slate-100 rounded-2xl p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-slate-900">{contract.user.fullName}</p>
                                            <p className="text-xs text-slate-500">{contract.user.email}</p>
                                        </div>
                                        <span className={`pill ${token.classes}`}>{token.label}</span>
                                    </div>
                                    <p className="text-sm text-slate-500">{contract.parking.name}</p>
                                    <div className="text-2xl font-semibold text-slate-900">
                                        {moneyFormatter.format(contract.monthlyFee || 0)}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                                        <div>
                                            <p className="uppercase">Inició</p>
                                            <p className="font-semibold text-slate-900">{dateFormatter.format(new Date(contract.startDate))}</p>
                                        </div>
                                        <div>
                                            <p className="uppercase">Finaliza</p>
                                            <p className="font-semibold text-slate-900">{dateFormatter.format(new Date(contract.endDate))}</p>
                                        </div>
                                        <div>
                                            <p className="uppercase">Último pago</p>
                                            <p className="font-semibold text-slate-900">
                                                {contract.lastPaymentDate
                                                    ? dateFormatter.format(new Date(contract.lastPaymentDate))
                                                    : 'Sin registro'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="uppercase">Próximo pago</p>
                                            <p className="font-semibold text-slate-900">
                                                {contract.nextPaymentDate
                                                    ? dateFormatter.format(new Date(contract.nextPaymentDate))
                                                    : 'No definido'}
                                            </p>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-sm text-slate-500">Aún no existen contratos. Registra un cliente para comenzar a monitorear.</p>
                )}
            </article>
        </section>
    );
};

export default ClientManagementPanel;

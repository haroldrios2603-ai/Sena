import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import {
    AlertTriangle,
    BellRing,
    ClipboardPlus,
    Loader2,
    RefreshCw,
    CalendarCheck,
    Pencil,
    X,
    Trash2,
    RotateCcw,
} from 'lucide-react';
import clientsService, {
    type AlertRecord,
    type ContractFilters,
    type ContractRecord,
    type UpdateContractPayload,
} from '../../services/clients.service';
import type { DocumentType } from '../../context/types';
import { useAutoDismiss } from '../../hooks/useAutoDismiss';
import { useAuth } from '../../context/useAuth';
import { hasScreenPermission, SCREEN_KEYS } from '../../permissions';
import ConfirmActionModal from './ConfirmActionModal';
import { DATA_UPDATED_EVENT } from '../../utils/dataRefresh';

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

const formatPhoneInput = (value: string) => {
    const hasLeadingPlus = value.trim().startsWith('+');
    const digits = value.replace(/\D/g, '').slice(0, 15);
    const prefix = hasLeadingPlus ? '+' : '';

    if (!digits) {
        return prefix;
    }

    if (digits.length <= 3) {
        return `${prefix}${digits}`;
    }

    if (digits.length <= 6) {
        return `${prefix}${digits.slice(0, 3)} ${digits.slice(3)}`;
    }

    if (digits.length <= 10) {
        return `${prefix}${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }

    return `${prefix}${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)} ${digits.slice(10)}`;
};

const formatPhoneDisplay = (value: string | null | undefined) => {
    if (!value?.trim()) {
        return 'Sin teléfono';
    }
    return formatPhoneInput(value);
};

const statusTokens: Record<string, { label: string; classes: string }> = {
    ACTIVE: { label: 'Activo', classes: 'bg-emerald-100 text-emerald-700' },
    EXPIRED: { label: 'Vencido', classes: 'bg-rose-100 text-rose-700' },
    EXPIRING_SOON: { label: 'Por vencer', classes: 'bg-amber-100 text-amber-700' },
    PAYMENT_PENDING: { label: 'Pago pendiente', classes: 'bg-amber-100 text-amber-700' },
    CANCELLED: { label: 'Archivado', classes: 'bg-slate-200 text-slate-700' },
};

const documentTypeLabels: Record<DocumentType, string> = {
    CEDULA: 'Cédula de ciudadanía',
    TARJETA_IDENTIDAD: 'Tarjeta de identidad',
    NIT: 'NIT',
    PASAPORTE: 'Pasaporte',
    PEP: 'Permiso Especial de Permanencia',
};

const documentTypes = Object.keys(documentTypeLabels) as DocumentType[];

const ClientManagementPanel = ({ parkings, loadingParkings }: ClientManagementPanelProps) => {
    const { user: sessionUser } = useAuth();
    const period = useMemo(() => getDefaultPeriod(), []);
    const [contracts, setContracts] = useState<ContractRecord[]>([]);
    const [alerts, setAlerts] = useState<AlertRecord[]>([]);
    const [loadingContracts, setLoadingContracts] = useState(true);
    const [loadingAlerts, setLoadingAlerts] = useState(true);
    const [creating, setCreating] = useState(false);
    const [renewing, setRenewing] = useState(false);
    const [savingEdit, setSavingEdit] = useState(false);
    const [message, setMessage] = useState<MessageState>({ text: '', type: '' });
    const [newClientData, setNewClientData] = useState({
        fullName: '',
        email: '',
        contactPhone: '',
        parkingId: '',
        startDate: period.today,
        endDate: period.nextMonth,
        monthlyFee: '',
        planName: 'Mensualidad',
        documentType: '' as DocumentType | '',
        documentNumber: '',
    });
    const [contractFilters, setContractFilters] = useState<ContractFilters>({});
    const [renewalData, setRenewalData] = useState({
        contractId: '',
        newEndDate: '',
        paymentDate: period.today,
        monthlyFee: '',
    });
    const [editingContract, setEditingContract] = useState<ContractRecord | null>(null);
    const [pendingDeleteContract, setPendingDeleteContract] = useState<ContractRecord | null>(null);
    const [editData, setEditData] = useState<UpdateContractPayload>({});
    const canDeleteClients = hasScreenPermission(
        sessionUser?.role,
        sessionUser?.permissions,
        SCREEN_KEYS.CLIENTS_DELETE,
    );

    useAutoDismiss(Boolean(message.text), () => setMessage({ text: '', type: '' }), 5000);

    const loadContracts = useCallback(async (filters: ContractFilters = contractFilters) => {
        setLoadingContracts(true);
        try {
            const data = await clientsService.listContracts(filters);
            setContracts(data);
        } catch (error) {
            setMessage({
                text: getErrorMessage(error, 'No se pudieron cargar los contratos'),
                type: 'error',
            });
        } finally {
            setLoadingContracts(false);
        }
    }, [contractFilters]);

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
        const handleDataUpdated = () => {
            void Promise.all([loadContracts(contractFilters), loadAlerts()]);
        };

        window.addEventListener(DATA_UPDATED_EVENT, handleDataUpdated);
        return () => window.removeEventListener(DATA_UPDATED_EVENT, handleDataUpdated);
    }, [contractFilters, loadAlerts, loadContracts]);

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

    useEffect(() => {
        if (!editingContract) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !savingEdit) {
                setEditingContract(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [editingContract, savingEdit]);

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
                contactPhone: newClientData.contactPhone,
                parkingId: newClientData.parkingId,
                startDate: newClientData.startDate,
                endDate: newClientData.endDate,
                monthlyFee: monthlyFeeValue,
                planName: newClientData.planName || undefined,
                ...(newClientData.documentType ? { documentType: newClientData.documentType as DocumentType } : {}),
                ...(newClientData.documentNumber.trim() ? { documentNumber: newClientData.documentNumber.trim() } : {}),
            });
            setMessage({ text: 'Cliente registrado y contrato creado', type: 'success' });
            setNewClientData((prev) => ({
                ...prev,
                fullName: '',
                email: '',
                contactPhone: '',
                startDate: period.today,
                endDate: period.nextMonth,
                monthlyFee: '',
                documentType: '',
                documentNumber: '',
            }));
            await Promise.all([loadContracts(contractFilters), loadAlerts()]);
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

    const openEditContractModal = (contract: ContractRecord) => {
        setEditingContract(contract);
        setEditData({
            fullName: contract.user.fullName,
            email: contract.user.email,
            contactPhone: contract.user.contactPhone ?? '',
            parkingId: contract.parkingId,
            startDate: toInputDate(contract.startDate),
            endDate: toInputDate(contract.endDate),
            lastPaymentDate: contract.lastPaymentDate ? toInputDate(contract.lastPaymentDate) : '',
            nextPaymentDate: contract.nextPaymentDate ? toInputDate(contract.nextPaymentDate) : '',
            monthlyFee: Number(contract.monthlyFee ?? 0),
            planName: contract.planName,
            isRecurring: contract.isRecurring,
            documentType: contract.user.documentType ?? undefined,
            documentNumber: contract.user.documentNumber ?? '',
        });
    };

    const closeEditContractModal = () => {
        if (savingEdit) {
            return;
        }
        setEditingContract(null);
    };

    const handleUpdateContract = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editingContract || savingEdit) {
            return;
        }

        const payload: UpdateContractPayload = {
            fullName: (editData.fullName ?? '').trim(),
            email: (editData.email ?? '').trim().toLowerCase(),
            contactPhone: (editData.contactPhone ?? '').trim(),
            parkingId: editData.parkingId,
            startDate: editData.startDate,
            endDate: editData.endDate,
            lastPaymentDate: editData.lastPaymentDate || undefined,
            nextPaymentDate: editData.nextPaymentDate || undefined,
            monthlyFee: Number(editData.monthlyFee ?? 0),
            planName: (editData.planName ?? '').trim(),
            isRecurring: Boolean(editData.isRecurring),
            documentType: editData.documentType ?? null,
            documentNumber: (editData.documentNumber ?? '').trim() || null,
        };

        if (Number.isNaN(payload.monthlyFee ?? Number.NaN)) {
            setMessage({ text: 'La mensualidad debe ser un valor numérico', type: 'error' });
            return;
        }

        setSavingEdit(true);
        setMessage({ text: '', type: '' });
        try {
            await clientsService.updateContract(editingContract.id, payload);
            setMessage({ text: 'Cliente y contrato actualizados correctamente', type: 'success' });
            setEditingContract(null);
            await Promise.all([loadContracts(contractFilters), loadAlerts()]);
        } catch (error) {
            setMessage({
                text: getErrorMessage(error, 'No se pudo actualizar el cliente'),
                type: 'error',
            });
        } finally {
            setSavingEdit(false);
        }
    };

    const handleDeleteContract = (contract: ContractRecord) => {
        if (savingEdit) {
            return;
        }

        // ES: Confirmamos la eliminación con modal para evitar borrados accidentales.
        setPendingDeleteContract(contract);
    };

    const cancelDeleteContract = () => {
        if (!pendingDeleteContract || savingEdit) {
            return;
        }

        setPendingDeleteContract(null);
        setMessage({
            text: 'No se archivó el contrato: operación cancelada por el operador.',
            type: 'error',
        });
    };

    const confirmDeleteContract = async () => {
        if (!pendingDeleteContract) {
            return;
        }

        const contract = pendingDeleteContract;

        setSavingEdit(true);
        setMessage({ text: '', type: '' });
        try {
            await clientsService.deleteContract(contract.id);
            setMessage({ text: 'Contrato archivado correctamente', type: 'success' });
            await Promise.all([loadContracts(contractFilters), loadAlerts()]);
        } catch (error) {
            setMessage({
                text: getErrorMessage(error, 'No se pudo archivar el cliente'),
                type: 'error',
            });
        } finally {
            setPendingDeleteContract(null);
            setSavingEdit(false);
        }
    };

    const handleRestoreContract = async (contract: ContractRecord) => {
        if (savingEdit) {
            return;
        }

        const shouldRestore = window.confirm(
            `Vas a restaurar el contrato de ${contract.user.fullName}.`,
        );
        if (!shouldRestore) {
            return;
        }

        setSavingEdit(true);
        setMessage({ text: '', type: '' });
        try {
            await clientsService.restoreContract(contract.id);
            setMessage({ text: 'Contrato restaurado correctamente', type: 'success' });
            await Promise.all([loadContracts(contractFilters), loadAlerts()]);
        } catch (error) {
            setMessage({
                text: getErrorMessage(error, 'No se pudo restaurar el contrato'),
                type: 'error',
            });
        } finally {
            setSavingEdit(false);
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
                        <label className="form-label">Tipo de documento</label>
                        <select
                            className="input-field"
                            value={newClientData.documentType}
                            onChange={(event) =>
                                setNewClientData({ ...newClientData, documentType: event.target.value as DocumentType | '' })
                            }
                        >
                            <option value="">Sin documento</option>
                            {documentTypes.map((dt) => (
                                <option key={dt} value={dt}>
                                    {documentTypeLabels[dt]}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="form-label">Número de documento</label>
                        <input
                            className="input-field"
                            type="text"
                            placeholder="Ej. 1234567890"
                            value={newClientData.documentNumber}
                            onChange={(event) => setNewClientData({ ...newClientData, documentNumber: event.target.value })}
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
                        <label className="form-label">Teléfono de contacto</label>
                        <input
                            className="input-field"
                            type="tel"
                            value={newClientData.contactPhone}
                            onChange={(event) =>
                                setNewClientData({ ...newClientData, contactPhone: formatPhoneInput(event.target.value) })
                            }
                            placeholder="Ej. +57 300 123 4567"
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
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                    <div>
                        <label className="form-label">Nombre completo</label>
                        <input
                            className="input-field"
                            type="text"
                            value={contractFilters.fullName ?? ''}
                            onChange={(event) => setContractFilters((prev) => ({ ...prev, fullName: event.target.value || undefined }))}
                        />
                    </div>
                    <div>
                        <label className="form-label">Correo</label>
                        <input
                            className="input-field"
                            type="text"
                            value={contractFilters.email ?? ''}
                            onChange={(event) => setContractFilters((prev) => ({ ...prev, email: event.target.value || undefined }))}
                        />
                    </div>
                    <div>
                        <label className="form-label">Teléfono</label>
                        <input
                            className="input-field"
                            type="text"
                            value={contractFilters.contactPhone ?? ''}
                            onChange={(event) => {
                                const formatted = formatPhoneInput(event.target.value);
                                setContractFilters((prev) => ({ ...prev, contactPhone: formatted || undefined }));
                            }}
                        />
                    </div>
                    <div>
                        <label className="form-label">Estado</label>
                        <select
                            className="input-field"
                            value={contractFilters.status ?? ''}
                            onChange={(event) =>
                                setContractFilters((prev) => ({
                                    ...prev,
                                    status: (event.target.value || undefined) as ContractFilters['status'],
                                }))
                            }
                        >
                            <option value="">Todos</option>
                            <option value="ACTIVE">Activo</option>
                            <option value="EXPIRING_SOON">Por vencer</option>
                            <option value="EXPIRED">Vencido</option>
                            <option value="PAYMENT_PENDING">Pago pendiente</option>
                            <option value="CANCELLED">Archivado</option>
                        </select>
                    </div>
                    <div>
                        <label className="form-label">Parqueadero</label>
                        <select
                            className="input-field"
                            value={contractFilters.parkingId ?? ''}
                            onChange={(event) => setContractFilters((prev) => ({ ...prev, parkingId: event.target.value || undefined }))}
                        >
                            <option value="">Todos</option>
                            {parkings.map((parking) => (
                                <option key={parking.id} value={parking.id}>{parking.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="form-label">Nombre parqueadero</label>
                        <input
                            className="input-field"
                            type="text"
                            value={contractFilters.parkingName ?? ''}
                            onChange={(event) => setContractFilters((prev) => ({ ...prev, parkingName: event.target.value || undefined }))}
                        />
                    </div>
                    <div>
                        <label className="form-label">Plan</label>
                        <input
                            className="input-field"
                            type="text"
                            value={contractFilters.planName ?? ''}
                            onChange={(event) => setContractFilters((prev) => ({ ...prev, planName: event.target.value || undefined }))}
                        />
                    </div>
                    <div>
                        <label className="form-label">Número de documento</label>
                        <input
                            className="input-field"
                            type="text"
                            value={contractFilters.documentNumber ?? ''}
                            onChange={(event) => setContractFilters((prev) => ({ ...prev, documentNumber: event.target.value || undefined }))}
                            placeholder="Ej. 1234567890"
                        />
                    </div>
                    <div className="flex items-end gap-2">
                        <button
                            type="button"
                            className="btn-primary w-auto px-4"
                            onClick={() => loadContracts(contractFilters)}
                            disabled={loadingContracts}
                        >
                            Buscar
                        </button>
                        <button
                            type="button"
                            className="btn-outline !w-auto px-4"
                            onClick={() => {
                                const reset: ContractFilters = {};
                                setContractFilters(reset);
                                void loadContracts(reset);
                            }}
                            disabled={loadingContracts}
                        >
                            Limpiar filtros
                        </button>
                    </div>
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
                                            <p className="text-xs text-slate-500">{formatPhoneDisplay(contract.user.contactPhone)}</p>
                                            {contract.user.documentNumber && (
                                                <p className="text-xs text-slate-400">
                                                    {contract.user.documentType ? documentTypeLabels[contract.user.documentType] : 'Doc.'}: {contract.user.documentNumber}
                                                </p>
                                            )}
                                        </div>
                                        <span className={`pill ${token.classes}`}>{token.label}</span>
                                    </div>
                                    <div className="flex justify-end">
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                className="btn-outline !w-auto px-3 text-xs"
                                                onClick={() => openEditContractModal(contract)}
                                                disabled={contract.status === 'CANCELLED'}
                                            >
                                                <Pencil size={13} /> Editar
                                            </button>
                                            {canDeleteClients && (
                                                contract.status === 'CANCELLED' ? (
                                                    <button
                                                        type="button"
                                                        className="btn-suspend btn-suspend--success !w-auto px-3 text-xs"
                                                        onClick={() => handleRestoreContract(contract)}
                                                    >
                                                        <RotateCcw size={13} /> Restaurar
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="btn-suspend btn-suspend--danger !w-auto px-3 text-xs"
                                                        onClick={() => handleDeleteContract(contract)}
                                                    >
                                                        <Trash2 size={13} /> Archivar
                                                    </button>
                                                )
                                            )}
                                        </div>
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

            {editingContract && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeEditContractModal();
                        }
                    }}
                >
                    <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">Editar cliente y contrato</h3>
                                <p className="text-xs text-slate-500">Contrato: {editingContract.id}</p>
                            </div>
                            <button
                                type="button"
                                className="btn-outline !w-auto px-3 py-2"
                                onClick={closeEditContractModal}
                                disabled={savingEdit}
                            >
                                <X size={14} /> Cerrar
                            </button>
                        </div>

                        <form className="space-y-4" onSubmit={handleUpdateContract}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="form-label">Nombre completo</label>
                                    <input
                                        className="input-field"
                                        type="text"
                                        value={editData.fullName ?? ''}
                                        onChange={(event) => setEditData({ ...editData, fullName: event.target.value })}
                                        required
                                        minLength={2}
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Tipo de documento</label>
                                    <select
                                        className="input-field"
                                        value={editData.documentType ?? ''}
                                        onChange={(event) =>
                                            setEditData({ ...editData, documentType: (event.target.value as DocumentType) || undefined })
                                        }
                                    >
                                        <option value="">Sin documento</option>
                                        {documentTypes.map((dt) => (
                                            <option key={dt} value={dt}>
                                                {documentTypeLabels[dt]}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">Número de documento</label>
                                    <input
                                        className="input-field"
                                        type="text"
                                        placeholder="Ej. 1234567890"
                                        value={editData.documentNumber ?? ''}
                                        onChange={(event) => setEditData({ ...editData, documentNumber: event.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Correo</label>
                                    <input
                                        className="input-field lowercase"
                                        type="email"
                                        value={editData.email ?? ''}
                                        onChange={(event) => setEditData({ ...editData, email: event.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Teléfono</label>
                                    <input
                                        className="input-field"
                                        type="text"
                                        value={editData.contactPhone ?? ''}
                                        onChange={(event) =>
                                            setEditData({ ...editData, contactPhone: formatPhoneInput(event.target.value) })
                                        }
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Parqueadero</label>
                                    <select
                                        className="input-field"
                                        value={editData.parkingId ?? ''}
                                        onChange={(event) => setEditData({ ...editData, parkingId: event.target.value })}
                                        required
                                        disabled={loadingParkings || !parkings.length}
                                    >
                                        {parkings.map((parking) => (
                                            <option key={parking.id} value={parking.id}>{parking.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">Inicio</label>
                                    <input
                                        className="input-field"
                                        type="date"
                                        value={editData.startDate ?? ''}
                                        onChange={(event) => setEditData({ ...editData, startDate: event.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Fin</label>
                                    <input
                                        className="input-field"
                                        type="date"
                                        value={editData.endDate ?? ''}
                                        onChange={(event) => setEditData({ ...editData, endDate: event.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Último pago</label>
                                    <input
                                        className="input-field"
                                        type="date"
                                        value={editData.lastPaymentDate ?? ''}
                                        onChange={(event) => setEditData({ ...editData, lastPaymentDate: event.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Próximo pago</label>
                                    <input
                                        className="input-field"
                                        type="date"
                                        value={editData.nextPaymentDate ?? ''}
                                        onChange={(event) => setEditData({ ...editData, nextPaymentDate: event.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Plan</label>
                                    <input
                                        className="input-field"
                                        type="text"
                                        value={editData.planName ?? ''}
                                        onChange={(event) => setEditData({ ...editData, planName: event.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Mensualidad (COP)</label>
                                    <input
                                        className="input-field"
                                        type="number"
                                        min="0"
                                        step="1000"
                                        value={String(editData.monthlyFee ?? 0)}
                                        onChange={(event) =>
                                            setEditData({ ...editData, monthlyFee: Number(event.target.value) })
                                        }
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Renovación automática</label>
                                    <select
                                        className="input-field"
                                        value={editData.isRecurring ? 'YES' : 'NO'}
                                        onChange={(event) =>
                                            setEditData({ ...editData, isRecurring: event.target.value === 'YES' })
                                        }
                                    >
                                        <option value="YES">Sí</option>
                                        <option value="NO">No</option>
                                    </select>
                                </div>
                            </div>

                            <button type="submit" className="btn-primary" disabled={savingEdit}>
                                {savingEdit ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 size={16} className="animate-spin" /> Guardando cambios
                                    </span>
                                ) : (
                                    'Guardar edición'
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmActionModal
                isOpen={Boolean(pendingDeleteContract)}
                title="Confirmar archivo de contrato"
                message={pendingDeleteContract
                    ? `¿Deseas archivar el contrato de ${pendingDeleteContract.user.fullName}? Podrás restaurarlo más adelante.`
                    : ''}
                confirmText="Aceptar"
                cancelText="Cancelar"
                isProcessing={savingEdit}
                onConfirm={confirmDeleteContract}
                onCancel={cancelDeleteContract}
            />
        </section>
    );
};

export default ClientManagementPanel;

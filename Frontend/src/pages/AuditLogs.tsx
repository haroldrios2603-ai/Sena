import { useCallback, useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import { Download, FileSearch, Loader2, ShieldAlert } from 'lucide-react';
import auditService, {
    type AuditFilters,
    type AuditLogItem,
    type AuditOperation,
    type AuditResult,
} from '../services/audit.service';
import { useAutoDismiss } from '../hooks/useAutoDismiss';

type MessageState = {
    text: string;
    type: 'success' | 'error' | '';
};

const operationOptions: Array<AuditOperation | ''> = [
    '',
    'CREATE',
    'UPDATE',
    'DELETE',
    'VIEW',
    'LOGIN',
    'LOGOUT',
    'LOGIN_FAILED',
    'FORBIDDEN',
    'PASSWORD_CHANGE',
    'EXPORT',
];

const resultOptions: Array<AuditResult | ''> = ['', 'SUCCESS', 'FAILURE'];

const getErrorMessage = (error: unknown, fallback: string) => {
    if (isAxiosError<{ message?: string }>(error)) {
        return error.response?.data?.message ?? fallback;
    }
    return fallback;
};

const AuditLogs = () => {
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [items, setItems] = useState<AuditLogItem[]>([]);
    const [selected, setSelected] = useState<AuditLogItem | null>(null);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [message, setMessage] = useState<MessageState>({ text: '', type: '' });
    const [filters, setFilters] = useState<AuditFilters>({ page: 1, pageSize: 25 });
    const [visibleColumns, setVisibleColumns] = useState({
        timestamp: true,
        user: true,
        ip: true,
        operation: true,
        entity: true,
        result: true,
    });

    useAutoDismiss(Boolean(message.text), () => setMessage({ text: '', type: '' }), 5000);

    const dateFormatter = useMemo(
        () =>
            new Intl.DateTimeFormat('es-CO', {
                dateStyle: 'short',
                timeStyle: 'medium',
            }),
        [],
    );

    const loadLogs = useCallback(async () => {
        setLoading(true);
        try {
            const response = await auditService.list(filters);
            setItems(response.items);
            setTotal(response.total);
            setTotalPages(response.totalPages);
        } catch (error) {
            setMessage({
                text: getErrorMessage(error, 'No se pudo cargar la auditoría'),
                type: 'error',
            });
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        void loadLogs();
    }, [loadLogs]);

    const onExport = async (format: 'csv' | 'json') => {
        setExporting(true);
        try {
            const blob = await auditService.exportLogs(format, filters);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `auditoria.${format}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            setMessage({ text: `Exportación ${format.toUpperCase()} generada`, type: 'success' });
        } catch (error) {
            setMessage({
                text: getErrorMessage(error, 'No se pudo exportar la auditoría'),
                type: 'error',
            });
        } finally {
            setExporting(false);
        }
    };

    const updateFilter = (field: keyof AuditFilters, value: string) => {
        setFilters((prev) => ({
            ...prev,
            page: 1,
            [field]: value || undefined,
        }));
    };

    return (
        <section className="dashboard-shell space-y-6 py-8">
            <header className="space-y-2">
                <span className="pill bg-rose-100 text-rose-700 w-fit">
                    <ShieldAlert size={14} /> Módulo de auditoría
                </span>
                <h1 className="text-3xl font-semibold text-slate-900">Trazabilidad de eventos</h1>
                <p className="text-sm text-slate-500 max-w-3xl">
                    Revisa quién hizo qué, cuándo y desde dónde. Los registros son inmutables y se ordenan por fecha descendente.
                </p>
            </header>

            {message.text && (
                <div
                    className={`rounded-2xl border p-4 text-sm ${
                        message.type === 'success'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                            : 'border-rose-200 bg-rose-50 text-rose-900'
                    }`}
                >
                    {message.text}
                </div>
            )}

            <div className="panel-card space-y-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <label>
                        <span className="form-label">Desde</span>
                        <input
                            className="input-field"
                            type="date"
                            value={filters.from ?? ''}
                            onChange={(event) => updateFilter('from', event.target.value)}
                        />
                    </label>
                    <label>
                        <span className="form-label">Hasta</span>
                        <input
                            className="input-field"
                            type="date"
                            value={filters.to ?? ''}
                            onChange={(event) => updateFilter('to', event.target.value)}
                        />
                    </label>
                    <label>
                        <span className="form-label">Usuario (email)</span>
                        <input
                            className="input-field"
                            type="text"
                            value={filters.userEmail ?? ''}
                            onChange={(event) => updateFilter('userEmail', event.target.value)}
                        />
                    </label>
                    <label>
                        <span className="form-label">Entidad</span>
                        <input
                            className="input-field"
                            type="text"
                            value={filters.entity ?? ''}
                            onChange={(event) => updateFilter('entity', event.target.value)}
                        />
                    </label>
                    <label>
                        <span className="form-label">Operación</span>
                        <select
                            className="input-field"
                            value={filters.operation ?? ''}
                            onChange={(event) => updateFilter('operation', event.target.value)}
                        >
                            {operationOptions.map((op) => (
                                <option key={op || 'ALL'} value={op}>
                                    {op || 'Todas'}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        <span className="form-label">Resultado</span>
                        <select
                            className="input-field"
                            value={filters.result ?? ''}
                            onChange={(event) => updateFilter('result', event.target.value)}
                        >
                            {resultOptions.map((item) => (
                                <option key={item || 'ALL'} value={item}>
                                    {item || 'Todos'}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        <span className="form-label">ID registro</span>
                        <input
                            className="input-field"
                            type="text"
                            value={filters.recordId ?? ''}
                            onChange={(event) => updateFilter('recordId', event.target.value)}
                        />
                    </label>
                </div>

                <div className="flex flex-wrap gap-3">
                    {Object.entries(visibleColumns).map(([key, active]) => (
                        <label key={key} className="inline-flex items-center gap-2 text-xs text-slate-600">
                            <input
                                type="checkbox"
                                checked={active}
                                onChange={(event) =>
                                    setVisibleColumns((prev) => ({
                                        ...prev,
                                        [key]: event.target.checked,
                                    }))
                                }
                                className="h-4 w-4 accent-indigo-600"
                            />
                            {key}
                        </label>
                    ))}
                </div>

                <div className="flex flex-wrap gap-2 justify-end">
                    <button
                        type="button"
                        className="btn-outline !w-auto px-4"
                        disabled={exporting}
                        onClick={() => onExport('csv')}
                    >
                        <Download size={14} /> Exportar CSV
                    </button>
                    <button
                        type="button"
                        className="btn-outline !w-auto px-4"
                        disabled={exporting}
                        onClick={() => onExport('json')}
                    >
                        <Download size={14} /> Exportar JSON
                    </button>
                </div>
            </div>

            <div className="panel-card space-y-4">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">Total registros: {total}</p>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            className="btn-outline !w-auto px-3 py-2"
                            disabled={(filters.page ?? 1) <= 1}
                            onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, (prev.page ?? 1) - 1) }))}
                        >
                            Anterior
                        </button>
                        <span className="text-sm text-slate-600">Página {filters.page ?? 1} de {totalPages}</span>
                        <button
                            type="button"
                            className="btn-outline !w-auto px-3 py-2"
                            disabled={(filters.page ?? 1) >= totalPages}
                            onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page ?? 1) + 1 }))}
                        >
                            Siguiente
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Loader2 className="animate-spin" size={16} /> Cargando registros...
                    </div>
                ) : (
                    <div className="overflow-auto rounded-2xl border border-slate-200">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-600">
                                <tr>
                                    {visibleColumns.timestamp && <th className="px-3 py-2 text-left">Fecha</th>}
                                    {visibleColumns.user && <th className="px-3 py-2 text-left">Usuario</th>}
                                    {visibleColumns.ip && <th className="px-3 py-2 text-left">IP</th>}
                                    {visibleColumns.operation && <th className="px-3 py-2 text-left">Operación</th>}
                                    {visibleColumns.entity && <th className="px-3 py-2 text-left">Entidad</th>}
                                    {visibleColumns.result && <th className="px-3 py-2 text-left">Resultado</th>}
                                    <th className="px-3 py-2 text-left">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => (
                                    <tr key={item.id} className="border-t border-slate-100">
                                        {visibleColumns.timestamp && <td className="px-3 py-2">{dateFormatter.format(new Date(item.timestamp))}</td>}
                                        {visibleColumns.user && <td className="px-3 py-2">{item.userEmail || 'sistema/anónimo'}</td>}
                                        {visibleColumns.ip && <td className="px-3 py-2">{item.ipAddress || '-'}</td>}
                                        {visibleColumns.operation && <td className="px-3 py-2">{item.operation}</td>}
                                        {visibleColumns.entity && <td className="px-3 py-2">{item.entity}</td>}
                                        {visibleColumns.result && <td className="px-3 py-2">
                                            <span className={`pill ${item.result === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                {item.result}
                                            </span>
                                        </td>}
                                        <td className="px-3 py-2">
                                            <button
                                                type="button"
                                                className="btn-outline !w-auto px-3 py-1 text-xs"
                                                onClick={async () => {
                                                    const detail = await auditService.getById(item.id);
                                                    setSelected(detail);
                                                }}
                                            >
                                                <FileSearch size={12} /> Ver detalle
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {selected && (
                <div className="panel-card space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="panel-card__title">Detalle del log</h2>
                        <button type="button" className="btn-outline !w-auto px-3 py-1" onClick={() => setSelected(null)}>
                            Cerrar
                        </button>
                    </div>
                    <pre className="rounded-xl bg-slate-900 text-slate-100 text-xs p-4 overflow-auto">
                        {JSON.stringify(selected, null, 2)}
                    </pre>
                </div>
            )}
        </section>
    );
};

export default AuditLogs;

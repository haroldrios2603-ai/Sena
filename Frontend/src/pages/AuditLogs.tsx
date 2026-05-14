import { useCallback, useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import { Download, FileSearch, Loader2, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import auditService, {
    type AuditFilters,
    type AuditLogItem,
    type AuditOperation,
    type AuditResult,
} from '../services/audit.service';
import { useAutoDismiss } from '../hooks/useAutoDismiss';
import { DATA_UPDATED_EVENT } from '../utils/dataRefresh';

type MessageState = {
    text: string;
    type: 'success' | 'error' | '';
};

interface AuditLogsProps {
    embedded?: boolean;
}

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

const AuditLogs = ({ embedded = false }: AuditLogsProps) => {
    const { t } = useTranslation();
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
                text: getErrorMessage(error, t('audit.loadError')),
                type: 'error',
            });
        } finally {
            setLoading(false);
        }
    }, [filters, t]);

    useEffect(() => {
        void loadLogs();
    }, [loadLogs]);

    useEffect(() => {
        const handleDataUpdated = () => {
            void loadLogs();
        };

        window.addEventListener(DATA_UPDATED_EVENT, handleDataUpdated);
        return () => window.removeEventListener(DATA_UPDATED_EVENT, handleDataUpdated);
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
            setMessage({ text: t('audit.exportSuccess', { format: format.toUpperCase() }), type: 'success' });
        } catch (error) {
            setMessage({
                text: getErrorMessage(error, t('audit.exportError')),
                type: 'error',
            });
        } finally {
            setExporting(false);
        }
    };

    const operationLabelByValue = useMemo(
        () => ({
            CREATE: t('audit.operationLabels.CREATE'),
            UPDATE: t('audit.operationLabels.UPDATE'),
            DELETE: t('audit.operationLabels.DELETE'),
            VIEW: t('audit.operationLabels.VIEW'),
            LOGIN: t('audit.operationLabels.LOGIN'),
            LOGOUT: t('audit.operationLabels.LOGOUT'),
            LOGIN_FAILED: t('audit.operationLabels.LOGIN_FAILED'),
            FORBIDDEN: t('audit.operationLabels.FORBIDDEN'),
            PASSWORD_CHANGE: t('audit.operationLabels.PASSWORD_CHANGE'),
            EXPORT: t('audit.operationLabels.EXPORT'),
        }),
        [t],
    );

    const resultLabelByValue = useMemo(
        () => ({
            SUCCESS: t('audit.resultLabels.SUCCESS'),
            FAILURE: t('audit.resultLabels.FAILURE'),
        }),
        [t],
    );

    const columnLabelByKey = useMemo(
        () => ({
            timestamp: t('audit.columns.timestamp'),
            user: t('audit.columns.user'),
            ip: t('audit.columns.ip'),
            operation: t('audit.columns.operation'),
            entity: t('audit.columns.entity'),
            result: t('audit.columns.result'),
        }),
        [t],
    );

    const updateFilter = (field: keyof AuditFilters, value: string) => {
        setFilters((prev) => ({
            ...prev,
            page: 1,
            [field]: value || undefined,
        }));
    };

    return (
        <section className={embedded ? 'space-y-6' : 'dashboard-shell space-y-6 py-8'}>
            <header className="space-y-2">
                <span className="pill bg-rose-100 text-rose-700 w-fit">
                    <ShieldAlert size={14} /> {t('audit.badge')}
                </span>
                <h1 className="text-3xl font-semibold text-slate-900">{t('audit.title')}</h1>
                <p className="text-sm text-slate-500 max-w-3xl">
                    {t('audit.subtitle')}
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
                        <span className="form-label">{t('audit.filters.from')}</span>
                        <input
                            className="input-field"
                            type="date"
                            value={filters.from ?? ''}
                            onChange={(event) => updateFilter('from', event.target.value)}
                        />
                    </label>
                    <label>
                        <span className="form-label">{t('audit.filters.to')}</span>
                        <input
                            className="input-field"
                            type="date"
                            value={filters.to ?? ''}
                            onChange={(event) => updateFilter('to', event.target.value)}
                        />
                    </label>
                    <label>
                        <span className="form-label">{t('audit.filters.user')}</span>
                        <input
                            className="input-field"
                            type="text"
                            value={filters.userEmail ?? ''}
                            onChange={(event) => updateFilter('userEmail', event.target.value)}
                        />
                    </label>
                    <label>
                        <span className="form-label">{t('audit.filters.entity')}</span>
                        <input
                            className="input-field"
                            type="text"
                            value={filters.entity ?? ''}
                            onChange={(event) => updateFilter('entity', event.target.value)}
                        />
                    </label>
                    <label>
                        <span className="form-label">{t('audit.filters.operation')}</span>
                        <select
                            className="input-field"
                            value={filters.operation ?? ''}
                            onChange={(event) => updateFilter('operation', event.target.value)}
                        >
                            {operationOptions.map((op) => (
                                <option key={op || 'ALL'} value={op}>
                                    {op ? operationLabelByValue[op] : t('audit.filters.allOperations')}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        <span className="form-label">{t('audit.filters.result')}</span>
                        <select
                            className="input-field"
                            value={filters.result ?? ''}
                            onChange={(event) => updateFilter('result', event.target.value)}
                        >
                            {resultOptions.map((item) => (
                                <option key={item || 'ALL'} value={item}>
                                    {item ? resultLabelByValue[item] : t('audit.filters.allResults')}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        <span className="form-label">{t('audit.filters.recordId')}</span>
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
                            {columnLabelByKey[key as keyof typeof columnLabelByKey]}
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
                        <Download size={14} /> {t('audit.exportCsv')}
                    </button>
                    <button
                        type="button"
                        className="btn-outline !w-auto px-4"
                        disabled={exporting}
                        onClick={() => onExport('json')}
                    >
                        <Download size={14} /> {t('audit.exportJson')}
                    </button>
                </div>
            </div>

            <div className="panel-card space-y-4">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">{t('audit.totalRecords', { count: total })}</p>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            className="btn-outline !w-auto px-3 py-2"
                            disabled={(filters.page ?? 1) <= 1}
                            onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, (prev.page ?? 1) - 1) }))}
                        >
                            {t('audit.previous')}
                        </button>
                        <span className="text-sm text-slate-600">{t('audit.page', { page: filters.page ?? 1, totalPages })}</span>
                        <button
                            type="button"
                            className="btn-outline !w-auto px-3 py-2"
                            disabled={(filters.page ?? 1) >= totalPages}
                            onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page ?? 1) + 1 }))}
                        >
                            {t('audit.next')}
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Loader2 className="animate-spin" size={16} /> {t('audit.loading')}
                    </div>
                ) : (
                    <div className="overflow-auto rounded-2xl border border-slate-200">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-600">
                                <tr>
                                    {visibleColumns.timestamp && <th className="px-3 py-2 text-left">Fecha</th>}
                                    {visibleColumns.user && <th className="px-3 py-2 text-left">{t('audit.columns.user')}</th>}
                                    {visibleColumns.ip && <th className="px-3 py-2 text-left">{t('audit.columns.ip')}</th>}
                                    {visibleColumns.operation && <th className="px-3 py-2 text-left">{t('audit.columns.operation')}</th>}
                                    {visibleColumns.entity && <th className="px-3 py-2 text-left">{t('audit.columns.entity')}</th>}
                                    {visibleColumns.result && <th className="px-3 py-2 text-left">{t('audit.columns.result')}</th>}
                                    <th className="px-3 py-2 text-left">{t('audit.columns.action')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => (
                                    <tr key={item.id} className="border-t border-slate-100">
                                        {visibleColumns.timestamp && <td className="px-3 py-2">{dateFormatter.format(new Date(item.timestamp))}</td>}
                                        {visibleColumns.user && <td className="px-3 py-2">{item.userEmail || t('audit.anonymousSystem')}</td>}
                                        {visibleColumns.ip && <td className="px-3 py-2">{item.ipAddress || '-'}</td>}
                                        {visibleColumns.operation && <td className="px-3 py-2">{operationLabelByValue[item.operation]}</td>}
                                        {visibleColumns.entity && <td className="px-3 py-2">{item.entity}</td>}
                                        {visibleColumns.result && <td className="px-3 py-2">
                                            <span className={`pill ${item.result === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                {resultLabelByValue[item.result]}
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
                                                <FileSearch size={12} /> {t('audit.viewDetail')}
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
                        <h2 className="panel-card__title">{t('audit.detailTitle')}</h2>
                        <button type="button" className="btn-outline !w-auto px-3 py-1" onClick={() => setSelected(null)}>
                            {t('audit.close')}
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

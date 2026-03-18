import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import reportsService, { type ReportExportFormat, type ReportExportType } from '../../services/reports.service';
import { useAuth } from '../../context/useAuth';
import { hasScreenPermission, SCREEN_KEYS } from '../../permissions';

type ReportsTab =
    | 'trabajadores'
    | 'vehiculos'
    | 'facturacion'
    | 'mensualidades'
    | 'asistencia'
    | 'ingresos'
    | 'pico';

const CHART_COLORS = ['#0f766e', '#0369a1', '#ca8a04', '#b91c1c', '#4338ca', '#15803d'];

const todayIso = () => new Date().toISOString().slice(0, 10);

const ReportsPanel = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<ReportsTab>('trabajadores');
    const [from, setFrom] = useState(todayIso());
    const [to, setTo] = useState(todayIso());
    const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
    const [periodDate, setPeriodDate] = useState(todayIso());
    const [clientId, setClientId] = useState('');
    const [status, setStatus] = useState<'todos' | 'al_dia' | 'atrasados'>('todos');
    const [userId, setUserId] = useState('');
    const [documentNumberFilter, setDocumentNumberFilter] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [workersData, setWorkersData] = useState<any>(null);
    const [vehiclesData, setVehiclesData] = useState<any>(null);
    const [billingTotalData, setBillingTotalData] = useState<any>(null);
    const [billingClientData, setBillingClientData] = useState<any>(null);
    const [monthlyData, setMonthlyData] = useState<any>(null);
    const [attendanceData, setAttendanceData] = useState<any>(null);
    const [incomeData, setIncomeData] = useState<any>(null);
    const [peakData, setPeakData] = useState<any>(null);
    const [clients, setClients] = useState<Array<{
        id: string;
        fullName: string;
        email: string;
        documentType?: string | null;
        documentNumber?: string | null;
    }>>([]);

    const canViewWorkers = hasScreenPermission(user?.role, user?.permissions, SCREEN_KEYS.REPORTS_WORKERS);
    const canViewVehicles = hasScreenPermission(user?.role, user?.permissions, SCREEN_KEYS.REPORTS_VEHICLES);
    const canViewBilling = hasScreenPermission(user?.role, user?.permissions, SCREEN_KEYS.REPORTS_BILLING);
    const canViewMonthly = hasScreenPermission(user?.role, user?.permissions, SCREEN_KEYS.REPORTS_MONTHLY);
    const canViewAttendance = hasScreenPermission(user?.role, user?.permissions, SCREEN_KEYS.REPORTS_ATTENDANCE);
    const canViewIncome = hasScreenPermission(user?.role, user?.permissions, SCREEN_KEYS.REPORTS_INCOME);
    const canViewPeak = hasScreenPermission(user?.role, user?.permissions, SCREEN_KEYS.REPORTS_PEAK);

    const currency = useMemo(
        () =>
            new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
                maximumFractionDigits: 0,
            }),
        [],
    );

    const clearFeedback = () => {
        setError('');
        setSuccess('');
    };

    const loadClients = async () => {
        if (clients.length) return;
        const response = await reportsService.clients();
        setClients(response.data ?? []);
    };

    const consultar = async () => {
        clearFeedback();
        setLoading(true);
        try {
            if (activeTab === 'trabajadores') {
                const response = await reportsService.workersPresent();
                setWorkersData(response.data);
            }

            if (activeTab === 'vehiculos') {
                const response = await reportsService.vehiclesCount({ period, date: periodDate });
                setVehiclesData(response.data);
            }

            if (activeTab === 'facturacion') {
                const [totalRes, clientRes] = await Promise.all([
                    reportsService.billingTotal({ from, to }),
                    clientId
                        ? reportsService.billingClient({ clientId, from, to })
                        : Promise.resolve({ data: null }),
                ]);
                setBillingTotalData(totalRes.data);
                setBillingClientData(clientRes.data);
            }

            if (activeTab === 'mensualidades') {
                const response = await reportsService.monthlyStatus({ status });
                setMonthlyData(response.data);
            }

            if (activeTab === 'asistencia') {
                const response = await reportsService.attendance({ from, to, userId: userId || undefined, documentNumber: documentNumberFilter || undefined });
                setAttendanceData(response.data);
            }

            if (activeTab === 'ingresos') {
                const response = await reportsService.incomeByVehicle({ from, to });
                setIncomeData(response.data);
            }

            if (activeTab === 'pico') {
                const response = await reportsService.peak({ from, to });
                setPeakData(response.data);
            }

            setSuccess(t('reports.messages.loaded'));
        } catch (err: any) {
            setError(err?.response?.data?.message ?? t('reports.messages.loadError'));
        } finally {
            setLoading(false);
        }
    };

    const exportar = async (format: ReportExportFormat) => {
        clearFeedback();
        setLoading(true);
        try {
            const reportTypeMap: Record<ReportsTab, ReportExportType> = {
                trabajadores: 'trabajadores',
                vehiculos: 'vehiculos',
                facturacion: clientId ? 'facturacion-cliente' : 'facturacion-total',
                mensualidades: 'mensualidades',
                asistencia: 'asistencia',
                ingresos: 'ingresos-por-tipo',
                pico: 'horas-pico',
            };

            await reportsService.exportReport({
                reportType: reportTypeMap[activeTab],
                format,
                from,
                to,
                date: periodDate,
                period,
                status,
                userId: userId || undefined,
                clientId: clientId || undefined,
            });
            setSuccess(t('reports.messages.exported', { format: format.toUpperCase() }));
        } catch (err: any) {
            setError(err?.response?.data?.message ?? t('reports.messages.exportError'));
        } finally {
            setLoading(false);
        }
    };

    const allTabs: Array<{ key: ReportsTab; label: string; canView: boolean }> = [
        { key: 'trabajadores', label: t('reports.tabs.workers'), canView: canViewWorkers },
        { key: 'vehiculos', label: t('reports.tabs.vehicles'), canView: canViewVehicles },
        { key: 'facturacion', label: t('reports.tabs.billing'), canView: canViewBilling },
        { key: 'mensualidades', label: t('reports.tabs.monthly'), canView: canViewMonthly },
        { key: 'asistencia', label: t('reports.tabs.attendance'), canView: canViewAttendance },
        { key: 'ingresos', label: t('reports.tabs.income'), canView: canViewIncome },
        { key: 'pico', label: t('reports.tabs.peak'), canView: canViewPeak },
    ];

    const tabs: Array<{ key: ReportsTab; label: string }> = allTabs
        .filter((tab) => tab.canView)
        .map(({ key, label }) => ({ key, label }));

    useEffect(() => {
        if (!tabs.length) {
            return;
        }

        if (!tabs.some((tab) => tab.key === activeTab)) {
            setActiveTab(tabs[0].key);
        }
    }, [activeTab, tabs]);

    useEffect(() => {
        if (activeTab === 'facturacion' && canViewBilling) {
            void loadClients();
        }
    }, [activeTab, canViewBilling]);

    if (!tabs.length) {
        return (
            <section className="panel-card">
                <h2 className="panel-card__title">{t('reports.title')}</h2>
                <p className="text-sm text-slate-600 mt-2">{t('reports.messages.noSectionPermission')}</p>
            </section>
        );
    }

    return (
        <section className="panel-card space-y-6">
            <div className="panel-card__header">
                <div>
                    <span className="pill">{t('reports.badge')}</span>
                    <h2 className="panel-card__title mt-2">{t('reports.title')}</h2>
                    <p className="text-sm text-slate-500 mt-2">{t('reports.subtitle')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => {
                            if (tab.key === 'facturacion') {
                                void loadClients();
                            }
                            setActiveTab(tab.key);
                            clearFeedback();
                        }}
                        className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                            activeTab === tab.key
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <label className="text-sm text-slate-600">
                    {t('reports.filters.from')}
                    <input
                        type="date"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        className="input-field mt-1"
                    />
                </label>
                <label className="text-sm text-slate-600">
                    {t('reports.filters.to')}
                    <input
                        type="date"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        className="input-field mt-1"
                    />
                </label>

                {activeTab === 'vehiculos' && (
                    <>
                        <label className="text-sm text-slate-600">
                            {t('reports.filters.period')}
                            <select
                                value={period}
                                onChange={(e) => setPeriod(e.target.value as 'day' | 'week' | 'month')}
                                className="input-field mt-1"
                            >
                                <option value="day">{t('reports.period.day')}</option>
                                <option value="week">{t('reports.period.week')}</option>
                                <option value="month">{t('reports.period.month')}</option>
                            </select>
                        </label>
                        <label className="text-sm text-slate-600">
                            {t('reports.filters.referenceDate')}
                            <input
                                type="date"
                                value={periodDate}
                                onChange={(e) => setPeriodDate(e.target.value)}
                                className="input-field mt-1"
                            />
                        </label>
                    </>
                )}

                {activeTab === 'facturacion' && (
                    <label className="text-sm text-slate-600 md:col-span-2">
                        {t('reports.filters.client')}
                        <select
                            value={clientId}
                            onChange={(e) => setClientId(e.target.value)}
                            className="input-field mt-1"
                        >
                            <option value="">{t('reports.filters.allClients')}</option>
                            {clients.map((client) => (
                                <option key={client.id} value={client.id}>
                                    {client.fullName} ({client.documentNumber ? `${client.documentType || 'Doc'}: ${client.documentNumber}` : client.email})
                                </option>
                            ))}
                        </select>
                    </label>
                )}

                {activeTab === 'mensualidades' && (
                    <label className="text-sm text-slate-600">
                        {t('reports.filters.status')}
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as 'todos' | 'al_dia' | 'atrasados')}
                            className="input-field mt-1"
                        >
                            <option value="todos">{t('reports.status.all')}</option>
                            <option value="al_dia">{t('reports.status.current')}</option>
                            <option value="atrasados">{t('reports.status.late')}</option>
                        </select>
                    </label>
                )}

                {activeTab === 'asistencia' && (
                    <>
                        <label className="text-sm text-slate-600">
                            {t('reports.filters.employeeId')}
                            <input
                                type="text"
                                value={userId}
                                onChange={(e) => setUserId(e.target.value.trim())}
                                className="input-field mt-1"
                                placeholder={t('reports.filters.employeeIdPlaceholder')}
                            />
                        </label>
                        <label className="text-sm text-slate-600">
                            Número de documento
                            <input
                                type="text"
                                value={documentNumberFilter}
                                onChange={(e) => setDocumentNumberFilter(e.target.value.trim())}
                                className="input-field mt-1"
                                placeholder="Ej. 1234567890"
                            />
                        </label>
                    </>
                )}

                {activeTab === 'asistencia' && !userId && !documentNumberFilter && (
                    <div className="col-span-full text-xs text-amber-600">Selecciona empleado o documento para filtrar</div>
                )}
            </div>

            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={consultar} className="btn-primary" disabled={loading}>
                    {loading ? t('reports.actions.loading') : t('reports.actions.query')}
                </button>
                <button
                    type="button"
                    onClick={() => void exportar('excel')}
                    className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800"
                    disabled={loading}
                >
                    {t('reports.export.excel')}
                </button>
                <button
                    type="button"
                    onClick={() => void exportar('pdf')}
                    className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800"
                    disabled={loading}
                >
                    {t('reports.export.pdf')}
                </button>
                <button
                    type="button"
                    onClick={() => void exportar('word')}
                    className="rounded-xl border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-800"
                    disabled={loading}
                >
                    {t('reports.export.word')}
                </button>
            </div>

            {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800 text-sm">{error}</div>}
            {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-800 text-sm">{success}</div>}

            {activeTab === 'trabajadores' && workersData && (
                <div className="space-y-3">
                    <p className="text-sm text-slate-600">
                        Turno: <strong>{workersData.turno}</strong> · Presentes: <strong>{workersData.totalPresentes}</strong>
                    </p>
                    <div className="overflow-auto border border-slate-200 rounded-xl">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-100">
                                <tr>
                                    <th className="px-3 py-2 text-left">Nombre</th>
                                    <th className="px-3 py-2 text-left">Documento</th>
                                    <th className="px-3 py-2 text-left">Rol</th>
                                    <th className="px-3 py-2 text-left">Ingreso</th>
                                    <th className="px-3 py-2 text-left">Salida</th>
                                    <th className="px-3 py-2 text-left">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {workersData.registros?.map((row: any) => (
                                    <tr key={row.attendanceId} className="border-t border-slate-100">
                                        <td className="px-3 py-2">{row.nombre}</td>
                                        <td className="px-3 py-2 text-xs">{row.documento || 'Sin registro'}</td>
                                        <td className="px-3 py-2">{row.rol}</td>
                                        <td className="px-3 py-2">{new Date(row.ingreso).toLocaleString('es-CO')}</td>
                                        <td className="px-3 py-2">{row.salida ? new Date(row.salida).toLocaleString('es-CO') : 'Sin salida'}</td>
                                        <td className="px-3 py-2">{row.presente ? 'Presente' : 'Retirado'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'vehiculos' && vehiclesData && (
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                        Total de vehículos: <strong>{vehiclesData.totalVehiculos}</strong>
                    </p>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={vehiclesData.porPeriodo ?? []}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="bucket" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="total" fill="#0f766e" name="Vehículos" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {activeTab === 'facturacion' && billingTotalData && (
                <div className="space-y-4">
                    <p className="text-sm text-slate-700">
                        Facturación total: <strong>{currency.format(billingTotalData.totalFacturado ?? 0)}</strong>
                    </p>
                    {billingClientData && (
                        <div className="rounded-xl border border-slate-200 p-3">
                            <p className="text-sm text-slate-700">
                                Cliente: <strong>{billingClientData.cliente?.fullName}</strong> · Total acumulado:{' '}
                                <strong>{currency.format(billingClientData.totalAcumulado ?? 0)}</strong>
                            </p>
                            <div className="overflow-auto mt-3">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-slate-100">
                                        <tr>
                                            <th className="px-3 py-2 text-left">Fecha</th>
                                            <th className="px-3 py-2 text-left">Tipo</th>
                                            <th className="px-3 py-2 text-left">Descripción</th>
                                            <th className="px-3 py-2 text-left">Estado</th>
                                            <th className="px-3 py-2 text-left">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {billingClientData.movimientos?.map((row: any) => (
                                            <tr key={`${row.tipo}-${row.referencia}`} className="border-t border-slate-100">
                                                <td className="px-3 py-2">{row.fecha ? new Date(row.fecha).toLocaleDateString('es-CO') : 'N/D'}</td>
                                                <td className="px-3 py-2">{row.tipo}</td>
                                                <td className="px-3 py-2">{row.descripcion}</td>
                                                <td className="px-3 py-2">{row.estado}</td>
                                                <td className="px-3 py-2">{currency.format(row.monto ?? 0)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'mensualidades' && monthlyData && (
                <div className="overflow-auto border border-slate-200 rounded-xl">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-100">
                            <tr>
                                <th className="px-3 py-2 text-left">Cliente</th>
                                <th className="px-3 py-2 text-left">Documento</th>
                                <th className="px-3 py-2 text-left">Parqueadero</th>
                                <th className="px-3 py-2 text-left">Plan</th>
                                <th className="px-3 py-2 text-left">Vencimiento</th>
                                <th className="px-3 py-2 text-left">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {monthlyData.registros?.map((row: any) => (
                                <tr key={row.contractId} className="border-t border-slate-100">
                                    <td className="px-3 py-2">{row.cliente}</td>
                                    <td className="px-3 py-2 text-xs">{row.documento || 'Sin registro'}</td>
                                    <td className="px-3 py-2">{row.parqueadero}</td>
                                    <td className="px-3 py-2">{row.plan}</td>
                                    <td className="px-3 py-2">{new Date(row.fechaVencimiento).toLocaleDateString('es-CO')}</td>
                                    <td className="px-3 py-2">{row.estadoPago}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'asistencia' && attendanceData && (
                <div className="space-y-4">
                    <p className="text-sm text-slate-700">
                        Total horas trabajadas: <strong>{attendanceData.totalHoras}</strong>
                    </p>
                    <div className="overflow-auto border border-slate-200 rounded-xl">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-100">
                                <tr>
                                    <th className="px-3 py-2 text-left">Empleado</th>
                                    <th className="px-3 py-2 text-left">Documento</th>
                                    <th className="px-3 py-2 text-left">Ingreso</th>
                                    <th className="px-3 py-2 text-left">Salida</th>
                                    <th className="px-3 py-2 text-left">Horas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {attendanceData.registros?.map((row: any) => (
                                    <tr key={row.attendanceId} className="border-t border-slate-100">
                                        <td className="px-3 py-2">{row.nombre}</td>
                                        <td className="px-3 py-2 text-xs">{row.documento || 'Sin registro'}</td>
                                        <td className="px-3 py-2">{new Date(row.ingreso).toLocaleString('es-CO')}</td>
                                        <td className="px-3 py-2">{row.salida ? new Date(row.salida).toLocaleString('es-CO') : 'Sin salida'}</td>
                                        <td className="px-3 py-2">{row.horasTrabajadas}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'ingresos' && incomeData && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-slate-200 p-3">
                        <p className="text-sm text-slate-700 mb-3">
                            Total ingresos: <strong>{currency.format(incomeData.totalIngresos ?? 0)}</strong>
                        </p>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={incomeData.desglose ?? []}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="tipoVehiculo" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="totalIngresos" fill="#0369a1" name="Ingresos" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-3">
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={incomeData.desglose ?? []}
                                        dataKey="totalIngresos"
                                        nameKey="tipoVehiculo"
                                        outerRadius={100}
                                        label
                                    >
                                        {(incomeData.desglose ?? []).map((_: any, index: number) => (
                                            <Cell key={`slice-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'pico' && peakData && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-slate-200 p-3">
                        <p className="text-sm text-slate-700 mb-2">Promedio de ingresos por hora</p>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={peakData.porHora ?? []}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="hora" />
                                    <YAxis />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="ingresos" stroke="#4338ca" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-3">
                        <p className="text-sm text-slate-700 mb-2">Ingresos por día de semana</p>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={peakData.porDiaSemana ?? []}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="dia" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="ingresos" fill="#b91c1c" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default ReportsPanel;

import api from '../api';

export type ReportExportType =
    | 'trabajadores'
    | 'vehiculos'
    | 'facturacion-total'
    | 'facturacion-cliente'
    | 'mensualidades'
    | 'asistencia'
    | 'ingresos-por-tipo'
    | 'horas-pico';

export type ReportExportFormat = 'excel' | 'pdf' | 'word';

const reportsService = {
    workersPresent: () => api.get('/reports/workers/present'),
    vehiclesCount: (params: { period: 'day' | 'week' | 'month'; date?: string }) =>
        api.get('/reports/vehicles/count', { params }),
    billingTotal: (params: { from?: string; to?: string }) =>
        api.get('/reports/billing/total', { params }),
    clients: () =>
        api.get('/reports/clients').then((res) => ({
            data: res.data.map((client: any) => ({
                id: client.id,
                fullName: client.fullName,
                email: client.email,
                documentType: client.documentType,
                documentNumber: client.documentNumber,
            })),
        })),
    billingClient: (params: { clientId: string; from?: string; to?: string }) =>
        api.get('/reports/billing/client', { params }),
    monthlyStatus: (params: { status?: 'todos' | 'al_dia' | 'atrasados' }) =>
        api.get('/reports/monthly-payments/status', { params }),
    attendance: (params: { userId?: string; documentNumber?: string; from?: string; to?: string }) =>
        api.get('/reports/attendance', { params }),
    incomeByVehicle: (params: { from?: string; to?: string }) =>
        api.get('/reports/income/by-vehicle', { params }),
    peak: (params: { from?: string; to?: string }) => api.get('/reports/peak', { params }),
    exportReport: async (params: {
        reportType: ReportExportType;
        format: ReportExportFormat;
        from?: string;
        to?: string;
        date?: string;
        period?: 'day' | 'week' | 'month';
        status?: 'todos' | 'al_dia' | 'atrasados';
        userId?: string;
        documentNumber?: string;
        clientId?: string;
    }) => {
        const response = await api.get('/reports/export', {
            params,
            responseType: 'blob',
        });

        const disposition = response.headers['content-disposition'] as string | undefined;
        const fileNameMatch = disposition?.match(/filename="?([^\"]+)"?/);
        const fileName = fileNameMatch?.[1] ?? `reporte-${Date.now()}`;

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },
};

export default reportsService;

import { test, expect, request as playwrightRequest } from '@playwright/test';

/**
 * Suite API para cubrir los módulos de administración de usuarios y clientes.
 * Se ejecuta con el backend real levantado en http://localhost:3000.
 */
const API_BASE = process.env.QA_API_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || 'admin@rmparking.com';
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || '123456';

test.describe.serial('Administración > Usuarios y Clientes (API)', () => {
    let adminToken: string;
    let parkingId: string;

    test.beforeAll(async () => {
        const api = await playwrightRequest.newContext({ baseURL: API_BASE });
        const loginRes = await api.post('/auth/login', {
            data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
        });
        expect(loginRes.ok()).toBeTruthy();
        const loginJson = await loginRes.json();
        adminToken = loginJson.accessToken;

        const parkingRes = await api.get('/parking', {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        expect(parkingRes.ok()).toBeTruthy();
        const parkings = await parkingRes.json();
        expect(Array.isArray(parkings) && parkings.length > 0).toBeTruthy();
        parkingId = parkings[0].id;
        await api.dispose();
    });

    test('SUPER_ADMIN puede crear usuarios y gestionar sus permisos', async () => {
        const api = await playwrightRequest.newContext({
            baseURL: API_BASE,
            extraHTTPHeaders: {
                Authorization: `Bearer ${adminToken}`,
            },
        });

        const uniqueSuffix = Date.now();
        const email = `qa.user.${uniqueSuffix}@rmparking.com`;

        // Crear usuario operativo
        const createRes = await api.post('/users', {
            data: {
                fullName: 'QA Operador',
                email,
                password: 'QaUser2026@',
                role: 'OPERATOR',
            },
        });
        expect(createRes.ok()).toBeTruthy();
        const createdUser = await createRes.json();
        expect(createdUser.email).toBe(email);

        // Cambiar rol a ADMIN_PARKING
        const roleRes = await api.patch(`/users/${createdUser.id}/role`, {
            data: { role: 'ADMIN_PARKING' },
        });
        expect(roleRes.ok()).toBeTruthy();
        const roleJson = await roleRes.json();
        expect(roleJson.role).toBe('ADMIN_PARKING');

        // Desactivar y reactivar
        const disableRes = await api.patch(`/users/${createdUser.id}/status`, {
            data: { isActive: false },
        });
        expect(disableRes.ok()).toBeTruthy();
        const disableJson = await disableRes.json();
        expect(disableJson.isActive).toBe(false);

        const enableRes = await api.patch(`/users/${createdUser.id}/status`, {
            data: { isActive: true },
        });
        expect(enableRes.ok()).toBeTruthy();
        const enableJson = await enableRes.json();
        expect(enableJson.isActive).toBe(true);

        // Listar usuarios filtrando por rol
        const listRes = await api.get('/users?role=ADMIN_PARKING');
        expect(listRes.ok()).toBeTruthy();
        const listJson = await listRes.json();
        const found = listJson.some((user: { email: string }) => user.email === email);
        expect(found).toBeTruthy();

        await api.dispose();
    });

    test('Registro y renovación de clientes mensuales', async () => {
        const api = await playwrightRequest.newContext({
            baseURL: API_BASE,
            extraHTTPHeaders: {
                Authorization: `Bearer ${adminToken}`,
            },
        });

        const suffix = Date.now();
        const clientEmail = `qa.client.${suffix}@rmparking.com`;
        const today = new Date();
        const startDate = today.toISOString();
        const endDate = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();

        const createRes = await api.post('/clients', {
            data: {
                fullName: 'Cliente QA Mensual',
                email: clientEmail,
                parkingId,
                startDate,
                endDate,
                monthlyFee: 150000,
                planName: 'QA Mensualidad',
            },
        });
        expect(createRes.ok()).toBeTruthy();
        const contract = await createRes.json();
        expect(contract.user.email).toBe(clientEmail);

        // Verificar que existan contratos y alertas
        const contractsRes = await api.get('/clients/contracts');
        expect(contractsRes.ok()).toBeTruthy();
        const contracts = await contractsRes.json();
        const createdContract = contracts.find((c: { id: string }) => c.id === contract.id);
        expect(createdContract).toBeTruthy();

        const alertsRes = await api.get('/clients/contracts/alerts');
        expect(alertsRes.ok()).toBeTruthy();
        const alerts = await alertsRes.json();
        expect(Array.isArray(alerts)).toBeTruthy();

        // Registrar renovación con pago
        const newEnd = new Date(today.getTime() + 32 * 24 * 60 * 60 * 1000).toISOString();
        const renewRes = await api.patch(`/clients/contracts/${contract.id}/renew`, {
            data: {
                newEndDate: newEnd,
                paymentDate: today.toISOString(),
                monthlyFee: 180000,
            },
        });
        expect(renewRes.ok()).toBeTruthy();
        const renewed = await renewRes.json();
        expect(new Date(renewed.endDate).toISOString()).toBe(newEnd);

        await api.dispose();
    });
});

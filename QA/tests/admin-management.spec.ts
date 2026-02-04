import { test, expect, Page, Route } from '@playwright/test';

type Role = 'SUPER_ADMIN' | 'ADMIN_PARKING' | 'OPERATOR';

type MockUser = {
    id: string;
    email: string;
    fullName: string;
    role: Role;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
};

const mockDate = new Date('2026-02-03T12:00:00.000Z').toISOString();
const mockUsers: MockUser[] = [
    {
        id: 'u-1',
        email: 'qa.super@rmparking.com',
        fullName: 'QA Super Admin',
        role: 'SUPER_ADMIN',
        isActive: true,
        createdAt: mockDate,
        updatedAt: mockDate,
    },
    {
        id: 'u-2',
        email: 'operaciones@rmparking.com',
        fullName: 'Operador Norte',
        role: 'OPERATOR',
        isActive: true,
        createdAt: mockDate,
        updatedAt: mockDate,
    },
];

const mockParkings = [
    {
        id: 'p-1',
        name: 'Sede Norte',
        address: 'Av. Caracas #5',
        capacity: 120,
        baseRate: 2500,
    },
];

const mockContracts = [
    {
        id: 'c-1',
        parkingId: 'p-1',
        userId: 'client-1',
        startDate: '2026-01-01T05:00:00.000Z',
        endDate: '2026-03-01T05:00:00.000Z',
        status: 'EXPIRING_SOON',
        planName: 'Corporativo',
        monthlyFee: 350000,
        isRecurring: true,
        lastPaymentDate: '2026-01-01T05:00:00.000Z',
        nextPaymentDate: '2026-03-01T05:00:00.000Z',
        alerts: [],
        user: {
            id: 'client-1',
            fullName: 'Cliente Demo 1',
            email: 'cliente@empresa.com',
        },
        parking: {
            id: 'p-1',
            name: 'Sede Norte',
            address: 'Av. Caracas #5',
        },
    },
];

const mockAlerts = [
    {
        id: 'alert-1',
        alertType: 'EXPIRING_SOON',
        message: 'El contrato vencerá en breve. Recuerda contactar al cliente para renovar.',
        status: 'PENDING',
        createdAt: mockDate,
        resolvedAt: null,
        contract: mockContracts[0],
    },
];

const fulfillJson = (route: Route, payload: unknown) =>
    route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payload),
    });

const setupDashboard = async (page: Page, role: Role) => {
    await page.addInitScript(() => {
        window.localStorage.setItem('token', 'qa-e2e-token');
    });

    await page.route('**/auth/me', (route) => {
        fulfillJson(route, {
            id: 'session-user',
            email: 'session@rmparking.com',
            fullName: 'Sesión QA',
            role,
            isActive: true,
            createdAt: mockDate,
            updatedAt: mockDate,
        });
    });

    await page.route('**/parking', (route) => fulfillJson(route, mockParkings));
    await page.route('**/users', (route) => fulfillJson(route, mockUsers));
    await page.route('**/clients/contracts/alerts', (route) => fulfillJson(route, mockAlerts));
    await page.route('**/clients/contracts', (route) => fulfillJson(route, mockContracts));
};

test.describe('Gestión administrativa en Dashboard', () => {
    test('SUPER_ADMIN visualiza y navega entre Operación, Usuarios y Clientes', async ({ page }) => {
        await setupDashboard(page, 'SUPER_ADMIN');
        await page.goto('/dashboard');

        await expect(page.getByRole('button', { name: /Operación diaria/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Usuarios/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Clientes/i })).toBeVisible();

        await page.getByRole('button', { name: /Usuarios/i }).click();
        await expect(page.getByText('Equipo operativo')).toBeVisible();
        await expect(page.getByText('Operador Norte')).toBeVisible();

        await page.getByRole('button', { name: /Clientes/i }).click();
        await expect(page.getByText('Contratos y alertas')).toBeVisible();
        await expect(page.getByText('Cliente Demo 1')).toBeVisible();
    });

    test('ADMIN_PARKING no visualiza el módulo de Usuarios pero sí Clientes', async ({ page }) => {
        await setupDashboard(page, 'ADMIN_PARKING');
        await page.goto('/dashboard');

        await expect(page.getByRole('button', { name: /Operación diaria/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Usuarios/i })).toHaveCount(0);
        await expect(page.getByRole('button', { name: /Clientes/i })).toBeVisible();

        await page.getByRole('button', { name: /Clientes/i }).click();
        await expect(page.getByText('Alertas activas')).toBeVisible();
    });

    test('OPERADOR mantiene solo la vista Operación', async ({ page }) => {
        await setupDashboard(page, 'OPERATOR');
        await page.goto('/dashboard');

        await expect(page.getByRole('button', { name: /Operación diaria/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Usuarios/i })).toHaveCount(0);
        await expect(page.getByRole('button', { name: /Clientes/i })).toHaveCount(0);

        await expect(page.getByText('Registrar ingreso')).toBeVisible();
        await expect(page.getByText('Registrar salida')).toBeVisible();
    });
});

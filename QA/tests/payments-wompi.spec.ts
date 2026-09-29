import { expect, test } from '@playwright/test';

test('checkout público envía método y datos del cliente y redirige a Wompi Sandbox', async ({ page }) => {
    const paymentId = '7f2dc3e9-95ca-49cf-97f4-cb0f4c6a6d11';
    const customerEmail = 'qa.pagos@example.test';
    let checkoutRequestBody: { method?: string; customerEmail?: string } | undefined;

    await page.route(`**/payments/public/${paymentId}`, async (route) => {
        await route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({
                id: paymentId,
                amount: 275,
                method: 'ONLINE',
                status: 'PENDING',
                currency: 'COP',
                createdAt: '2026-09-29T12:00:00.000Z',
                reference: '1234567890',
                availableMethods: ['NEQUI', 'CARD', 'BANK_ACCOUNT'],
            }),
        });
    });

    await page.route(`**/payments/public/${paymentId}/checkout`, async (route) => {
        checkoutRequestBody = route.request().postDataJSON();
        await route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({
                paymentId,
                checkoutUrl: 'https://checkout.wompi.co/p/?public-key=pub_test_e2e&currency=COP&amount-in-cents=27500&reference=1234567890&signature%3Aintegrity=test-signature&payment-method=BANK_ACCOUNT',
            }),
        });
    });

    await page.route('https://checkout.wompi.co/**', async (route) => {
        await route.fulfill({
            contentType: 'text/html',
            body: '<!doctype html><html><body><h1>Sandbox Wompi simulado</h1></body></html>',
        });
    });

    await page.goto(`/pago/${paymentId}`);

    await expect(page.getByText('1234567890')).toBeVisible();
    await expect(page.getByText(/275/)).toBeVisible();
    await page.getByRole('radio', { name: 'Cuenta bancaria (PSE)' }).check();
    await page.getByPlaceholder('cliente@correo.com').fill(customerEmail);
    await page.getByRole('button', { name: 'Continuar con Wompi' }).click();

    await expect(page).toHaveURL(/^https:\/\/checkout\.wompi\.co\/p\//);
    await expect(page.getByRole('heading', { name: 'Sandbox Wompi simulado' })).toBeVisible();
    expect(checkoutRequestBody).toEqual({
        method: 'BANK_ACCOUNT',
        customerEmail,
    });

    const checkoutUrl = new URL(page.url());
    expect(checkoutUrl.searchParams.get('public-key')).toBe('pub_test_e2e');
    expect(checkoutUrl.searchParams.get('currency')).toBe('COP');
    expect(checkoutUrl.searchParams.get('amount-in-cents')).toBe('27500');
    expect(checkoutUrl.searchParams.get('payment-method')).toBe('BANK_ACCOUNT');
});
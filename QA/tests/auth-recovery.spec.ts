import { test, expect } from '@playwright/test';

/**
 * Suite enfocada en validar la UX del flujo "¿Olvidaste tu contraseña?".
 */
test.describe('Recuperación de contraseña', () => {
    test.beforeEach(async ({ page }) => {
        // ES: Navegamos siempre a /login usando la baseURL del config y esperamos a que cargue el formulario.
        await page.goto('/login');
        await expect(page.getByRole('heading', { name: /Bienvenido/i })).toBeVisible();
    });

    test('muestra el enlace de recuperación junto al campo de contraseña', async ({ page }) => {
        const recoveryLink = page.getByRole('link', { name: /Olvidaste tu contraseña/i });
        // ES: Log temporal para diagnosticar los enlaces disponibles cuando la prueba falle.
        await expect(recoveryLink).toBeVisible();
    });

    test('impide solicitar código si no se ha digitado el correo', async ({ page }) => {
        const recoveryLink = page.getByRole('link', { name: /Olvidaste tu contraseña/i });
        await recoveryLink.click();

        const errorBanner = page.getByText('Ingresa tu correo antes de solicitar la recuperación.');
        await expect(errorBanner).toBeVisible();
    });

    test('flujo completo de solicitud y confirmación con API mockeada', async ({ page }) => {
        // ES: Interceptamos la petición de solicitud para simular respuesta del backend.
        await page.route('**/auth/password/request', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ message: 'mocked' }),
            });
        });

        // ES: Interceptamos también la confirmación del código.
        await page.route('**/auth/password/reset', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ message: 'ok' }),
            });
        });

        await page.getByLabel('Correo Electrónico').fill('qa+reset@rmparking.com');
        await page.getByRole('link', { name: /Olvidaste tu contraseña/i }).click();

        // ES: Aparece el bloque de recuperación con instrucciones.
        const instructions = page.getByText(/Ingresa el código que enviamos/i);
        await expect(instructions).toBeVisible();

        await page.getByLabel('Código de confirmación').fill('ABC123');
        await page.getByLabel('Nueva contraseña').fill('NuevaClave@2026');

        await page.getByRole('button', { name: 'Actualizar contraseña' }).click();

        // ES: Al finalizar se ocultan los campos, señalando que el flujo terminó correctamente.
        await expect(page.getByLabel('Código de confirmación')).toBeHidden();
    });
});

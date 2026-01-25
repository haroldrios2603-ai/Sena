import { test, expect } from '@playwright/test';

/**
 * Pruebas de cordura (Sanity Tests) para verificar que el sistema carga correctamente.
 */

test('la página de inicio tiene el título correcto', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    // El título definido en index.html es 'frontend'
    await expect(page).toHaveTitle(/frontend/i);
});

test('la página de login carga correctamente con el texto de bienvenida', async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    // Buscamos el texto "Bienvenido" que es el encabezado del formulario
    const loginText = await page.getByText(/Bienvenido/i);
    await expect(loginText).toBeVisible();
});

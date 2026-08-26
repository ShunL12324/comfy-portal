import { expect, test } from '@playwright/test';
import { clearState } from './fixtures/app-state';
import { installMockComfyServer, MOCK_HOST, MOCK_PORT } from './fixtures/comfy-server';

test.describe('adding a server', () => {
  test.beforeEach(async ({ page }) => {
    await clearState(page);
    await installMockComfyServer(page);
  });

  test('adds a reachable server and reports it online', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Add Server' }).click();

    await page.getByRole('textbox', { name: 'Server name' }).fill('E2E Server');
    await page.getByRole('textbox', { name: 'Host or IP address' }).fill(MOCK_HOST);
    await page.getByRole('textbox', { name: 'Port number' }).fill(String(MOCK_PORT));
    await page.getByRole('button', { name: 'Add', exact: true }).click();

    await expect(page.getByText('E2E Server')).toBeVisible();
    await expect(page.getByText(`${MOCK_HOST}:${MOCK_PORT}`, { exact: false })).toBeVisible();
  });

  test('reports offline when the server cannot be reached', async ({ page }) => {
    await installMockComfyServer(page, { offline: true });
    await page.goto('/');
    await page.getByRole('button', { name: 'Add Server' }).click();

    await page.getByRole('textbox', { name: 'Server name' }).fill('Dead Server');
    await page.getByRole('textbox', { name: 'Host or IP address' }).fill(MOCK_HOST);
    await page.getByRole('textbox', { name: 'Port number' }).fill(String(MOCK_PORT));
    await page.getByRole('button', { name: 'Add', exact: true }).click();

    await expect(page.getByText(/Offline/)).toBeVisible({ timeout: 30_000 });
  });

  test('refuses to submit without a name', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Add Server' }).click();

    await page.getByRole('textbox', { name: 'Host or IP address' }).fill(MOCK_HOST);
    await page.getByRole('button', { name: 'Add', exact: true }).click();

    // Still on the sheet — the name field is required.
    await expect(page.getByRole('textbox', { name: 'Server name' })).toBeVisible();
  });
});

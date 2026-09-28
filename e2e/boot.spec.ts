import { expect, test } from '@playwright/test';
import { clearState } from './fixtures/app-state';

/**
 * The regression this exists for: the web target was completely broken for an
 * unknown length of time — every route 500'd because a shim dropped an export
 * and a hook threw before first paint. Nothing caught it, because nothing ran
 * the web build. A test that only asserts "the app boots with a clean console"
 * would have.
 */
test.describe('boot', () => {
  test('renders the servers screen with no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await clearState(page);
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Servers' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add server' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('shows the empty state before any server is added', async ({ page }) => {
    await clearState(page);
    await page.goto('/');

    await expect(page.getByText(/Connect your ComfyUI server/)).toBeVisible();
  });
});

test('Settings excludes the internal design catalog', async ({ page }) => {
  await clearState(page);
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto('/');
  await expect(page.getByRole('tab', { name: 'Design', exact: true })).toHaveCount(0);
  await page.getByRole('tab', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await expect(page.getByText('Design system', { exact: true })).toHaveCount(0);
});

test('manual servers and template builds share one list without duplicate provisioning rows', async ({ page }) => {
  await clearState(page);
  await page.addInitScript(() => {
    const cloud = { provider: 'vast', instanceId: 42, startedAt: Date.now() / 1000, pricePerHour: 0.2 };
    const base = { host: 'example.invalid', port: 8188, useSSL: 'Never', status: 'offline' };
    localStorage.setItem(
      'servers-storage',
      JSON.stringify({
        version: 0,
        state: {
          servers: [
            { ...base, id: 'manual', name: 'Rented elsewhere' },
            { ...base, id: 'built', name: 'Ready build', cloud },
            { ...base, id: 'pending', name: 'Duplicate connection', cloud: { ...cloud, instanceId: 43 } },
          ],
        },
      }),
    );
    localStorage.setItem(
      'gpu-provisioning',
      JSON.stringify({
        version: 0,
        state: {
          launches: [
            {
              instanceId: 42,
              templateName: 'Ready build',
              serverId: 'built',
              stage: 'ready',
              startedAt: cloud.startedAt,
              pricePerHour: 0.2,
            },
            {
              instanceId: 43,
              templateName: 'Failed build',
              serverId: 'pending',
              stage: 'failed',
              startedAt: cloud.startedAt,
              pricePerHour: 0.2,
            },
          ],
        },
      }),
    );
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Open Rented elsewhere', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Ready build', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'View progress for Failed build', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Duplicate connection', exact: true })).toHaveCount(0);
  await expect(page.getByText('Cloud instances', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Manage Ready build', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Open Ready build', exact: true }).click();
  await page.getByRole('button', { name: 'Server settings', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Destroy instance', exact: true })).toBeVisible();
});

test('building rows use the same layout and open installation progress', async ({ page }) => {
  await clearState(page);
  await page.setViewportSize({ width: 393, height: 852 });
  await page.addInitScript(() => {
    localStorage.setItem(
      'gpu-provisioning',
      JSON.stringify({
        version: 0,
        state: {
          launches: [
            {
              instanceId: 99,
              templateName: 'Building environment',
              stage: 'installing',
              startedAt: Date.now() / 1000,
              pricePerHour: 0.2,
              snapshot: {
                phase: 'downloading',
                steps: [],
                models: [
                  { name: 'one', folder: 'models', state: 'done', total: 100, completed: 100, speed: 0 },
                  { name: 'two', folder: 'models', state: 'active', total: 100, completed: 50, speed: 10 },
                ],
                totals: { bytes: 200, completed: 150, speed: 10 },
                services: {},
              },
            },
          ],
        },
      }),
    );
    localStorage.setItem(
      'servers-storage',
      JSON.stringify({
        version: 0,
        state: {
          servers: [
            {
              id: 'manual',
              name: 'Existing server',
              host: 'example.invalid',
              port: 8188,
              useSSL: 'Never',
              status: 'offline',
            },
          ],
        },
      }),
    );
  });
  await page.goto('/');
  await expect(page.getByTestId('server-row')).toHaveCount(2);
  await expect(page.getByText('Building · Downloading models 1/2', { exact: true })).toBeVisible();
  const rows = page.getByTestId('server-row');
  const first = await rows.nth(0).boundingBox();
  const second = await rows.nth(1).boundingBox();
  expect(first!.x).toBe(second!.x);
  expect(first!.width).toBe(second!.width);
  await page.screenshot({ path: '.expo/server-lifecycle-workspace.png' });
  await page.getByRole('button', { name: 'View progress for Building environment', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Setup', exact: true })).toBeVisible();
  await expect(page.getByText('Models', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Back to Servers', exact: true })).toHaveCount(0);
});

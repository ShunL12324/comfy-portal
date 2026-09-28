import { expect, test, type Page } from '@playwright/test';
import { clearState } from './fixtures/app-state';
import { installMockComfyServer, MOCK_HOST, MOCK_PORT } from './fixtures/comfy-server';

async function seedCollection(page: Page) {
  await clearState(page);
  await installMockComfyServer(page);
  await page.addInitScript(
    ({ host, port }) => {
      localStorage.setItem(
        'servers-storage',
        JSON.stringify({
          version: 0,
          state: {
            servers: [
              { id: 'studio', name: 'Studio workstation', host, port, useSSL: 'Never', status: 'online' },
              {
                id: 'backup',
                name: 'Backup machine',
                host: 'backup.example',
                port,
                useSSL: 'Never',
                status: 'offline',
              },
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
                id: 'vast:42',
                provider: 'vast',
                instanceId: '42',
                environmentId: 'flux',
                environmentName: 'Flux studio',
                environmentSnapshot: {
                  id: 'flux',
                  name: 'Flux studio',
                  description: '',
                  models: [],
                  extensions: [],
                  workflows: [],
                },
                token: 'fixture',
                pricePerHour: 0.2,
                startedAt: Date.now() / 1000,
                stage: 'failed',
                host: 'build.example',
                comfyPort: 8188,
                error: 'Fixture failure',
              },
            ],
          },
        }),
      );
    },
    { host: MOCK_HOST, port: MOCK_PORT },
  );
}

test('server search matches visible names and endpoints, including builds', async ({ page }) => {
  await seedCollection(page);
  await page.goto('/');
  const search = page.getByRole('textbox', { name: 'Search servers', exact: true });
  await expect(page.getByRole('button', { name: 'Open Studio workstation', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Backup machine', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'View progress for Flux studio', exact: true })).toBeVisible();

  await search.fill('  STUDIO  ');
  await expect(page.getByRole('button', { name: 'Open Studio workstation', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'View progress for Flux studio', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Backup machine', exact: true })).toHaveCount(0);
  await expect(page.getByTestId('app-bar').getByText('3', { exact: true })).toBeVisible();

  await search.fill(`${MOCK_HOST}:${MOCK_PORT}`);
  await expect(page.getByRole('button', { name: 'Open Studio workstation', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'View progress for Flux studio', exact: true })).toHaveCount(0);
  await search.fill('build.example:8188');
  await expect(page.getByRole('button', { name: 'View progress for Flux studio', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Studio workstation', exact: true })).toHaveCount(0);
  await search.fill('does not exist');
  await expect(page.getByText('No matching servers', { exact: true })).toBeVisible();
  await expect(page.getByText('Connect your ComfyUI server', { exact: true })).toHaveCount(0);
  await search.fill('   ');
  await expect(page.getByRole('button', { name: 'Open Backup machine', exact: true })).toBeVisible();
});

test('server search has the same geometry as environment search', async ({ page }) => {
  await clearState(page);
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/');
  const serverSearch = page.getByRole('textbox', { name: 'Search servers', exact: true });
  await expect(serverSearch).toBeVisible();
  const serverBox = (await serverSearch.boundingBox())!;
  await page.getByRole('tab', { name: 'Environments', exact: true }).click();
  const environmentSearch = page.getByRole('textbox', { name: 'Search environments', exact: true });
  await expect(environmentSearch).toBeVisible();
  const environmentBox = (await environmentSearch.boundingBox())!;
  for (const key of ['x', 'y', 'width', 'height'] as const) {
    expect(serverBox[key]).toBeCloseTo(environmentBox[key], 0);
  }
});

test('empty search results still allow pulling to refresh every connection without clearing the query', async ({
  page,
}) => {
  await seedCollection(page);
  const checkedHosts: string[] = [];
  await page.route('**/system_stats', async (route) => {
    checkedHosts.push(new URL(route.request().url()).hostname);
    await route.fulfill({ json: { system: {}, devices: [] } });
  });
  await page.route(`**://backup.example:${MOCK_PORT}/**`, async (route) => {
    if (new URL(route.request().url()).pathname === '/system_stats') {
      checkedHosts.push('backup.example');
    }
    await route.fulfill({ json: {} });
  });
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Open Studio workstation', exact: true })).toBeVisible();
  const search = page.getByRole('textbox', { name: 'Search servers', exact: true });
  await search.fill('no matching connection');
  await expect(page.getByText('No matching servers', { exact: true })).toBeVisible();
  checkedHosts.length = 0;
  const content = page.getByTestId('refresh-content');
  const box = (await content.boundingBox())!;
  await page.mouse.move(box.x + 180, box.y + 250);
  await page.mouse.down();
  await page.mouse.move(box.x + 180, box.y + 420, { steps: 16 });
  await expect
    .poll(() => content.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42))
    .toBeGreaterThan(60);
  await page.mouse.up();
  await expect.poll(() => checkedHosts).toEqual(expect.arrayContaining([MOCK_HOST, 'backup.example']));
  await expect(page.getByTestId('refresh-indicator')).toHaveCSS('opacity', '0');
  await expect(search).toHaveValue('no matching connection');
  await expect(page.getByText('No matching servers', { exact: true })).toBeVisible();
  await search.fill('');
  await expect(page.getByRole('button', { name: 'Open Backup machine', exact: true })).toBeVisible();
});

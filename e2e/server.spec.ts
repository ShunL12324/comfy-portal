import { expect, test, type Page } from '@playwright/test';
import { clearState, seedServer, SERVER_ID } from './fixtures/app-state';
import { installMockComfyServer, MOCK_HOST, MOCK_PORT } from './fixtures/comfy-server';
import { designTokens } from '../constants/design-tokens';

async function refreshConnections(page: Page) {
  const content = page.getByTestId('refresh-content');
  const box = (await content.boundingBox())!;
  await page.mouse.move(box.x + 180, box.y + 250);
  await page.mouse.down();
  await page.mouse.move(box.x + 180, box.y + 420, { steps: 16 });
  await expect
    .poll(() => content.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42))
    .toBeGreaterThan(60);
  await page.mouse.up();
}

test.describe('adding a server', () => {
  test.beforeEach(async ({ page }) => {
    await clearState(page);
    await installMockComfyServer(page);
  });

  test('adds a reachable server and reports it online', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Add server' }).click();

    await page.getByRole('textbox', { name: 'Server name' }).fill('E2E Server');
    await page.getByRole('textbox', { name: 'Host or IP address' }).fill(MOCK_HOST);
    await page.getByRole('textbox', { name: 'Port number' }).fill(String(MOCK_PORT));
    await page.getByRole('button', { name: 'Add', exact: true }).click();

    await expect(page.getByText('E2E Server')).toBeVisible();
    await expect(page.getByText(`${MOCK_HOST}:${MOCK_PORT}`, { exact: true })).toBeVisible();
  });

  test('reports offline when the server cannot be reached', async ({ page }) => {
    await installMockComfyServer(page, { offline: true });
    await page.goto('/');
    const add = page.getByRole('button', { name: 'Add server' });
    await add.hover();
    await expect(add).toHaveAttribute('data-hover', 'true');
    await add.click();

    await page.getByRole('textbox', { name: 'Server name' }).fill('Dead Server');
    await page.getByRole('textbox', { name: 'Host or IP address' }).fill(MOCK_HOST);
    await page.getByRole('textbox', { name: 'Port number' }).fill(String(MOCK_PORT));
    await page.getByRole('button', { name: 'Add', exact: true }).click();

    await expect(page.getByTestId('server-status-line').getByText('Offline', { exact: true })).toBeVisible({
      timeout: 30_000,
    });
  });

  test('refuses to submit without a name', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Add server' }).click();

    await page.getByRole('textbox', { name: 'Host or IP address' }).fill(MOCK_HOST);
    await page.getByRole('button', { name: 'Add', exact: true }).click();

    // Still on the sheet — the name field is required.
    await expect(page.getByRole('textbox', { name: 'Server name' })).toBeVisible();
  });
});

test('connection removal lives in management and requires confirmation', async ({ page }) => {
  await clearState(page);
  await seedServer(page);
  await installMockComfyServer(page);
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Remove connection', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Edit E2E Server', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Open E2E Server', exact: true }).click();
  await page.getByRole('button', { name: 'Server settings', exact: true }).click();
  await page.getByRole('button', { name: 'Remove connection', exact: true }).click();
  await expect(page.getByText('Remove connection?', { exact: true })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('servers-storage')!).state.servers.length)).toBe(1);
  await page.getByRole('button', { name: 'Remove connection', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Remove connection', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open E2E Server', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('servers-storage')!).state.servers.length)).toBe(0);
});

test('server section plus opens the connection form and can be reused', async ({ page }) => {
  await clearState(page);
  await seedServer(page);
  await installMockComfyServer(page);
  await page.goto('/');
  await expect(page.getByTestId('app-bar').getByRole('button', { name: 'Add server', exact: true })).toHaveCount(1);
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.getByRole('button', { name: 'Add server', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Server name' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Server name' })).toHaveCount(0);
  }
});

test('server cards expose independent details, and opening them leads straight to workflows', async ({ page }) => {
  await clearState(page);
  await seedServer(page);
  await installMockComfyServer(page);
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Server details: E2E Server', exact: true }).click();
  await expect(page.getByTestId('resource-storage')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Server name', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Done', exact: true })).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Bottom sheet backdrop', exact: true })
    .last()
    .click({ position: { x: 8, y: 8 } });
  await page.getByRole('button', { name: 'Open E2E Server', exact: true }).click();
  await expect(page.getByText('Workflows', { exact: true })).toBeVisible();
  await expect(page.getByTestId('server-overview')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Server details: E2E Server', exact: true }).filter({ visible: true }),
  ).toHaveCount(0);
  await expect(page.getByTestId('resource-storage')).toHaveCount(0);
  const appBar = (await page.getByTestId('app-bar').filter({ visible: true }).last().boundingBox())!;
  const title = (await page.getByText('Workflows', { exact: true }).boundingBox())!;
  expect(title.y - appBar.y - appBar.height).toBeLessThan(44);
  await page.screenshot({ path: '.expo/server-workflows-review.png' });
  await page.getByRole('button', { name: 'Server settings', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Server name', exact: true })).toHaveValue('E2E Server');
  const cancel = page.getByRole('button', { name: 'Cancel', exact: true });
  await expect(cancel.getByTestId('button-surface')).toHaveCSS('height', `${designTokens.height.control}px`);
  await cancel.click();
});

test('compact server cards keep long multi-GPU summaries bounded and open complete readings', async ({ page }) => {
  test.setTimeout(90_000);
  await clearState(page);
  await seedServer(page);
  await installMockComfyServer(page);
  const longName = 'AMD Radeon Pro ' + 'Long graphics model '.repeat(10);
  await page.route(`**://${MOCK_HOST}:${MOCK_PORT}/system_stats`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        devices: [
          { name: 'cuda:0 NVIDIA GeForce RTX 4090', vram_total: 24 * 1024 ** 3, vram_free: 18 * 1024 ** 3 },
          { name: 'cuda:1 NVIDIA GeForce RTX 4090' },
          { name: longName },
        ],
      }),
    }),
  );
  await page.route(`**://${MOCK_HOST}:${MOCK_PORT}/cpe/system/storage`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        storage: { total: 1000 * 1024 ** 3, used: 200 * 1024 ** 3, free: 750 * 1024 ** 3 },
      }),
    }),
  );
  for (const theme of ['dark', 'light']) {
    await page.addInitScript(
      (preference) => localStorage.setItem('theme-storage', JSON.stringify({ state: { preference }, version: 1 })),
      theme,
    );
    for (const width of [320, 375, 430, 1024]) {
      await page.setViewportSize({ width, height: 812 });
      await page.goto('/');
      await expect(page.getByTestId('server-gpu')).toContainText('2 × RTX 4090');
      await expect(page.getByTestId('server-card-vram')).toHaveText('GPU 1 · 6.0 GB / 24.0 GB');
      await expect(
        page.getByRole('progressbar', { name: 'VRAM usage: E2E Server, GPU 1', exact: true }),
      ).toHaveAttribute('aria-valuenow', '25');
      const card = (await page.getByTestId('server-row').boundingBox())!;
      expect(card.height).toBeLessThanOrEqual(140);
      await expect(page.getByTestId('server-gpu').locator('span')).toHaveCSS('text-overflow', 'ellipsis');
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      if (width === 375) await page.screenshot({ path: `.expo/server-card-readings-${theme}.png` });
    }
  }
  await page.getByRole('button', { name: 'Server details: E2E Server', exact: true }).click();
  await expect(page.getByText('1. RTX 4090', { exact: true })).toBeVisible();
  await expect(page.getByText('2. RTX 4090', { exact: true })).toBeVisible();
  await expect(page.getByText('3. ' + longName, { exact: true })).toBeVisible();
  await expect(page.getByText('VRAM · Primary GPU · Used / Total', { exact: true })).toBeVisible();
  await expect(page.getByTestId('hardware-detail-vram').getByText('6.0 GB / 24.0 GB', { exact: true })).toBeVisible();
  await expect(page.getByText('200.0 GB / 1000.0 GB', { exact: true })).toBeVisible();
  await expect(page.getByText('750.0 GB free', { exact: true })).toBeVisible();
  await expect(page.getByText('Ready', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Done', exact: true })).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Bottom sheet backdrop', exact: true })
    .last()
    .click({ position: { x: 8, y: 8 } });
  await expect(page.getByText('1. RTX 4090', { exact: true })).toHaveCount(0);
});

test('server cards keep last-known GPUs offline without inventing current memory or disk values', async ({ page }) => {
  await clearState(page);
  await seedServer(page);
  await page.addInitScript(() => {
    const saved = JSON.parse(localStorage.getItem('servers-storage')!);
    saved.state.servers[0].gpuNames = ['NVIDIA GeForce RTX 4060', 'NVIDIA GeForce RTX 4090'];
    localStorage.setItem('servers-storage', JSON.stringify(saved));
  });
  await installMockComfyServer(page, { offline: true });
  await page.goto('/');
  await expect(page.getByTestId('server-gpu')).toHaveText('RTX 4060 · RTX 4090');
  await expect(page.getByTestId('server-status-line')).toHaveText('Offline');
  await expect(page.getByTestId('server-card-vram')).toHaveCount(0);
  await expect(page.getByRole('progressbar', { name: /^VRAM usage:/ })).toHaveCount(0);
  await expect(page.getByTestId('resource-storage')).toHaveCount(0);
  await page.getByRole('button', { name: 'Server details: E2E Server', exact: true }).click();
  await expect(page.getByTestId('resource-storage')).toContainText('Unavailable');
  await expect(page.getByText('Offline', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('Last known hardware', { exact: true })).toBeVisible();
  await expect(page.getByText('Server is unreachable', { exact: true })).toBeVisible();
  await expect(page.getByText('Needs Comfy Portal Endpoint', { exact: true })).toHaveCount(0);
});

test('ready connection dots use green in light and dark themes', async ({ page }) => {
  await clearState(page);
  await seedServer(page);
  await installMockComfyServer(page);
  for (const [theme, color] of [
    ['dark', 'rgb(74, 222, 128)'],
    ['light', 'rgb(21, 128, 61)'],
  ] as const) {
    await page.addInitScript((theme) => {
      localStorage.setItem('theme-storage', JSON.stringify({ state: { preference: theme }, version: 1 }));
    }, theme);
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Open E2E Server', exact: true })).toBeVisible();
    await refreshConnections(page);
    await expect(page.getByTestId('server-status-line').locator('.bg-status-online')).toHaveCSS(
      'background-color',
      color,
    );
  }
});

test('server cards retain every reported GPU offline and replace the list on reconnect', async ({ page, context }) => {
  await clearState(page);
  await seedServer(page);
  await installMockComfyServer(page);
  await page.route('**/system_stats', (route) =>
    route.fulfill({
      json: {
        devices: [
          { name: 'cuda:0 NVIDIA GeForce RTX 4090 : cudaMallocAsync' },
          { name: 'cuda:1 NVIDIA GeForce RTX 4090 : cudaMallocAsync' },
          { name: 'cuda:2 NVIDIA GeForce RTX 4060 : cudaMallocAsync' },
        ],
      },
    }),
  );
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Open E2E Server', exact: true })).toBeVisible();
  await expect(page.getByTestId('server-gpu')).toHaveText('2 × RTX 4090 · RTX 4060');
  await refreshConnections(page);
  await expect(page.getByTestId('server-gpu')).toHaveText('2 × RTX 4090 · RTX 4060');
  await expect(page.getByTestId('server-row-facts')).not.toContainText('models');
  // Refresh translates the entire list while settling. Measure all three
  // regions in the same frame so animation cannot masquerade as misalignment.
  const { footer, gpu, status } = await page.evaluate(() => {
    const rect = (id: string) => {
      const box = document.querySelector(`[data-testid="${id}"]`)!.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    };
    return { footer: rect('server-row-facts'), gpu: rect('server-gpu'), status: rect('server-status-line') };
  });
  expect(gpu.x).toBeGreaterThan(status.x + status.width);
  expect(gpu.x + gpu.width).toBeLessThanOrEqual(footer.x + footer.width);
  expect(gpu.y + gpu.height / 2).toBeCloseTo(status.y + status.height / 2, 0);
  await expect(page.getByTestId('server-row')).toHaveAccessibleDescription(/2 × RTX 4090 · RTX 4060/);
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem('servers-storage')!).state.servers[0].gpuNames.length),
    )
    .toBe(3);

  // A fresh page shares saved storage, without rerunning this page's seed scripts.
  const reopened = await context.newPage();
  await reopened.setViewportSize({ width: 375, height: 812 });
  await installMockComfyServer(reopened, { offline: true });
  await reopened.goto('/');
  await expect(reopened.getByRole('button', { name: 'Open E2E Server', exact: true })).toBeVisible();
  await expect(reopened.getByTestId('server-gpu')).toHaveText('2 × RTX 4090 · RTX 4060');
  await refreshConnections(reopened);
  await expect(reopened.getByTestId('server-status-line')).toHaveText('Offline');
  await expect(reopened.getByTestId('server-gpu')).toHaveText('2 × RTX 4090 · RTX 4060');
  await expect
    .poll(() =>
      reopened.getByTestId('refresh-content').evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42),
    )
    .toBe(0);

  await reopened.unrouteAll();
  await installMockComfyServer(reopened);
  const longName = 'RTX 5090 workstation '.repeat(12).trim();
  await reopened.route('**/system_stats', (route) => route.fulfill({ json: { devices: [{ name: longName }] } }));
  await refreshConnections(reopened);
  await expect(reopened.getByTestId('server-gpu')).toHaveText(longName);
  const gpuText = reopened.getByTestId('server-gpu').getByText(longName, { exact: true });
  await expect(gpuText).toHaveCSS('text-overflow', 'ellipsis');
  expect(await gpuText.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  await expect(reopened.getByTestId('server-row')).toHaveAccessibleDescription(new RegExp(longName));
  await reopened.close();
});

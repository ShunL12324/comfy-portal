import { expect, test } from '@playwright/test';
import { clearState, seedServer, SERVER_ID } from './fixtures/app-state';
import { installMockComfyServer, MOCK_HOST, MOCK_PORT } from './fixtures/comfy-server';

async function seedWorkflows(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const graph = { '1': { class_type: 'CLIPTextEncode', inputs: { text: 'Portrait' } } };
    const assets = Array.from({ length: 24 }, (_, i) => ({
      id: `asset-${i}`,
      name:
        i === 0
          ? 'Portrait study'
          : i === 23
            ? 'Landscape study · ' + 'a very long panoramic workflow name '.repeat(8)
            : `Workflow ${i}`,
      data: graph,
      createdAt: new Date(2026, 8, i + 1).toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    const bindings = assets.map((asset, i) => ({
      id: `run-${i}`,
      assetId: asset.id,
      serverId: 'e2e-server',
      addMethod: 'file',
      ...(i === 0 ? { lastUsed: new Date().toISOString() } : {}),
    }));
    localStorage.setItem('cp-workflows-v2', JSON.stringify({ state: { assets, bindings }, version: 0 }));
    const image =
      'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#aeb9ae"/><circle cx="40" cy="32" r="16" fill="#efe0c7"/><path d="M13 80Q15 49 40 49Q65 49 67 80" fill="#63524e"/></svg>',
      );
    localStorage.setItem(
      'cp-media-v2',
      JSON.stringify({
        state: {
          assets: [
            {
              id: 'wrong-server',
              serverId: 'other',
              workflowId: 'run-0',
              kind: 'image',
              path: 'https://wrong.invalid/preview.png',
              metadata: { timestamp: new Date().toISOString(), workflow: graph, originalUrl: '' },
            },
            {
              id: 'recent-preview',
              serverId: 'e2e-server',
              workflowId: 'run-0',
              kind: 'image',
              path: image,
              metadata: { timestamp: new Date().toISOString(), workflow: graph, originalUrl: '' },
            },
          ],
        },
        version: 0,
      }),
    );
  });
}

test('workflow workspace has recent-use order, scoped previews, stable search and one scrolling body', async ({
  page,
}) => {
  await clearState(page);
  await seedServer(page);
  await seedWorkflows(page);
  await installMockComfyServer(page);
  await page.route(`**://${MOCK_HOST}:${MOCK_PORT}/api/cpe/workflow/list`, (route) =>
    route.fulfill({ json: { status: 'success', workflows: [] } }),
  );
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`/workflow/${SERVER_ID}`);
  const cards = page.getByRole('button', { name: /^Open / });
  await expect(cards.first()).toHaveAttribute('aria-label', 'Open Portrait study');
  await expect(cards.nth(1)).toHaveAttribute('aria-label', /^Open Landscape study/);
  await expect(cards.first().locator('..')).toContainText('Used today');
  await expect(cards.nth(1).locator('..')).toContainText('Not run yet');
  await expect(cards.first().locator('..').locator('img')).toHaveAttribute('src', /^data:image\/svg\+xml/);
  await expect(page.getByText(/\d+ nodes/)).toHaveCount(0);
  const search = page.getByRole('textbox', { name: 'Search workflows', exact: true });
  const searchBox = (await search.locator('..').boundingBox())!;
  const cardBox = (await cards.first().boundingBox())!;
  expect(cardBox.y - searchBox.y - searchBox.height).toBeGreaterThanOrEqual(12);
  expect(cardBox.x).toBe(searchBox.x);
  await search.pressSequentially('Portrait');
  await expect(search).toBeFocused();
  await expect(cards).toHaveCount(1);
  await search.fill('missing');
  await expect(page.getByText('No matching workflows', { exact: true })).toBeVisible();
  await search.fill('');
  await search.blur();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: '.expo/server-workspace-dark.png' });
  await page.setViewportSize({ width: 320, height: 812 });
  const longTitle = page.getByText(/^Landscape study · a very long/);
  await expect(longTitle).toHaveCSS('text-overflow', 'ellipsis');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.setViewportSize({ width: 375, height: 812 });
  const appBar = (await page.getByTestId('app-bar').boundingBox())!;
  await page.mouse.move(180, 620);
  await page.mouse.wheel(0, 650);
  await expect
    .poll(
      async () => (await page.getByRole('textbox', { name: 'Search workflows', exact: true }).boundingBox())?.y ?? -1,
    )
    .toBeLessThan(0);
  expect((await page.getByTestId('app-bar').boundingBox())!.y).toBe(appBar.y);
  await page.addInitScript(() =>
    localStorage.setItem('theme-storage', JSON.stringify({ state: { preference: 'light' }, version: 1 })),
  );
  await page.goto(`/workflow/${SERVER_ID}`);
  await expect(page.getByRole('button', { name: 'Open Portrait study', exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: '.expo/server-workspace-light.png' });
});

test('unavailable workflow sync preserves saved workflows without a hardware status region', async ({ page }) => {
  await clearState(page);
  await seedServer(page);
  await seedWorkflows(page);
  await installMockComfyServer(page);
  await page.route(`**://${MOCK_HOST}:${MOCK_PORT}/api/cpe/workflow/list`, (route) =>
    route.fulfill({ status: 503, body: 'Unavailable' }),
  );
  const offline = true;
  await page.route(`**://${MOCK_HOST}:${MOCK_PORT}/system_stats`, (route) =>
    offline
      ? route.abort('connectionrefused')
      : route.fulfill({
          json: { devices: [{ name: 'NVIDIA GeForce RTX 4060', vram_total: 8 * 1024 ** 3, vram_free: 6 * 1024 ** 3 }] },
        }),
  );
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`/workflow/${SERVER_ID}`);
  await expect(page.getByText('Showing saved workflows · Workflow sync unavailable', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Portrait study', exact: true })).toBeVisible();
  await expect(page.getByTestId('server-overview')).toHaveCount(0);
  await expect(page.getByText('Server offline', { exact: true })).toHaveCount(0);
});

test('Add workflow offers saved workflows and clipboard, creating independent bindings', async ({ page }) => {
  await clearState(page);
  await seedServer(page);
  await seedWorkflows(page);
  await installMockComfyServer(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        readText: async () =>
          JSON.stringify({
            '1': { class_type: 'CLIPTextEncode', inputs: { text: 'Added from clipboard' } },
          }),
      },
    });
  });
  await page.goto(`/workflow/${SERVER_ID}`);
  await page.getByRole('button', { name: 'Add workflow', exact: true }).click();
  await page.getByRole('button', { name: 'Saved workflows', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search saved workflows', exact: true }).fill('Portrait');
  await page.getByRole('checkbox', { name: 'Portrait study 1 nodes' }).click();
  await page.getByRole('button', { name: 'Add selected (1)', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Search saved workflows', exact: true })).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('cp-workflows-v2')!).state.bindings.length))
    .toBe(25);
  await page.getByRole('button', { name: 'Add workflow', exact: true }).click();
  await page.getByRole('button', { name: 'Paste from clipboard', exact: true }).click();
  await expect(page.getByText('Workflow loaded', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Workflow name', exact: true }).fill('Clipboard study');
  await page.getByRole('button', { name: 'Add workflow', exact: true }).last().click();
  await expect(page.getByText('Workflow added', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Clipboard study', exact: true })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('cp-workflows-v2')!).state.bindings.length))
    .toBe(26);
});

test('clipboard loading reports failures and recovery through Toast above the open sheet', async ({ page }) => {
  await clearState(page);
  await seedServer(page);
  await installMockComfyServer(page);
  await page.addInitScript(() => {
    (window as any).clipboardContent = '{}';
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        readText: async () => {
          const content = (window as any).clipboardContent;
          if (content === 'permission-denied') throw new Error('Clipboard access denied');
          return content;
        },
      },
    });
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`/workflow/${SERVER_ID}`);
  await page.getByRole('button', { name: 'Add workflow', exact: true }).click();
  const paste = page.getByRole('button', { name: 'Paste from clipboard', exact: true });
  for (const [content, title] of [
    ['{}', 'Could not load workflow'],
    ['  ', 'Clipboard is empty'],
    ['{broken json', 'Could not load workflow'],
    ['permission-denied', 'Could not read clipboard'],
  ]) {
    await page.evaluate((text) => {
      (window as any).clipboardContent = text;
    }, content);
    await paste.click();
    const toast = page.getByText(title, { exact: true });
    await expect(toast).toBeVisible();
    expect((await toast.boundingBox())!.y).toBeLessThan(80);
    await expect(paste).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Workflow name', exact: true })).toHaveCount(0);
    await expect(page.getByRole('alert')).toHaveCount(0);
  }
  await page.evaluate(() => {
    (window as any).clipboardContent = JSON.stringify({
      '1': { class_type: 'CLIPTextEncode', inputs: { text: 'Recovered workflow' } },
    });
  });
  await paste.click();
  await expect(page.getByText('Workflow loaded', { exact: true })).toBeVisible();
  await expect(page.getByText('Review it before adding.', { exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Workflow name', exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Workflow name', exact: true }).fill('Recovered workflow');
  await page.getByRole('button', { name: 'Add workflow', exact: true }).last().click();
  await expect(page.getByText('Workflow added', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Recovered workflow', exact: true })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('cp-workflows-v2')!).state.bindings.length))
    .toBe(1);
});

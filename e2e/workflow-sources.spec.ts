import { expect, test, type Page } from '@playwright/test';
import { clearState, seedServer, SERVER_ID } from './fixtures/app-state';
import { installMockComfyServer, MOCK_HOST, MOCK_PORT } from './fixtures/comfy-server';

const graph = (text: string) => ({
  '1': { id: '1', class_type: 'CLIPTextEncode', inputs: { text }, _meta: { title: 'Prompt' } },
});
const filename = 'Server portrait.json';
async function setup(page: Page, theme = 'dark') {
  await clearState(page);
  await seedServer(page);
  await installMockComfyServer(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(
    ({ theme, original }) => {
      localStorage.setItem('theme-storage', JSON.stringify({ version: 1, state: { preference: theme } }));
      const now = new Date().toISOString();
      const assets = [
        { id: 'local-asset', name: 'Local portrait', data: original, createdAt: now, updatedAt: now },
        { id: 'remote-asset', name: 'Server portrait', data: original, createdAt: now, updatedAt: now },
      ];
      const bindings = [
        { id: 'local', serverId: 'e2e-server', assetId: 'local-asset', addMethod: 'clipboard' },
        {
          id: 'remote',
          serverId: 'e2e-server',
          assetId: 'remote-asset',
          addMethod: 'server-sync',
          metadata: { originalFilename: 'Server portrait.json', serverFileModified: 1, serverFileSize: 100 },
          serverSync: {
            filename: 'Server portrait.json',
            base: { name: 'Server portrait', data: original, modified: 1, size: 100 },
          },
        },
      ];
      localStorage.setItem('cp-workflows-v2', JSON.stringify({ version: 0, state: { assets, bindings } }));
    },
    { theme, original: graph('Original prompt') },
  );
  const state = { version: 1, removed: false, unsupported: false, failed: false, conversions: 0 };
  await page.route(`**://${MOCK_HOST}:${MOCK_PORT}/api/cpe/workflow/list`, (route) => {
    if (state.unsupported) return route.fulfill({ status: 404, body: 'Not found' });
    if (state.failed) return route.fulfill({ status: 503, body: 'Unavailable' });
    return route.fulfill({
      json: { status: 'success', workflows: state.removed ? [] : [{ filename, modified: state.version, size: 100 }] },
    });
  });
  await page.route(`**://${MOCK_HOST}:${MOCK_PORT}/cpe/workflow/get-and-convert**`, (route) => {
    state.conversions++;
    return route.fulfill({ json: { status: 'success', data: { workflow: graph('Server update ' + state.version) } } });
  });
  await page.goto(`/workflow/${SERVER_ID}`);
  return state;
}
async function stored(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('cp-workflows-v2')!).state);
}
async function back(page: Page) {
  await page.getByRole('button', { name: 'Go back', exact: true }).filter({ visible: true }).last().click();
}
async function reopen(page: Page) {
  await page.getByRole('button', { name: 'Open Local portrait', exact: true }).click();
  await back(page);
}

for (const theme of ['dark', 'light']) {
  test(`${theme}: unified workflow sources align, filter with search and preserve local edits on sync`, async ({
    page,
  }) => {
    const state = await setup(page, theme);
    const sourceFilters = page.getByRole('radiogroup', { name: 'Workflow sources' });
    await expect(sourceFilters).toBeVisible();
    await expect(page.getByText('Imported', { exact: true }).last()).toBeVisible();
    const search = page.getByRole('textbox', { name: 'Search workflows', exact: true });
    await page.getByRole('radio', { name: 'Server', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Open Local portrait', exact: true })).toHaveCount(0);
    await search.fill('missing');
    await expect(page.getByText('No matching workflows', { exact: true })).toBeVisible();
    await search.fill('');
    await page.getByRole('radio', { name: 'All', exact: true }).click();
    const bounds = (await sourceFilters.boundingBox())!;
    const card = (await page.getByRole('button', { name: 'Open Server portrait', exact: true }).boundingBox())!;
    expect(card.y - bounds.y - bounds.height).toBeGreaterThanOrEqual(12);
    expect(card.x).toBe(bounds.x);
    expect(card.x + card.width).toBeCloseTo(bounds.x + bounds.width, 0);
    await page.getByRole('button', { name: 'Open Server portrait', exact: true }).click();
    const input = page.getByTestId('node-card-1').getByRole('textbox');
    await input.fill('My local adjustments');
    await expect
      .poll(
        async () => (await stored(page)).assets.find((asset: any) => asset.id === 'remote-asset').data['1'].inputs.text,
      )
      .toBe('My local adjustments');
    state.version = 2;
    await back(page);
    await page.getByRole('button', { name: 'Update available: Server portrait', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Workflow update', exact: true })).toBeVisible();
    await page.screenshot({ path: `.expo/workflow-update-${theme}.png` });
    await page.getByRole('button', { name: 'Keep copy and update', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Open Server portrait (local copy)', exact: true })).toBeVisible();
    const saved = await stored(page);
    expect(saved.assets.find((asset: any) => asset.id === 'remote-asset').data['1'].inputs.text).toBe(
      'Server update 2',
    );
    expect(saved.assets.find((asset: any) => asset.name === 'Server portrait (local copy)').data['1'].inputs.text).toBe(
      'My local adjustments',
    );
    expect(saved.bindings.find((binding: any) => binding.id === 'remote').assetId).toBe('remote-asset');
    await expect(page.getByRole('button', { name: 'Update available: Server portrait', exact: true })).toHaveCount(0);
    await page.screenshot({ path: `.expo/workflow-sources-${theme}.png` });
  });
}

test('removed sources can be kept independently; failed sync and missing extension preserve cache', async ({
  page,
}) => {
  const state = await setup(page);
  state.removed = true;
  await reopen(page);
  await page.getByRole('button', { name: 'Source removed: Server portrait', exact: true }).click();
  await page.getByRole('button', { name: 'Keep as imported', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Source removed: Server portrait', exact: true })).toHaveCount(0);
  expect((await stored(page)).bindings.find((binding: any) => binding.id === 'remote').addMethod).toBe('file');
  state.removed = false;
  state.version = 2;
  state.failed = true;
  await reopen(page);
  await expect(page.getByText('Showing saved workflows · Workflow sync unavailable', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Server portrait', exact: true })).toBeVisible();
  state.failed = false;
  state.unsupported = true;
  await reopen(page);
  await expect(
    page.getByText('Install Comfy Portal Endpoint to discover server workflows.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Server portrait', exact: true })).toBeVisible();
});

test('server workflows stay hidden after refresh and restart, and can be restored', async ({ page }) => {
  const state = await setup(page);
  const card = page.getByRole('button', { name: 'Open Server portrait', exact: true });
  const box = (await card.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(page.getByText('Edit Workflow', { exact: true })).toBeVisible();
  await page.mouse.up();
  await page.getByRole('button', { name: 'Hide on this device', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Hide workflow', exact: true }).click();
  await expect(card).toHaveCount(0);
  state.version = 2;
  await reopen(page);
  await expect(card).toHaveCount(0);
  expect(state.conversions).toBe(0);
  const saved = await stored(page);
  await page.addInitScript(
    (state) => localStorage.setItem('cp-workflows-v2', JSON.stringify({ version: 0, state })),
    saved,
  );
  await page.reload();
  await expect(card).toHaveCount(0);
  await page.getByRole('button', { name: 'Hidden workflows (1)', exact: true }).click();
  await page.getByRole('button', { name: `Restore ${filename}`, exact: true }).click();
  await page
    .getByRole('button', { name: 'Bottom sheet backdrop', exact: true })
    .last()
    .click({ position: { x: 8, y: 8 } });
  await expect(card).toBeVisible();
  expect((await stored(page)).hiddenServerWorkflows[SERVER_ID]).toEqual([]);
});

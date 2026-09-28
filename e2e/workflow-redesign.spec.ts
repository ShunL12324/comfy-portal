import { expect, test } from '@playwright/test';
import { clearState, seedServer, SERVER_ID } from './fixtures/app-state';
import { CHECKPOINTS, installMockComfyServer } from './fixtures/comfy-server';

test('the real workflow screen edits models, reopens selectors and submits updated inputs', async ({ page }) => {
  await clearState(page);
  await seedServer(page);
  await installMockComfyServer(page);
  await page.setViewportSize({ width: 430, height: 932 });
  await page.addInitScript(
    ({ serverId, checkpoint }) => {
      localStorage.setItem(
        'cp-workflows-v2',
        JSON.stringify({
          version: 0,
          state: {
            bindings: [{ id: 'review-flow', assetId: 'review-asset', serverId, addMethod: 'file' }],
            assets: [
              {
                id: 'review-asset',
                name: 'Workflow review',
                createdAt: '2026-09-09T00:00:00Z',
                updatedAt: '2026-09-09T00:00:00Z',
                data: {
                  '1': {
                    id: '1',
                    class_type: 'CheckpointLoaderSimple',
                    inputs: { ckpt_name: checkpoint },
                    _meta: { title: 'Checkpoint' },
                  },
                  '2': {
                    id: '2',
                    class_type: 'EmptyLatentImage',
                    inputs: { width: 512, height: 512, batch_size: 1 },
                    _meta: { title: 'Canvas' },
                  },
                  '3': {
                    id: '3',
                    class_type: 'LoraLoader',
                    inputs: { lora_name: 'None', strength_model: 1, strength_clip: 1 },
                    _meta: { title: 'LoRA' },
                  },
                },
              },
            ],
          },
        }),
      );
    },
    { serverId: SERVER_ID, checkpoint: CHECKPOINTS[0] },
  );
  await page.goto(`/workflow/${SERVER_ID}`);
  await page.getByText('Workflow review', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Workflow review', exact: true })).toBeVisible();
  const appBar = page
    .getByTestId('app-bar')
    .filter({ has: page.getByRole('heading', { name: 'Workflow review', exact: true }) });
  await expect(appBar.getByText('E2E Server', { exact: true })).toHaveCount(0);
  await expect(appBar.getByText('Ready', { exact: true })).toHaveCount(0);
  await page.screenshot({ path: '.expo/run-header-clean.png' });
  await page
    .getByText(/sd_xl_base_1.0/)
    .first()
    .click();
  await page.getByRole('button', { name: 'dreamshaperXL_v21', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Select checkpoints', exact: true })).toHaveCount(0);
  await page
    .getByText(/dreamshaperXL_v21/)
    .first()
    .click();
  await expect(page.getByRole('heading', { name: 'Select checkpoints', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close options', exact: true })).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Bottom sheet backdrop', exact: true })
    .last()
    .click({ position: { x: 8, y: 8 } });
  await expect(page.getByRole('heading', { name: 'Select checkpoints', exact: true })).toHaveCount(0);
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('cp-workflows-v2')!).state);
  expect(state.assets[0].data['1'].inputs.ckpt_name).toBe(CHECKPOINTS[1]);
  await page.getByPlaceholder('Search nodes...').fill('LoRA');
  await page.getByRole('button', { name: 'Increase slider', exact: true }).first().click();
  await expect(page.getByText('1.05', { exact: true })).toBeVisible();
  const request = page.waitForRequest((r) => r.url().endsWith('/prompt') && r.method() === 'POST');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  const body = (await request).postDataJSON();
  expect(body.prompt['1'].inputs.ckpt_name).toBe(CHECKPOINTS[1]);
  expect(body.prompt['3'].inputs.strength_model).toBe(1.05);
  const queue = page.getByRole('button', { name: 'Open queue, 1 jobs', exact: true });
  await expect(queue).toBeVisible();
  await expect(queue.locator(':scope > div').first()).toHaveCSS('background-color', 'rgb(245, 158, 11)');
  await expect(queue.getByText('1', { exact: true })).toHaveCSS('color', 'rgb(19, 19, 20)');
  await page.screenshot({ path: '.expo/redesign-workflow-real.png' });
});

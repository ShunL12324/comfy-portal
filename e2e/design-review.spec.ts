import { test, expect, type Page } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import { installMockComfyServer } from './fixtures/comfy-server';

test.use({ viewport: { width: 393, height: 852 }, colorScheme: 'dark' });
const graph = {
  '1': {
    id: '1',
    class_type: 'CheckpointLoaderSimple',
    inputs: { ckpt_name: 'sd_xl_base_1.0.safetensors' },
    _meta: { title: 'Load checkpoint' },
  },
  '2': {
    id: '2',
    class_type: 'CLIPTextEncode',
    inputs: { text: 'Soft morning light, precise architectural lines, quiet atmosphere.' },
    _meta: { title: 'Positive prompt' },
  },
};
async function shot(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  let previous = '';
  let stable = 0;
  await expect
    .poll(
      async () => {
        const current = await page.locator('h1,h2,h3,h4,h5,h6,button,input').evaluateAll((elements) =>
          JSON.stringify(
            elements.map((element) => {
              const r = element.getBoundingClientRect();
              return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
            }),
          ),
        );
        stable = current === previous ? stable + 1 : 0;
        previous = current;
        return stable;
      },
      { intervals: [100, 100, 100], timeout: 10000 },
    )
    .toBeGreaterThanOrEqual(3);
  if (name === '02-servers')
    console.log(
      await page
        .getByRole('heading')
        .first()
        .evaluate((element) => ({
          font: getComputedStyle(element).fontFamily,
          weight: getComputedStyle(element).fontWeight,
        })),
    );
  await page.screenshot({ path: `.expo/design-review/app/${name}.png`, fullPage: true, animations: 'disabled' });
}
test('review production screens against the approved dark Figma frames', async ({ page }) => {
  test.setTimeout(120000);
  await mkdir('.expo/design-review/app', { recursive: true });
  await installMockComfyServer(page);
  await page.addInitScript(
    ({ graph }) => {
      const save = (key: string, state: unknown) => localStorage.setItem(key, JSON.stringify({ state, version: 0 }));
      save('theme-storage', { preference: 'dark' });
      save('servers-storage', {
        servers: [
          {
            id: 'review',
            name: 'Studio workstation',
            host: '127.0.0.1',
            port: 18188,
            useSSL: 'Never',
            status: 'online',
          },
        ],
      });
      save('cp-workflows-v2', {
        assets: [
          { id: 'portrait', name: 'Portrait study', data: graph, createdAt: '2026-09-12', updatedAt: '2026-09-12' },
        ],
        bindings: [{ id: 'portrait-run', assetId: 'portrait', serverId: 'review', addMethod: 'file' }],
      });
      save('cp-environments-v2', {
        environments: [
          {
            id: 'flux',
            name: 'Flux studio',
            description: 'Image generation with FLUX',
            models: [
              {
                url: 'https://huggingface.co/black-forest-labs/FLUX.1-dev/resolve/main/flux1-dev.safetensors',
                pageUrl: 'https://huggingface.co/black-forest-labs/FLUX.1-dev',
                filename: 'flux1-dev.safetensors',
                type: 'diffusion_models',
              },
            ],
            extensions: ['https://github.com/ltdrdata/ComfyUI-Manager'],
            workflows: [{ name: 'Portrait study', data: graph }],
            createdAt: '2026-09-12',
            updatedAt: '2026-09-12',
          },
        ],
      });
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { readText: async () => JSON.stringify(graph) },
      });
    },
    { graph },
  );
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Open Studio workstation' })).toBeVisible();
  await shot(page, '02-servers');
  await page.getByRole('button', { name: 'Add server', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).hover();
  await shot(page, '04-add-server');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Open Studio workstation' }).click();
  await expect(page.getByText('RTX 4090', { exact: true })).toBeVisible();
  await shot(page, '05-server-workflows');
  await page.getByRole('button', { name: 'Server settings', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).hover();
  await shot(page, '14-server-settings');
  await page.getByRole('button', { name: 'Remove connection', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).last().hover();
  await shot(page, '15-remove-confirmation');
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Add workflow', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).hover();
  await shot(page, '16-import-source');
  await page.getByRole('button', { name: 'Paste from clipboard' }).click();
  await expect(page.getByRole('textbox', { name: 'Workflow name' })).toHaveValue('Imported workflow');
  await expect(page.getByRole('button', { name: 'Add workflow', exact: true })).toHaveCount(2);
  await page.getByRole('button', { name: 'Add workflow', exact: true }).last().hover();
  await shot(page, '17-import-review');
  await page.getByRole('button', { name: 'Add workflow', exact: true }).last().click();
  await expect(page.getByText('Workflow added', { exact: true }).first()).toBeVisible();
  await shot(page, '19-import-success');
  await page.goto('/gallery');
  // The empty state under review; unfiltered, so it covers both media kinds.
  await expect(page.getByText('No media yet', { exact: true })).toBeVisible();
  await shot(page, '21-gallery-empty');
  await page.goto('/explore');
  await expect(page.getByRole('button', { name: 'Open Flux studio' })).toBeVisible();
  await shot(page, '22-environments');
  await page.getByRole('button', { name: 'Open Flux studio' }).click();
  await expect(page.getByRole('heading', { name: 'Flux studio' })).toBeVisible();
  await shot(page, '23-environment-details');
  await page.getByRole('button', { name: 'Edit environment' }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).hover();
  await shot(page, '24-edit-environment');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  for (const [resource, label, row, number] of [
    ['models', 'Models', 'flux1-dev.safetensors', 25],
    ['extensions', 'Extensions', 'ComfyUI-Manager', 27],
    ['workflows', 'Workflows', 'Portrait study', 29],
  ] as const) {
    await page.goto(`/environments/flux/${resource}`);
    await expect(page.getByRole('heading', { name: label, exact: true })).toBeVisible();
    await shot(page, `${number}-${resource}`);
    await page.getByRole('button', { name: row, exact: true }).click();
    await page.getByRole('button', { name: /^Delete / }).hover();
    await shot(page, `${number + 1}-${resource}-details`);
  }
  await page.goto('/setting');
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await shot(page, '34-settings');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/workflow/review');
  await expect(page.getByText('RTX 4090', { exact: true })).toBeVisible();
  await shot(page, '38-server-375');
});

test('review first use and populated image galleries', async ({ page }) => {
  await installMockComfyServer(page);
  await page.addInitScript(() =>
    localStorage.setItem('theme-storage', JSON.stringify({ state: { preference: 'dark' }, version: 0 })),
  );
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Add server', exact: true })).toBeVisible();
  await shot(page, '01-first-use');
  const picture = 'http://localhost:8081/design-review-image.png';
  const bytes = await readFile('assets/workflows/basic.png');
  await page.route(picture, (route) => route.fulfill({ status: 200, contentType: 'image/png', body: bytes }));
  await page.evaluate(
    ({ picture }) => {
      localStorage.setItem(
        'servers-storage',
        JSON.stringify({
          state: {
            servers: [{ id: 'review', name: 'Studio workstation', host: '127.0.0.1', port: 18188, useSSL: 'Never' }],
          },
          version: 0,
        }),
      );
      localStorage.setItem(
        'cp-media-v2',
        JSON.stringify({
          state: {
            assets: Array.from({ length: 9 }, (_, i) => ({
              id: String(i),
              serverId: 'review',
              workflowId: 'portrait',
              kind: 'image',
              path: picture,
              metadata: { timestamp: '2026-09-12', originalUrl: picture, workflow: {} },
            })),
          },
          version: 0,
        }),
      );
    },
    { picture },
  );
  await page.goto('/gallery');
  await expect(page.getByRole('button', { name: 'Preview image', exact: true })).toHaveCount(9);
  await shot(page, '20-gallery');
  await page.getByRole('radio', { name: 'Videos', exact: true }).click();
  await expect(page.getByText('No videos yet', { exact: true })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Videos', exact: true })).toBeChecked();
  await page.getByRole('radio', { name: 'Images', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Preview image', exact: true })).toHaveCount(9);

  await page.getByRole('button', { name: 'Preview image', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Close preview' })).toBeVisible();
  await shot(page, '12-image-preview');
  await page.getByRole('button', { name: 'Close preview' }).click();
  await page.goto('/workflow/review');
  await page.getByRole('tab', { name: 'Gallery', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Preview image', exact: true })).toHaveCount(9);
  await shot(page, '11-server-gallery');
});

test('hardware filters and Next stay visible when the content scrolls', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 420 });
  await page.addInitScript(() => {
    localStorage.setItem(
      'cp-environments-v2',
      JSON.stringify({
        state: {
          environments: [
            {
              id: 'layout',
              name: 'Layout review',
              description: '',
              models: [],
              extensions: [],
              workflows: [],
              createdAt: '2026-09-12',
              updatedAt: '2026-09-12',
            },
          ],
        },
        version: 0,
      }),
    );
  });
  await page.goto('/cloud/launch?environmentId=layout');
  const next = page.getByRole('button', { name: 'Next', exact: true });
  const search = page.getByRole('textbox', { name: 'Search GPUs', exact: true });
  await expect(next).toBeVisible();
  await expect(next).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Refresh hardware', exact: true })).toHaveCount(0);
  const before = { next: await next.boundingBox(), search: await search.boundingBox() };
  expect(before.next!.y + before.next!.height).toBeLessThanOrEqual(420);
  await page.mouse.move(200, 265);
  await page.mouse.wheel(0, 600);
  await expect.poll(async () => Math.round((await next.boundingBox())!.y)).toBe(Math.round(before.next!.y));
  expect(Math.round((await search.boundingBox())!.y)).toBe(Math.round(before.search!.y));
  await shot(page, '31-hardware-compact');
});

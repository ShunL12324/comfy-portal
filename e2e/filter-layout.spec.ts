import { expect, test, type Locator, type Page } from '@playwright/test';
import { clearState } from './fixtures/app-state';
import { designColors, designTokens as t } from '../constants/design-tokens';

async function seedFilters(page: Page) {
  await clearState(page);
  await page.addInitScript(() => {
    const types = [
      'checkpoints',
      'loras',
      'vae',
      'text_encoders',
      'diffusion_models',
      'clip_vision',
      'controlnet',
      'upscale_models',
      'embeddings',
    ];
    const environment = {
      id: 'filters',
      name: 'Filter review',
      description: '',
      models: types.flatMap((type) =>
        Array.from({ length: 3 }, (_, index) => ({
          type,
          url: `https://example.com/${type}-${index}.safetensors`,
          label: `${type} model ${index}`,
        })),
      ),
      extensions: [],
      workflows: [],
      createdAt: '2026-09-12',
      updatedAt: '2026-09-12',
    };
    localStorage.setItem('cp-environments-v2', JSON.stringify({ state: { environments: [environment] }, version: 0 }));
    const picture =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    localStorage.setItem(
      'cp-media-v2',
      JSON.stringify({
        state: {
          assets: Array.from({ length: 9 }, (_, index) => ({
            id: String(index),
            serverId: 'filters',
            workflowId: 'portrait',
            kind: 'image',
            path: picture,
            metadata: { timestamp: '2026-09-12', originalUrl: picture, workflow: {} },
          })),
        },
        version: 0,
      }),
    );
  });
}

async function expectGap(upper: Locator, lower: Locator) {
  await expect
    .poll(async () => {
      const a = (await upper.boundingBox())!;
      const b = (await lower.boundingBox())!;
      return b.y - a.y - a.height;
    })
    .toBeCloseTo(t.layout.field, 0);
}

test('Models keeps filter height and result spacing for All, a category and empty results', async ({ page }) => {
  await seedFilters(page);
  for (const width of [320, 375, 430]) {
    await page.setViewportSize({ width, height: 420 });
    await page.goto('/environments/filters/models');
    const filters = page.getByRole('radiogroup', { name: 'Model type' });
    const list = page.getByTestId('environment-resource-list');
    await expect(page.getByRole('button', { name: 'checkpoints model 0', exact: true })).toBeVisible();
    const search = (await page
      .getByRole('textbox', { name: 'Search models', exact: true })
      .locator('..')
      .boundingBox())!;
    const row = (await page.getByRole('button', { name: 'checkpoints model 0', exact: true }).boundingBox())!;
    const boundary = (await filters.boundingBox())!;
    expect(boundary.x).toBeCloseTo(search.x, 0);
    expect(boundary.x + boundary.width).toBeCloseTo(search.x + search.width, 0);
    expect(boundary.x).toBeCloseTo(row.x, 0);
    expect(boundary.x + boundary.width).toBeCloseTo(row.x + row.width, 0);
    await expectGap(filters, list);
    const before = (await filters.boundingBox())!;
    expect(before.height).toBeGreaterThanOrEqual(t.height.touch);
    await page.getByRole('radio', { name: 'Checkpoint', exact: true }).click();
    await expect(page.getByRole('button', { name: 'loras model 0', exact: true })).toHaveCount(0);
    await expectGap(filters, list);
    expect((await filters.boundingBox())!.height).toBeCloseTo(before.height, 0);
    await page.getByRole('radio', { name: 'All', exact: true }).click();
    await expect(page.getByRole('button', { name: 'loras model 0', exact: true })).toBeVisible();
    await expectGap(filters, list);
    await page.getByRole('textbox', { name: 'Search models', exact: true }).fill('no matching model');
    await expect(list.getByRole('button')).toHaveCount(0);
    await expectGap(filters, list);
    expect((await filters.boundingBox())!.height).toBeCloseTo(before.height, 0);
  }
});

test('overflowing filters clip within their container and fade only toward hidden content', async ({ page }) => {
  await seedFilters(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/environments/filters/models');
  const filters = page.getByRole('radiogroup', { name: 'Model type' });
  await expect(filters).toHaveCSS('overflow', 'hidden');
  await expect(filters.getByTestId('filter-fade-right')).toHaveCSS('opacity', '1');
  await expect(filters.getByTestId('filter-fade-right').locator('stop').first()).toHaveAttribute(
    'stop-color',
    designColors.dark.paper,
  );
  await expect(filters.getByTestId('filter-fade-left')).toHaveCSS('opacity', '0');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  const scroll = filters.getByTestId('filter-scroll');
  const boundary = (await filters.boundingBox())!;
  const fade = (await filters.getByTestId('filter-fade-right').boundingBox())!;
  expect(fade.width).toBe(t.layout.inset);
  expect(fade.x + fade.width).toBeCloseTo(boundary.x + boundary.width, 0);
  expect(boundary.x).toBe(t.layout.gutter);
  expect(boundary.x + boundary.width).toBe(375 - t.layout.gutter);
  const escaped = await filters.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return [bounds.left - 1, bounds.right + 1].some((x) => {
      const target = document.elementFromPoint(x, bounds.top + bounds.height / 2);
      return target !== null && element.contains(target);
    });
  });
  expect(escaped).toBe(false);
  await scroll.evaluate((element) => {
    element.scrollLeft = 8;
  });
  await expect
    .poll(async () =>
      Number(await filters.getByTestId('filter-fade-left').evaluate((element) => getComputedStyle(element).opacity)),
    )
    .toBeCloseTo(7 / t.layout.inset, 2);
  await expect(filters.getByTestId('filter-fade-right')).toHaveCSS('opacity', '1');
  await scroll.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
  });
  await expect(filters.getByTestId('filter-fade-left')).toHaveCSS('opacity', '1');
  await expect(filters.getByTestId('filter-fade-right')).toHaveCSS('opacity', '0');
  await page.getByRole('radio', { name: 'Embedding', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Embedding', exact: true })).toBeChecked();
  await scroll.evaluate((element) => {
    element.scrollLeft = 0;
  });
  await expect(filters.getByTestId('filter-fade-left')).toHaveCSS('opacity', '0');
  await expect(filters.getByTestId('filter-fade-right')).toHaveCSS('opacity', '1');
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(filters.getByTestId('filter-fade-left')).toHaveCSS('opacity', '0');
  await expect(filters.getByTestId('filter-fade-right')).toHaveCSS('opacity', '0');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() =>
    localStorage.setItem('theme-storage', JSON.stringify({ state: { preference: 'light' }, version: 1 })),
  );
  await page.goto('/environments/filters/models');
  await expect(filters.getByTestId('filter-fade-right')).toHaveCSS('opacity', '1');
  await expect(filters.getByTestId('filter-fade-right').locator('stop').first()).toHaveAttribute(
    'stop-color',
    designColors.light.paper,
  );
});

test('Gallery and hardware selection keep the same results gap without redundant fades', async ({ page }) => {
  await seedFilters(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/gallery');
  const media = page.getByRole('radiogroup', { name: 'Media type' });
  await expect(page.getByRole('button', { name: 'Preview image', exact: true })).toHaveCount(9);
  await expectGap(media, page.getByRole('button', { name: 'Preview image', exact: true }).first());
  await expect(media.getByTestId('filter-fade-right')).toHaveCSS('opacity', '0');
  await expect(media.getByTestId('filter-fade-left')).toHaveCSS('opacity', '0');
  await page.getByRole('radio', { name: 'Videos', exact: true }).click();
  await expect(page.getByText('No videos yet', { exact: true })).toBeVisible();
  await page.getByRole('radio', { name: 'Images', exact: true }).click();
  await expectGap(media, page.getByRole('button', { name: 'Preview image', exact: true }).first());
  await page.goto('/cloud/launch?environmentId=filters');
  const hardware = page.getByRole('radiogroup', { name: 'Hardware provider' });
  const search = page.getByRole('textbox', { name: 'Search GPUs', exact: true }).locator('..');
  await expect(search).toBeVisible();
  await expectGap(search, page.getByTestId('refresh-content'));
  await expect(hardware.getByTestId('filter-fade-left')).toHaveCSS('opacity', '0');
  await expect(hardware.getByTestId('filter-fade-right')).toHaveCSS('opacity', '0');
});

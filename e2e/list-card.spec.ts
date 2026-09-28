import { expect, test, type Locator, type Page } from '@playwright/test';
import { clearState, seedServer, SERVER_ID } from './fixtures/app-state';
import { installMockComfyServer } from './fixtures/comfy-server';

/** Clicks the screen point at the centre of a region, so hit testing decides what receives it, as it does for a finger. */
async function tapCentre(page: Page, region: Locator) {
  const box = (await region.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

test('every region of a server card opens it, including its origin badge', async ({ page }) => {
  test.setTimeout(60_000);
  await clearState(page);
  await seedServer(page);
  await installMockComfyServer(page);
  await page.setViewportSize({ width: 393, height: 852 });
  const card = page.getByTestId('server-row').locator('..');
  for (const region of ['E2E Server', 'Manual']) {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Open E2E Server', exact: true })).toBeVisible();
    const badge = card.getByTestId('server-origin-badge');
    await expect(badge).toHaveCSS('border-top-width', '1px');
    const badgeBox = (await badge.boundingBox())!;
    const labelBox = (await badge.getByText('Manual', { exact: true }).boundingBox())!;
    expect(badgeBox.width).toBeGreaterThan(labelBox.width);
    expect(badgeBox.height).toBeGreaterThan(labelBox.height);
    await tapCentre(page, card.getByText(region, { exact: true }));
    await expect(page).toHaveURL(new RegExp(`/workflow/${SERVER_ID}$`));
  }
  for (const region of ['server-status-line', 'server-row-facts']) {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Open E2E Server', exact: true })).toBeVisible();
    await tapCentre(page, page.getByTestId(region));
    await expect(page).toHaveURL(new RegExp(`/workflow/${SERVER_ID}$`));
  }
});

test('an environment card opens its recipe, where creating an instance starts a launch', async ({ page }) => {
  await clearState(page);
  await page.addInitScript(() => {
    const environment = {
      id: 'card',
      name: 'Card review',
      description: '   ',
      models: [],
      extensions: [],
      workflows: [],
      createdAt: '2026-09-12T00:00:00.000Z',
      updatedAt: '2026-09-12T00:00:00.000Z',
    };
    localStorage.setItem('cp-environments-v2', JSON.stringify({ state: { environments: [environment] }, version: 0 }));
  });
  await page.setViewportSize({ width: 393, height: 852 });

  await page.goto('/explore');
  await expect(page.getByRole('button', { name: 'Open Card review', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Create instance/ })).toHaveCount(0);
  await expect(page.getByText('No description yet', { exact: true })).toBeVisible();
  await page.screenshot({ path: '.expo/design-review/app/environments-empty-description.png' });
  await tapCentre(page, page.getByTestId('environment-card').locator('..').getByText('Card review', { exact: true }));
  await expect(page).toHaveURL(/\/templates\/card$/);
  await page.getByRole('button', { name: 'Create instance', exact: true }).click();
  await expect(page).toHaveURL(/\/cloud\/launch\?environmentId=card$/);
});

test('server and environment cards share title and subtitle spacing', async ({ page }) => {
  await clearState(page);
  await seedServer(page);
  await installMockComfyServer(page);
  await page.addInitScript(() => {
    const environment = {
      id: 'geometry',
      name: 'Studio recipe',
      description: 'Shared card geometry',
      models: [],
      extensions: [],
      workflows: [],
      createdAt: '2026-09-12',
      updatedAt: '2026-09-12',
    };
    localStorage.setItem('cp-environments-v2', JSON.stringify({ state: { environments: [environment] }, version: 0 }));
  });
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Open E2E Server', exact: true })).toBeVisible();
  const serverCard = page.getByTestId('server-row').locator('..');
  const serverTitle = (await serverCard.getByText('E2E Server', { exact: true }).boundingBox())!;
  const endpoint = (await serverCard.getByText('127.0.0.1:18188', { exact: true }).boundingBox())!;
  const serverGap = endpoint.y - serverTitle.y - serverTitle.height;

  await page.getByRole('tab', { name: 'Environments', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open Studio recipe', exact: true })).toBeVisible();
  const environmentCard = page.getByTestId('environment-card').locator('..');
  const environmentTitle = (await environmentCard.getByText('Studio recipe', { exact: true }).boundingBox())!;
  const description = (await environmentCard.getByText('Shared card geometry', { exact: true }).boundingBox())!;
  await expect(page.getByText('No description yet', { exact: true })).toHaveCount(0);
  expect(environmentTitle.height).toBeCloseTo(serverTitle.height, 0);
  expect(description.height).toBeCloseTo(endpoint.height, 0);
  expect(description.y - environmentTitle.y - environmentTitle.height).toBeCloseTo(serverGap, 0);
  expect(description.x).toBeCloseTo(endpoint.x, 0);
  await page.screenshot({ path: '.expo/design-review/app/environments-card-spacing.png' });
});

test('environment footers show count labels without model sizes on compact phones', async ({ page }) => {
  await clearState(page);
  await page.addInitScript(() => {
    const base = {
      description: 'A reusable recipe',
      extensions: ['https://example.com/extension'],
      workflows: [{ name: 'Portrait', data: {} }],
      createdAt: '2026-09-12',
      updatedAt: '2026-09-12',
    };
    const model = { url: 'https://example.com/model.safetensors', type: 'checkpoints' };
    const environments = [
      { ...base, id: 'known', name: 'Known size', models: [{ ...model, sizeBytes: 12 * 1024 ** 3 }] },
      { ...base, id: 'unknown', name: 'Unknown size', models: [model] },
      { ...base, id: 'empty', name: 'No models', models: [] },
    ];
    localStorage.setItem('cp-environments-v2', JSON.stringify({ state: { environments }, version: 0 }));
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/explore');
  await expect(page.getByRole('button', { name: 'Open Known size', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Known size', exact: true })).toHaveAccessibleDescription(
    'A reusable recipe, 1 model, 1 extension, 1 workflow',
  );
  for (const width of [320, 375, 430]) {
    await page.setViewportSize({ width, height: 812 });
    const cards = page.getByTestId('environment-card').locator('..');
    const known = cards.filter({ has: page.getByText('Known size', { exact: true }) });
    const unknown = cards.filter({ has: page.getByText('Unknown size', { exact: true }) });
    const empty = cards.filter({ has: page.getByText('No models', { exact: true }) });
    await expect(known.getByText('12.0 GB', { exact: true })).toHaveCount(0);
    await expect(unknown.getByText('Size unavailable', { exact: true })).toHaveCount(0);
    const footers = page.getByTestId('environment-card-facts');
    await expect(footers).toHaveCount(3);
    const heights: number[] = [];
    for (let i = 0; i < 3; i++) {
      const footer = footers.nth(i);
      const model = (await footer.getByTestId('environment-model-count').boundingBox())!;
      const extensions = (await footer.getByTestId('environment-extension-count').boundingBox())!;
      const workflows = (await footer.getByTestId('environment-workflow-count').boundingBox())!;
      expect(extensions.y).toBeCloseTo(model.y, 0);
      expect(workflows.y).toBeCloseTo(model.y, 0);
      const bounds = (await footer.boundingBox())!;
      expect(model.x).toBeCloseTo(bounds.x, 0);
      expect(workflows.x + workflows.width).toBeCloseTo(bounds.x + bounds.width, 0);
      expect(extensions.x - model.x - model.width).toBeCloseTo(workflows.x - extensions.x - extensions.width, 0);
      await expect(footer.getByTestId('environment-model-count')).toHaveText(i === 2 ? '0models' : '1model');
      await expect(footer.getByTestId('environment-extension-count')).toHaveText('1extension');
      await expect(footer.getByTestId('environment-workflow-count')).toHaveText('1workflow');
      heights.push((await footer.boundingBox())!.height);
    }
    expect(heights[1]).toBeCloseTo(heights[0], 0);
    expect(heights[2]).toBeCloseTo(heights[0], 0);
    expect((await empty.boundingBox())!.height).toBeCloseTo((await known.boundingBox())!.height, 0);
  }
});

test('long environment names and descriptions are clipped without losing the full card name', async ({ page }) => {
  await clearState(page);
  const name = 'Very long environment name '.repeat(12);
  const description = 'A detailed reusable environment description '.repeat(20);
  await page.addInitScript(
    ({ name, description }) => {
      const environment = {
        id: 'long',
        name,
        description,
        models: [{ url: 'https://example.com/model.safetensors', type: 'checkpoints', sizeBytes: 12 * 1024 ** 3 }],
        extensions: [],
        workflows: [],
        createdAt: '2026-09-12',
        updatedAt: '2026-09-12',
      };
      localStorage.setItem(
        'cp-environments-v2',
        JSON.stringify({ state: { environments: [environment] }, version: 0 }),
      );
    },
    { name, description },
  );
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/explore');
  const button = page.getByRole('button', { name: `Open ${name.trim()}`, exact: true });
  await expect(button).toBeVisible();
  await expect(button).toHaveAccessibleDescription(new RegExp(description.trim()));
  const card = page.getByTestId('environment-card').locator('..');
  const title = card.getByText(name.trim(), { exact: true });
  const subtitle = card.getByText(description.trim(), { exact: true });
  await expect(title).toHaveCSS('text-overflow', 'ellipsis');
  expect(await title.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  expect((await title.boundingBox())!.height).toBeLessThanOrEqual(20);
  expect((await subtitle.boundingBox())!.height).toBeLessThanOrEqual(32);
  const bounds = (await card.boundingBox())!;
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(375);
  await button.click();
  await expect(page).toHaveURL(/\/templates\/long$/);
});

test('the environment create action stays fixed while recipe content scrolls', async ({ page }) => {
  await clearState(page);
  await page.addInitScript(() => {
    const environment = {
      id: 'scrolling',
      name: 'Long recipe',
      description: 'Recipe notes\n'.repeat(120),
      models: [],
      extensions: [],
      workflows: [],
      createdAt: '2026-09-12',
      updatedAt: '2026-09-12',
    };
    localStorage.setItem('cp-environments-v2', JSON.stringify({ state: { environments: [environment] }, version: 0 }));
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/templates/scrolling');
  const create = page.getByRole('button', { name: 'Create instance', exact: true });
  await expect(create).toBeVisible();
  const before = (await create.boundingBox())!;
  expect(before.y).toBeGreaterThan(700);
  expect(before.y + before.height).toBeLessThanOrEqual(812);
  const content = page.getByTestId('environment-content');
  await content.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect.poll(() => content.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  const after = (await create.boundingBox())!;
  expect(after.y).toBeCloseTo(before.y, 0);
  await create.click();
  await expect(page).toHaveURL(/\/cloud\/launch\?environmentId=scrolling$/);
});

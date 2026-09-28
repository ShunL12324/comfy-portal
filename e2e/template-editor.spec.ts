import { expect, test } from '@playwright/test';
import { clearState } from './fixtures/app-state';
test('an environment can be authored, edited and reused without renting hardware', async ({ page }) => {
  await clearState(page);
  await page.goto('/explore');
  await page.getByRole('button', { name: 'Create environment', exact: true }).click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Image studio');
  const description = page.getByRole('textbox', { name: 'Description', exact: true });
  await expect(description).toHaveJSProperty('tagName', 'TEXTAREA');
  await description.fill('Reusable image recipe\nIncludes portrait workflows');
  await page.getByRole('button', { name: 'Create environment', exact: true }).last().click();
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem('cp-environments-v2')!).state.environments[0].description),
    )
    .toBe('Reusable image recipe\nIncludes portrait workflows');
  await page.getByRole('button', { name: 'Extensions', exact: true }).click();
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Add extensions', exact: true }).click();
    await page.getByRole('textbox', { name: 'GitHub repository URL' }).fill('https://github.com/example/nodes');
    await page.getByRole('button', { name: 'Add extension', exact: true }).click();
  }
  await expect(page.getByRole('button', { name: 'nodes', exact: true })).toHaveCount(1);
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('cp-environments-v2')!).state);
  expect(state.environments).toHaveLength(1);
  expect(state.environments[0].extensions).toEqual(['https://github.com/example/nodes']);
  expect(state.environments[0]).not.toHaveProperty('gpuQuery');
  await page.getByRole('button', { name: 'Go back', exact: true }).click();
  await page.getByRole('button', { name: 'Edit environment', exact: true }).click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Studio revised');
  await expect(description).toHaveJSProperty('tagName', 'TEXTAREA');
  await expect(description).toHaveValue('Reusable image recipe\nIncludes portrait workflows');
  await description.fill('Updated recipe\nKeeps multiple lines');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Studio revised', exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem('cp-environments-v2')!).state.environments[0].description),
    )
    .toBe('Updated recipe\nKeeps multiple lines');
});

test('workspace, template library and settings fit compact and wide layouts', async ({ page }) => {
  await clearState(page);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const width of [375, 430, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ['/', '/explore', '/setting']) {
      await page.goto(route);
      await expect(page.getByRole('heading').first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  }
  expect(errors).toEqual([]);
});

test('business selectors reopen after selection and dismissal', async ({ page }) => {
  await clearState(page);
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto('/settings/ai-assistant');
  await page.getByRole('button', { name: /^Provider:/ }).click();
  const search = page.getByTestId('selector-search');
  const option = page.getByRole('button', { name: 'OpenAI', exact: true });
  await option.click({ trial: true });
  const [searchBounds, optionBounds] = await Promise.all([search.boundingBox(), option.boundingBox()]);
  expect(optionBounds!.y - searchBounds!.y - searchBounds!.height).toBeCloseTo(16, 0);
  await expect(
    page.getByRole('button', { name: 'Anthropic', exact: true }).getByText('Anthropic', { exact: true }),
  ).toHaveCSS('color', 'rgb(244, 244, 245)');
  await page.getByPlaceholder('Search...').fill('Anthropic');
  await expect(option).toHaveCount(0);
  await page.getByRole('button', { name: 'Anthropic', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Anthropic', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /^Provider:/ }).click();
  await expect(page.getByPlaceholder('Search...')).toHaveValue('');
  await page.getByRole('button', { name: 'OpenAI', exact: true }).click();
  await expect(page.getByRole('button', { name: 'OpenAI', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Provider: OpenAI/ })).toBeVisible();
});

test('environment model type uses the shared selector inside the add sheet', async ({ page }) => {
  await clearState(page);
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto('/explore');
  await page.getByRole('button', { name: 'Create environment', exact: true }).click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Selector recipe');
  await page.getByRole('button', { name: 'Create environment', exact: true }).last().click();
  await page.getByRole('button', { name: 'Models', exact: true }).click();
  await page.getByRole('button', { name: 'Add models', exact: true }).click();
  await page.getByRole('button', { name: /^Model type:/ }).click();
  const title = page.getByTestId('selector-title-row').filter({ visible: true }).last();
  const first = page.getByTestId('selector-option-checkpoints');
  await first.click({ trial: true });
  const [titleBounds, firstBounds] = await Promise.all([title.boundingBox(), first.boundingBox()]);
  expect(firstBounds!.y - titleBounds!.y - titleBounds!.height).toBeCloseTo(16, 0);
  await page.getByRole('button', { name: 'VAE', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Model type: VAE', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Add models', exact: true })).toBeVisible();
});

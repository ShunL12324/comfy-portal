import { test, expect } from '@playwright/test';
test.use({ viewport: { width: 393, height: 852 } });
test('environment creation, resource editing and repeated sheets', async ({ page }) => {
  await page.goto('/explore');
  await page.getByRole('button', { name: 'Create environment', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'New environment' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Test studio');
  await page.getByRole('textbox', { name: 'Description', exact: true }).fill('A portable environment');
  await page.getByRole('button', { name: 'Create environment', exact: true }).last().click();
  await expect(page.getByRole('heading', { name: 'Test studio' })).toBeVisible();
  await page.getByRole('button', { name: 'Extensions', exact: true }).click();
  await page.getByRole('button', { name: 'Add extensions', exact: true }).click();
  await page.getByRole('textbox', { name: 'GitHub repository URL' }).fill('https://github.com/example/custom-nodes');
  await page.getByRole('button', { name: 'Add extension', exact: true }).click();
  await page.getByRole('button', { name: 'custom-nodes', exact: true }).click();
  await expect(page.getByText('Extension details', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Bottom sheet backdrop' }).click();
  await page.getByRole('button', { name: 'custom-nodes', exact: true }).click();
  await expect(page.getByText('Extension details', { exact: true })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('cp-environments-v2')!).state.environments[0]);
  expect(saved).toMatchObject({ name: 'Test studio', description: 'A portable environment', extensions: ['https://github.com/example/custom-nodes'] });
  expect(saved).not.toHaveProperty('disk');
  expect(saved).not.toHaveProperty('gpuQuery');
  await page.screenshot({ path: 'test-results/environment-details.png' });
});
test('four approved tabs and empty Gallery', async ({ page }) => {
  await page.goto('/');
  for (const name of ['Servers', 'Gallery', 'Environments', 'Settings']) await expect(page.getByRole('tab', { name, exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Gallery', exact: true }).click();
  // One grid holds images and videos, so the unfiltered empty state says media.
  await expect(page.getByText('No media yet', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Videos', exact: true })).toHaveCount(0);
  await page.screenshot({ path: 'test-results/gallery-empty.png' });
});

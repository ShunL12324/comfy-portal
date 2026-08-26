import { expect, test } from '@playwright/test';
import { clearState } from './fixtures/app-state';

/**
 * The regression this exists for: the web target was completely broken for an
 * unknown length of time — every route 500'd because a shim dropped an export
 * and a hook threw before first paint. Nothing caught it, because nothing ran
 * the web build. A test that only asserts "the app boots with a clean console"
 * would have.
 */
test.describe('boot', () => {
  test('renders the servers screen with no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await clearState(page);
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Servers' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Server' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('shows the empty state before any server is added', async ({ page }) => {
    await clearState(page);
    await page.goto('/');

    await expect(page.getByText(/Add Server button above to connect/)).toBeVisible();
  });
});

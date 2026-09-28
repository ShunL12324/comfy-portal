import { test, expect } from '@playwright/test';
import { designTokens } from '../constants/design-tokens';

test.use({ viewport: { width: 393, height: 852 } });
test('tab indicator stretches, settles, and follows rapid direction changes', async ({ page }) => {
  await page.goto('/');
  const indicator = page.getByTestId('tab-indicator');
  await expect(indicator).toBeVisible();
  const center = async () => { const box = (await indicator.boundingBox())!; return box.x + box.width / 2; };
  await expect.poll(center).toBeCloseTo(393 / 8, 0);
  await page.evaluate(() => {
    const samples: number[] = [];
    (window as any).__indicatorWidths = samples;
    const end = performance.now() + 1500;
    const frame = () => {
      const node = document.querySelector('[data-testid="tab-indicator"]');
      if (node) samples.push(node.getBoundingClientRect().width);
      if (performance.now() < end) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  await page.getByRole('tab', { name: 'Settings', exact: true }).click();
  await expect.poll(center).toBeCloseTo(393 * 7 / 8, 0);
  await expect.poll(async () => (await indicator.boundingBox())!.width).toBeCloseTo(16, 0);
  expect(await page.evaluate(() => Math.max(...(window as any).__indicatorWidths))).toBeGreaterThan(20);
  await page.getByRole('tab', { name: 'Servers', exact: true }).click();
  await page.getByRole('tab', { name: 'Environments', exact: true }).click();
  await page.getByRole('tab', { name: 'Gallery', exact: true }).click();
  await expect.poll(center).toBeCloseTo(393 * 3 / 8, 0);
  await expect.poll(async () => (await indicator.boundingBox())!.width).toBeCloseTo(16, 0);
  await expect(indicator).toHaveCSS('border-radius', `${designTokens.radius.pill}px`);
});

import { test, expect } from '@playwright/test';
import { clearState } from './fixtures/app-state';
test.use({ viewport: { width: 393, height: 852 } });

test('fixed actions travel with the sheet on opening and closing', async ({ page }) => {
  await clearState(page);
  await page.goto('/');
  async function startCapture() {
    await page.evaluate(() => {
      (window as any).__footerMotion = [];
      let end = performance.now() + 5000;
      let observed = false;
      function sample() {
        const title = document.querySelector('[data-testid="add-server-sheet-title"]');
        const footer = document.querySelector('[data-testid="sheet-fixed-actions"]');
        if (title && footer) {
          const t = title.getBoundingClientRect(); const f = footer.getBoundingClientRect();
          if (t.height > 0 && f.height > 0 && t.y > 0 && t.y < innerHeight - 30) {
            if (!observed) { observed = true; end = performance.now() + 900; }
            (window as any).__footerMotion.push({ title: t.y, footer: f.y, gap: f.y - t.y });
          }
        }
        if (performance.now() < end) requestAnimationFrame(sample);
        else (window as any).__footerMotionDone = true;
      }
      (window as any).__footerMotionDone = false;
      requestAnimationFrame(sample);
    });
  }
  async function checkCapture() {
    await page.waitForFunction(() => (window as any).__footerMotionDone);
    const samples = await page.evaluate(() => (window as any).__footerMotion as { title: number; footer: number; gap: number }[]);
    expect(samples.length).toBeGreaterThan(3);
    // Ignore overscroll above the final detent, where the footer deliberately stays keyboard-safe.
    const lowestTitle = Math.min(...samples.map(s => s.title));
    const moving = samples.filter(s => s.title > lowestTitle + 2);
    expect(moving.length).toBeGreaterThan(2);
    expect(Math.max(...moving.map(s => s.gap)) - Math.min(...moving.map(s => s.gap))).toBeLessThan(2);
  }
  await startCapture();
  await page.getByRole('button', { name: 'Add server', exact: true }).click();
  await checkCapture();
  await startCapture();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await checkCapture();
  await expect(page.getByTestId('sheet-fixed-actions')).toHaveCount(0);
});

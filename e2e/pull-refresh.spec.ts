import { expect, test } from '@playwright/test';
import { REFRESH_ARTWORKS } from '../assets/illustrations/refresh-artworks';
import { clearState, SEEDED_THEME, seedServer } from './fixtures/app-state';
import { installMockComfyServer } from './fixtures/comfy-server';

/**
 * Where a dot group comes to rest, per portrait-refresh-art.tsx:
 * `target = dark ? tone : 1 - tone`. Deriving it instead of asserting a literal
 * keeps these checks true under either theme, which is what design.md:122
 * ("correct tonal polarity in both themes") actually claims.
 */
function settledOpacity(artworkId: string | null) {
  const artwork = REFRESH_ARTWORKS.find((candidate) => candidate.id === artworkId);
  if (!artwork) throw new Error(`No bundled artwork named ${artworkId}`);
  const tone = artwork.groups[0].tone;
  return SEEDED_THEME === 'dark' ? tone : 1 - tone;
}

test('pull feedback follows dragging and settles after release', async ({ page }) => {
  await clearState(page);
  await seedServer(page);
  await installMockComfyServer(page);
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Open E2E Server' })).toBeVisible();
  const content = page.getByTestId('refresh-content');
  const offset = () => content.evaluate(el => new DOMMatrix(getComputedStyle(el).transform).m42);
  const box = (await content.boundingBox())!;
  await page.mouse.move(box.x + 180, box.y + 160);
  await page.mouse.down();
  await page.mouse.move(box.x + 180, box.y + 200, { steps: 8 });
  await expect.poll(offset).toBeGreaterThan(5);
  await page.mouse.up();
  await expect.poll(offset).toBe(0);
  await page.mouse.move(box.x + 180, box.y + 160);
  await page.mouse.down();
  await page.mouse.move(box.x + 180, box.y + 330, { steps: 16 });
  await expect.poll(offset).toBeGreaterThan(60);
  await page.screenshot({ path: '.expo/design-review/app/refresh-drag.png' });
  const selectedArtwork = await page.getByTestId('refresh-portrait').getAttribute('aria-label');
  const releasedAt = Date.now();
  await page.mouse.up();
  await expect.poll(offset).toBeCloseTo(48, 0);
  await expect(page.getByTestId('refresh-portrait')).toHaveCount(1);
  await expect(page.getByTestId('refresh-portrait-dots')).toHaveCount(16);
  const ink = page.getByTestId('refresh-portrait-dots').first();
  await expect(ink).toHaveAttribute('opacity', String(settledOpacity(selectedArtwork)));
  await expect(page.getByTestId('refresh-portrait')).toHaveAttribute('aria-label', selectedArtwork!);
  await page.screenshot({ path: '.expo/design-review/app/refresh-portrait.png' });
  await expect.poll(offset, { timeout: 15000 }).toBe(0);
  expect(Date.now() - releasedAt).toBeGreaterThanOrEqual(700);
  await expect(page.getByTestId('refresh-indicator')).toHaveCSS('opacity', '0');
  await page.mouse.move(box.x + 180, box.y + 160);
  await page.mouse.down();
  await page.mouse.move(box.x + 180, box.y + 330, { steps: 16 });
  await expect(page.getByTestId('refresh-portrait')).not.toHaveAttribute('aria-label', selectedArtwork!);
  await page.mouse.up();
  await expect.poll(offset, { timeout: 15000 }).toBe(0);
});

test('a pending refresh generates different portraits continuously and stops when settled', async ({ page }) => {
  await clearState(page);
  await seedServer(page);
  await installMockComfyServer(page);
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Open E2E Server' })).toBeVisible();
  let finish!: () => void;
  const pending = new Promise<void>(resolve => { finish = resolve; });
  await page.route('**:18188/system_stats', async route => {
    await pending;
    await route.fallback();
  });
  const content = page.getByTestId('refresh-content');
  const box = (await content.boundingBox())!;
  await page.mouse.move(box.x + 180, box.y + 160);
  await page.mouse.down();
  await page.mouse.move(box.x + 180, box.y + 330, { steps: 16 });
  const art = page.getByTestId('refresh-portrait');
  const first = await art.getAttribute('aria-label');
  await page.mouse.up();
  const seen = new Set([first]);
  for (let i = 0; i < 3; i++) {
    await expect.poll(async () => Number(await page.getByTestId('refresh-portrait-dots').first().getAttribute('opacity')), { intervals: [30] }).toBe(settledOpacity(await art.getAttribute('aria-label')));
    await expect.poll(async () => art.getAttribute('aria-label'), { intervals: [30] }).not.toBe([...seen].at(-1));
    const current = await art.getAttribute('aria-label');
    expect(seen.has(current)).toBe(false);
    seen.add(current);
    await expect.poll(() => content.evaluate(el => new DOMMatrix(getComputedStyle(el).transform).m42)).toBeCloseTo(48, 0);
  }
  finish();
  await expect(page.getByTestId('refresh-indicator')).toHaveCSS('opacity', '0');
  const last = await art.getAttribute('aria-label');
  await page.waitForTimeout(1200);
  await expect(art).toHaveAttribute('aria-label', last!);
});

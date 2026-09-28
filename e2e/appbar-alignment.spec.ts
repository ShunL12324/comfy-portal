import { test, expect } from '@playwright/test';

test('AppBar visual edges share the content grid at phone and wide widths', async ({ page }) => {
  test.setTimeout(60000);
  await page.addInitScript(() => {
    localStorage.setItem(
      'cp-environments-v2',
      JSON.stringify({
        state: {
          environments: [
            {
              id: 'alignment',
              name: 'Alignment review',
              description: '',
              models: [],
              extensions: [],
              workflows: [],
              createdAt: '2026-09-12T00:00:00.000Z',
              updatedAt: '2026-09-12T00:00:00.000Z',
            },
          ],
        },
        version: 0,
      }),
    );
  });
  for (const width of [375, 430, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/', '/explore', '/templates/alignment', '/environments/alignment/models', '/setting']) {
      await page.goto(route);
      const bar = page.getByTestId('app-bar').first();
      await expect(bar).toBeVisible();
      await expect
        .poll(
          async () =>
            bar.evaluate((element) => {
              const bounds = element.getBoundingClientRect();
              const visible = (selector: string) =>
                Array.from(element.querySelectorAll(selector)).find((node) => node.getBoundingClientRect().width > 0);
              const leading = visible('[data-testid="app-bar-leading"]');
              const trailing = visible('[data-testid="app-bar-trailing"]');
              const heading = visible('h1,h2,h3,h4,h5,h6,[role="heading"]');
              if (!heading) return false;
              const aligned = (actual: number, expected: number) => Math.abs(actual - expected) <= 1;
              if (!aligned(heading.getBoundingClientRect().x, bounds.x + (leading ? 52 : 20))) return false;
              if (leading) {
                const icon = visible('[data-testid="app-bar-leading"] svg');
                const button = visible(
                  '[data-testid="app-bar-leading"] [role="button"], [data-testid="app-bar-leading"] button',
                );
                if (!icon || !button) return false;
                if (!aligned(icon.getBoundingClientRect().x, bounds.x + 20)) return false;
                const hit = button.getBoundingClientRect();
                if (hit.width < 44 || hit.height < 44) return false;
              }
              if (trailing) {
                const icon = visible('[data-testid="app-bar-trailing"] svg');
                if (!icon) return false;
                const surface = visible('[data-testid="app-bar-trailing"] [data-testid="button-surface"]');
                if (surface && getComputedStyle(surface).backgroundColor !== 'rgba(0, 0, 0, 0)') {
                  const face = surface.getBoundingClientRect();
                  const glyph = icon.getBoundingClientRect();
                  if (!aligned(face.right, bounds.right - 24)) return false;
                  if (!aligned(glyph.x + glyph.width / 2, face.x + face.width / 2)) return false;
                } else if (!aligned(icon.getBoundingClientRect().right, bounds.right - 20)) return false;
              }
              return true;
            }),
          { message: `${route} at ${width}px`, timeout: 15000 },
        )
        .toBe(true);
    }
  }
});

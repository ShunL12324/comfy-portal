import { expect, test, type Locator } from '@playwright/test';
import { clearState, seedServer, SERVER_ID } from './fixtures/app-state';
import { installMockComfyServer } from './fixtures/comfy-server';
import { designColors } from '../constants/design-tokens';

const rgb = (hex: string) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;

async function expectSurface(target: Locator, color: string) {
  await expect(target).toBeVisible();
  await expect
    .poll(() =>
      target.evaluate((element) => {
        // The shared list-card button overlays its painted parent; fields and
        // resource rows paint themselves. Resolve the actual visible surface.
        let current: Element | null = element;
        while (current) {
          const fill = getComputedStyle(current).backgroundColor;
          if (fill !== 'rgba(0, 0, 0, 0)' && fill !== 'transparent') return fill;
          current = current.parentElement;
        }
        return 'transparent';
      }),
    )
    .toBe(rgb(color));
}

for (const mode of ['light', 'dark'] as const) {
  test(`${mode} uses consistent content surfaces and recessed editing controls`, async ({ page }) => {
    test.setTimeout(90_000);
    await clearState(page);
    await seedServer(page);
    await installMockComfyServer(page);
    await page.addInitScript((theme) => {
      localStorage.setItem('theme-storage', JSON.stringify({ state: { preference: theme }, version: 1 }));
      const graph = { '1': { class_type: 'CLIPTextEncode', inputs: { text: 'Portrait' } } };
      const environment = {
        id: 'surface',
        name: 'Surface review',
        description: 'Reusable recipe',
        models: [{ type: 'checkpoints', label: 'Portrait model', url: 'https://example.com/portrait.safetensors' }],
        extensions: [],
        workflows: [{ name: 'Portrait', data: graph }],
        createdAt: '2026-09-27',
        updatedAt: '2026-09-27',
      };
      localStorage.setItem(
        'cp-environments-v2',
        JSON.stringify({ state: { environments: [environment] }, version: 0 }),
      );
      localStorage.setItem(
        'cp-workflows-v2',
        JSON.stringify({
          state: {
            assets: [
              { id: 'portrait', name: 'Portrait', data: graph, createdAt: '2026-09-27', updatedAt: '2026-09-27' },
            ],
            bindings: [{ id: 'portrait-run', assetId: 'portrait', serverId: 'e2e-server', addMethod: 'file' }],
          },
          version: 0,
        }),
      );
    }, mode);
    await page.setViewportSize({ width: 375, height: 812 });
    const c = designColors[mode];
    await page.goto('/');
    await expectSurface(page.getByTestId('server-row'), c.card);
    await expectSurface(page.getByRole('textbox', { name: 'Search servers', exact: true }), c.well);
    await expectSurface(page.getByRole('heading', { name: 'Servers', exact: true }), c.paper);
    await expect(page.getByTestId('server-row')).toHaveCSS(
      '--color-card',
      c.card === '#ffffff' ? '255 255 255' : '27 27 29',
    );

    await page.goto('/explore');
    await expectSurface(page.getByTestId('environment-card'), c.card);
    await expectSurface(page.getByRole('textbox', { name: 'Search environments', exact: true }), c.well);
    await page.goto('/templates/surface');
    await expectSurface(page.getByRole('button', { name: 'Models', exact: true }), c.card);
    await page.goto('/environments/surface/models');
    await expectSurface(page.getByRole('button', { name: 'Portrait model', exact: true }), c.card);
    await expectSurface(page.getByRole('textbox', { name: 'Search models', exact: true }), c.well);
    await page.goto(`/workflow/${SERVER_ID}`);
    await expectSurface(page.getByRole('textbox', { name: 'Search workflows', exact: true }), c.well);
    await expect(page.getByTestId('server-overview')).toHaveCount(0);
    await expectSurface(page.getByRole('button', { name: 'Open Portrait', exact: true }), c.card);

    // Change theme without a document reload: token consumers and provider
    // variables must update together after returning to the server list.
    await page.goto('/setting');
    await page.getByRole('button', { name: `Theme: ${mode === 'light' ? 'Light' : 'Dark'}. Switch theme` }).click();
    if (mode === 'dark') await page.getByRole('button', { name: 'Theme: System. Switch theme' }).click();
    await page.getByRole('tab', { name: 'Servers', exact: true }).click();
    const next = designColors[mode === 'light' ? 'dark' : 'light'];
    await expectSurface(page.getByTestId('server-row'), next.card);
    await expectSurface(page.getByRole('textbox', { name: 'Search servers', exact: true }), next.well);
  });
}

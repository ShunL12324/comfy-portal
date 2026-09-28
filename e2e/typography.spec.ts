import { expect, test, type Page } from '@playwright/test';
import { clearState, seedServer, SERVER_ID } from './fixtures/app-state';
import { CHECKPOINTS, installMockComfyServer } from './fixtures/comfy-server';

async function seedTypographyPages(page: Page, theme: string) {
  await clearState(page);
  await seedServer(page);
  await installMockComfyServer(page);
  await page.addInitScript(
    ({ theme, checkpoint }) => {
      const save = (key: string, state: unknown, version = 0) =>
        localStorage.setItem(key, JSON.stringify({ state, version }));
      save('theme-storage', { preference: theme }, 1);
      const data = {
        '1': {
          class_type: 'CheckpointLoaderSimple',
          inputs: { ckpt_name: checkpoint },
          _meta: { title: 'Checkpoint' },
        },
        '2': {
          class_type: 'EmptyLatentImage',
          inputs: { width: 512, height: 512, batch_size: 1 },
          _meta: { title: 'Canvas' },
        },
        '3': { class_type: 'CLIPTextEncode', inputs: { text: 'A portrait' }, _meta: { title: 'Prompt' } },
      };
      save('cp-workflows-v2', {
        assets: [
          { id: 'type-asset', name: 'Typography workflow', data, createdAt: '2026-09-27', updatedAt: '2026-09-27' },
        ],
        bindings: [{ id: 'type-run', assetId: 'type-asset', serverId: 'e2e-server', addMethod: 'file' }],
      });
      const environment = {
        id: 'studio',
        name: 'Studio recipe',
        description: 'Reusable workflow environment',
        models: [
          { filename: 'portrait.safetensors', type: 'checkpoints', url: 'https://example.invalid/model.safetensors' },
        ],
        extensions: ['https://github.com/example/nodes'],
        workflows: [{ name: 'Typography workflow', data }],
        createdAt: '2026-09-27',
        updatedAt: '2026-09-27',
      };
      save('cp-environments-v2', { environments: [environment] });
      save('gpu-provisioning', {
        launches: [
          {
            id: 'vast:type-setup',
            provider: 'vast',
            instanceId: 'type-setup',
            environmentId: 'studio',
            environmentName: 'Studio recipe',
            environmentSnapshot: environment,
            token: 'fixture',
            stage: 'failed',
            startedAt: 0,
            pricePerHour: 0,
          },
        ],
      });
      save(
        'ai-assistant-storage',
        {
          provider: { id: 'fixture', type: 'openai', name: 'OpenAI', apiKey: 'fixture', modelName: 'fixture-model' },
          customPrompt: '',
        },
        1,
      );
      save(
        'chat-sessions-storage',
        {
          sessions: {
            'e2e-server:type-run': {
              lastUpdated: Date.now(),
              messages: [
                {
                  id: 'answer',
                  role: 'assistant',
                  parts: [
                    {
                      type: 'text',
                      text: 'Normal text **Bold text** _Italic text_ **_Combined emphasis_** `machine_code`',
                    },
                  ],
                },
              ],
            },
          },
        },
        1,
      );
    },
    { theme, checkpoint: CHECKPOINTS[0] },
  );
}

async function assertManagedFonts(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  const sample = await page.evaluate(() => {
    const loaded = new Set(Array.from(document.fonts, (font) => font.family.replaceAll('"', '')));
    const samples = Array.from(document.querySelectorAll<HTMLElement>('body *'))
      .filter(
        (el) =>
          !el.closest('svg, [aria-hidden="true"]') &&
          (Array.from(el.childNodes).some((child) => child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) ||
            el.tagName === 'TEXTAREA' ||
            (el.tagName === 'INPUT' &&
              ['text', 'password', 'search', 'email', 'url', 'tel', 'number'].includes((el as HTMLInputElement).type))),
      )
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        const css = getComputedStyle(el);
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          rect.bottom > 0 &&
          rect.top < innerHeight &&
          css.visibility !== 'hidden' &&
          css.display !== 'none'
        );
      })
      .map((el) => {
        const css = getComputedStyle(el);
        return {
          text: (el.textContent || (el as HTMLInputElement).placeholder || el.tagName).trim().slice(0, 70),
          family: css.fontFamily.replaceAll('"', ''),
          weight: css.fontWeight,
          style: css.fontStyle,
          size: css.fontSize,
          lineHeight: css.lineHeight,
        };
      });
    return { loaded: [...loaded], samples };
  });
  expect(sample.samples.length).toBeGreaterThan(0);
  const allowed = /^(Inter(?:Medium|SemiBold|Bold)?(?:Italic)?|Newsreader(?:Italic|SemiBold)?|SpaceMono)$/;
  expect(sample.samples.filter((s) => !allowed.test(s.family) || s.weight !== '400' || s.style !== 'normal')).toEqual(
    [],
  );
  expect(sample.samples.filter((s) => !sample.loaded.includes(s.family))).toEqual([]);
  expect(
    sample.samples.filter((s) => !['10px', '11px', '12px', '13px', '14px', '20px', '26px'].includes(s.size)),
  ).toEqual([]);
}

for (const theme of ['light', 'dark']) {
  for (const width of [375, 1024]) {
    test(`${theme} ${width}: production pages and sheets use loaded typography roles`, async ({ page }) => {
      test.setTimeout(180_000);
      await page.setViewportSize({ width, height: 900 });
      await seedTypographyPages(page, theme);
      const routes = [
        ['/', 'Servers'],
        ['/explore', 'Environments'],
        ['/gallery', 'Gallery'],
        ['/setting', 'Settings'],
        [`/workflow/${SERVER_ID}`, 'E2E Server'],
        ['/templates/studio', 'Studio recipe'],
        ['/environments/studio/models', 'Models'],
        ['/environments/studio/extensions', 'Extensions'],
        ['/environments/studio/workflows', 'Workflows'],
        ['/settings/ai-assistant', 'AI Assistant'],
        ['/settings/cloud-gpu', 'Cloud accounts'],
        ['/settings/cloud-gpu/instances', 'Cloud instances'],
        ['/cloud/launch?environmentId=studio', 'Create instance'],
        ['/cloud/launch-status/vast%3Atype-setup', 'Setup'],
        [`/workflow/${SERVER_ID}/run/history?workflowId=type-run`, 'History'],
      ];
      for (const [route, title] of routes) {
        await page.goto(route);
        await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
        await expect(page.getByRole('heading', { name: title, exact: true })).toHaveCSS('font-family', 'Newsreader');
        await assertManagedFonts(page);
      }
      await page.goto('/templates/studio');
      await page.getByRole('button', { name: 'Edit environment', exact: true }).click();
      await expect(page.getByRole('textbox', { name: 'Description', exact: true })).toHaveCSS('font-family', 'Inter');
      await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toHaveCSS('font-weight', '400');
      await assertManagedFonts(page);
      await page.goto(`/workflow/${SERVER_ID}/run/type-run`);
      await expect(page.getByPlaceholder('Search nodes...')).toHaveCSS('font-family', 'Inter');
      await assertManagedFonts(page);
      await page.getByRole('tab', { name: 'Assistant', exact: true }).click();
      await expect(page.getByText('Bold text', { exact: true })).toHaveCSS('font-family', 'InterBold');
      await expect(page.getByText('Italic text', { exact: true })).toHaveCSS('font-family', 'InterItalic');
      await expect(page.getByText('Combined emphasis', { exact: true })).toHaveCSS('font-family', 'InterBoldItalic');
      await expect(page.getByText('machine_code', { exact: true })).toHaveCSS('font-family', 'SpaceMono');
      await assertManagedFonts(page);
      // Guide/legal body content is an external website; audit application chrome.
      for (const [route, title] of [
        ['/guide', 'Connection guide'],
        ['/legal/privacy', 'Privacy policy'],
        ['/legal/terms', 'Terms of service'],
      ]) {
        await page.goto(route);
        await expect(page.getByRole('heading', { name: title, exact: true })).toHaveCSS('font-family', 'Newsreader');
      }
    });
  }
}

import { expect, test } from '@playwright/test';
import { clearState, seedServer, SERVER_ID } from './fixtures/app-state';
import { CHECKPOINTS, installMockComfyServer } from './fixtures/comfy-server';

/**
 * Every node toggle now goes through `components/ui/design-system/native-controls`.
 * These cover the parameter contract that unification had to preserve: an
 * enum segment writes the option it names, and an enable/disable switch still
 * round-trips the ComfyUI string rather than a boolean.
 *
 * Segments share the Gluestack rendering across platforms. iOS retains the
 * native switch integration, which is also checked on the simulator.
 */

const WORKFLOW_KEY = 'cp-workflows-v2';

async function seedWorkflow(page: import('@playwright/test').Page, checkpoint: string) {
  await page.addInitScript(
    ({ serverId, ckpt, key }) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 0,
          state: {
            bindings: [{ id: 'controls-flow', assetId: 'controls-asset', serverId, addMethod: 'file' }],
            assets: [
              {
                id: 'controls-asset',
                name: 'Controls review',
                createdAt: '2026-09-09T00:00:00Z',
                updatedAt: '2026-09-09T00:00:00Z',
                data: {
                  '1': {
                    id: '1',
                    class_type: 'CheckpointLoaderSimple',
                    inputs: { ckpt_name: ckpt },
                    _meta: { title: 'Checkpoint' },
                  },
                  '2': {
                    id: '2',
                    class_type: 'EmptyLatentImage',
                    inputs: { width: 512, height: 512, batch_size: 1 },
                    _meta: { title: 'Canvas' },
                  },
                  '3': {
                    id: '3',
                    class_type: 'KSamplerAdvanced',
                    inputs: {
                      add_noise: 'disable',
                      noise_seed: 12345,
                      steps: 20,
                      cfg: 8,
                      sampler_name: 'euler',
                      scheduler: 'normal',
                      start_at_step: 0,
                      end_at_step: 10000,
                      return_with_leftover_noise: 'disable',
                    },
                    _meta: { title: 'Sampler' },
                  },
                  '4': {
                    id: '4',
                    class_type: 'CLIPTextEncodeSDXL',
                    inputs: {
                      text_g: 'Soft studio light',
                      text_l: 'Portrait',
                      width: 1024,
                      height: 1024,
                      crop_w: 0,
                      crop_h: 0,
                      target_width: 1024,
                      target_height: 1024,
                    },
                    _meta: { title: 'Prompt' },
                  },
                  '5': {
                    id: '5',
                    class_type: 'ThirdPartyNode',
                    inputs: { count: 0.5, message: 'Example' },
                  },
                  '6': {
                    id: '6',
                    class_type: 'ImageScale',
                    inputs: { upscale_method: 'bilinear', width: 512, height: 512, crop: 'disabled' },
                    _meta: { title: 'Resize' },
                  },
                  '7': {
                    id: '7',
                    class_type: 'MiniMaxH3EasyLoader',
                    inputs: {
                      fl2va_model: 'None',
                      ref2va_model: 'None',
                      text_encoder: 'None',
                      video_vae: 'None',
                      audio_vae: 'None',
                    },
                    _meta: { title: 'Optional models' },
                  },
                  '8': {
                    id: '8',
                    class_type: 'LoadImage',
                    inputs: { image: 'missing-photo.png' },
                    _meta: { title: 'Image input' },
                  },
                },
              },
            ],
          },
        }),
      );
    },
    { serverId: SERVER_ID, ckpt: checkpoint, key: WORKFLOW_KEY },
  );
}

function storedInputs(page: import('@playwright/test').Page, nodeId: string) {
  return page.evaluate(
    ({ key, id }) => {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const asset = JSON.parse(raw).state.assets.find((a: { id: string }) => a.id === 'controls-asset');
      return asset?.data?.[id]?.inputs ?? null;
    },
    { key: WORKFLOW_KEY, id: nodeId },
  );
}

test.beforeEach(async ({ page }) => {
  await clearState(page);
  await seedServer(page);
  await installMockComfyServer(page);
  await page.route('**/object_info/MiniMaxH3EasyLoader', (route) =>
    route.fulfill({
      json: {
        MiniMaxH3EasyLoader: {
          input: {
            required: {
              fl2va_model: [['None', 'first.safetensors', 'second.safetensors', 'third.safetensors'], {}],
              ref2va_model: [['None'], {}],
            },
          },
        },
      },
    }),
  );
  await seedWorkflow(page, CHECKPOINTS[0]);
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto(`/workflow/${SERVER_ID}`);
  await page.getByText('Controls review', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Controls review', exact: true })).toBeVisible();
});

async function expectSelectorGap(page: import('@playwright/test').Page, value: string, searchable = false) {
  const header = page
    .getByTestId(searchable ? 'selector-search' : 'selector-title-row')
    .filter({ visible: true })
    .last();
  const option = page.getByTestId(`selector-option-${value}`).filter({ visible: true }).last();
  await option.click({ trial: true });
  const container = page.getByTestId('selector-header').filter({ visible: true }).last();
  const geometry = await page.evaluate(
    ([header, option, container]) => {
      const h = header!.getBoundingClientRect();
      const o = option!.getBoundingClientRect();
      const c = container!.getBoundingClientRect();
      return { gap: o.y - h.y - h.height, inset: o.x - c.x };
    },
    [await header.elementHandle(), await option.elementHandle(), await container.elementHandle()],
  );
  expect(geometry.gap).toBeCloseTo(16, 0);
  expect(geometry.inset).toBeCloseTo(16, 0);
}

test('an enum segment commits the option it names', async ({ page }) => {
  await expect(page.getByRole('radio', { name: '512x512', exact: true })).toBeVisible();

  // Gluestack paints the label over the radio, which is also what a user taps.
  await page.getByText('1024x1024', { exact: true }).click();

  await expect.poll(() => storedInputs(page, '2').then((i) => i && [i.width, i.height])).toEqual([1024, 1024]);
});

test('an enable/disable switch keeps writing the ComfyUI string', async ({ page }) => {
  // react-native-web renders the switch as a labelled container around a
  // checkbox input, so both carry the role.
  const addNoise = page.getByRole('switch', { name: 'Add noise', exact: true }).first();
  await expect(addNoise).toBeVisible();

  await addNoise.click();

  await expect.poll(() => storedInputs(page, '3').then((i) => i && i.add_noise)).toBe('enable');

  await addNoise.click();
  await expect.poll(() => storedInputs(page, '3').then((i) => i && i.add_noise)).toBe('disable');
});

test('the seed mode segment stays operable', async ({ page }) => {
  await page.getByText('Fixed', { exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Fixed', exact: true })).toBeChecked();
});

test('node segments keep a compact track and full-height tap targets', async ({ page }) => {
  const group = page.getByRole('radiogroup', { name: 'Resolution', exact: true });
  const track = group.getByTestId('segment-track');
  const custom = group.getByRole('radio', { name: 'Custom', exact: true });
  const customTarget = custom.locator('xpath=ancestor::*[@data-checked][1]');
  await customTarget.scrollIntoViewIfNeeded();
  await expect(track).toBeVisible();
  const trackBounds = await track.boundingBox();
  const targetBounds = await customTarget.boundingBox();
  expect(trackBounds).not.toBeNull();
  expect(targetBounds).not.toBeNull();
  expect(trackBounds!.height).toBe(36);
  expect(targetBounds!.height).toBeGreaterThanOrEqual(44);
  expect(trackBounds!.y).toBeGreaterThan(targetBounds!.y);

  // Tap the transparent band above the visible track, then below it.
  await customTarget.click({ position: { x: targetBounds!.width / 2, y: 2 } });
  await expect(custom).toBeChecked();
  const square = group.getByRole('radio', { name: '1024x1024', exact: true });
  const squareTarget = square.locator('xpath=ancestor::*[@data-checked][1]');
  const squareBounds = await squareTarget.boundingBox();
  await squareTarget.click({ position: { x: squareBounds!.width / 2, y: squareBounds!.height - 2 } });
  await expect(square).toBeChecked();
  await expect.poll(() => storedInputs(page, '2').then((i) => i && [i.width, i.height])).toEqual([1024, 1024]);
});

test('the Run tabs still switch panels', async ({ page }) => {
  const generate = page.getByRole('button', { name: 'Generate', exact: true });
  await expect(generate.getByTestId('generate-surface')).toHaveCSS('height', '28px');
  await expect(generate).toHaveCSS('height', '44px');
  await expect(page.getByTestId('run-panel-track')).toHaveCSS('height', '28px');
  const nodes = page.getByRole('tab', { name: 'Nodes', exact: true });
  await expect(nodes).toHaveCSS('width', '44px');
  await expect(nodes).toHaveCSS('height', '44px');
  const queue = page.getByTestId('queue-surface');
  await expect(queue).toHaveCSS('width', '28px');
  await expect(queue).toHaveCSS('height', '28px');
  await expect(queue).toHaveCSS('border-radius', '999px');
  await page.getByRole('tab', { name: 'Assistant', exact: true }).click();
  await expect(page.getByPlaceholder('Search nodes...')).toHaveCount(0);

  await page.getByRole('tab', { name: 'Nodes', exact: true }).click();
  await expect(page.getByPlaceholder('Search nodes...')).toBeVisible();
});

test('compact nodes share type roles, insets and the search width', async ({ page }) => {
  const checkpoint = page.getByTestId('node-card-1');
  const canvas = page.getByTestId('node-card-2');
  const search = page.getByPlaceholder('Search nodes...').locator('..');
  const title = checkpoint.getByText('Checkpoint', { exact: true });
  await expect(title).toHaveCSS('font-size', '13px');
  await expect(title).toHaveCSS('line-height', '18px');
  await expect(title).toHaveCSS('font-family', 'InterMedium');
  await expect(canvas.getByText('Resolution', { exact: true })).toHaveCSS('font-size', '12px');
  await expect(canvas.getByText('Width', { exact: true })).toHaveCSS('font-family', 'Inter');
  await expect(checkpoint.locator(':scope > div').first()).toHaveCSS('padding', '12px');
  const [cardBounds, searchBounds] = await Promise.all([checkpoint.boundingBox(), search.boundingBox()]);
  const alignment = {
    left: Math.abs(cardBounds!.x - searchBounds!.x),
    right: Math.abs(cardBounds!.x + cardBounds!.width - searchBounds!.x - searchBounds!.width),
  };
  expect(alignment.left).toBeLessThanOrEqual(1);
  expect(alignment.right).toBeLessThanOrEqual(1);
  await expect(search).toBeVisible();
  await expect(canvas.getByRole('textbox').first()).toHaveCSS('font-size', '12px');
  await page.getByPlaceholder('Search nodes...').fill('Prompt');
  await expect(page.getByPlaceholder('Your text goes here...').first()).toHaveCSS('font-size', '12px');
  await expect(page.getByPlaceholder('Your text goes here...').first()).toHaveCSS('line-height', '18px');
  await page.getByPlaceholder('Search nodes...').fill('ThirdPartyNode');
  const fallback = page.getByTestId('node-card-5');
  await expect(fallback.getByText('ThirdPartyNode', { exact: true })).toHaveCSS('font-family', 'InterMedium');
  await expect(fallback.getByPlaceholder('count', { exact: true })).toHaveCSS('font-size', '12px');
  await expect(fallback.getByPlaceholder('count', { exact: true })).toHaveCSS('font-family', 'SpaceMono');
  await expect(fallback.getByPlaceholder('message', { exact: true })).toHaveCSS('font-family', 'Inter');
});

for (const theme of ['dark', 'light']) {
  test(`${theme}: model and searchless selectors retain visible actions and a themed handle`, async ({ page }) => {
    if (theme === 'light') {
      await page.addInitScript(() =>
        localStorage.setItem('theme-storage', JSON.stringify({ version: 1, state: { preference: 'light' } })),
      );
      await page.reload();
    }
    const paper = theme === 'dark' ? 'rgb(16, 16, 18)' : 'rgb(247, 247, 248)';
    const muted = theme === 'dark' ? 'rgb(147, 147, 150)' : 'rgb(102, 102, 105)';
    const runHandle = page.getByLabel('Bottom sheet handle', { exact: true }).last();
    const runSurface = page
      .getByLabel('Bottom Sheet', { exact: true })
      .filter({ hasNot: page.locator('*') })
      .last();
    await expect(runSurface).toHaveCSS('border-top-left-radius', '6px');
    await expect(runSurface).toHaveCSS('border-top-right-radius', '6px');
    await expect(runSurface).toHaveCSS('background-color', paper);
    await expect(runHandle).toHaveCSS('background-color', paper);
    await expect(runHandle).toHaveCSS('border-top-left-radius', '6px');
    await expect(runHandle.locator(':scope > div').first()).toHaveCSS('background-color', muted);
    await expect.poll(() => runHandle.boundingBox().then((bounds) => bounds?.y ?? Infinity)).toBeLessThan(650);
    await page.screenshot({ path: `.expo/run-sheet-theme-${theme}.png` });
    await page
      .getByTestId('node-card-1')
      .getByRole('button', { name: /Select model:/ })
      .click();
    {
      const action = page.getByRole('button', { name: 'Refresh options', exact: true });
      await expect(action).toBeVisible();
      await expect(action.getByTestId('button-surface')).toHaveCSS(
        'background-color',
        theme === 'dark' ? 'rgb(27, 27, 29)' : 'rgb(237, 237, 238)',
      );
    }
    await expect(page.getByRole('button', { name: 'Close options', exact: true })).toHaveCount(0);
    await expectSelectorGap(page, CHECKPOINTS[0], true);
    const handle = page.getByLabel('Bottom sheet handle', { exact: true }).last();
    const modalSurface = page
      .getByLabel('Bottom Sheet', { exact: true })
      .filter({ hasNot: page.locator('*') })
      .last();
    await expect(modalSurface).toHaveCSS('border-top-left-radius', '6px');
    await expect(handle).toHaveCSS('border-top-left-radius', '6px');
    await expect(handle).toHaveCSS('background-color', theme === 'dark' ? 'rgb(16, 16, 18)' : 'rgb(247, 247, 248)');
    await expect(handle.locator(':scope > div').first()).toHaveCSS(
      'background-color',
      theme === 'dark' ? 'rgb(147, 147, 150)' : 'rgb(102, 102, 105)',
    );
    await page.getByRole('button', { name: 'Refresh options', exact: true }).click();
    await expect(page.getByRole('button', { name: 'dreamshaperXL_v21', exact: true })).toBeVisible();
    await page
      .getByRole('button', { name: 'Bottom sheet backdrop', exact: true })
      .last()
      .click({ position: { x: 8, y: 8 } });
    await expect(page.getByRole('heading', { name: 'Select checkpoints', exact: true })).toHaveCount(0);
    await page.getByPlaceholder('Search nodes...').fill('Sampler');
    await page.getByText('euler', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Select Sampler', exact: true })).toBeVisible();
    await expectSelectorGap(page, 'euler');
    const ink = theme === 'dark' ? 'rgb(244, 244, 245)' : 'rgb(26, 26, 30)';
    await expect(page.getByRole('button', { name: 'heun', exact: true }).getByText('heun', { exact: true })).toHaveCSS(
      'color',
      ink,
    );
    await expect(page.getByRole('button', { name: 'euler', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByPlaceholder('Search...')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Close options', exact: true })).toHaveCount(0);
    const handleTarget = page.getByLabel('Bottom sheet handle', { exact: true }).last();
    await handleTarget.evaluate(
      (el) =>
        new Promise<void>((resolve, reject) => {
          let previous = -1;
          let stableFrames = 0;
          const deadline = performance.now() + 5000;
          function frame() {
            const rect = el.getBoundingClientRect();
            stableFrames = Math.abs(rect.y - previous) < 0.1 && rect.y < innerHeight * 0.25 ? stableFrames + 1 : 0;
            previous = rect.y;
            if (stableFrames >= 6) resolve();
            else if (performance.now() > deadline) reject(new Error('Selector handle did not settle'));
            else requestAnimationFrame(frame);
          }
          frame();
        }),
    );
    const bounds = await handleTarget.boundingBox();
    const client = await page.context().newCDPSession(page);
    await client.send('Emulation.setTouchEmulationEnabled', { enabled: true });
    const x = bounds!.x + bounds!.width / 2;
    const startY = bounds!.y + bounds!.height / 2;
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: startY }] });
    for (let step = 1; step <= 12; step++) {
      const y = startY + ((page.viewportSize()!.height - 12 - startY) * step) / 12;
      await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
    }
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await client.detach();
    await expect(page.getByRole('heading', { name: 'Select Sampler', exact: true })).toHaveCount(0);
  });
}

for (const theme of ['dark', 'light']) {
  test(`${theme}: scheduler and ordinary options share spacing, legibility and selection`, async ({ page }) => {
    if (theme === 'light') {
      await page.addInitScript(() =>
        localStorage.setItem('theme-storage', JSON.stringify({ version: 1, state: { preference: 'light' } })),
      );
      await page.reload();
    }
    const ink = theme === 'dark' ? 'rgb(244, 244, 245)' : 'rgb(26, 26, 30)';
    await page.getByPlaceholder('Search nodes...').fill('Sampler');
    await page.getByText('normal', { exact: true }).click();
    await expectSelectorGap(page, 'normal');
    const karras = page.getByRole('button', { name: 'karras', exact: true });
    await expect(karras.getByText('karras', { exact: true })).toHaveCSS('color', ink);
    await karras.click();
    await expect.poll(() => storedInputs(page, '3').then((inputs) => inputs.scheduler)).toBe('karras');
    await expect(page.getByRole('heading', { name: 'Select Scheduler', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Select Scheduler: karras', exact: true }).click();
    await expect(page.getByRole('button', { name: 'karras', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page
      .getByRole('button', { name: 'Bottom sheet backdrop', exact: true })
      .last()
      .click({ position: { x: 8, y: 8 } });
    await page.getByPlaceholder('Search nodes...').fill('Resize');
    await page.getByRole('button', { name: 'Select Option: bilinear', exact: true }).click();
    await expectSelectorGap(page, 'nearest-exact');
    const lanczos = page.getByRole('button', { name: 'lanczos', exact: true });
    await expect(lanczos.getByText('lanczos', { exact: true })).toHaveCSS('color', ink);
    await lanczos.click();
    await expect.poll(() => storedInputs(page, '6').then((inputs) => inputs.upscale_method)).toBe('lanczos');
  });

  test(`${theme}: optional models and server image grids align every column and preserve selection`, async ({
    page,
  }) => {
    if (theme === 'light') {
      await page.addInitScript(() =>
        localStorage.setItem('theme-storage', JSON.stringify({ version: 1, state: { preference: 'light' } })),
      );
      await page.reload();
    }
    await page.getByPlaceholder('Search nodes...').fill('Optional models');
    await page.getByRole('button', { name: 'Select optional model fl2va_model: None', exact: true }).click();
    await expectSelectorGap(page, 'first.safetensors', true);
    const first = page.getByRole('button', { name: 'first', exact: true });
    const third = page.getByRole('button', { name: 'third', exact: true });
    await expect(third).toBeVisible();
    const [firstBounds, secondBounds, thirdBounds] = await Promise.all([
      first.boundingBox(),
      page.getByRole('button', { name: 'second', exact: true }).boundingBox(),
      third.boundingBox(),
    ]);
    expect(secondBounds!.x - firstBounds!.x - firstBounds!.width).toBeCloseTo(8, 0);
    expect(thirdBounds!.x).toBe(firstBounds!.x);
    expect(thirdBounds!.width).toBe(firstBounds!.width);
    await first.click();
    await expect.poll(() => storedInputs(page, '7').then((inputs) => inputs.fl2va_model)).toBe('first.safetensors');
    await page
      .getByRole('button', { name: 'Select optional model fl2va_model: first.safetensors', exact: true })
      .click();
    await expect(page.getByRole('button', { name: 'first', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page
      .getByRole('button', { name: 'Bottom sheet backdrop', exact: true })
      .last()
      .click({ position: { x: 8, y: 8 } });
    await page.getByPlaceholder('Search nodes...').fill('Image input');
    await expect(page.getByText('Not installed on server', { exact: true })).toBeVisible();
    await page.getByTestId('node-card-8').screenshot({ path: `.expo/load-image-missing-${theme}.png` });
    await page.getByRole('button', { name: 'Set image: missing-photo.png', exact: true }).click();
    await page.getByText('Already on Server', { exact: true }).click();
    await expectSelectorGap(page, 'example.png', true);
    await page.getByRole('button', { name: 'example.png', exact: true }).click();
    await expect.poll(() => storedInputs(page, '8').then((inputs) => inputs.image)).toBe('example.png');
    await expect(page.getByRole('heading', { name: 'Server Images', exact: true })).toHaveCount(0);
    await expect(page.getByText('Not installed on server', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Set image: example.png', exact: true }).click();
    await page.getByText('Already on Server', { exact: true }).click();
    await expect(page.getByRole('button', { name: 'example.png', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.getByRole('button', { name: 'selfie.png', exact: true }).click();
    await expect.poll(() => storedInputs(page, '8').then((inputs) => inputs.image)).toBe('selfie.png');
  });

  test(`${theme}: slider readout stays centered and preserves the track when digits change`, async ({ page }) => {
    await page.addInitScript((theme) => {
      localStorage.setItem('theme-storage', JSON.stringify({ version: 1, state: { preference: theme } }));
      const saved = JSON.parse(localStorage.getItem('cp-workflows-v2')!);
      saved.state.assets[0].data['3'].inputs.steps = 9;
      localStorage.setItem('cp-workflows-v2', JSON.stringify(saved));
    }, theme);
    await page.reload();
    await page.getByPlaceholder('Search nodes...').fill('Sampler');
    const card = page.getByTestId('node-card-3');
    const readout = card.getByTestId('slider-readout').first();
    await expect(readout.getByText('9', { exact: true })).toBeVisible();
    const width = await readout.evaluate((el) => el.getBoundingClientRect().width);
    await card.getByRole('button', { name: 'Increase slider', exact: true }).first().click();
    await expect.poll(() => storedInputs(page, '3').then((inputs) => inputs.steps)).toBe(10);
    await expect(readout.getByText('10', { exact: true })).toBeVisible();
    const centered = await readout.evaluate((el) => {
      const outer = el.getBoundingClientRect();
      const text = el.firstElementChild!.getBoundingClientRect();
      return {
        width: outer.width,
        dx: Math.abs(text.x + text.width / 2 - outer.x - outer.width / 2),
        dy: Math.abs(text.y + text.height / 2 - outer.y - outer.height / 2),
      };
    });
    expect(centered.width).toBe(width);
    expect(centered.dx).toBeLessThan(1);
    expect(centered.dy).toBeLessThan(1);
    await card.screenshot({ path: `.expo/slider-readout-${theme}.png` });
  });

  test(`${theme}: server image empty and offline states recover through refresh without losing the input`, async ({
    page,
  }) => {
    if (theme === 'light') {
      await page.addInitScript(() =>
        localStorage.setItem('theme-storage', JSON.stringify({ version: 1, state: { preference: 'light' } })),
      );
      await page.reload();
    }
    await page.getByPlaceholder('Search nodes...').fill('Image input');
    await page.getByRole('button', { name: 'Set image: missing-photo.png', exact: true }).click();
    await page.getByText('Already on Server', { exact: true }).click();
    await expect(page.getByRole('button', { name: 'example.png', exact: true })).toBeVisible();
    await page.getByPlaceholder('Search images...').fill('no-match-here');
    await expect(page.getByText('No matching options', { exact: true })).toBeVisible();
    await expect(page.getByText(/No images in this server’s input folder yet/)).toHaveCount(0);
    await page.getByPlaceholder('Search images...').fill('');
    let state: 'offline' | 'empty' | 'ready' = 'offline';
    await page.route('**/object_info/LoadImage', async (route) => {
      if (state === 'offline') return route.fulfill({ status: 503, body: 'Unavailable' });
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          LoadImage: { input: { required: { image: [state === 'empty' ? [] : ['example.png', 'selfie.png'], {}] } } },
        }),
      });
    });
    await page.getByRole('button', { name: 'Refresh options', exact: true }).click();
    await expect(page.getByText(/Could not reach the server to read its images/)).toBeVisible();
    expect((await storedInputs(page, '8')).image).toBe('missing-photo.png');
    await page.screenshot({ path: `.expo/state-icons-offline-${theme}.png` });
    state = 'empty';
    await page.getByRole('button', { name: 'Refresh options', exact: true }).click();
    await expect(page.getByText(/No images in this server’s input folder yet/)).toBeVisible();
    expect((await storedInputs(page, '8')).image).toBe('missing-photo.png');
    await page.screenshot({ path: `.expo/state-icons-empty-${theme}.png` });
    state = 'ready';
    await page.getByRole('button', { name: 'Refresh options', exact: true }).click();
    await expect(page.getByRole('button', { name: 'example.png', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'example.png', exact: true }).click();
    await expect.poll(() => storedInputs(page, '8').then((inputs) => inputs.image)).toBe('example.png');
    await expect(page.getByRole('heading', { name: 'Server Images', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Clear image', exact: true }).click();
    await expect.poll(() => storedInputs(page, '8').then((inputs) => inputs.image)).toBe('');
    await expect(page.getByText('Upload Image', { exact: true })).toBeVisible();
    await page.getByTestId('node-card-8').screenshot({ path: `.expo/state-icons-upload-${theme}.png` });
    await page.getByRole('button', { name: 'Set image: Choose', exact: true }).click();
    await page.getByText('Already on Server', { exact: true }).click();
    await page.getByRole('button', { name: 'selfie.png', exact: true }).click();
    await expect.poll(() => storedInputs(page, '8').then((inputs) => inputs.image)).toBe('selfie.png');
  });
}

for (const reducedMotion of [false, true]) {
  test(`refresh keeps its icon and geometry while pending${reducedMotion ? ' with reduced motion' : ''}`, async ({
    page,
  }) => {
    if (reducedMotion) {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.reload();
    }
    await page
      .getByTestId('node-card-1')
      .getByRole('button', { name: /Select model:/ })
      .click();
    const action = page.getByRole('button', { name: 'Refresh options', exact: true });
    const icon = action.getByTestId('button-rotating-icon');
    await expect(icon).toBeVisible();
    // Wait for sheet presentation before comparing the icon's resting position.
    await action.click({ trial: true });
    await icon.evaluate(
      (el) =>
        new Promise<void>((resolve, reject) => {
          let previous = -1;
          let stableFrames = 0;
          const deadline = performance.now() + 5000;
          function frame() {
            const rect = el.getBoundingClientRect();
            stableFrames = Math.abs(rect.y - previous) < 0.1 && rect.y < innerHeight * 0.25 ? stableFrames + 1 : 0;
            previous = rect.y;
            if (stableFrames >= 6) resolve();
            else if (performance.now() > deadline) reject(new Error('Selector presentation did not settle'));
            else requestAnimationFrame(frame);
          }
          frame();
        }),
    );
    const originalBounds = await icon.boundingBox();
    let release!: () => void;
    const response = new Promise<void>((resolve) => {
      release = resolve;
    });
    let requests = 0;
    await page.route('**/experiment/models/checkpoints', async (route) => {
      requests++;
      await response;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(CHECKPOINTS.map((name) => ({ name, pathIndex: 0 }))),
      });
    });
    await action.click();
    await expect(action).toHaveAttribute('aria-busy', 'true');
    await expect(action).toBeDisabled();
    await expect.poll(() => requests).toBe(1);
    await expect(icon.locator('svg')).toHaveCount(1);
    // No loader replaces or briefly overlaps the original refresh arrows.
    await expect(action.locator('[role="progressbar"]')).toHaveCount(0);
    const motion = await icon.evaluate(async (el) => {
      const transforms: string[] = [];
      const sizes: number[][] = [];
      for (let frame = 0; frame < 18; frame++) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        transforms.push(getComputedStyle(el).transform);
        const parent = el.parentElement!.getBoundingClientRect();
        sizes.push([parent.x, parent.y, parent.width, parent.height]);
      }
      return { transforms, sizes };
    });
    expect(new Set(motion.transforms).size)[reducedMotion ? 'toBe' : 'toBeGreaterThan'](1);
    expect(new Set(motion.sizes.map((size) => JSON.stringify(size))).size).toBe(1);
    release();
    await expect(action).toBeEnabled();
    await expect
      .poll(() =>
        icon.evaluate((el) => {
          const matrix = new DOMMatrix(getComputedStyle(el).transform);
          return Math.abs(matrix.a - 1) + Math.abs(matrix.b);
        }),
      )
      .toBeLessThan(0.001);
    expect(await icon.boundingBox()).toEqual(originalBounds);
    await expect(page.getByRole('button', { name: 'dreamshaperXL_v21', exact: true })).toBeVisible();
  });
}

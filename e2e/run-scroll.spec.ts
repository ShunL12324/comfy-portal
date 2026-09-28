import { expect, test, type Page } from '@playwright/test';
import { clearState, seedServer, SERVER_ID } from './fixtures/app-state';
import { installMockComfyServer } from './fixtures/comfy-server';

test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

async function firstContentSwipe(page: Page) {
  const list = page.getByTestId('run-node-list');
  await expect(list).toBeVisible();
  await expect.poll(() => list.evaluate((el) => el.clientHeight)).toBeGreaterThan(100);
  // The scroll view mounts before Gorhom's entrance animation finishes.
  await list.evaluate(
    (el) =>
      new Promise<void>((resolve, reject) => {
        let previous = -1;
        let stableFrames = 0;
        const deadline = performance.now() + 5000;
        function frame() {
          const rect = el.getBoundingClientRect();
          stableFrames = Math.abs(rect.y - previous) < 0.1 && rect.y < innerHeight * 0.75 ? stableFrames + 1 : 0;
          previous = rect.y;
          if (stableFrames >= 6) return resolve();
          if (performance.now() > deadline) return reject(new Error('Run sheet did not settle in the viewport'));
          requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      }),
  );
  const before = (await list.boundingBox())!;
  const cdp = await page.context().newCDPSession(page);
  const x = before.x + 8;
  const y = Math.min(before.y + before.height - 30, 770);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let step = 1; step <= 12; step++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - step * 12 }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
  await expect.poll(() => list.evaluate((el) => el.scrollTop)).toBeGreaterThan(40);
  const after = (await list.boundingBox())!;
  expect(Math.abs(after.y - before.y)).toBeLessThan(2);
}

test('Run node content scrolls on the first swipe at the default detent, after a tab switch and on re-entry', async ({
  page,
}) => {
  await clearState(page);
  await seedServer(page);
  await installMockComfyServer(page);
  await page.addInitScript(() => {
    const data = Object.fromEntries(
      Array.from({ length: 16 }, (_, i) => [
        String(i + 1),
        {
          class_type: 'CLIPTextEncode',
          inputs: { text: `Prompt ${i + 1}` },
          _meta: { title: `Prompt ${i + 1}` },
        },
      ]),
    );
    localStorage.setItem(
      'cp-workflows-v2',
      JSON.stringify({
        version: 0,
        state: {
          assets: [
            { id: 'scroll-asset', name: 'Scrollable workflow', data, createdAt: '2026-09-27', updatedAt: '2026-09-27' },
          ],
          bindings: [{ id: 'scroll-run', assetId: 'scroll-asset', serverId: 'e2e-server', addMethod: 'file' }],
        },
      }),
    );
  });
  await page.goto(`/workflow/${SERVER_ID}`);
  await page.getByRole('button', { name: 'Open Scrollable workflow', exact: true }).click();
  await expect(page.getByPlaceholder('Search nodes...')).toBeVisible();
  await firstContentSwipe(page);
  await page.getByRole('tab', { name: 'Assistant', exact: true }).click();
  await page.getByRole('tab', { name: 'Nodes', exact: true }).click();
  await firstContentSwipe(page);
  await page.getByRole('button', { name: 'Go back', exact: true }).click();
  await page.getByRole('button', { name: 'Open Scrollable workflow', exact: true }).click();
  await firstContentSwipe(page);
});

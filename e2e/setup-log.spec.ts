import { test, expect } from '@playwright/test';
test.use({ viewport: { width: 393, height: 852 } });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('gpu-provisioning', JSON.stringify({ version: 0, state: { launches: [{
      id: 'vast:sheet-test', provider: 'vast', instanceId: 'sheet-test', environmentId: 'test',
      environmentName: 'Sheet test', token: 'test', pricePerHour: 0, startedAt: 0, stage: 'failed',
      environmentSnapshot: { id: 'test', name: 'Sheet test', description: '', models: [], extensions: [], workflows: [] },
    }] } }));
  });
});

test('installation log stacks over Setup and can be reopened', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'View progress for Sheet test' }).click();
  const setup = page.getByRole('heading', { name: 'Setup', exact: true });
  await expect(setup).toBeVisible();
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.getByRole('button', { name: 'View installation log' }).click();
    await expect(page.getByText('Installation log', { exact: true })).toBeVisible();
    await expect(page.getByText('Installation logs will be available after the runtime starts.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Done', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Bottom sheet backdrop' }).last().click({ position: { x: 8, y: 8 } });
    await expect(page.getByText('Installation log', { exact: true })).toHaveCount(0);
    await expect(setup).toBeVisible();
  }
});

for (const succeeds of [true, false]) {
  test(`destroy feedback is explicit on ${succeeds ? 'success' : 'failure'}`, async ({ page }) => {
    let deleted = false;
    await page.route('https://console.vast.ai/api/v0/**', async route => {
      if (route.request().method() === 'DELETE') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        deleted = succeeds;
        await route.fulfill({ json: { success: succeeds, msg: 'Destruction rejected by provider' } });
      } else {
        await route.fulfill({ json: { instances: deleted ? [] : [{ id: 42 }] } });
      }
    });
    await page.addInitScript(() => {
      const data = JSON.parse(localStorage.getItem('gpu-provisioning')!);
      data.state.launches[0].id = 'vast:42';
      data.state.launches[0].instanceId = '42';
      localStorage.setItem('gpu-provisioning', JSON.stringify(data));
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'View progress for Sheet test' }).click();
    await page.getByRole('button', { name: 'Destroy instance', exact: true }).click();
    await expect(page.getByText('Stop setup and destroy instance?', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Destroy instance', exact: true }).last().click();
    await expect(page.getByRole('button', { name: 'Destroying instance…', exact: true }).last()).toBeDisabled();
    if (succeeds) {
      await expect(page.getByRole('button', { name: 'Instance destroyed', exact: true }).last()).toBeVisible();
      await page.screenshot({ path: '.expo/design-review/app/setup-destroy-success.png' });
      await page.getByRole('button', { name: 'Back to Servers', exact: true }).click();
      await expect(page.getByRole('button', { name: 'View progress for Sheet test' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Bottom sheet backdrop' })).toHaveCount(0);
      await page.getByRole('tab', { name: 'Gallery', exact: true }).click();
      // The app is still navigable once the destroy flow is done: no sheet is
      // left blocking input and the tab really renders. Unfiltered and empty,
      // so the copy reads media.
      await expect(page.getByText('No media yet', { exact: true })).toBeVisible();
    } else {
      await expect(page.getByText('Destruction rejected by provider', { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Remove local record only', exact: true })).toBeVisible();
      const records = await page.evaluate(() => JSON.parse(localStorage.getItem('gpu-provisioning')!).state.launches);
      expect(records).toHaveLength(1);
      await page.screenshot({ path: '.expo/design-review/app/setup-destroy-failure.png' });
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      await expect(page.getByText('Setup', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'View installation log', exact: true }).click();
      await expect(page.getByText('Installation log', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Bottom sheet backdrop' }).last().click({ position: { x: 8, y: 8 } });
      await expect(page.getByRole('button', { name: 'Bottom sheet backdrop' })).toHaveCount(1);
      await page.getByRole('button', { name: 'Bottom sheet backdrop' }).last().click({ position: { x: 8, y: 8 } });
      await expect(page.getByRole('button', { name: 'Bottom sheet backdrop' })).toHaveCount(0);
      await page.getByRole('tab', { name: 'Gallery', exact: true }).click();
      // The app is still navigable once the destroy flow is done: no sheet is
      // left blocking input and the tab really renders. Unfiltered and empty,
      // so the copy reads media.
      await expect(page.getByText('No media yet', { exact: true })).toBeVisible();
    }
  });
}

test('failed destruction can explicitly remove its local record without another cloud request', async ({ page }) => {
  let deletes = 0;
  await page.route('https://console.vast.ai/api/v0/**', async route => {
    if (route.request().method() === 'DELETE') deletes++;
    await route.fulfill({ json: { instances: [] } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'View progress for Sheet test' }).click();
  await page.getByRole('button', { name: 'Destroy instance', exact: true }).click();
  await expect(page.getByText('Stop setup and destroy instance?', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Destroy instance', exact: true }).last().click();
  await expect(page.getByText('Destruction not confirmed', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Remove local record only', exact: true }).click();
  await expect(page.getByText(/This does not destroy the cloud instance or stop billing/)).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Bottom sheet backdrop' })).toHaveCount(1);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('gpu-provisioning')!).state.launches.length)).toBe(1);
  await expect(page.getByRole('button', { name: 'Remove local record only', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Destroy instance', exact: true }).click();
  await expect(page.getByText('Stop setup and destroy instance?', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Destroy instance', exact: true }).last().click();
  await page.getByRole('button', { name: 'Remove local record only', exact: true }).click();
  await page.getByRole('button', { name: 'Remove from this app', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Local record removed', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back to Servers', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Bottom sheet backdrop' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'View progress for Sheet test' })).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('gpu-provisioning')!).state.launches.length)).toBe(0);
  expect(deletes).toBe(0);
  await page.getByRole('tab', { name: 'Gallery', exact: true }).click();
  // Same check as the destroy tests: the app is navigable afterwards.
  await expect(page.getByText('No media yet', { exact: true })).toBeVisible();
});

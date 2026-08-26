import type { Page } from '@playwright/test';
import { MOCK_HOST, MOCK_PORT } from './comfy-server';

/**
 * Seed the zustand stores before the app boots.
 *
 * On web the stores persist through AsyncStorage, which is localStorage. Doing
 * this in an init script rather than by clicking through the UI keeps each
 * spec to the one thing it's testing, and means a broken Add Server flow fails
 * only its own test instead of every test.
 *
 * Keys and shapes come from the `persist` config in the stores themselves —
 * `features/server/stores/server-store.ts` and the workflow store.
 */

export const SERVER_ID = 'e2e-server';

const server = {
  id: SERVER_ID,
  name: 'E2E Server',
  host: MOCK_HOST,
  port: MOCK_PORT,
  useSSL: 'Never',
  status: 'online',
  latency: 8,
  models: [],
  lastModelSync: 0,
};

export async function seedServer(page: Page) {
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key as string, value as string);
    },
    ['servers-storage', JSON.stringify({ state: { servers: [server] }, version: 0 })],
  );
}

export async function clearState(page: Page) {
  await page.addInitScript(() => window.localStorage.clear());
}

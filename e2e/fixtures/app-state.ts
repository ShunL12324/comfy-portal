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

/**
 * The theme every spec runs under.
 *
 * Seeded explicitly rather than inherited from the store's default: a spec that
 * depends on whatever the default happens to be breaks the day the default
 * changes, which is exactly what happened when a fresh install started opening
 * in Dark. Dark is what a first launch actually shows, so that is what the
 * suite covers.
 */
export const SEEDED_THEME = 'dark';

export async function clearState(page: Page) {
  await page.addInitScript((theme) => {
    window.localStorage.clear();
    // Shape must match the store's persist config (zustand, version 1), or
    // rehydration drops it and the default silently takes over again.
    window.localStorage.setItem('theme-storage', JSON.stringify({ state: { preference: theme }, version: 1 }));
  }, SEEDED_THEME);
}

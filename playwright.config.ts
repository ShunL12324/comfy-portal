import { defineConfig, devices } from '@playwright/test';

/**
 * E2E against the web build.
 *
 * The app is React Native; web is the only target a browser can drive, and it
 * shares every screen, store and service with iOS and Android — only the
 * native shell differs. So this covers the logic that actually breaks, and
 * device builds stay responsible for the native surface.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: 'http://localhost:8081',
    trace: 'on-first-retry',
    // The bundle is large and the first load compiles it, so the default 5s
    // action timeout trips constantly on a cold Metro.
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: {
    command: 'npx expo start --web --port 8081',
    url: 'http://localhost:8081',
    reuseExistingServer: !process.env.CI,
    // Metro's first web bundle takes a while.
    timeout: 300_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});

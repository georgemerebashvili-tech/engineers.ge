import {defineConfig, devices} from '@playwright/test';

/**
 * engineers.ge · Playwright QA suite.
 *
 * Run against a local dev server (PORT 3001 default) or a prod URL via
 * PLAYWRIGHT_BASE_URL. Headless Chromium only — keeps the install footprint small.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 1,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001',
    trace: 'on-first-retry',
    viewport: {width: 1440, height: 900},
    navigationTimeout: 30_000,
    actionTimeout: 10_000
  },
  projects: [
    {name: 'chromium', use: {...devices['Desktop Chrome']}}
  ]
});

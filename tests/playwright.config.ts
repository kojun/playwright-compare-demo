import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  use: {
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    locale: 'ja-JP',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  timeout: 60_000,
  expect: { timeout: 10_000 },
});
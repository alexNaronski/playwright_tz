import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  retries: 0,
  timeout: 45000,
  use: {
    headless: false,
    viewport: { width: 1280, height: 720 },
    baseURL: 'https://enotes.pointschool.ru',
    actionTimeout: 35000,
  },
  workers: 1,
  projects: [
    {
      name: 'Chromium',
      use: { browserName: 'chromium' },
    },
    /*{
      name: 'Firefox',
      use: { browserName: 'firefox' },
    },
    {
      name: 'WebKit',
      use: { browserName: 'webkit' },
    },*/
  ],
  reporter: [
    ['list'],
    ['allure-playwright'],
  ],
});

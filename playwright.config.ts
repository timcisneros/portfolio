import { defineConfig } from '@playwright/test';

// Set CHROMIUM_PATH to use a system Chromium instead of Playwright's download.
const executablePath = process.env.CHROMIUM_PATH;

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? 'github' : 'list',
    use: {
        baseURL: 'http://localhost:3311',
        ...(executablePath ? { launchOptions: { executablePath } } : {}),
    },
    webServer: {
        command: 'npx next start -p 3311',
        url: 'http://localhost:3311',
        reuseExistingServer: !process.env.CI,
        timeout: 30000,
    },
});

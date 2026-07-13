import { defineConfig } from '@playwright/test';

// Set CHROMIUM_PATH to use a system Chromium instead of Playwright's download.
const executablePath = process.env.CHROMIUM_PATH;
const webgpuHardwareProbe = process.env.WEBGPU_TEST === '1';
const developmentLifecycleProbe = process.env.DEV_TEST === '1';

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? 'github' : 'list',
    use: {
        baseURL: developmentLifecycleProbe ? 'http://localhost:3000' : 'http://localhost:3311',
        ...((executablePath || webgpuHardwareProbe) ? {
            launchOptions: {
                ...(executablePath ? { executablePath } : {}),
                ...(webgpuHardwareProbe ? {
                    // Headless Chromium disables adapter exposure on some
                    // Linux hosts. These flags are test-only and exercise the
                    // same Vulkan/WebGPU backend used by the browser process.
                    args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-angle=vulkan'],
                } : {}),
            },
        } : {}),
    },
    webServer: {
        command: developmentLifecycleProbe ? 'npx next dev -p 3000' : 'npx next start -p 3311',
        url: developmentLifecycleProbe ? 'http://localhost:3000' : 'http://localhost:3311',
        reuseExistingServer: !process.env.CI,
        timeout: 30000,
    },
});

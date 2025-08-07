const { devices } = require('@playwright/test');

module.exports = {
    workers: 4, // or use percentage: '50%'
    testDir: './tests/e2e',
    outputDir: './tests/test-results',
    timeout: 30000,
    retries: 2,

    use: {
        baseURL: 'http://127.0.0.1:9292',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'on-first-retry',

        // Native Linux settings
        launchOptions: {
            // Run in headed mode by default on native Linux
            headless: process.env.HEADLESS === 'true',
            // Slow down actions for better debugging
            slowMo: process.env.SLOWMO ? parseInt(process.env.SLOWMO) : 0,
        }
    },

    // Configure screenshot paths
    snapshotDir: './tests/e2e/screenshots',
    snapshotPathTemplate: '{snapshotDir}/{testFileDir}/{testFileName}-{projectName}/{arg}{ext}',

    projects: [
        {
            name: 'firefox',
            use: {
                ...devices['Desktop Firefox'],
                viewport: { width: 1280, height: 720 },
                bypassCSP: true,
                ignoreHTTPSErrors: true,
                serviceWorkers: 'block'
            }
        },
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1280, height: 720 },
                bypassCSP: true,
                ignoreHTTPSErrors: true,
                serviceWorkers: 'block'
            }
        },
        {
            name: 'Mobile Safari',
            use: {
                ...devices['iPhone 12'],
                isMobile: true,
                hasTouch: true
            }
        }
    ],

    webServer: {
        command: 'shopify theme dev --store nookleaf-dev.myshopify.com',
        url: 'http://127.0.0.1:9292',
        reuseExistingServer: true,
        timeout: 120000
    }
};
import playwright from 'playwright';
import { promises as fs } from 'fs';
import path from 'path';
import { parseArgs } from 'util';

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    url: {
      type: 'string',
      short: 'u',
      default: 'http://127.0.0.1:9292'
    },
    output: {
      type: 'string',
      short: 'o',
      default: './tests/e2e/screenshots'
    },
    element: {
      type: 'string',
      short: 'e',
      multiple: true,
      default: []
    },
    fullpage: {
      type: 'boolean',
      short: 'f',
      default: false
    },
    mobile: {
      type: 'boolean',
      short: 'm',
      default: false
    },
    wait: {
      type: 'string',
      short: 'w',
      default: '1000'  // Reduced from 3000ms
    },
    browser: {
      type: 'string',
      short: 'b',
      default: 'chromium'
    },
    common: {
      type: 'boolean',
      short: 'c',
      default: false  // New flag for capturing common sections
    }
  },
  strict: false,
  allowPositionals: true
});

// Override URL if provided as positional argument
const url = positionals[0] || values.url;
const outputDir = values.output;
const elements = values.element || [];
const fullPage = values.fullpage;
const useMobile = values.mobile;
const waitTime = parseInt(values.wait);
const browserType = values.browser;
const captureCommon = values.common;

console.log('=== Screenshot Capture Configuration ===');
console.log('URL:', url);
console.log('Output directory:', outputDir);
console.log('Full page:', fullPage);
console.log('Mobile view:', useMobile);
console.log('Browser:', browserType);
console.log('Wait time:', waitTime, 'ms');
if (elements.length > 0) {
  console.log('Elements to capture:', elements);
}
if (captureCommon) {
  console.log('Capture common sections:', captureCommon);
}
console.log('=====================================\n');

(async () => {
  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  // Launch browser
  const browserInstance = await playwright[browserType].launch({
    headless: true
  });

  const context = await browserInstance.newContext({
    ...(useMobile ? playwright.devices['iPhone 13'] : {
      viewport: { width: 1920, height: 1080 }
    })
  });

  const page = await context.newPage();

  // Only set up error tracking if explicitly needed (could add a --debug flag)
  const errors = [];

  try {
    console.log(`Navigating to ${url}...`);
    await page.goto(url, {
      waitUntil: 'domcontentloaded',  // Changed from 'networkidle' for speed
      timeout: 30000
    });

    // Only wait if we have a non-default wait time or specific elements
    if (waitTime > 1000 || elements.length > 0) {
      await page.waitForTimeout(waitTime);
    }

    // Generate timestamp for unique filenames
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // DEFAULT BEHAVIOR: Take only the main screenshot
    const screenshotType = fullPage ? 'full-page' : 'viewport';
    const mainScreenshotPath = path.join(outputDir, `${screenshotType}-${timestamp}.png`);
    await page.screenshot({
      path: mainScreenshotPath,
      fullPage: fullPage
    });
    console.log(`✓ ${fullPage ? 'Full page' : 'Viewport'} screenshot saved: ${mainScreenshotPath}`);

    // Only capture specific elements if explicitly requested
    if (elements.length > 0) {
      console.log('\nCapturing specific elements...');
      for (const selector of elements) {
        try {
          // Wait for element to be visible
          await page.waitForSelector(selector, { timeout: 5000 });
          const element = await page.$(selector);
          if (element) {
            const elementPath = path.join(
              outputDir,
              `element-${selector.replace(/[^a-zA-Z0-9]/g, '-')}-${timestamp}.png`
            );
            await element.screenshot({ path: elementPath });
            console.log(`✓ Element screenshot saved: ${elementPath} (${selector})`);
          }
        } catch (error) {
          console.error(`✗ Error capturing element ${selector}:`, error.message);
        }
      }
    }

    // Only capture common sections if explicitly requested with -c flag
    if (captureCommon) {
      const commonSelectors = [
        { selector: 'header', name: 'header' },
        { selector: 'nav', name: 'navigation' },
        { selector: 'main', name: 'main-content' },
        { selector: 'footer', name: 'footer' },
        { selector: '.hero, [class*="hero"]', name: 'hero-section' },
        { selector: '.products, [class*="product-grid"]', name: 'products-section' }
      ];

      console.log('\nCapturing common sections...');
      for (const { selector, name } of commonSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            const elementPath = path.join(outputDir, `${name}-${timestamp}.png`);
            await element.screenshot({ path: elementPath });
            console.log(`✓ ${name} screenshot saved: ${elementPath}`);
          }
        } catch (error) {
          // Silent fail for optional sections
        }
      }
    }

    // Only save metadata if we captured more than just the main screenshot
    if (elements.length > 0 || captureCommon || errors.length > 0) {
      const metadata = {
        url,
        timestamp,
        viewport: useMobile ? 'mobile' : 'desktop',
        errors: errors.length,
        screenshots: {
          fullPage: fullPage,
          elements: elements,
          capturedCommon: captureCommon
        }
      };

      const metadataPath = path.join(outputDir, `metadata-${timestamp}.json`);
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
      console.log(`\n✓ Metadata saved: ${metadataPath}`);
    }

  } catch (error) {
    console.error('Error during screenshot capture:', error);
    process.exit(1);
  } finally {
    await browserInstance.close();
  }

  console.log('\n✅ Screenshot capture completed!');
})();
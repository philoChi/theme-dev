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
      default: './tests/e2e/console-logs'
    },
    wait: {
      type: 'string',
      short: 'w',
      default: '3000'
    },
    filter: {
      type: 'string',
      short: 'f',
      multiple: true,
      default: []
    },
    browser: {
      type: 'string',
      short: 'b',
      default: 'chromium'
    },
    verbose: {
      type: 'boolean',
      short: 'v',
      default: false
    }
  },
  strict: false,
  allowPositionals: true
});

// Override URL if provided as positional argument
const url = positionals[0] || values.url;
const outputDir = values.output;
const waitTime = parseInt(values.wait);
const filters = values.filter || [];
const browserType = values.browser;
const verbose = values.verbose;

console.log('=== Console Check Configuration ===');
console.log('URL:', url);
console.log('Output directory:', outputDir);
console.log('Wait time:', waitTime, 'ms');
console.log('Browser:', browserType);
console.log('Verbose:', verbose);
if (filters.length > 0) {
  console.log('Filters:', filters);
}
console.log('===================================\n');

// Helper to format stack traces
function formatStackTrace(stack) {
  if (!stack) return '';
  const lines = stack.split('\n');
  return lines
    .map((line, i) => i === 0 ? line : '    ' + line)
    .join('\n');
}

// Helper to categorize console messages
function categorizeMessage(text, type) {
  const categories = {
    react: /react|jsx|component|props|state|hook/i,
    api: /fetch|xhr|api|request|response|graphql|storefront/i,
    routing: /route|navigation|redirect|history|location/i,
    styling: /css|style|tailwind|class|layout/i,
    performance: /performance|slow|lag|memory|optimization/i,
    security: /security|cors|csp|mixed content|unsafe/i,
    deprecation: /deprecated|obsolete|will be removed/i,
    hydration: /hydrat|mismatch|server.*client/i,
    shopify: /shopify|storefront|liquid|metafield|cart/i,
    remix: /remix|loader|action|meta|links/i,
    debug: /\[debug\]|\[DEV\]|debug:/i
  };

  for (const [category, regex] of Object.entries(categories)) {
    if (regex.test(text)) {
      return category;
    }
  }

  return type === 'error' ? 'general-error' : 'general';
}

(async () => {
  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  const browser = await playwright[browserType].launch({
    headless: true
  });

  const page = await browser.newPage();

  const consoleLogs = [];
  const pageErrors = [];
  const networkErrors = [];
  const performanceMetrics = {};

  // Capture all console output
  page.on('console', async msg => {
    try {
      const args = await Promise.all(
        msg.args().map(arg =>
          arg.jsonValue().catch(() => 'Unable to serialize')
        )
      );

      const logEntry = {
        type: msg.type(),
        text: msg.text(),
        args: args,
        location: msg.location(),
        timestamp: new Date().toISOString(),
        category: categorizeMessage(msg.text(), msg.type())
      };

      // Apply filters if specified
      const shouldInclude = filters.length === 0 || filters.some(f =>
        logEntry.type === f ||
        logEntry.category === f ||
        logEntry.text.toLowerCase().includes(f.toLowerCase())
      );

      if (shouldInclude) {
        consoleLogs.push(logEntry);
      }

      // Always show errors and warnings, show others in verbose mode
      if (verbose || logEntry.type === 'error' || logEntry.type === 'warning') {
        if (shouldInclude) {
          const typeColor = {
            'error': '\x1b[31m',    // Red
            'warning': '\x1b[33m',  // Yellow
            'info': '\x1b[36m',     // Cyan
            'log': '\x1b[0m',       // Default
            'debug': '\x1b[90m'     // Gray
          };

          const color = typeColor[msg.type()] || '\x1b[0m';
          const reset = '\x1b[0m';

          console.log(`${color}[${msg.type().toUpperCase()}]${reset} ${msg.text()}`);
          if (logEntry.location.url && logEntry.location.url !== 'about:blank') {
            console.log(`  at ${logEntry.location.url}:${logEntry.location.lineNumber}`);
          }
        }
      }
    } catch (error) {
      console.error('Error processing console message:', error);
    }
  });

  // Capture page errors
  page.on('pageerror', error => {
    const errorEntry = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
    pageErrors.push(errorEntry);
    console.error('🚨 Page error:', error.message);
    if (verbose && error.stack) {
      console.error(formatStackTrace(error.stack));
    }
  });

  // Capture network errors
  page.on('response', response => {
    const status = response.status();
    const url = response.url();

    if (status >= 400) {
      const errorEntry = {
        status,
        statusText: response.statusText(),
        url,
        timestamp: new Date().toISOString()
      };
      networkErrors.push(errorEntry);
      console.error(`🌐 Network error: ${status} ${response.statusText()} - ${url}`);
    }
  });

  // Capture request failures
  page.on('requestfailed', request => {
    const failure = request.failure();
    if (failure) {
      networkErrors.push({
        url: request.url(),
        method: request.method(),
        failure: failure.errorText,
        timestamp: new Date().toISOString()
      });
      console.error(`🌐 Request failed: ${request.url()} - ${failure.errorText}`);
    }
  });

  // Capture unhandled promise rejections
  await page.addInitScript(() => {
    window.addEventListener('unhandledrejection', event => {
      console.error('Unhandled promise rejection:', event.reason);
    });
  });

  console.log(`Navigating to ${url}...`);
  const startTime = Date.now();

  try {
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    if (!response) {
      throw new Error('No response received from server');
    }

    console.log(`Page loaded with status: ${response.status()}`);

    // Wait for any async operations to complete
    console.log(`Waiting ${waitTime}ms for async operations...`);
    await page.waitForTimeout(waitTime);

    // Collect performance metrics
    performanceMetrics.loadTime = Date.now() - startTime;
    // Note: page.metrics() is not available in newer Playwright versions
    try {
      performanceMetrics.metrics = await page.metrics();
    } catch (error) {
      console.log('Note: page.metrics() not available, using alternative performance collection');
      performanceMetrics.metrics = {
        JSEventListeners: 0,
        Nodes: 0,
        LayoutCount: 0,
        RecalcStyleCount: 0,
        LayoutDuration: 0,
        RecalcStyleDuration: 0,
        ScriptDuration: 0,
        TaskDuration: 0,
        JSHeapUsedSize: 0,
        JSHeapTotalSize: 0
      };
    }

    // Log console message count
    console.log(`\n📊 Captured ${consoleLogs.length} console messages`);

    // Check for common issues
    console.log('\n🔍 Checking for common issues...');

    // Check for React errors
    const reactErrors = await page.evaluate(() => {
      const errorOverlay = document.querySelector('#webpack-dev-server-client-overlay');
      const reactErrorBoundary = document.querySelector('[data-react-error-boundary]');
      return {
        hasDevOverlay: !!errorOverlay,
        hasErrorBoundary: !!reactErrorBoundary,
        devOverlayVisible: errorOverlay ? errorOverlay.style.display !== 'none' : false
      };
    });

    if (reactErrors.hasDevOverlay || reactErrors.devOverlayVisible) {
      console.log('⚠️  React development error overlay detected');
    }

    // Check for missing elements
    const elementChecks = [
      { selector: 'header', name: 'Header' },
      { selector: 'nav', name: 'Navigation' },
      { selector: 'main', name: 'Main content' },
      { selector: 'footer', name: 'Footer' }
    ];

    console.log('\n📋 Element checks:');
    for (const { selector, name } of elementChecks) {
      const exists = await page.$(selector);
      console.log(`  ${exists ? '✓' : '✗'} ${name}`);
    }

    // Check for hydration mismatches
    const hydrationErrors = consoleLogs.filter(log =>
      log.category === 'hydration' ||
      log.text.includes('mismatch') ||
      log.text.includes('differ')
    );

    if (hydrationErrors.length > 0) {
      console.log(`\n⚠️  Found ${hydrationErrors.length} potential hydration issues`);
    }

    // Generate timestamp for output files
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Prepare log data
    const logData = {
      url,
      timestamp,
      summary: {
        total: consoleLogs.length,
        errors: consoleLogs.filter(l => l.type === 'error').length,
        warnings: consoleLogs.filter(l => l.type === 'warning').length,
        info: consoleLogs.filter(l => l.type === 'info').length,
        log: consoleLogs.filter(l => l.type === 'log').length,
        debug: consoleLogs.filter(l => l.type === 'debug').length
      },
      categories: consoleLogs.reduce((acc, log) => {
        acc[log.category] = (acc[log.category] || 0) + 1;
        return acc;
      }, {}),
      logs: consoleLogs,
      pageErrors,
      networkErrors,
      performanceMetrics,
      elementChecks: await Promise.all(
        elementChecks.map(async ({ selector, name }) => ({
          name,
          selector,
          exists: !!(await page.$(selector))
        }))
      )
    };

    // Save detailed console log
    const logPath = path.join(outputDir, `console-log-${timestamp}.json`);
    await fs.writeFile(logPath, JSON.stringify(logData, null, 2));
    console.log(`\n✓ Detailed log saved: ${logPath}`);

    // Generate summary report
    const summaryPath = path.join(outputDir, `summary-${timestamp}.txt`);
    const summary = [
      '=== Console Check Summary ===',
      `URL: ${url}`,
      `Timestamp: ${new Date().toISOString()}`,
      `Load time: ${performanceMetrics.loadTime}ms`,
      '',
      '📊 Console Output:',
      `  Total logs: ${consoleLogs.length}`,
      `  Errors: ${logData.summary.errors}`,
      `  Warnings: ${logData.summary.warnings}`,
      `  Info: ${logData.summary.info}`,
      `  Log: ${logData.summary.log}`,
      `  Debug: ${logData.summary.debug}`,
      `  Page errors: ${pageErrors.length}`,
      `  Network errors: ${networkErrors.length}`,
      '',
      '📂 Categories:'
    ];

    Object.entries(logData.categories)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        summary.push(`  ${category}: ${count}`);
      });

    if (pageErrors.length > 0) {
      summary.push('', '🚨 Page Errors:');
      pageErrors.forEach((error, i) => {
        summary.push(`${i + 1}. ${error.message}`);
      });
    }

    if (networkErrors.length > 0) {
      summary.push('', '🌐 Network Errors:');
      networkErrors.forEach((error, i) => {
        if (error.failure) {
          summary.push(`${i + 1}. Failed: ${error.url} - ${error.failure}`);
        } else {
          summary.push(`${i + 1}. ${error.status} - ${error.url}`);
        }
      });
    }

    const criticalErrors = consoleLogs.filter(l =>
      l.type === 'error' &&
      (l.category === 'react' || l.category === 'hydration')
    );

    if (criticalErrors.length > 0) {
      summary.push('', '⚠️  Critical Issues:');
      criticalErrors.forEach((error, i) => {
        summary.push(`${i + 1}. ${error.text}`);
      });
    }

    // Add sample logs if verbose
    if (verbose && consoleLogs.length > 0) {
      summary.push('', '📝 Sample Console Messages:');
      consoleLogs.slice(0, 10).forEach((log, i) => {
        summary.push(`${i + 1}. [${log.type}] ${log.text.substring(0, 100)}${log.text.length > 100 ? '...' : ''}`);
      });
      if (consoleLogs.length > 10) {
        summary.push(`... and ${consoleLogs.length - 10} more messages`);
      }
    }

    await fs.writeFile(summaryPath, summary.join('\n'));
    console.log(`✓ Summary saved: ${summaryPath}`);

    // Print final summary
    console.log('\n' + summary.join('\n'));

  } catch (error) {
    console.error('Error during console check:', error);

    // Still try to save what we captured
    const errorLogPath = path.join(outputDir, `error-log-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    await fs.writeFile(errorLogPath, JSON.stringify({
      error: error.message,
      consoleLogs,
      pageErrors,
      networkErrors
    }, null, 2));
    console.log(`\n✓ Error log saved: ${errorLogPath}`);

    process.exit(1);
  } finally {
    await browser.close();
  }

  console.log('\n✅ Console check completed!');

  // Exit with error code if critical issues found
  if (pageErrors.length > 0 || consoleLogs.some(l => l.type === 'error')) {
    process.exit(1);
  }
})();


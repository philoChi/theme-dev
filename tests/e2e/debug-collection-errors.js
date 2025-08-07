const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Capture ALL console output with details
  const errors = [];
  const warnings = [];
  const logs = [];
  
  page.on('console', async msg => {
    const args = await Promise.all(msg.args().map(arg => arg.jsonValue().catch(() => 'Unable to serialize')));
    const entry = {
      type: msg.type(),
      text: msg.text(),
      args: args,
      location: msg.location()
    };
    
    if (msg.type() === 'error') {
      errors.push(entry);
      console.error('ERROR:', msg.text());
      if (msg.location() && msg.location().url) {
        console.error('  Location:', msg.location().url + ':' + msg.location().lineNumber);
      }
    } else if (msg.type() === 'warning') {
      warnings.push(entry);
      console.warn('WARNING:', msg.text());
    } else {
      logs.push(entry);
    }
  });

  // Capture page errors
  page.on('pageerror', error => {
    console.error('PAGE ERROR:', error.message);
    console.error('  Stack:', error.stack);
    errors.push({
      type: 'pageerror',
      text: error.message,
      stack: error.stack
    });
  });

  // Capture request failures
  page.on('requestfailed', request => {
    console.error('REQUEST FAILED:', request.url());
    console.error('  Failure:', request.failure().errorText);
  });

  console.log('Loading collection page...');
  
  try {
    await page.goto('http://127.0.0.1:42597/collections/all', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    // Wait a bit more to catch any delayed errors
    await page.waitForTimeout(3000);
    
    // Check for specific error patterns in the page
    const pageContent = await page.content();
    
    // Look for common error indicators
    if (pageContent.includes('404') || pageContent.includes('not found')) {
      console.error('Possible 404 error in page content');
    }
    
    // Check if collection data exists
    const collectionDataExists = await page.$('[data-collection-data]') !== null;
    if (collectionDataExists) {
      const collectionData = await page.$eval('[data-collection-data]', el => {
        try {
          return JSON.parse(el.textContent);
        } catch (e) {
          return { parseError: e.message };
        }
      });
      
      if (collectionData.parseError) {
        console.error('Collection data parse error:', collectionData.parseError);
      } else {
        console.log('Collection data loaded successfully');
        console.log('  Products:', collectionData.products?.length || 0);
        console.log('  Has filter options:', !!collectionData.filterOptions);
      }
    }
    
    // Check for missing scripts or stylesheets
    const missingResources = await page.evaluate(() => {
      const missing = [];
      
      // Check scripts
      document.querySelectorAll('script[src]').forEach(script => {
        if (script.src && !script.src.includes('data:')) {
          // Check if script loaded (this is a heuristic)
          if (!script.textContent && !window[script.src]) {
            missing.push({ type: 'script', url: script.src });
          }
        }
      });
      
      // Check stylesheets
      document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
        if (link.href && !link.sheet) {
          missing.push({ type: 'stylesheet', url: link.href });
        }
      });
      
      return missing;
    });
    
    if (missingResources.length > 0) {
      console.error('Missing resources:', missingResources);
    }
    
  } catch (error) {
    console.error('Error during page load:', error.message);
  }
  
  console.log('\n=== ERROR SUMMARY ===');
  console.log('Total errors:', errors.length);
  console.log('Total warnings:', warnings.length);
  
  if (errors.length > 0) {
    console.log('\nDetailed errors:');
    errors.forEach((err, i) => {
      console.log(`\n${i + 1}. ${err.type}:`, err.text);
      if (err.location) {
        console.log('   Location:', err.location);
      }
      if (err.stack) {
        console.log('   Stack:', err.stack);
      }
    });
  }
  
  await browser.close();
})();
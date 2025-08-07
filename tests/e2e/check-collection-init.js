const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch({
    headless: true
  });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Capture console logs
    const consoleLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push({
        type: msg.type(),
        text: text,
        location: msg.location()
      });
      
      // Print relevant logs immediately
      if (text.includes('DEBUG') || text.includes('CollectionPageController') || text.includes('[CollectionPage]')) {
        console.log(`[${msg.type().toUpperCase()}] ${text}`);
      }
    });

    // Capture page errors
    page.on('pageerror', error => {
      console.error('Page error:', error.message);
    });

    console.log('=== Collection Page Initialization Check ===\n');
    console.log('Loading collection page...');
    
    await page.goto('http://127.0.0.1:9292/collections/all', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });

    // Wait a bit for JavaScript to initialize
    await page.waitForTimeout(2000);

    console.log('\n1. Checking DOM elements...');
    
    // Check if section exists
    const sectionExists = await page.$eval('body', () => {
      const section = document.querySelector('.section-collection-page');
      return {
        exists: !!section,
        classes: section ? section.className : null,
        id: section ? section.id : null
      };
    }).catch(() => ({ exists: false }));
    
    console.log(`   - .section-collection-page exists: ${sectionExists.exists}`);
    if (sectionExists.exists) {
      console.log(`     Classes: ${sectionExists.classes}`);
      console.log(`     ID: ${sectionExists.id}`);
    }

    console.log('\n2. Checking JavaScript objects...');
    
    // Check window objects
    const jsState = await page.evaluate(() => {
      return {
        collectionPageController: typeof window.collectionPageController !== 'undefined',
        collectionPageControllerType: typeof window.collectionPageController,
        CollectionPageController: typeof window.CollectionPageController !== 'undefined',
        CollectionPageControllerType: typeof window.CollectionPageController,
        customElementDefined: customElements.get('collection-page-controller') !== undefined
      };
    });
    
    console.log(`   - window.collectionPageController exists: ${jsState.collectionPageController} (${jsState.collectionPageControllerType})`);
    console.log(`   - window.CollectionPageController exists: ${jsState.CollectionPageController} (${jsState.CollectionPageControllerType})`);
    console.log(`   - Custom element 'collection-page-controller' defined: ${jsState.customElementDefined}`);

    console.log('\n3. Loaded JavaScript files:');
    
    // Get all script tags
    const scripts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('script[src]')).map(script => {
        const src = script.src;
        const filename = src.split('/').pop().split('?')[0];
        return {
          filename,
          fullUrl: src,
          isCollectionPage: src.includes('section-collection-page')
        };
      });
    });
    
    scripts.forEach(script => {
      if (script.isCollectionPage) {
        console.log(`   - [COLLECTION PAGE] ${script.filename}`);
      } else {
        console.log(`   - ${script.filename}`);
      }
    });

    console.log('\n4. Checking for inline scripts...');
    
    const inlineScripts = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script:not([src])')).map((script, index) => {
        const content = script.textContent.trim();
        const hasCollectionPage = content.includes('CollectionPageController') || 
                                 content.includes('collection-page-controller');
        return {
          index,
          length: content.length,
          hasCollectionPage,
          preview: content.substring(0, 100)
        };
      });
      return scripts.filter(s => s.hasCollectionPage || s.length > 50);
    });
    
    console.log(`   Found ${inlineScripts.length} relevant inline scripts`);
    inlineScripts.forEach(script => {
      if (script.hasCollectionPage) {
        console.log(`   - Script #${script.index} (${script.length} chars) - Contains CollectionPage reference`);
      }
    });

    console.log('\n5. Console log analysis:');
    
    const debugLogs = consoleLogs.filter(log => 
      log.text.includes('DEBUG') || 
      log.text.includes('CollectionPageController') ||
      log.text.includes('[CollectionPage]') ||
      log.text.includes('Initializing') ||
      log.text.includes('connectedCallback')
    );
    
    console.log(`   Total console logs: ${consoleLogs.length}`);
    console.log(`   DEBUG/Collection logs: ${debugLogs.length}`);
    
    if (debugLogs.length > 0) {
      console.log('\n   Collection-related logs:');
      debugLogs.forEach(log => {
        console.log(`   [${log.type}] ${log.text}`);
      });
    }

    console.log('\n6. Testing JavaScript execution...');
    
    // Try to manually trigger initialization
    const manualInit = await page.evaluate(() => {
      try {
        // Check if we can find the controller element
        const element = document.querySelector('[data-collection-page-controller]') || 
                       document.querySelector('.collection-page-controller') ||
                       document.querySelector('#collection-page-controller');
        
        if (element) {
          // Try to access methods
          return {
            elementFound: true,
            tagName: element.tagName,
            hasInit: typeof element.init === 'function',
            hasConnectedCallback: typeof element.connectedCallback === 'function',
            dataset: Object.keys(element.dataset || {})
          };
        }
        
        return { elementFound: false };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('   Manual element check:', JSON.stringify(manualInit, null, 2));

    console.log('\n7. Checking for JavaScript errors...');
    
    // Check for any syntax errors in collection page script
    const scriptErrors = await page.evaluate(async () => {
      try {
        const response = await fetch('/assets/section-collection-page.js');
        const scriptText = await response.text();
        
        // Basic syntax check
        try {
          new Function(scriptText);
          return { valid: true, length: scriptText.length };
        } catch (error) {
          return { valid: false, error: error.message };
        }
      } catch (error) {
        return { fetchError: error.message };
      }
    });
    
    console.log('   Script syntax check:', JSON.stringify(scriptErrors, null, 2));

    console.log('\n8. Checking flickering behavior...');
    
    // Monitor for style changes
    const flickerCheck = await page.evaluate(() => {
      const grid = document.querySelector('[data-product-grid]');
      if (!grid) return { gridFound: false };
      
      let changeCount = 0;
      const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            changeCount++;
          }
        });
      });
      
      observer.observe(grid, { 
        attributes: true, 
        attributeFilter: ['style'],
        subtree: true 
      });
      
      // Wait and return results
      return new Promise(resolve => {
        setTimeout(() => {
          observer.disconnect();
          resolve({
            gridFound: true,
            styleChanges: changeCount,
            currentDisplay: grid.style.display || 'not set'
          });
        }, 2000);
      });
    });
    
    console.log('   Flicker check (2 seconds):', JSON.stringify(flickerCheck, null, 2));

    console.log('\n=== Summary ===');
    console.log(`- Section element exists: ${sectionExists.exists}`);
    console.log(`- Controller initialized: ${jsState.collectionPageController || jsState.customElementDefined}`);
    console.log(`- Collection page JS loaded: ${scripts.some(s => s.isCollectionPage)}`);
    console.log(`- DEBUG logs found: ${debugLogs.length > 0}`);
    console.log(`- Flickering detected: ${flickerCheck.styleChanges > 0 ? `Yes (${flickerCheck.styleChanges} changes)` : 'No'}`);

  } catch (error) {
    console.error('Script error:', error);
  } finally {
    await browser.close();
  }
})();
const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch({
    headless: true
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();

    // Add console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser console error:', msg.text());
      }
    });

    console.log('1. Opening collection page...');
    await page.goto('http://127.0.0.1:9292/collections/all', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(2000);

    console.log('2. Looking for filter button...');
    
    // Try multiple possible selectors for the filter button
    const filterButtonSelectors = [
      '[data-filter-button]',
      '[data-drawer-trigger="filter"]',
      'button:has-text("Filter")',
      '.filter-button',
      '[aria-label*="filter" i]',
      'button[class*="filter"]'
    ];

    let filterButton = null;
    let usedSelector = null;

    for (const selector of filterButtonSelectors) {
      try {
        filterButton = await page.$(selector);
        if (filterButton) {
          usedSelector = selector;
          console.log(`   Found filter button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue trying other selectors
      }
    }

    if (!filterButton) {
      console.log('   ERROR: Could not find filter button!');
      console.log('   Looking for any buttons on the page...');
      
      const allButtons = await page.$$eval('button', buttons => 
        buttons.map(btn => ({
          text: btn.textContent.trim(),
          class: btn.className,
          id: btn.id,
          dataAttrs: Object.keys(btn.dataset).map(key => `data-${key}="${btn.dataset[key]}"`)
        }))
      );
      
      console.log('   All buttons found:');
      allButtons.forEach(btn => {
        console.log(`   - Text: "${btn.text}", Class: "${btn.class}", ID: "${btn.id}"`);
        if (btn.dataAttrs.length > 0) {
          console.log(`     Data attributes: ${btn.dataAttrs.join(', ')}`);
        }
      });
    } else {
      console.log('3. Clicking filter button...');
      await filterButton.click();
      await page.waitForTimeout(1000);

      console.log('4. Taking screenshot of opened drawer...');
      await page.screenshot({
        path: 'tests/e2e/screenshots/filter-drawer-open.png',
        fullPage: false
      });

      console.log('5. Inspecting filter drawer content...');
      
      // Try to find the drawer container
      const drawerSelectors = [
        '[data-drawer-content="filter"]',
        '[data-drawer="filter"]',
        '.drawer-content--filter',
        '.filter-drawer',
        '[class*="drawer"][class*="filter"]',
        '.drawer.is-open'
      ];

      let drawerContent = null;
      let drawerSelector = null;

      for (const selector of drawerSelectors) {
        try {
          drawerContent = await page.$(selector);
          if (drawerContent) {
            drawerSelector = selector;
            console.log(`   Found drawer with selector: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue trying
        }
      }

      if (!drawerContent) {
        console.log('   Could not find drawer content container!');
        console.log('   Looking for any visible drawer-like elements...');
        
        const visibleDrawers = await page.$$eval('[class*="drawer"]:not([style*="display: none"])', drawers => 
          drawers.map(d => ({
            class: d.className,
            id: d.id,
            visible: window.getComputedStyle(d).display !== 'none',
            html: d.innerHTML.substring(0, 200) + '...'
          }))
        );
        
        console.log('   Visible drawer elements:');
        visibleDrawers.forEach(d => {
          console.log(`   - Class: "${d.class}", ID: "${d.id}", Visible: ${d.visible}`);
        });
      } else {
        // Get the full HTML structure of the drawer
        const drawerHTML = await drawerContent.evaluate(el => el.innerHTML);
        console.log('\n   Drawer HTML Structure (first 1000 chars):');
        console.log(drawerHTML.substring(0, 1000));
        console.log('...\n');

        // Find all interactive elements
        console.log('6. Finding all interactive elements in drawer...');
        
        const interactiveElements = await drawerContent.$$eval('input, button, select, [role="checkbox"], [role="button"]', elements => 
          elements.map(el => ({
            tag: el.tagName.toLowerCase(),
            type: el.type || '',
            name: el.name || '',
            id: el.id || '',
            class: el.className || '',
            value: el.value || '',
            checked: el.checked || false,
            text: el.textContent.trim().substring(0, 50),
            dataAttrs: Object.keys(el.dataset).map(key => `data-${key}="${el.dataset[key]}"`)
          }))
        );

        console.log(`   Found ${interactiveElements.length} interactive elements:`);
        interactiveElements.forEach((el, index) => {
          console.log(`\n   [${index + 1}] ${el.tag}${el.type ? `[type="${el.type}"]` : ''}`);
          if (el.id) console.log(`      ID: "${el.id}"`);
          if (el.class) console.log(`      Class: "${el.class}"`);
          if (el.name) console.log(`      Name: "${el.name}"`);
          if (el.value) console.log(`      Value: "${el.value}"`);
          if (el.checked) console.log(`      Checked: ${el.checked}`);
          if (el.text) console.log(`      Text: "${el.text}"`);
          if (el.dataAttrs.length > 0) {
            console.log(`      Data attributes: ${el.dataAttrs.join(', ')}`);
          }
        });

        // Look specifically for filter options
        console.log('\n7. Looking for filter option containers...');
        
        const filterContainers = await drawerContent.$$eval('[class*="filter"], [data-filter], [role="group"]', containers => 
          containers.map(c => ({
            class: c.className,
            id: c.id,
            dataAttrs: Object.keys(c.dataset).map(key => `data-${key}="${c.dataset[key]}"`),
            childCount: c.children.length,
            text: c.textContent.trim().substring(0, 100)
          }))
        );

        console.log(`   Found ${filterContainers.length} potential filter containers:`);
        filterContainers.forEach((c, index) => {
          console.log(`\n   [${index + 1}] Container`);
          console.log(`      Class: "${c.class}"`);
          if (c.id) console.log(`      ID: "${c.id}"`);
          console.log(`      Children: ${c.childCount}`);
          if (c.dataAttrs.length > 0) {
            console.log(`      Data attributes: ${c.dataAttrs.join(', ')}`);
          }
          console.log(`      Text preview: "${c.text}..."`);
        });

        // Check for any form elements
        console.log('\n8. Checking for form elements...');
        const forms = await drawerContent.$$eval('form', forms => 
          forms.map(f => ({
            id: f.id,
            class: f.className,
            action: f.action,
            method: f.method,
            inputCount: f.querySelectorAll('input').length
          }))
        );

        if (forms.length > 0) {
          console.log(`   Found ${forms.length} forms:`);
          forms.forEach(f => {
            console.log(`   - Form: ID="${f.id}", Class="${f.class}", Inputs=${f.inputCount}`);
          });
        }

        // Take a full page screenshot to see the entire structure
        console.log('\n9. Taking full page screenshot...');
        await page.screenshot({
          path: 'tests/e2e/screenshots/filter-drawer-fullpage.png',
          fullPage: true
        });
      }

      // Also check the network requests to see if filters are loaded dynamically
      console.log('\n10. Checking if filters might be loaded dynamically...');
      const requests = [];
      page.on('request', request => {
        if (request.url().includes('filter') || request.url().includes('facet')) {
          requests.push({
            url: request.url(),
            method: request.method()
          });
        }
      });

      // Wait a bit to see if any requests are made
      await page.waitForTimeout(2000);
      
      if (requests.length > 0) {
        console.log('   Dynamic filter requests detected:');
        requests.forEach(r => {
          console.log(`   - ${r.method} ${r.url}`);
        });
      }
    }

  } catch (error) {
    console.error('Error during inspection:', error);
  } finally {
    await browser.close();
    console.log('\nInspection completed!');
    console.log('Check the screenshots in tests/e2e/screenshots/');
  }
})();
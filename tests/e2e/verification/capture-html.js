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
            default: './tests/e2e/html-captures'
        },
        element: {
            type: 'string',
            short: 'e',
            multiple: true,
            default: []
        },
        pretty: {
            type: 'boolean',
            short: 'p',
            default: true
        },
        wait: {
            type: 'string',
            short: 'w',
            default: '3000'
        },
        timeout: {
            type: 'string',
            short: 't',
            default: '60000'
        },
        waitUntil: {
            type: 'string',
            default: 'domcontentloaded'
        },
        analyze: {
            type: 'boolean',
            short: 'a',
            default: true
        },
        browser: {
            type: 'string',
            short: 'b',
            default: 'chromium'
        }
    },
    strict: false,
    allowPositionals: true
});

// Try to read URL from working-url.md, fallback to provided URL
let defaultUrl = values.url;
try {
    const shopifyUrlContent = await fs.readFile('working-url.md', 'utf8');
    defaultUrl = shopifyUrlContent.trim();
} catch (err) {
    // File doesn't exist, use default
}

// Override URL if provided as positional argument
const url = values.url || defaultUrl;
const outputDir = values.output;
const elements = values.element || [];
const prettyPrint = values.pretty;
const waitTime = parseInt(values.wait);
const timeout = parseInt(values.timeout);
const waitUntil = values.waitUntil;
const analyze = values.analyze;
const browserType = values.browser;

console.log('=== HTML Capture Configuration ===');
console.log('URL:', url);
console.log('Output directory:', outputDir);
console.log('Pretty print:', prettyPrint);
console.log('Analyze structure:', analyze);
console.log('Browser:', browserType);
console.log('Wait time:', waitTime, 'ms');
console.log('Timeout:', timeout, 'ms');
console.log('Wait strategy:', waitUntil);
if (elements.length > 0) {
    console.log('Elements to capture:', elements);
}
console.log('==================================\n');

// Helper function to format HTML
function formatHtml(html, indent = 0) {
    if (!prettyPrint) return html;

    const lines = html.split('\n');
    const formatted = [];
    let currentIndent = indent;

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) {
            if (trimmed.startsWith('</')) currentIndent--;
            formatted.push('  '.repeat(Math.max(0, currentIndent)) + trimmed);
            if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.endsWith('/>') && !trimmed.includes('</')) {
                currentIndent++;
            }
        }
    }

    return formatted.join('\n');
}

// Helper function to analyze HTML structure
function analyzeHtml(html) {
    const analysis = {
        totalElements: 0,
        elementTypes: {},
        classes: new Set(),
        ids: new Set(),
        dataAttributes: new Set(),
        images: 0,
        links: 0,
        forms: 0,
        scripts: 0,
        stylesheets: 0
    };

    // Count elements
    const elementMatches = html.match(/<([a-zA-Z][a-zA-Z0-9]*)/g) || [];
    analysis.totalElements = elementMatches.length;

    elementMatches.forEach(match => {
        const tag = match.substring(1).toLowerCase();
        analysis.elementTypes[tag] = (analysis.elementTypes[tag] || 0) + 1;
    });

    // Extract classes
    const classMatches = html.match(/class="([^"]*)"/g) || [];
    classMatches.forEach(match => {
        const classes = match.match(/class="([^"]*)"/)[1].split(' ');
        classes.forEach(cls => analysis.classes.add(cls));
    });

    // Extract IDs
    const idMatches = html.match(/id="([^"]*)"/g) || [];
    idMatches.forEach(match => {
        const id = match.match(/id="([^"]*)"/)[1];
        analysis.ids.add(id);
    });

    // Extract data attributes
    const dataMatches = html.match(/data-[a-zA-Z-]*="[^"]*"/g) || [];
    dataMatches.forEach(match => {
        const attr = match.split('=')[0];
        analysis.dataAttributes.add(attr);
    });

    // Count specific elements
    analysis.images = (html.match(/<img/g) || []).length;
    analysis.links = (html.match(/<a\s/g) || []).length;
    analysis.forms = (html.match(/<form/g) || []).length;
    analysis.scripts = (html.match(/<script/g) || []).length;
    analysis.stylesheets = (html.match(/<link[^>]*stylesheet/g) || []).length;

    return analysis;
}

(async () => {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Launch browser
    const browserInstance = await playwright[browserType].launch({
        headless: true
    });

    const context = await browserInstance.newContext({
        viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();

    // Set up console and error tracking
    const consoleLogs = [];
    const errors = [];

    page.on('console', msg => {
        consoleLogs.push({
            type: msg.type(),
            text: msg.text()
        });
    });

    page.on('pageerror', error => {
        errors.push({
            message: error.message,
            stack: error.stack
        });
    });

    try {
        console.log(`Navigating to ${url}...`);

        // Try multiple strategies for reliable loading
        try {
            await page.goto(url, {
                waitUntil: waitUntil,
                timeout: timeout
            });
            console.log(`✓ Page loaded (${waitUntil})`);
        } catch (error) {
            if (error.name === 'TimeoutError') {
                console.log(`⚠️  ${waitUntil} timeout, trying domcontentloaded...`);
                try {
                    await page.goto(url, {
                        waitUntil: 'domcontentloaded',
                        timeout: Math.floor(timeout * 0.75)
                    });
                    console.log('✓ Page loaded (domcontentloaded fallback)');
                } catch (fallbackError) {
                    console.log('⚠️  Fallback timeout, proceeding with basic navigation...');
                    await page.goto(url, {
                        waitUntil: 'commit',
                        timeout: Math.floor(timeout * 0.5)
                    });
                    console.log('✓ Page navigation committed');
                }
            } else {
                throw error;
            }
        }

        // Wait for any async operations
        await page.waitForTimeout(waitTime);

        // Generate timestamp for unique filenames
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        // Only capture full page HTML if no specific elements are requested
        if (elements.length === 0) {
            // Capture full page HTML
            const fullHtml = await page.content();
            const fullHtmlPath = path.join(outputDir, `full-page-${timestamp}.html`);
            await fs.writeFile(fullHtmlPath, formatHtml(fullHtml));
            console.log(`✓ Full page HTML saved: ${fullHtmlPath}`);

            // Analyze full page if requested
            if (analyze) {
                const analysis = analyzeHtml(fullHtml);
                const analysisPath = path.join(outputDir, `analysis-${timestamp}.json`);
                await fs.writeFile(analysisPath, JSON.stringify(analysis, null, 2));
                console.log(`✓ Page analysis saved: ${analysisPath}`);

                // Print summary
                console.log('\n📊 Page Analysis Summary:');
                console.log(`  Total elements: ${analysis.totalElements}`);
                console.log(`  Unique classes: ${analysis.classes.size}`);
                console.log(`  Unique IDs: ${analysis.ids.size}`);
                console.log(`  Images: ${analysis.images}`);
                console.log(`  Links: ${analysis.links}`);
                console.log(`  Forms: ${analysis.forms}`);
                console.log(`  Scripts: ${analysis.scripts}`);
                console.log(`  Stylesheets: ${analysis.stylesheets}`);

                // Top 5 element types
                const topElements = Object.entries(analysis.elementTypes)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5);
                console.log('\n  Top 5 element types:');
                topElements.forEach(([tag, count]) => {
                    console.log(`    ${tag}: ${count}`);
                });
            }
        } else {
            console.log('Specific elements requested - skipping full page capture');
        }

        // Capture specific elements
        for (const selector of elements) {
            try {
                const element = await page.$(selector);
                if (element) {
                    const elementHtml = await element.evaluate(el => el.outerHTML);
                    const elementPath = path.join(
                        outputDir,
                        `element-${selector.replace(/[^a-zA-Z0-9]/g, '-')}-${timestamp}.html`
                    );
                    await fs.writeFile(elementPath, formatHtml(elementHtml));
                    console.log(`✓ Element HTML saved: ${elementPath} (${selector})`);

                    if (analyze) {
                        const elementAnalysis = analyzeHtml(elementHtml);
                        console.log(`  └─ Elements: ${elementAnalysis.totalElements}, Classes: ${elementAnalysis.classes.size}`);
                    }
                } else {
                    console.error(`✗ Element not found: ${selector}`);
                }
            } catch (error) {
                console.error(`✗ Error capturing element ${selector}:`, error.message);
            }
        }

        // Extract component structure if no specific elements provided
        if (elements.length === 0) {
            console.log('\nExtracting common components...');

            const componentSelectors = [
                { selector: 'header', name: 'header' },
                { selector: 'nav', name: 'navigation' },
                { selector: 'main', name: 'main-content' },
                { selector: 'footer', name: 'footer' },
                { selector: '[data-testid]', name: 'testid-elements', all: true },
                { selector: '[class*="error"], [class*="Error"]', name: 'error-elements', all: true }
            ];

            for (const { selector, name, all } of componentSelectors) {
                try {
                    if (all) {
                        const elements = await page.$$(selector);
                        if (elements.length > 0) {
                            const allHtml = await Promise.all(
                                elements.map(el => el.evaluate(e => e.outerHTML))
                            );
                            const componentPath = path.join(outputDir, `${name}-${timestamp}.html`);
                            await fs.writeFile(componentPath, formatHtml(allHtml.join('\n\n')));
                            console.log(`✓ ${name} captured: ${elements.length} elements`);
                        }
                    } else {
                        const element = await page.$(selector);
                        if (element) {
                            const elementHtml = await element.evaluate(el => el.outerHTML);
                            const componentPath = path.join(outputDir, `${name}-${timestamp}.html`);
                            await fs.writeFile(componentPath, formatHtml(elementHtml));
                            console.log(`✓ ${name} HTML saved`);
                        }
                    }
                } catch (error) {
                    // Silent fail for optional components
                }
            }
        }

        // Extract inline styles and scripts only if no specific elements requested
        if (elements.length === 0) {
            const inlineStyles = await page.$$eval('style', styles =>
                styles.map(style => style.textContent)
            );
            if (inlineStyles.length > 0) {
                const stylesPath = path.join(outputDir, `inline-styles-${timestamp}.css`);
                await fs.writeFile(stylesPath, inlineStyles.join('\n\n'));
                console.log(`✓ Inline styles saved: ${stylesPath}`);
            }

            // Save page metadata
            const metadata = {
                url,
                timestamp,
                title: await page.title(),
                viewport: await page.viewportSize(),
                errors: errors.length,
                warnings: consoleLogs.filter(log => log.type === 'warning').length,
                consoleErrors: consoleLogs.filter(log => log.type === 'error').length
            };

            const metadataPath = path.join(outputDir, `metadata-${timestamp}.json`);
            await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
            console.log(`✓ Metadata saved: ${metadataPath}`);
        }

        // Report any errors
        const consoleErrors = consoleLogs.filter(log => log.type === 'error').length;
        const warnings = consoleLogs.filter(log => log.type === 'warning').length;
        
        if (errors.length > 0 || consoleErrors > 0) {
            console.log('\n⚠️  Errors detected:');
            console.log(`  Page errors: ${errors.length}`);
            console.log(`  Console errors: ${consoleErrors}`);
            console.log(`  Console warnings: ${warnings}`);
        }

    } catch (error) {
        console.error('Error during HTML capture:', error);
        process.exit(1);
    } finally {
        await browserInstance.close();
    }

    console.log('\n✅ HTML capture completed!');
})();


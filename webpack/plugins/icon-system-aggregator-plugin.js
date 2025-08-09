/**
 * Icon System Aggregator Plugin
 * 
 * This webpack plugin:
 * 1. Discovers all icon assets from bundle-specific assets/ folders
 * 2. Copies them to the theme assets folder
 * 3. Collects icon snippet files from bundles
 * 4. Merges them into a single master icon-system-vars.liquid snippet
 * 
 * Usage in webpack.config.js:
 * new IconSystemAggregatorPlugin({
 *   bundleBasePath: 'src/bundles',
 *   outputPath: 'theme-hyspex',
 *   iconFilePattern: /^icon-.*\.svg$/
 * })
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

class IconSystemAggregatorPlugin {
  constructor(options = {}) {
    this.options = {
      bundleBasePath: options.bundleBasePath || 'src/bundles',
      outputPath: options.outputPath || 'theme-hyspex',
      iconFilePattern: options.iconFilePattern || /^icon-.*\.svg$/,
      masterSnippetName: options.masterSnippetName || 'snippet-icon-system-vars.liquid',
      ...options
    };
  }

  apply(compiler) {
    // Run after compilation and after copy plugin
    compiler.hooks.afterEmit.tap('IconSystemAggregatorPlugin', () => {
      this.processIconSystem(compiler);
    });
  }

  processIconSystem(compiler) {
    const { bundleBasePath, outputPath, iconFilePattern, masterSnippetName } = this.options;
    
    try {
      // 1. Discover all icon assets from bundle assets/ folders
      const iconAssets = this.discoverIconAssets(bundleBasePath, iconFilePattern);
      
      // 2. Copy icon assets to theme assets folder
      this.copyIconAssets(iconAssets, outputPath);
      
      // 3. Discover and merge icon snippets
      const iconSnippets = this.discoverIconSnippets(bundleBasePath);
      
      // 4. Generate master icon system snippet
      this.generateMasterSnippet(iconAssets, iconSnippets, outputPath, masterSnippetName);
      
      console.log(`[IconSystemAggregator] Processed ${iconAssets.length} icons from ${iconSnippets.length} bundles`);
      
    } catch (error) {
      console.error('[IconSystemAggregator] Error processing icon system:', error);
    }
  }

  /**
   * Discover all icon assets from bundle-specific assets/ folders only
   */
  discoverIconAssets(bundleBasePath, iconFilePattern) {
    const iconAssets = [];
    
    // Search for assets/ folders in all bundles (distributed approach only)
    const assetsPattern = path.join(bundleBasePath, '**/assets/*.svg');
    const svgFiles = glob.sync(assetsPattern);
    
    svgFiles.forEach(filePath => {
      const fileName = path.basename(filePath);
      
      // Check if file matches icon pattern
      if (iconFilePattern.test(fileName)) {
        const relativePath = path.relative(bundleBasePath, filePath);
        const bundlePath = this.extractBundlePath(relativePath);
        
        iconAssets.push({
          fileName: fileName,
          sourceFile: filePath,
          bundlePath: bundlePath,
          iconName: this.extractIconName(fileName),
          source: 'distributed'
        });
      }
    });
    
    return iconAssets;
  }

  /**
   * Copy icon assets to theme assets folder
   */
  copyIconAssets(iconAssets, outputPath) {
    const assetsDir = path.join(outputPath, 'assets');
    
    // Ensure assets directory exists
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }
    
    iconAssets.forEach(asset => {
      const destPath = path.join(assetsDir, asset.fileName);
      
      try {
        fs.copyFileSync(asset.sourceFile, destPath);
      } catch (error) {
        console.warn(`[IconSystemAggregator] Failed to copy ${asset.fileName}:`, error.message);
      }
    });
  }

  /**
   * Discover icon snippet files from bundles
   */
  discoverIconSnippets(bundleBasePath) {
    const iconSnippets = [];
    
    // Look for icon snippet files (various naming patterns)
    const snippetPatterns = [
      path.join(bundleBasePath, '**/snippets/*icon*.liquid'),
      path.join(bundleBasePath, '**/snippets/*-icons.liquid')
    ];
    
    snippetPatterns.forEach(pattern => {
      const snippetFiles = glob.sync(pattern);
      
      snippetFiles.forEach(filePath => {
        const relativePath = path.relative(bundleBasePath, filePath);
        const bundlePath = this.extractBundlePath(relativePath);
        const fileName = path.basename(filePath, '.liquid');
        
        // Skip master snippet files to avoid circular inclusion
        if (!fileName.includes('icon-system-vars') && !fileName.includes('master')) {
          iconSnippets.push({
            fileName: fileName,
            sourceFile: filePath,
            bundlePath: bundlePath,
            content: this.readSnippetContent(filePath)
          });
        }
      });
    });
    
    return iconSnippets;
  }

  /**
   * Generate the master icon system snippet
   */
  generateMasterSnippet(iconAssets, iconSnippets, outputPath, masterSnippetName) {
    const snippetsDir = path.join(outputPath, 'snippets');
    
    // Ensure snippets directory exists
    if (!fs.existsSync(snippetsDir)) {
      fs.mkdirSync(snippetsDir, { recursive: true });
    }
    
    // Group icons by category/bundle for better organization
    const iconsByBundle = this.groupIconsByBundle(iconAssets);
    
    // Generate master snippet content
    const snippetContent = this.generateSnippetContent(iconsByBundle, iconSnippets);
    
    // Write master snippet file
    const masterSnippetPath = path.join(snippetsDir, masterSnippetName);
    fs.writeFileSync(masterSnippetPath, snippetContent, 'utf8');
    
    console.log(`[IconSystemAggregator] Generated master snippet at: ${masterSnippetPath}`);
  }

  /**
   * Group icons by their bundle for organized output
   */
  groupIconsByBundle(iconAssets) {
    const grouped = {};
    
    iconAssets.forEach(asset => {
      if (!grouped[asset.bundlePath]) {
        grouped[asset.bundlePath] = [];
      }
      grouped[asset.bundlePath].push(asset);
    });
    
    // Sort icons within each bundle
    Object.keys(grouped).forEach(bundlePath => {
      grouped[bundlePath].sort((a, b) => a.fileName.localeCompare(b.fileName));
    });
    
    return grouped;
  }

  /**
   * Generate the final snippet content
   */
  generateSnippetContent(iconsByBundle, iconSnippets) {
    const lines = [];
    
    // Header
    lines.push('{%- comment -%}');
    lines.push('  Master Icon System CSS Variables');
    lines.push('  Auto-generated by IconSystemAggregatorPlugin');
    lines.push('  Combines icons from all bundles into a single CSS variables definition');
    lines.push('  Last updated: ' + new Date().toISOString());
    lines.push('{%- endcomment -%}');
    lines.push('');
    lines.push('<style>');
    lines.push(':root {');
    
    // Generate CSS variables for each bundle
    const bundleOrder = this.getBundleOrder(Object.keys(iconsByBundle));
    
    bundleOrder.forEach(bundlePath => {
      const icons = iconsByBundle[bundlePath];
      if (icons && icons.length > 0) {
        lines.push('');
        lines.push(`  /* ${this.formatBundleName(bundlePath)} Icons */`);
        
        icons.forEach(icon => {
          const cssVarName = `--${icon.iconName}`;
          const assetUrl = `{{ '${icon.fileName}' | asset_url }}`;
          lines.push(`  ${cssVarName}: url('${assetUrl}');`);
        });
      }
    });
    
    // Include any additional CSS variables from bundle-specific snippets
    if (iconSnippets.length > 0) {
      lines.push('');
      lines.push('  /* Bundle-specific additional icon variables */');
      
      // Group snippets by bundle to avoid duplicates
      const snippetsByBundle = {};
      iconSnippets.forEach(snippet => {
        if (!snippetsByBundle[snippet.bundlePath]) {
          snippetsByBundle[snippet.bundlePath] = [];
        }
        snippetsByBundle[snippet.bundlePath].push(snippet);
      });
      
      Object.keys(snippetsByBundle).forEach(bundlePath => {
        const bundleSnippets = snippetsByBundle[bundlePath];
        const allVars = new Set(); // Use Set to avoid duplicates
        
        bundleSnippets.forEach(snippet => {
          const extractedVars = this.extractCssVariables(snippet.content);
          extractedVars.forEach(varLine => allVars.add(varLine));
        });
        
        if (allVars.size > 0) {
          lines.push(`  /* From ${bundlePath} */`);
          Array.from(allVars).forEach(varLine => {
            lines.push(`  ${varLine}`);
          });
        }
      });
    }
    
    lines.push('}');
    lines.push('</style>');
    
    return lines.join('\n');
  }

  /**
   * Helper methods
   */
  extractBundlePath(relativePath) {
    const parts = relativePath.split(path.sep);
    return parts.slice(0, -2).join('/'); // Remove '/assets/filename.svg' or '/snippets/filename.liquid'
  }

  extractIconName(fileName) {
    return path.basename(fileName, '.svg');
  }

  readSnippetContent(filePath) {
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      console.warn(`[IconSystemAggregator] Failed to read snippet ${filePath}:`, error.message);
      return '';
    }
  }

  formatBundleName(bundlePath) {
    return bundlePath
      .split('/')
      .map(part => part.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' '))
      .join(' / ');
  }

  getBundleOrder(bundlePaths) {
    // Define preferred order for better organization
    const orderMap = {
      'global': 1,
      'shared-features': 2,
      'page-specific': 3,
      'section-specific': 4
    };
    
    return bundlePaths.sort((a, b) => {
      const aOrder = orderMap[a.split('/')[0]] || 99;
      const bOrder = orderMap[b.split('/')[0]] || 99;
      
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      
      return a.localeCompare(b);
    });
  }

  extractCssVariables(content) {
    const variables = [];
    const lines = content.split('\n');
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('--') && trimmed.includes('url(')) {
        variables.push(trimmed);
      }
    });
    
    return variables;
  }
}

module.exports = IconSystemAggregatorPlugin;

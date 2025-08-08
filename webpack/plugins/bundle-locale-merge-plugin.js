/**
 * Bundle Locale Merge Plugin
 * 
 * This webpack plugin collects locale files from individual bundle directories and merges them
 * with product configuration, maintaining Shopify's locale file structure.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

class BundleLocaleMergePlugin {
  constructor(options = {}) {
    this.options = {
      bundleBasePath: 'src/bundles',
      configPath: 'src/config/product-info.de.json',
      metadataPath: 'src/config/locale-metadata.json',
      outputPath: 'theme-hyspex/locales',
      ...options
    };
  }

  apply(compiler) {
    compiler.hooks.beforeCompile.tapAsync('BundleLocaleMergePlugin', (params, callback) => {
      this.mergeAllLocales(compiler.context)
        .then(() => callback())
        .catch(callback);
    });
  }

  async mergeAllLocales(context) {
    const bundleBasePath = path.resolve(context, this.options.bundleBasePath);
    const configPath = path.resolve(context, this.options.configPath);
    const metadataPath = path.resolve(context, this.options.metadataPath);
    const outputPath = path.resolve(context, this.options.outputPath);

    try {
      // Ensure the output directory exists
      if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
      }

      // Find all bundle locale files
      const bundleLocaleFiles = this.findBundleLocaleFiles(bundleBasePath);

      // Read product configuration and metadata
      const configData = this.readJsonFile(configPath);
      const metadataData = this.readJsonFile(metadataPath);

      // Process each locale (currently only de.default.json and de.default.schema.json)
      const localeNames = ['de.default.json', 'de.default.schema.json'];

      for (const localeName of localeNames) {
        await this.processLocale(localeName, {
          bundleLocaleFiles,
          configData,
          metadataData,
          outputPath
        });
      }

      console.log(`✓ Merged locale files from ${bundleLocaleFiles.length} bundle directories`);
    } catch (error) {
      console.error('Error merging bundle locales:', error);
      throw error;
    }
  }

  findBundleLocaleFiles(bundleBasePath) {
    // Find all locale directories within bundles
    const localePattern = `${bundleBasePath}/**/locales/*.json`;
    return glob.sync(localePattern);
  }



  readJsonFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(content);
        
        return parsed;
      }
    } catch (error) {
      console.warn(`Warning: Could not read ${filePath}:`, error.message);
    }
    return {};
  }

  async processLocale(localeName, { bundleLocaleFiles, configData, metadataData, outputPath }) {
    // Start with empty object as base
    let mergedLocale = {};
    
    // Merge bundle-specific locales
    const relevantBundleFiles = bundleLocaleFiles.filter(file => path.basename(file) === localeName);
    
    for (const bundleFile of relevantBundleFiles) {
      try {
        const content = fs.readFileSync(bundleFile, 'utf8');
        const bundleLocale = JSON.parse(content);
        
        // Simply merge the bundle locale directly without flattening
        mergedLocale = this.deepMerge(mergedLocale, bundleLocale);
        
        console.log(`✓ Merged ${path.relative(process.cwd(), bundleFile)}`);
      } catch (error) {
        console.warn(`Warning: Could not process ${bundleFile}:`, error.message);
      }
    }

    // Add product configurations for main locale file
    if (localeName === 'de.default.json' && (Object.keys(configData).length > 0 || Object.keys(metadataData).length > 0)) {
      mergedLocale.product_configurations = {
        ...metadataData,
        ...configData
      };
    }

    // Write the merged locale file
    const outputFile = path.join(outputPath, localeName);
    const outputContent = JSON.stringify(mergedLocale, null, 2);
    fs.writeFileSync(outputFile, outputContent, 'utf8');

    console.log(`✓ Created merged ${localeName} with ${relevantBundleFiles.length} bundle locales`);
  }

  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    
    return result;
  }
}

module.exports = BundleLocaleMergePlugin;
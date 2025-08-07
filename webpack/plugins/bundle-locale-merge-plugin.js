/**
 * Bundle Locale Merge Plugin
 * 
 * This webpack plugin collects locale files from individual bundle directories and merges them
 * with central locale files and product configuration, maintaining Shopify's locale file structure.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

class BundleLocaleMergePlugin {
  constructor(options = {}) {
    this.options = {
      bundleBasePath: 'src/bundles',
      centralLocalesPath: 'src/localization-common/locales',
      configPath: 'src/localization-common/products-metadata/product-info.de.json',
      metadataPath: 'src/localization-common/products-metadata/locale-metadata.json',
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
    const centralLocalesPath = path.resolve(context, this.options.centralLocalesPath);
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

      // Read central locale files
      const centralLocales = this.readCentralLocales(centralLocalesPath);

      // Read product configuration and metadata
      const configData = this.readJsonFile(configPath);
      const metadataData = this.readJsonFile(metadataPath);

      // Process each locale (currently only de.default.json and de.default.schema.json)
      const localeNames = ['de.default.json', 'de.default.schema.json'];

      for (const localeName of localeNames) {
        await this.processLocale(localeName, {
          bundleLocaleFiles,
          centralLocales,
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

  readCentralLocales(centralPath) {
    const locales = {};
    try {
      // Read de.default.json
      const defaultPath = path.join(centralPath, 'de.default.json');
      if (fs.existsSync(defaultPath)) {
        const content = fs.readFileSync(defaultPath, 'utf8');
        locales['de.default.json'] = JSON.parse(this.cleanJsonContent(content));
      }

      // Read de.default.schema.json
      const schemaPath = path.join(centralPath, 'de.default.schema.json');
      if (fs.existsSync(schemaPath)) {
        const content = fs.readFileSync(schemaPath, 'utf8');
        locales['de.default.schema.json'] = JSON.parse(this.cleanJsonContent(content));
      }
    } catch (error) {
      console.warn('Warning: Could not read central locale files:', error.message);
    }
    return locales;
  }

  readJsonFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(this.cleanJsonContent(content));
      }
    } catch (error) {
      console.warn(`Warning: Could not read ${filePath}:`, error.message);
    }
    return {};
  }

  async processLocale(localeName, { bundleLocaleFiles, centralLocales, configData, metadataData, outputPath }) {
    // Start with central locale as base
    let mergedLocale = centralLocales[localeName] || {};

    // Merge bundle-specific locales
    const relevantBundleFiles = bundleLocaleFiles.filter(file => path.basename(file) === localeName);
    
    for (const bundleFile of relevantBundleFiles) {
      try {
        const content = fs.readFileSync(bundleFile, 'utf8');
        const bundleLocale = JSON.parse(this.cleanJsonContent(content));
        
        // Deep merge the bundle locale into the merged locale
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

  cleanJsonContent(content) {
    // Remove single-line comments (// ...)
    content = content.replace(/\/\/.*$/gm, '');
    
    // Remove multi-line comments (/* ... */)
    content = content.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Remove trailing commas
    content = content.replace(/,(\s*[}\]])/g, '$1');
    
    return content;
  }
}

module.exports = BundleLocaleMergePlugin;
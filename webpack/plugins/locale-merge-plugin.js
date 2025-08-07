/**
 * Locale Merge Plugin
 * 
 * This webpack plugin merges product configuration from src/localization-common/products-metadata/product-info.de.json
 * into the locale files, making the external config the source of truth while maintaining
 * Shopify's locale file structure for Liquid template compatibility.
 */

const fs = require('fs');
const path = require('path');

class LocaleMergePlugin {
  constructor(options = {}) {
    this.options = {
      configPath: 'src/localization-common/products-metadata/product-info.de.json',
      metadataPath: 'src/localization-common/products-metadata/locale-metadata.json',
      localesPath: 'locales',
      ...options
    };
  }

  apply(compiler) {
    compiler.hooks.beforeCompile.tapAsync('LocaleMergePlugin', (params, callback) => {
      this.mergeConfigIntoLocales(compiler.context)
        .then(() => callback())
        .catch(callback);
    });
  }

  async mergeConfigIntoLocales(context) {
    const configPath = path.resolve(context, this.options.configPath);
    const metadataPath = path.resolve(context, this.options.metadataPath);
    const localesPath = path.resolve(context, this.options.localesPath);

    try {
      // Ensure the locales directory exists
      if (!fs.existsSync(localesPath)) {
        fs.mkdirSync(localesPath, { recursive: true });
      }

      // Read the source config and metadata
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const metadataData = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      
      // Find all locale files (or return empty array if directory is empty)
      const localeFiles = fs.existsSync(localesPath) 
        ? fs.readdirSync(localesPath)
            .filter(file => file.endsWith('.json'))
            .map(file => path.join(localesPath, file))
        : [];

      // Process each locale file
      for (const localeFile of localeFiles) {
        await this.processLocaleFile(localeFile, configData, metadataData);
      }

      console.log(`✓ Merged product configuration into ${localeFiles.length} locale files`);
    } catch (error) {
      console.error('Error merging config into locales:', error);
      throw error;
    }
  }

  async processLocaleFile(localeFile, configData, metadataData) {
    try {
      // Read existing locale file
      const localeContent = fs.readFileSync(localeFile, 'utf8');
      
      // Handle JSON with comments by removing comments and trailing commas
      const cleanedContent = this.cleanJsonContent(localeContent);
      const localeData = JSON.parse(cleanedContent);

      // Create or update the product_configurations section
      localeData.product_configurations = {
        ...metadataData,
        ...configData
      };

      // Write the updated locale file
      const updatedContent = JSON.stringify(localeData, null, 2);
      fs.writeFileSync(localeFile, updatedContent, 'utf8');

      console.log(`✓ Updated ${path.basename(localeFile)} with merged product_configurations`);
    } catch (error) {
      console.error(`Error processing locale file ${localeFile}:`, error);
      throw error;
    }
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

module.exports = LocaleMergePlugin;
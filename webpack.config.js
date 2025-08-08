const path = require('path');
const glob = require('glob');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const RemoveEmptyScriptsPlugin = require('webpack-remove-empty-scripts');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const BundleLocaleMergePlugin = require('./webpack/plugins/bundle-locale-merge-plugin');

const isDevelopment = process.env.NODE_ENV !== 'production';
const isAnalyze = process.env.ANALYZE_BUNDLE === 'true';

function generateEntriesAutomatically() {
  const entries = {};
  const srcPath = path.resolve(__dirname, 'src/bundles');
  
  // Helper function to find index files in a directory
  function findIndexFiles(dir) {
    const indexJs = path.join(dir, 'index.js');
    const indexScss = path.join(dir, 'index.scss');
    const files = [];
    
    if (glob.sync(indexJs).length > 0) files.push(indexJs);
    if (glob.sync(indexScss).length > 0) files.push(indexScss);
    
    return files;
  }
  
  // 1. Global theme bundle
  const globalFiles = findIndexFiles(`${srcPath}/bundle-global`);
  if (globalFiles.length > 0) {
    entries['global'] = globalFiles;
  }
  
  // 2. Shared features bundle
  const featuresFiles = findIndexFiles(`${srcPath}/bundle-shared-features`);
  if (featuresFiles.length > 0) {
    entries['features-shared-all'] = featuresFiles;
  }
  
  // 3. Page-specific sections
  glob.sync(`${srcPath}/parts-page-specific/*/*/`).forEach(dir => {
    const indexFiles = findIndexFiles(dir);
    if (indexFiles.length > 0) {
      const dirName = path.basename(dir);
      const pageName = path.basename(path.dirname(dir));
      entries[`section-page-${pageName}-${dirName}`] = indexFiles;
    }
  });
  
  // 4. Individual sections
  glob.sync(`${srcPath}/parts-sections/*/`).forEach(dir => {
    const sectionName = path.basename(dir);
    
    // Check for index files first (unified bundle approach)
    const indexFiles = findIndexFiles(dir);
    if (indexFiles.length > 0) {
      // If index files exist, use them for a unified bundle
      entries[`section-${sectionName}`] = indexFiles;
    } else if (sectionName === 'showcase') {
      // Fallback: Special case for showcase if no index files exist
      // Check for showcase-specific entry files
      const showcaseTabJs = path.join(dir, 'showcase-tab.js');
      const showcaseTabScss = path.join(dir, 'showcase-tab.scss');
      const showcaseSimpleJs = path.join(dir, 'showcase-simple.js');
      const showcaseSimpleScss = path.join(dir, 'showcase-simple.scss');
      
      // Create showcase-tab bundle
      const tabFiles = [];
      if (glob.sync(showcaseTabJs).length > 0) tabFiles.push(showcaseTabJs);
      if (glob.sync(showcaseTabScss).length > 0) tabFiles.push(showcaseTabScss);
      if (tabFiles.length > 0) {
        entries['section-showcase-tab'] = tabFiles;
      }
      
      // Create showcase-simple bundle
      const simpleFiles = [];
      if (glob.sync(showcaseSimpleJs).length > 0) simpleFiles.push(showcaseSimpleJs);
      if (glob.sync(showcaseSimpleScss).length > 0) simpleFiles.push(showcaseSimpleScss);
      if (simpleFiles.length > 0) {
        entries['section-showcase-simple'] = simpleFiles;
      }
    }
  });
  
  console.log('Generated entries:', Object.keys(entries));
  return entries;
}

module.exports = {
  mode: isDevelopment ? 'development' : 'production',
  
  // Use auto-discovery instead of manual entry points
  entry: generateEntriesAutomatically(),
  
  output: {
    path: path.resolve(__dirname, 'theme-hyspex/assets'),
    filename: '[name].js',
    chunkFilename: 'chunks/[name].[contenthash:8].js',
    clean: false, // Don't clean entire assets folder, only webpack generated files
    assetModuleFilename: 'images/[name].[hash][ext]'
  },
  
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                targets: {
                  browsers: ['> 1%', 'last 2 versions', 'IE 11']
                },
                modules: false, // Keep ES modules for tree shaking
                useBuiltIns: 'usage',
                corejs: false // Avoid polyfill conflicts with Shopify
              }]
            ]
          }
        }
      },
      {
        test: /\.scss$/,
        use: [
          MiniCssExtractPlugin.loader, // Always extract CSS to separate file
          {
            loader: 'css-loader',
            options: {
              importLoaders: 2,
              sourceMap: isDevelopment,
              url: false, // Don't process url() in CSS for Shopify compatibility
            }
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  'autoprefixer',
                  ['postcss-preset-env', { stage: 0 }]
                ]
              }
            }
          },
          {
            loader: 'sass-loader',
            options: {
              sassOptions: {
                includePaths: [
                  path.resolve(__dirname, 'src/bundles/bundle-global/styles'),
                  path.resolve(__dirname, 'src/bundles')
                ]
              }
            }
          }
        ]
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
              sourceMap: isDevelopment,
              url: false,
            }
          }
        ]
      },
      {
        test: /\.(png|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.svg$/i,
        oneOf: [
          {
            // Inline SVGs from icons directory as data URIs
            test: /icons.*\.svg$/,
            type: 'asset/inline',
          },
          {
            // Other SVGs as regular resources
            type: 'asset/resource',
          }
        ]
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
      }
    ]
  },
  
  plugins: [
    // Ensure theme directory structure exists
    {
      apply: (compiler) => {
        compiler.hooks.beforeRun.tap('EnsureDirectoriesPlugin', () => {
          const fs = require('fs');
          const themeDir = path.resolve(__dirname, 'theme-hyspex');
          
          // Create all required directories
          const dirs = [
            `${themeDir}/assets`,
            `${themeDir}/config`,
            `${themeDir}/layout`,
            `${themeDir}/locales`,
            `${themeDir}/sections`,
            `${themeDir}/snippets`,
            `${themeDir}/templates/customers`
          ];
          
          dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
          });
        });
      }
    },
    
    // Merge bundle-specific locale files with product configuration
    new BundleLocaleMergePlugin({
      bundleBasePath: 'src/bundles',
      configPath: 'src/config/product-info.de.json',
      metadataPath: 'src/config/locale-metadata.json',
      outputPath: 'theme-hyspex/locales'
    }),
    
    // Clean webpack generated files AND liquid template files
    new CleanWebpackPlugin({
      cleanOnceBeforeBuildPatterns: [
        'section-*.js',
        'section-*.css',
        'section-page-*.js',
        'section-page-*.css',
        'features-*.js',
        'features-*.css',
        'global.js',
        'global.css',
        'chunks/**/*',
        // Clean generated liquid files
        '../snippets/snippet-*.liquid',
        '../snippets/root-*.liquid',
        '../sections/section-*.liquid',
        '../layout/*.liquid',
        // Note: Locale files are handled by BundleLocaleMergePlugin - no need to clean
        // Clean config and template files before copying from source
        '../config/*.json',
        '../templates/**/*'
      ],
      cleanStaleWebpackAssets: false,
      protectWebpackAssets: false,
      dangerouslyAllowCleanPatternsOutsideProject: true,
      dry: false
    }),
    
    // Remove empty JavaScript files when only CSS was generated
    new RemoveEmptyScriptsPlugin(),
    
    // Extract CSS for production
    new MiniCssExtractPlugin({
      filename: '[name].css',
      chunkFilename: 'chunks/[name].[contenthash:8].css'
    }),
    
    // Copy non-bundled assets (maintain existing assets)
    new CopyWebpackPlugin({
      patterns: [
        // Bundle-global section templates with section- prefix
        {
          from: 'src/bundles/bundle-global/**/sections/*.liquid',
          to: ({ absoluteFilename }) => {
            const filename = path.basename(absoluteFilename, '.liquid');
            return `../sections/section-${filename}.liquid`;
          },
          noErrorOnMissing: true
        },
        // Parts-sections templates with section- prefix
        {
          from: 'src/bundles/parts-sections/*/sections/*.liquid',
          to: ({ absoluteFilename }) => {
            const filename = path.basename(absoluteFilename, '.liquid');
            return `../sections/section-${filename}.liquid`;
          },
          noErrorOnMissing: true
        },
        // Parts-page-specific templates with section-page- prefix
        {
          from: 'src/bundles/parts-page-specific/*/*/sections/*.liquid',
          to: ({ absoluteFilename }) => {
            const filename = path.basename(absoluteFilename, '.liquid');
            const relativePath = path.relative(path.resolve(__dirname, 'src/bundles/parts-page-specific'), absoluteFilename);
            const pathParts = relativePath.split(path.sep);
            const pageDir = pathParts[0]; // Extract page name (e.g., "faq")
            return `../sections/section-page-${pageDir}-${filename}.liquid`;
          },
          noErrorOnMissing: true
        },
        // Legacy fallback for old section structure (backwards compatibility)
        {
          from: 'src/bundles/**/sections/*.liquid',
          to: ({ absoluteFilename }) => {
            const filename = path.basename(absoluteFilename, '.liquid');
            return `../sections/section-${filename}.liquid`;
          },
          noErrorOnMissing: true,
          filter: (filepath) => {
            // Exclude files already handled by above patterns
            return !filepath.includes('bundle-global') && 
                   !filepath.includes('parts-sections') && 
                   !filepath.includes('parts-page-specific');
          }
        },
        // Drawer-specific section templates with custom naming
        {
          from: 'src/bundles/bundle-global/drawer-group/cart/sections/*.liquid',
          to: ({ absoluteFilename }) => {
            const filename = path.basename(absoluteFilename, '.liquid');
            return `../sections/section-drawer-cart.liquid`;
          },
          noErrorOnMissing: true
        },
        {
          from: 'src/bundles/bundle-global/drawer-group/multi/sections/*.liquid',
          to: ({ absoluteFilename }) => {
            const filename = path.basename(absoluteFilename, '.liquid');
            return `../sections/section-drawer-multi.liquid`;
          },
          noErrorOnMissing: true
        },
        // Drawer-specific snippet templates with custom naming
        {
          from: 'src/bundles/bundle-global/drawer-group/cart/snippets/*.liquid',
          to: ({ absoluteFilename }) => {
            const filename = path.basename(absoluteFilename, '.liquid');
            return `../snippets/snippet-section-drawer-cart-${filename}.liquid`;
          },
          noErrorOnMissing: true
        },
        {
          from: 'src/bundles/bundle-global/drawer-group/multi/snippets/*.liquid',
          to: ({ absoluteFilename }) => {
            const filename = path.basename(absoluteFilename, '.liquid');
            return `../snippets/snippet-section-drawer-multi-${filename}.liquid`;
          },
          noErrorOnMissing: true
        },
        {
          from: 'src/bundles/bundle-global/drawer-group/base/snippets/*.liquid',
          to: ({ absoluteFilename }) => {
            const filename = path.basename(absoluteFilename, '.liquid');
            return `../snippets/snippet-section-drawer-base-${filename}.liquid`;
          },
          noErrorOnMissing: true
        },
        // Section-scoped snippets with snippet-section-<section>- prefix for bundle-global
        {
          from: 'src/bundles/bundle-global/**/snippets/*.liquid',
          to: ({ absoluteFilename }) => {
            const filename = path.basename(absoluteFilename, '.liquid');
            const relativePath = path.relative(path.resolve(__dirname, 'src/bundles/bundle-global'), absoluteFilename);
            const pathParts = relativePath.split(path.sep);
            // Extract section name (e.g., "navigation-bar" from "header-group/navigation-bar/snippets/...")
            const sectionName = pathParts[pathParts.length - 3]; // Get parent of snippets folder
            return `../snippets/snippet-section-${sectionName}-${filename}.liquid`;
          },
          noErrorOnMissing: true,
          filter: (filepath) => {
            // Exclude drawer snippets already handled by above patterns
            return !filepath.includes('/drawer/');
          }
        },
        // Section-scoped snippets with snippet-section-<section>- prefix for parts-sections
        {
          from: 'src/bundles/parts-sections/*/snippets/*.liquid',
          to: ({ absoluteFilename }) => {
            const filename = path.basename(absoluteFilename, '.liquid');
            const relativePath = path.relative(path.resolve(__dirname, 'src/bundles/parts-sections'), absoluteFilename);
            const sectionName = relativePath.split(path.sep)[0]; // First folder is section name
            return `../snippets/snippet-section-${sectionName}-${filename}.liquid`;
          },
          noErrorOnMissing: true
        },
        // Parts-page-specific snippets with snippet-section-page-<page>-<component>- prefix
        {
          from: 'src/bundles/parts-page-specific/*/*/snippets/*.liquid',
          to: ({ absoluteFilename }) => {
            const filename = path.basename(absoluteFilename, '.liquid');
            const relativePath = path.relative(path.resolve(__dirname, 'src/bundles/parts-page-specific'), absoluteFilename);
            const pathParts = relativePath.split(path.sep);
            const pageDir = pathParts[0]; // Extract page name (e.g., "faq")
            const componentDir = pathParts[1]; // Extract component name (e.g., "main")
            return `../snippets/snippet-section-page-${pageDir}-${componentDir}-${filename}.liquid`;
          },
          noErrorOnMissing: true
        },
        // Feature snippets with snippet-feature- prefix for shared features
        {
          from: 'src/bundles/bundle-shared-features/**/snippets/*.liquid',
          to: ({ absoluteFilename }) => {
            const filename = path.basename(absoluteFilename, '.liquid');
            return `../snippets/snippet-feature-${filename}.liquid`;
          },
          noErrorOnMissing: true
        },
        // Utils snippets with snippet-utils- prefix
        {
          from: 'src/bundles/utils/*.liquid',
          to: ({ absoluteFilename }) => {
            const filename = path.basename(absoluteFilename, '.liquid');
            return `../snippets/snippet-utils-${filename}.liquid`;
          },
          noErrorOnMissing: true
        },
        // Extract theme layout files
        {
          from: 'src/bundles/theme-main/layout/*.liquid',
          to: '../layout/[name][ext]',
          noErrorOnMissing: true
        },
        // Extract theme snippet files with snippet-theme- prefix
        {
          from: 'src/bundles/theme-main/snippets/*.liquid',
          to: ({ absoluteFilename }) => {
            const filename = path.basename(absoluteFilename, '.liquid');
            return `../snippets/snippet-theme-${filename}.liquid`;
          },
          noErrorOnMissing: true
        },
        // Legacy fallback for any remaining liquid files (maintain old behavior)
        {
          from: 'src/bundles/**/*.liquid',
          to: '../snippets/[name][ext]',
          noErrorOnMissing: true,
          filter: (filepath) => {
            // Exclude files already handled by above patterns
            return !filepath.includes('/sections/') && 
                   !filepath.includes('/snippets/') && 
                   !filepath.includes('/utils/') &&
                   !filepath.includes('/theme-main/');
          }
        },
        {
          from: 'src/bundles/bundle-global/icon-system/icons/*.svg',
          to: '[name][ext]',
          noErrorOnMissing: true
        },
        // Theme-specific liquid files (moved from src/theme-hyspex structure)
        {
          from: 'src/theme-hyspex/**/theme.liquid',
          to: ({ absoluteFilename }) => {
            const relativePath = path.relative(path.resolve(__dirname, 'src/theme-hyspex'), absoluteFilename);
            const pathParts = relativePath.split(path.sep);
            // Convert root/theme.liquid -> root-theme.liquid
            const folderName = pathParts[0]; // e.g., "root"
            return `../snippets/${folderName}-theme.liquid`;
          },
          noErrorOnMissing: true
        },
        // Theme group files (section groups from src/theme-hyspex/groups)
        {
          from: 'src/theme-hyspex/groups/*.json',
          to: '../sections/[name][ext]',
          noErrorOnMissing: true
        },
        // Note: Locale files are now handled by BundleLocaleMergePlugin
        // Config files from theme-hyspex
        {
          from: 'src/theme-hyspex/config/*.json',
          to: '../config/[name][ext]',
          noErrorOnMissing: true
        },
        // Template files from theme-hyspex (all file types: .json, .liquid)
        {
          from: 'src/theme-hyspex/templates/**/*',
          to: ({ absoluteFilename }) => {
            const relativePath = path.relative(path.resolve(__dirname, 'src/theme-hyspex/templates'), absoluteFilename);
            return `../templates/${relativePath}`;
          },
          noErrorOnMissing: true
        }
      ]
    }),
    
    // Bundle analyzer for optimization
    ...(isAnalyze ? [new BundleAnalyzerPlugin({
      analyzerMode: 'server',
      openAnalyzer: false,
      analyzerPort: 8888
    })] : []),
    
    // Optional: Log bundle contents for debugging
    {
      apply: (compiler) => {
        compiler.hooks.afterEmit.tap('LogBundlesPlugin', (compilation) => {
          console.log('\n=== Generated Bundles ===');
          Object.keys(compilation.assets).forEach(filename => {
            console.log(`- ${filename}`);
          });
        });
      }
    }
  ],
  
  resolve: {
    extensions: ['.js', '.scss', '.css'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@assets': path.resolve(__dirname, 'assets'),
      '@global': path.resolve(__dirname, 'src/bundles/bundle-global'),
      '@features': path.resolve(__dirname, 'src/bundles/bundle-shared-features'),
      '@page-specific': path.resolve(__dirname, 'src/bundles/parts-page-specific'),
      '@sections': path.resolve(__dirname, 'src/bundles/parts-sections')
    }
  },
  
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Vendor bundle for node_modules
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          chunks: 'all',
          priority: 20
        },
        // Common code used in multiple sections (disabled for now - using unified bundles)
        // 'common-sections': {
        //   test: /[\\/]src[\\/]parts-sections[\\/]/,
        //   minChunks: 2,
        //   name: 'common-sections',
        //   chunks: 'all',
        //   priority: 10,
        //   reuseExistingChunk: true
        // },
        // Common code used in multiple features
        'common-features': {
          test: /[\\/]src[\\/]bundle-shared-features[\\/]/,
          minChunks: 3,
          name: 'common-features',
          chunks: 'all',
          priority: 10,
          reuseExistingChunk: true
        }
      }
    },
    
    // Only minimize in production
    minimize: !isDevelopment,
    
    // Runtime chunk for better caching
    runtimeChunk: isDevelopment ? false : 'single'
  },
  
  devtool: isDevelopment ? 'eval-source-map' : 'source-map',
  
  stats: {
    assets: true,
    children: false,
    chunks: false,
    modules: false,
    warnings: true,
    errors: true
  },
  
  // Development server (for watch mode)
  devServer: {
    static: {
      directory: path.join(__dirname, 'assets'),
    },
    hot: true,
    open: false,
    port: 3001, // Different from Shopify CLI (usually 9292)
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
    }
  },
  
  // Watch options for development
  watchOptions: {
    ignored: [
      '**/node_modules/**',
      '**/tests/**',
      '**/planning/**',
      '**/*.liquid'
    ],
    aggregateTimeout: 1000, // Increased from 300ms to 1000ms to prevent partial file syncing
    poll: false
  },
  
  // Performance hints
  performance: {
    maxAssetSize: 250000, // 250kb per asset
    maxEntrypointSize: 500000, // 500kb per entry point
    hints: isDevelopment ? false : 'warning'
  }
};
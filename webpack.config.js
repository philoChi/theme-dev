const path = require('path');
const glob = require('glob');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const RemoveEmptyScriptsPlugin = require('webpack-remove-empty-scripts');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const BundleLocaleMergePlugin = require('./webpack/plugins/bundle-locale-merge-plugin');
const IconSystemAggregatorPlugin = require('./webpack/plugins/icon-system-aggregator-plugin');

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
  const globalFiles = findIndexFiles(`${srcPath}/global`);
  if (globalFiles.length > 0) {
    entries['global'] = globalFiles;
  }
  
  // 2. Shared features bundle
  const featuresFiles = findIndexFiles(`${srcPath}/shared-features`);
  if (featuresFiles.length > 0) {
    entries['features-shared-all'] = featuresFiles;
  }
  
  // 3. Page-specific sections
  glob.sync(`${srcPath}/page-specific/*/`).forEach(dir => {
    const indexFiles = findIndexFiles(dir);
    if (indexFiles.length > 0) {
      const pageName = path.basename(dir);
      entries[`section-page-${pageName}`] = indexFiles;
    }
  });
  
  // 4. Individual sections (unified approach)
  glob.sync(`${srcPath}/section-specific/*/`).forEach(dir => {
    const sectionName = path.basename(dir);
    const indexFiles = findIndexFiles(dir);
    if (indexFiles.length > 0) {
      entries[`section-${sectionName}`] = indexFiles;
    }
  });
  
  console.log('Generated entries:', Object.keys(entries));
  return entries;
}

// Unified copy pattern generator for standardized bundle structure
function generateCopyPatterns() {
  const patterns = [];
  
  // Helper function to generate snippet prefix based on bundle type and path
  function getSnippetPrefix(absoluteFilename) {
    const relativePath = path.relative(path.resolve(__dirname, 'src/bundles'), absoluteFilename);
    const pathParts = relativePath.split(path.sep);
    
    // Determine bundle type from path structure
    if (pathParts[0] === 'global') {
      // Extract section name from global bundle structure
      const sectionName = pathParts[pathParts.length - 3]; // Parent of snippets folder
      return `snippet-section-${sectionName}`;
    } else if (pathParts[0] === 'shared-features') {
      return 'snippet-feature';
    } else if (pathParts[0] === 'page-specific') {
      const pageName = pathParts[1];
      return `snippet-section-page-${pageName}`;
    } else if (pathParts[0] === 'section-specific') {
      const sectionName = pathParts[1];
      return `snippet-section-${sectionName}`;
    } else if (pathParts[0] === 'theme-main') {
      return 'snippet-theme';
    } else if (pathParts[0] === 'utils') {
      return 'snippet-utils';
    }
    
    return 'snippet';
  }
  
  // Helper function to generate section prefix
  function getSectionPrefix(absoluteFilename) {
    const relativePath = path.relative(path.resolve(__dirname, 'src/bundles'), absoluteFilename);
    const pathParts = relativePath.split(path.sep);
    
    if (pathParts[0] === 'page-specific') {
      const pageName = pathParts[1];
      return `section-page-${pageName}`;
    }
    
    return 'section';
  }
  
  // 1. Unified section templates copy pattern
  patterns.push({
    from: 'src/bundles/**/sections/*.liquid',
    to: ({ absoluteFilename }) => {
      const filename = path.basename(absoluteFilename, '.liquid');
      const prefix = getSectionPrefix(absoluteFilename);
      return `../sections/${prefix}-${filename}.liquid`;
    },
    noErrorOnMissing: true
  });
  
  // 2. Unified snippet templates copy pattern
  patterns.push({
    from: 'src/bundles/**/snippets/*.liquid',
    to: ({ absoluteFilename }) => {
      const filename = path.basename(absoluteFilename, '.liquid');
      const prefix = getSnippetPrefix(absoluteFilename);
      return `../snippets/${prefix}-${filename}.liquid`;
    },
    noErrorOnMissing: true,
    filter: (filepath) => {
      // Skip icon-system-vars as it's handled by the aggregator plugin
      const filename = path.basename(filepath, '.liquid');
      return filename !== 'icon-system-vars';
    }
  });
  
  // 3. Theme layout files
  patterns.push({
    from: 'src/bundles/theme-main/layout/*.liquid',
    to: '../layout/[name][ext]',
    noErrorOnMissing: true
  });
  
  // 4. Utils snippets (direct copy from utils bundle)
  patterns.push({
    from: 'src/bundles/utils/*.liquid',
    to: ({ absoluteFilename }) => {
      const filename = path.basename(absoluteFilename, '.liquid');
      return `../snippets/snippet-utils-${filename}.liquid`;
    },
    noErrorOnMissing: true
  });
  
  // 5. Theme-specific liquid files
  patterns.push({
    from: 'src/theme-hyspex/**/theme.liquid',
    to: ({ absoluteFilename }) => {
      const relativePath = path.relative(path.resolve(__dirname, 'src/theme-hyspex'), absoluteFilename);
      const pathParts = relativePath.split(path.sep);
      const folderName = pathParts[0];
      return `../snippets/${folderName}-theme.liquid`;
    },
    noErrorOnMissing: true
  });
  
  // 6. Theme group files
  patterns.push({
    from: 'src/theme-hyspex/groups/*.json',
    to: '../sections/[name][ext]',
    noErrorOnMissing: true
  });
  
  // 7. Config files
  patterns.push({
    from: 'src/theme-hyspex/config/*.json',
    to: '../config/[name][ext]',
    noErrorOnMissing: true
  });
  
  // 8. Template files
  patterns.push({
    from: 'src/theme-hyspex/templates/**/*',
    to: ({ absoluteFilename }) => {
      const relativePath = path.relative(path.resolve(__dirname, 'src/theme-hyspex/templates'), absoluteFilename);
      return `../templates/${relativePath}`;
    },
    noErrorOnMissing: true
  });
  
  return patterns;
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
                  path.resolve(__dirname, 'src/bundles/global/styles'),
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
      configPath: 'src/localization/product-info.de.json',
      metadataPath: 'src/localization/locale-metadata.json',
      outputPath: 'theme-hyspex/locales'
    }),
    
    // Aggregate icon system from distributed bundle assets
    new IconSystemAggregatorPlugin({
      bundleBasePath: 'src/bundles',
      outputPath: 'theme-hyspex',
      iconFilePattern: /^icon-.*\.svg$/,
      masterSnippetName: 'snippet-icon-system-vars.liquid'
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
    
    // Unified copy patterns for all bundle types
    new CopyWebpackPlugin({
      patterns: generateCopyPatterns()
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
      '@global': path.resolve(__dirname, 'src/bundles/global'),
      '@features': path.resolve(__dirname, 'src/bundles/shared-features'),
      '@page-specific': path.resolve(__dirname, 'src/bundles/page-specific'),
      '@sections': path.resolve(__dirname, 'src/bundles/section-specific')
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
        // Common code used in multiple features
        'common-features': {
          test: /[\\/]src[\\/]shared-features[\\/]/,
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
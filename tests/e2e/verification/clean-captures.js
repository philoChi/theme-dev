import { promises as fs } from 'fs';
import path from 'path';
import { parseArgs } from 'util';

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    screenshots: {
      type: 'string',
      short: 's',
      default: './tests/e2e/screenshots'
    },
    html: {
      type: 'string',
      short: 'h',
      default: './tests/e2e/html-captures'
    },
    console: {
      type: 'string',
      short: 'c',
      default: './tests/e2e/console-logs'
    },
    type: {
      type: 'string',
      short: 't',
      multiple: true,
      default: ['all']
    },
    days: {
      type: 'string',
      short: 'd',
      default: '0'
    },
    keep: {
      type: 'string',
      short: 'k',
      default: '0'
    },
    dry: {
      type: 'boolean',
      short: 'n',
      default: false
    },
    verbose: {
      type: 'boolean',
      short: 'v',
      default: false
    },
    force: {
      type: 'boolean',
      short: 'f',
      default: false
    }
  },
  strict: false
});

const screenshotsDir = values.screenshots;
const htmlDir = values.html;
const consoleDir = values.console;
const types = values.type;
const daysOld = parseInt(values.days);
const keepRecent = parseInt(values.keep);
const dryRun = values.dry;
const verbose = values.verbose;
const force = values.force;

const directories = {
  screenshots: screenshotsDir,
  html: htmlDir,
  console: consoleDir
};

console.log('=== Capture Cache Cleanup ===');
console.log('Directories:');
console.log('  Screenshots:', screenshotsDir);
console.log('  HTML:', htmlDir);
console.log('  Console:', consoleDir);
console.log('Options:');
console.log('  Types to clean:', types.join(', '));
console.log('  Delete files older than:', daysOld, 'days');
console.log('  Keep most recent:', keepRecent, 'files per type');
console.log('  Dry run:', dryRun);
console.log('  Force:', force);
console.log('=============================\n');

// Helper to get file stats safely
async function getFileStat(filePath) {
  try {
    return await fs.stat(filePath);
  } catch (error) {
    return null;
  }
}

// Helper to delete file with error handling
async function deleteFile(filePath) {
  try {
    if (!dryRun) {
      await fs.unlink(filePath);
    }
    return true;
  } catch (error) {
    console.error(`Error deleting ${filePath}:`, error.message);
    return false;
  }
}

// Helper to categorize files
function categorizeFile(filename) {
  if (filename.endsWith('.png')) return 'screenshot';
  if (filename.endsWith('.html')) return 'html';
  if (filename.endsWith('.json')) return 'json';
  if (filename.endsWith('.txt')) return 'text';
  if (filename.endsWith('.css')) return 'css';
  return 'other';
}

// Helper to parse timestamp from filename
function getTimestampFromFile(filename) {
  // Look for ISO timestamp pattern in filename
  const timestampMatch = filename.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)/);
  if (timestampMatch) {
    return new Date(timestampMatch[1].replace(/-/g, (match, offset) => {
      // Replace hyphens with colons only in time part
      return offset > 10 && offset < 16 ? ':' : match;
    }));
  }
  return null;
}

// Process a single directory
async function processDirectory(dirPath, dirType) {
  console.log(`\nProcessing ${dirType} directory...`);
  
  try {
    // Check if directory exists
    const dirStat = await getFileStat(dirPath);
    if (!dirStat || !dirStat.isDirectory()) {
      console.log(`  Directory does not exist: ${dirPath}`);
      return { deleted: 0, kept: 0, errors: 0, size: 0 };
    }

    // Read directory contents
    const files = await fs.readdir(dirPath);
    if (files.length === 0) {
      console.log('  Directory is empty');
      return { deleted: 0, kept: 0, errors: 0, size: 0 };
    }

    console.log(`  Found ${files.length} files`);

    // Get file info
    const fileInfo = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(dirPath, file);
        const stat = await getFileStat(filePath);
        if (!stat || !stat.isFile()) return null;

        const timestamp = getTimestampFromFile(file);
        return {
          name: file,
          path: filePath,
          size: stat.size,
          mtime: stat.mtime,
          timestamp: timestamp || stat.mtime,
          category: categorizeFile(file)
        };
      })
    );

    // Filter out null entries
    const validFiles = fileInfo.filter(f => f !== null);

    // Sort by timestamp (newest first)
    validFiles.sort((a, b) => b.timestamp - a.timestamp);

    // Group by category
    const filesByCategory = {};
    validFiles.forEach(file => {
      if (!filesByCategory[file.category]) {
        filesByCategory[file.category] = [];
      }
      filesByCategory[file.category].push(file);
    });

    // Process files
    let deleted = 0;
    let kept = 0;
    let errors = 0;
    let totalSize = 0;
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - (daysOld * 24 * 60 * 60 * 1000));

    for (const [category, categoryFiles] of Object.entries(filesByCategory)) {
      if (verbose) {
        console.log(`  Processing ${category} files (${categoryFiles.length} total)`);
      }

      for (let i = 0; i < categoryFiles.length; i++) {
        const file = categoryFiles[i];
        let shouldDelete = false;
        let reason = '';

        // Check if we should keep recent files
        if (keepRecent > 0 && i < keepRecent) {
          shouldDelete = false;
          reason = 'keeping recent';
        }
        // Check age
        else if (daysOld > 0 && file.timestamp > cutoffDate) {
          shouldDelete = false;
          reason = 'too recent';
        }
        // Delete everything else
        else {
          shouldDelete = true;
          reason = keepRecent > 0 ? 'exceeds keep limit' : 'matches criteria';
        }

        if (shouldDelete) {
          if (verbose || dryRun) {
            const age = Math.floor((now - file.timestamp) / (1000 * 60 * 60 * 24));
            console.log(`    ${dryRun ? '[DRY RUN]' : ''}Deleting: ${file.name} (${age} days old, ${(file.size / 1024).toFixed(1)}KB) - ${reason}`);
          }
          
          if (await deleteFile(file.path)) {
            deleted++;
            totalSize += file.size;
          } else {
            errors++;
          }
        } else {
          kept++;
          if (verbose) {
            console.log(`    Keeping: ${file.name} - ${reason}`);
          }
        }
      }
    }

    // Summary for this directory
    console.log(`  Summary: ${deleted} deleted, ${kept} kept, ${errors} errors`);
    if (deleted > 0) {
      console.log(`  Space freed: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
    }

    return { deleted, kept, errors, size: totalSize };
  } catch (error) {
    console.error(`Error processing directory ${dirPath}:`, error.message);
    return { deleted: 0, kept: 0, errors: 1, size: 0 };
  }
}

// Prompt for confirmation
async function promptConfirmation() {
  if (force || dryRun) return true;

  console.log('\n⚠️  WARNING: This will permanently delete files!');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  return true;
}

// Main execution
(async () => {
  try {
    // Determine which directories to process
    const dirsToProcess = [];
    if (types.includes('all')) {
      dirsToProcess.push(
        { path: directories.screenshots, type: 'screenshots' },
        { path: directories.html, type: 'html' },
        { path: directories.console, type: 'console' }
      );
    } else {
      if (types.includes('screenshots') || types.includes('s')) {
        dirsToProcess.push({ path: directories.screenshots, type: 'screenshots' });
      }
      if (types.includes('html') || types.includes('h')) {
        dirsToProcess.push({ path: directories.html, type: 'html' });
      }
      if (types.includes('console') || types.includes('c')) {
        dirsToProcess.push({ path: directories.console, type: 'console' });
      }
    }

    if (dirsToProcess.length === 0) {
      console.error('No valid types specified. Use: screenshots, html, console, or all');
      process.exit(1);
    }

    // Get confirmation
    await promptConfirmation();

    // Process each directory
    const totals = {
      deleted: 0,
      kept: 0,
      errors: 0,
      size: 0
    };

    for (const dir of dirsToProcess) {
      const result = await processDirectory(dir.path, dir.type);
      totals.deleted += result.deleted;
      totals.kept += result.kept;
      totals.errors += result.errors;
      totals.size += result.size;
    }

    // Final summary
    console.log('\n=== Cleanup Summary ===');
    console.log(`Files deleted: ${totals.deleted}`);
    console.log(`Files kept: ${totals.kept}`);
    console.log(`Errors: ${totals.errors}`);
    console.log(`Total space freed: ${(totals.size / 1024 / 1024).toFixed(2)}MB`);
    
    if (dryRun) {
      console.log('\n⚠️  This was a dry run. No files were actually deleted.');
      console.log('Remove the --dry flag to perform actual deletion.');
    }
    
    console.log('\n✅ Cleanup completed!');
    
    process.exit(totals.errors > 0 ? 1 : 0);

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
})();
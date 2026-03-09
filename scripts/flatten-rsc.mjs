/**
 * Flatten Next.js 16 RSC prefetch directory structure for static hosting.
 *
 * Next.js generates: /game/race/__next.game/race.txt
 * Browser requests: /game/race/__next.game.race.txt
 *
 * This script copies nested __next.* directories into dot-separated flat files.
 */
import { readdirSync, statSync, copyFileSync, mkdirSync } from 'fs';
import { join, relative, dirname } from 'path';

const outDir = join(process.cwd(), 'out');

function flattenDir(dir) {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (entry.startsWith('__next.')) {
        // This is a __next.X directory that needs flattening
        flattenNextDir(dir, entry, fullPath);
      }
      // Recurse into all directories
      flattenDir(fullPath);
    }
  }
}

function flattenNextDir(parentDir, prefix, nextDir) {
  const entries = getAllFiles(nextDir);

  for (const filePath of entries) {
    const relPath = relative(nextDir, filePath);
    // Convert path separators to dots, but keep .txt extension
    // e.g., "race.txt" -> "race.txt" (prefix already has __next.game)
    // e.g., "race/__PAGE__.txt" -> "race.__PAGE__.txt"
    const flatName = prefix + '.' + relPath.replace(/[/\\]/g, '.');
    const destPath = join(parentDir, flatName);

    // Only copy if destination doesn't already exist
    try {
      statSync(destPath);
    } catch {
      copyFileSync(filePath, destPath);
    }
  }
}

function getAllFiles(dir) {
  const results = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      results.push(...getAllFiles(fullPath));
    } else {
      results.push(fullPath);
    }
  }

  return results;
}

flattenDir(outDir);
console.log('RSC prefetch files flattened successfully.');

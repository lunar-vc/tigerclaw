#!/usr/bin/env node
//
// touch-theme — Update the research status on a theme.
//
// Usage:
//   node scripts/touch-theme.js THE-2132                # sets researched = today
//   node scripts/touch-theme.js THE-2132 2026-02-15     # sets researched = specific date
//   node scripts/touch-theme.js THE-2132 researching    # sets researching (in-progress)
//
// Updates BOTH the memory topic file AND the .themes pane file so
// the themes pane reflects changes immediately.
//

import { readFile, writeFile, readdir, rename, unlink, open } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const THEMES_FILE = join(PROJECT_ROOT, '.themes');
const THEMES_LOCK = join(PROJECT_ROOT, '.themes.lock');
const projectSlug = PROJECT_ROOT.replace(/\//g, '-');
const MEMORY_DIR = join(process.env.HOME, '.claude/projects', projectSlug, 'memory');
const THEMES_DIR = join(MEMORY_DIR, 'themes');

// =============================================================================
// Helpers
// =============================================================================

async function atomicWriteFile(filePath, content) {
  const tmp = filePath + '.tmp.' + randomBytes(4).toString('hex');
  await writeFile(tmp, content);
  await rename(tmp, filePath);
}

async function withThemesLock(fn) {
  let lockFd;
  const maxWait = 5000;
  const start = Date.now();

  // Spin until we acquire the lock or timeout
  while (true) {
    try {
      lockFd = await open(THEMES_LOCK, 'wx');
      break;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      if (Date.now() - start > maxWait) {
        // Stale lock — force remove and retry once
        console.error('warn: stale .themes.lock detected, removing');
        try { await unlink(THEMES_LOCK); } catch {}
        lockFd = await open(THEMES_LOCK, 'wx');
        break;
      }
      await new Promise(r => setTimeout(r, 50));
    }
  }

  try {
    return await fn();
  } finally {
    await lockFd.close();
    try { await unlink(THEMES_LOCK); } catch {}
  }
}

// =============================================================================
// Memory file update
// =============================================================================

async function updateMemoryFile(key, value) {
  const prefix = key.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  let files;
  try {
    files = (await readdir(THEMES_DIR)).filter(f => f.startsWith(prefix));
  } catch {
    console.error(`warn: themes memory dir missing: ${THEMES_DIR}`);
    return null;
  }
  if (files.length === 0) {
    console.error(`warn: no memory file found for theme ${key} (prefix: ${prefix})`);
    return null;
  }

  const filePath = join(THEMES_DIR, files[0]);
  let content = await readFile(filePath, 'utf8');

  // Only write a date to the memory file (not "researching")
  const isDate = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (!isDate) return files[0]; // skip memory update for non-date values

  if (content.includes('**Last researched:**')) {
    content = content.replace(
      /- \*\*Last researched:\*\* .*/,
      `- **Last researched:** ${value}`
    );
  } else {
    const lines = content.split('\n');
    let insertIdx = lines.length;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '' && i > 1) {
        insertIdx = i;
        break;
      }
    }
    lines.splice(insertIdx, 0, `- **Last researched:** ${value}`);
    content = lines.join('\n');
  }

  await atomicWriteFile(filePath, content);
  return files[0];
}

// =============================================================================
// Themes pane update (locked + atomic)
// =============================================================================

async function updateThemesPane(key, value) {
  return withThemesLock(async () => {
    let content;
    try {
      content = await readFile(THEMES_FILE, 'utf8');
    } catch {
      return false; // no .themes file yet
    }

    const lines = content.split('\n');
    let updated = false;

    // Find the theme block and insert/update the researched: line
    for (let i = 0; i < lines.length; i++) {
      const keyMatch = lines[i].match(/^\s*(THE-\d+)\s+/);
      if (!keyMatch || keyMatch[1] !== key) continue;

      // Found the theme line — look at the next lines in this block
      let hasResearched = false;
      let insertAt = i + 1;

      for (let j = i + 1; j < lines.length; j++) {
        // If we hit the next theme or end of file, stop
        if (/^\s*THE-\d+\s+/.test(lines[j])) break;
        if (lines[j].trim() === '') { insertAt = j; break; }

        if (/^\s+researched:/.test(lines[j])) {
          lines[j] = `    researched: ${value}`;
          hasResearched = true;
          break;
        }
        insertAt = j + 1;
      }

      if (!hasResearched) {
        // Insert after the URL line (or after the key line)
        lines.splice(insertAt, 0, `    researched: ${value}`);
      }

      updated = true;
      break;
    }

    if (!updated) {
      console.error(`warn: theme key ${key} not found in .themes pane file`);
    }

    if (updated) {
      await atomicWriteFile(THEMES_FILE, lines.join('\n'));
    }
    return updated;
  });
}

// =============================================================================
// Cleanup stale "researching" states
// =============================================================================

async function cleanupStaleResearching() {
  let content;
  try {
    content = await readFile(THEMES_FILE, 'utf8');
  } catch {
    console.log(JSON.stringify({ ok: true, cleaned: 0, message: 'no .themes file' }));
    return;
  }

  const lines = content.split('\n');
  let cleaned = 0;

  for (let i = 0; i < lines.length; i++) {
    if (!/^\s+researched:\s+researching\s*$/.test(lines[i])) continue;

    // Find which theme this belongs to by searching backward
    let themeKey = null;
    for (let j = i - 1; j >= 0; j--) {
      const keyMatch = lines[j].match(/^\s*(THE-\d+)\s+/);
      if (keyMatch) { themeKey = keyMatch[1]; break; }
    }
    if (!themeKey) continue;

    // Look up the actual date from memory
    const prefix = themeKey.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    let memDate = null;
    try {
      const files = (await readdir(THEMES_DIR)).filter(f => f.startsWith(prefix));
      if (files.length > 0) {
        const memContent = await readFile(join(THEMES_DIR, files[0]), 'utf8');
        const dateMatch = memContent.match(/\*\*Last researched:\*\*\s+(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) memDate = dateMatch[1];
      }
    } catch {}

    if (memDate) {
      lines[i] = `    researched: ${memDate}`;
      console.error(`cleanup: ${themeKey} researching → ${memDate}`);
    } else {
      // No date in memory — remove the researched: line entirely
      lines.splice(i, 1);
      i--; // adjust index after splice
      console.error(`cleanup: ${themeKey} researching → removed (no date in memory)`);
    }
    cleaned++;
  }

  if (cleaned > 0) {
    await atomicWriteFile(THEMES_FILE, lines.join('\n'));
  }
  console.log(JSON.stringify({ ok: true, cleaned }));
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const key = process.argv[2];
  const arg = process.argv[3];

  if (key === '--cleanup') {
    await cleanupStaleResearching();
    return;
  }

  if (!key) {
    console.error('Usage: node scripts/touch-theme.js THE-XXXX [YYYY-MM-DD|researching]');
    console.error('       node scripts/touch-theme.js --cleanup   # clear stale researching states');
    process.exit(1);
  }

  // Determine value: "researching", explicit date, or today
  let value;
  if (arg === 'researching') {
    value = 'researching';
  } else {
    value = arg || new Date().toISOString().split('T')[0];
  }

  const memFile = await updateMemoryFile(key, value);
  const paneUpdated = await updateThemesPane(key, value);

  console.log(JSON.stringify({
    ok: true,
    theme: key,
    value,
    memory_file: memFile,
    pane_updated: paneUpdated
  }));
}

main().catch(err => {
  console.error(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});

#!/usr/bin/env node
//
// touch-theme — Update the last_researched date on a theme memory file.
//
// Usage:
//   node scripts/touch-theme.js THE-2132              # sets to today
//   node scripts/touch-theme.js THE-2132 2026-02-15   # sets to specific date
//
// Updates the theme's topic file in memory/themes/ with a
// "Last researched" field. Call this after any scan, deep dive,
// or research workflow that touches a theme.
//

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const projectSlug = PROJECT_ROOT.replace(/\//g, '-');
const MEMORY_DIR = join(process.env.HOME, '.claude/projects', projectSlug, 'memory');
const THEMES_DIR = join(MEMORY_DIR, 'themes');

async function main() {
  const key = process.argv[2];
  const date = process.argv[3] || new Date().toISOString().split('T')[0];

  if (!key) {
    console.error('Usage: node scripts/touch-theme.js THE-XXXX [YYYY-MM-DD]');
    process.exit(1);
  }

  // Find the theme file matching this key
  const prefix = key.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  let files;
  try {
    files = (await readdir(THEMES_DIR)).filter(f => f.startsWith(prefix));
  } catch {
    console.error(JSON.stringify({ ok: false, error: `Themes dir not found: ${THEMES_DIR}` }));
    process.exit(1);
  }

  if (files.length === 0) {
    console.error(JSON.stringify({ ok: false, error: `No theme file found for ${key} (prefix: ${prefix})` }));
    process.exit(1);
  }

  const filePath = join(THEMES_DIR, files[0]);
  let content = await readFile(filePath, 'utf8');

  if (content.includes('**Last researched:**')) {
    content = content.replace(
      /- \*\*Last researched:\*\* .*/,
      `- **Last researched:** ${date}`
    );
  } else {
    // Insert before the trailing blank line at end of metadata block
    const lines = content.split('\n');
    let insertIdx = lines.length;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '' && i > 1) {
        insertIdx = i;
        break;
      }
    }
    lines.splice(insertIdx, 0, `- **Last researched:** ${date}`);
    content = lines.join('\n');
  }

  await writeFile(filePath, content);
  console.log(JSON.stringify({ ok: true, theme: key, last_researched: date, file: files[0] }));
}

main().catch(err => {
  console.error(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});

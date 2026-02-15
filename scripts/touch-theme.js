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

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const THEMES_FILE = join(PROJECT_ROOT, '.themes');
const projectSlug = PROJECT_ROOT.replace(/\//g, '-');
const MEMORY_DIR = join(process.env.HOME, '.claude/projects', projectSlug, 'memory');
const THEMES_DIR = join(MEMORY_DIR, 'themes');

async function updateMemoryFile(key, value) {
  const prefix = key.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  let files;
  try {
    files = (await readdir(THEMES_DIR)).filter(f => f.startsWith(prefix));
  } catch {
    return null; // no themes dir — skip silently
  }
  if (files.length === 0) return null;

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

  await writeFile(filePath, content);
  return files[0];
}

async function updateThemesPane(key, value) {
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

  if (updated) {
    await writeFile(THEMES_FILE, lines.join('\n'));
  }
  return updated;
}

async function main() {
  const key = process.argv[2];
  const arg = process.argv[3];

  if (!key) {
    console.error('Usage: node scripts/touch-theme.js THE-XXXX [YYYY-MM-DD|researching]');
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

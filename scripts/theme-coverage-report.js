#!/usr/bin/env node
//
// theme-coverage-report — Shows which themes need attention.
//
// Reads .themes pane file + memory topic files. Reports:
//   - Never-researched themes
//   - Stale themes (>30 days since last scan)
//   - Themes with 0 pipeline signals
//   - Recommended next scan
//
// Usage:
//   node scripts/theme-coverage-report.js
//   node scripts/theme-coverage-report.js --json    # Machine-readable output

const { readFileSync, existsSync, readdirSync } = require('fs');
const { resolve, dirname, join } = require('path');
const PROJECT_ROOT = resolve(dirname(__filename), '..');
const THEMES_FILE = resolve(PROJECT_ROOT, '.themes');
const PIPELINE_INDEX = resolve(PROJECT_ROOT, '.pipeline-index.json');
const projectSlug = PROJECT_ROOT.replace(/\//g, '-');
const MEMORY_DIR = join(process.env.HOME, '.claude/projects', projectSlug, 'memory');
const THEMES_DIR = join(MEMORY_DIR, 'themes');

const STALE_DAYS = 30;

function main() {
  const jsonOutput = process.argv.includes('--json');

  // 1. Parse .themes pane file for theme list
  const themes = [];
  if (existsSync(THEMES_FILE)) {
    const content = readFileSync(THEMES_FILE, 'utf8');
    const lines = content.split('\n');

    let current = null;
    for (const line of lines) {
      const keyMatch = line.match(/^\s*(THE-\d+)\s+(.+)/);
      if (keyMatch) {
        if (current) themes.push(current);
        current = { key: keyMatch[1], title: keyMatch[2].trim(), researched: null, labels: [] };
        continue;
      }
      if (current) {
        const dateMatch = line.match(/^\s+researched:\s+(\S+)/);
        if (dateMatch) current.researched = dateMatch[1];
        const labelMatch = line.match(/^\s+(\w[\w\s]+)$/);
        if (labelMatch && !line.includes('http') && !line.includes('researched:')) {
          current.labels.push(labelMatch[1].trim());
        }
      }
    }
    if (current) themes.push(current);
  }

  // 2. Check memory files for research dates (fallback if not in .themes)
  for (const theme of themes) {
    if (theme.researched && theme.researched !== 'researching') continue;
    const prefix = theme.key.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    try {
      const files = readdirSync(THEMES_DIR).filter(f => f.startsWith(prefix));
      if (files.length) {
        const content = readFileSync(join(THEMES_DIR, files[0]), 'utf8');
        const dateMatch = content.match(/\*\*Last researched:\*\*\s+(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) theme.researched = dateMatch[1];
      }
    } catch {}
  }

  // 3. Load pipeline index — count signals per theme
  let index = { people: {}, companies: {} };
  try {
    index = JSON.parse(readFileSync(PIPELINE_INDEX, 'utf8'));
  } catch {}

  const signalsByTheme = {};
  for (const [, person] of Object.entries(index.people || {})) {
    const t = person.theme || 'unassigned';
    signalsByTheme[t] = (signalsByTheme[t] || 0) + 1;
  }

  // 4. Categorize themes
  const today = new Date();
  const neverResearched = [];
  const stale = [];
  const zeroSignals = [];
  const healthy = [];

  for (const theme of themes) {
    theme.signals = signalsByTheme[theme.key] || 0;

    if (!theme.researched || theme.researched === 'researching') {
      neverResearched.push(theme);
    } else {
      const lastDate = new Date(theme.researched);
      const daysSince = Math.floor((today - lastDate) / 86400000);
      theme.days_since = daysSince;
      if (daysSince > STALE_DAYS) {
        stale.push(theme);
      } else {
        healthy.push(theme);
      }
    }

    if (theme.signals === 0) {
      zeroSignals.push(theme);
    }
  }

  // Sort stale by age (oldest first)
  stale.sort((a, b) => (b.days_since || 0) - (a.days_since || 0));

  // 5. Recommend next scan — priority: never-researched > stale > zero signals
  let recommended = null;
  if (neverResearched.length) {
    recommended = { theme: neverResearched[0], reason: 'never researched' };
  } else if (stale.length) {
    recommended = { theme: stale[0], reason: `${stale[0].days_since} days since last scan` };
  } else if (zeroSignals.length) {
    recommended = { theme: zeroSignals[0], reason: '0 pipeline signals' };
  }

  if (jsonOutput) {
    console.log(JSON.stringify({
      total_themes: themes.length,
      never_researched: neverResearched.map(t => ({ key: t.key, title: t.title })),
      stale: stale.map(t => ({ key: t.key, title: t.title, days_since: t.days_since, signals: t.signals })),
      zero_signals: zeroSignals.map(t => ({ key: t.key, title: t.title, researched: t.researched })),
      healthy: healthy.map(t => ({ key: t.key, title: t.title, researched: t.researched, signals: t.signals })),
      recommended: recommended ? { key: recommended.theme.key, title: recommended.theme.title, reason: recommended.reason } : null,
      coverage_pct: themes.length ? Math.round(((themes.length - neverResearched.length) / themes.length) * 100) : 0,
    }, null, 2));
    return;
  }

  // Human-readable output
  console.log('\n  Theme Coverage Report');
  console.log('  ' + '='.repeat(50));
  console.log(`  Total themes: ${themes.length}`);
  console.log(`  Coverage: ${themes.length ? Math.round(((themes.length - neverResearched.length) / themes.length) * 100) : 0}%`);
  console.log();

  if (neverResearched.length) {
    console.log('  NEVER RESEARCHED:');
    for (const t of neverResearched) {
      console.log(`    ${t.key}  ${t.title}`);
    }
    console.log();
  }

  if (stale.length) {
    console.log(`  STALE (>${STALE_DAYS} days):`);
    for (const t of stale) {
      console.log(`    ${t.key}  ${t.title}  (${t.days_since}d ago, ${t.signals} signals)`);
    }
    console.log();
  }

  if (zeroSignals.length) {
    console.log('  ZERO PIPELINE SIGNALS:');
    for (const t of zeroSignals) {
      console.log(`    ${t.key}  ${t.title}  (researched: ${t.researched || 'never'})`);
    }
    console.log();
  }

  if (healthy.length) {
    console.log('  HEALTHY:');
    for (const t of healthy) {
      console.log(`    ${t.key}  ${t.title}  (${t.days_since}d ago, ${t.signals} signals)`);
    }
    console.log();
  }

  if (recommended) {
    console.log(`  RECOMMENDED NEXT SCAN: ${recommended.theme.key} — ${recommended.theme.title}`);
    console.log(`  Reason: ${recommended.reason}`);
    console.log();
  }
}

main();

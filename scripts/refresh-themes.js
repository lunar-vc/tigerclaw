#!/usr/bin/env node
//
// refresh-themes.js — filter + write .themes from Linear theme data
//
// Usage:
//   node scripts/refresh-themes.js '{"themes":[{"id":"THE-2312","title":"...","url":"...","labels":["Core DC"],"priority":"High"}]}'
//
// Classifies each theme by lane owner (Mick / Morris / Peter) and only writes
// themes belonging to the configured owner (default: Mick).
//
// Reads memory/themes/<slug>.md files for research dates.
//

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TC_HOME = resolve(__dirname, '..');
const THEMES_FILE = resolve(TC_HOME, '.themes');

// Memory dirs — check both project-level and home-level
const MEMORY_DIRS = [
  resolve(TC_HOME, 'memory', 'themes'),
];

// Also check Claude Code project memory
const HOME = process.env.HOME || '';
const projectMemDir = resolve(HOME, '.claude', 'projects', '-Users-mick-Dropbox-Development-tigerclaw', 'memory', 'themes');
if (existsSync(projectMemDir)) {
  MEMORY_DIRS.push(projectMemDir);
}

// ── Lane classification ────────────────────────────────────────────────────
//
// Morris: AI/ML infra, data infra, dev tools
// Peter:  Health/bio
// Mick:   Everything else (defense, robotics, materials, industrial OT, DC hardware, optical, semiconductors)

const MORRIS_PATTERNS = [
  /\bai\s+agent/i,
  /\bagentic\b/i,
  /\bcoding\s+agent/i,
  /\bprompt.?injection/i,
  /\bsandbox.*agent/i,
  /\bpermission.*agent/i,
  /\bfirecracker.*agent/i,
  /\bspec.?driven.*agenti/i,
  /\bruntime.*hallucin/i,
  /\bverified\s+runtime\b.*\b(hallucin|observ)/i,
  /\bdev\s*tool/i,
  /\bcode\s+gen/i,
  /\bllm\s+(?:tool|framework|orchestrat)/i,
  /\brag\s+(?:pipeline|framework|infra)/i,
];

const PETER_PATTERNS = [
  /\bbio(?:tech|informatics)\b/i,
  /\bhealth\s*(?:tech|care)/i,
  /\bdrug\s+(?:discovery|design)/i,
  /\bgenomic/i,
  /\bprotein\s+(?:fold|design|engineer)/i,
  /\bclinical\s+trial/i,
  /\bmedical\s+device/i,
];

function classifyLane(title, labels) {
  const text = `${title} ${(labels || []).join(' ')}`;

  for (const pat of MORRIS_PATTERNS) {
    if (pat.test(text)) return 'morris';
  }
  for (const pat of PETER_PATTERNS) {
    if (pat.test(text)) return 'peter';
  }
  return 'mick';
}

// ── Parse input ────────────────────────────────────────────────────────────
let input;
const arg = process.argv[2];
if (arg) {
  input = JSON.parse(arg);
} else {
  const chunks = [];
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) chunks.push(chunk);
  input = JSON.parse(chunks.join(''));
}

const themes = input.themes || [];
const owner = (input.owner || 'mick').toLowerCase();

// ── Load research dates from memory files ──────────────────────────────────
function findResearchDate(themeKey) {
  const slug = themeKey.toLowerCase();
  for (const dir of MEMORY_DIRS) {
    if (!existsSync(dir)) continue;
    try {
      const files = readdirSync(dir);
      for (const f of files) {
        if (f.startsWith(slug) || f.includes(slug)) {
          const content = readFileSync(resolve(dir, f), 'utf8');
          const match = content.match(/Last researched:\s*(.+)/i);
          if (match) return match[1].trim();
        }
      }
    } catch { /* skip */ }
  }
  return null;
}

// ── Also check .themes file for existing dates (touch-theme writes here) ───
const existingDates = {};
if (existsSync(THEMES_FILE)) {
  try {
    const content = readFileSync(THEMES_FILE, 'utf8');
    let currentKey = null;
    for (const line of content.split('\n')) {
      const keyMatch = line.match(/^\s*(THE-\d+)/);
      if (keyMatch) currentKey = keyMatch[1];
      const dateMatch = line.match(/^\s+researched:\s+(.+)/);
      if (dateMatch && currentKey) existingDates[currentKey] = dateMatch[1].trim();
    }
  } catch { /* ignore */ }
}

// ── Filter and build output ────────────────────────────────────────────────
const kept = [];
const excluded = [];

for (const t of themes) {
  const lane = classifyLane(t.title || '', t.labels || []);
  if (lane !== owner) {
    excluded.push({ id: t.id, title: t.title, lane });
    continue;
  }
  kept.push(t);
}

// ── Write .themes file ─────────────────────────────────────────────────────
const lines = [];

for (const t of kept) {
  const id = t.id || '';
  const title = (t.title || '').replace(/^\[(?:Strong|Medium|Weak)\]\s*/i, '');
  const url = t.url || `https://linear.app/tigerslug/issue/${id}`;

  // Priority label from Linear (Urgent, High, Normal, Low)
  const priority = t.priority || '';

  // Research date: check touch-theme state first, then memory, then existing .themes
  let researchDate = null;
  const touchState = existingDates[id];
  if (touchState === 'researching') {
    researchDate = 'researching';
  } else {
    researchDate = findResearchDate(id) || touchState || null;
  }

  // Labels (excluding priority which is shown separately)
  const labels = (t.labels || []).filter(l =>
    !['Urgent', 'High', 'Normal', 'Low', 'None'].includes(l)
  );

  // Build label + priority string
  const metaParts = [];
  if (labels.length > 0) metaParts.push(labels.join(', '));
  if (priority) metaParts.push(`${priority} priority`);
  const metaStr = metaParts.join(' — ');

  lines.push(`  ${id}  ${title}`);
  lines.push(`    ${url}`);
  if (metaStr) lines.push(`    ${metaStr}`);
  if (researchDate) lines.push(`    researched: ${researchDate}`);
  lines.push('');
}

writeFileSync(THEMES_FILE, lines.join('\n') + '\n', 'utf8');

// ── Summary ────────────────────────────────────────────────────────────────
const excludedSummary = excluded.length > 0
  ? ` (excluded ${excluded.length}: ${excluded.map(e => `${e.id} → ${e.lane}`).join(', ')})`
  : '';
console.log(`Themes pane updated: ${kept.length} themes${excludedSummary}`);

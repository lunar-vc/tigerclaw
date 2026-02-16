#!/usr/bin/env node
//
// refresh-pipeline.js — merge Linear deal data with pipeline index, write .pipeline
//
// Usage:
//   node scripts/refresh-pipeline.js '{"deals":[{"id":"DEAL-1601","title":"...","url":"...","status":"Triage"}]}'
//
// Reads .pipeline-index.json for ages/themes, merges with Linear deal data,
// and writes .pipeline in a bash-parseable format watched by pipeline-pane.sh.
//

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TC_HOME = resolve(__dirname, '..');
const PIPELINE_INDEX = resolve(TC_HOME, '.pipeline-index.json');
const PIPELINE_FILE = resolve(TC_HOME, '.pipeline');

// ── Parse input ────────────────────────────────────────────────────────────
let input;
const arg = process.argv[2];
if (arg) {
  input = JSON.parse(arg);
} else {
  // Read from stdin
  const chunks = [];
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) chunks.push(chunk);
  input = JSON.parse(chunks.join(''));
}

const deals = input.deals || [];

// ── Load pipeline index ────────────────────────────────────────────────────
let index = { people: {}, companies: {} };
try {
  index = JSON.parse(readFileSync(PIPELINE_INDEX, 'utf8'));
} catch {
  // No index yet — proceed with empty
}

// ── Build a lookup: DEAL-XXXX → pipeline entry ─────────────────────────────
const linearToEntry = {};
for (const [slug, entry] of Object.entries(index.people || {})) {
  if (entry.linear) {
    linearToEntry[entry.linear] = { ...entry, slug, entityType: 'person' };
  }
}
for (const [slug, entry] of Object.entries(index.companies || {})) {
  if (entry.linear) {
    linearToEntry[entry.linear] = { ...entry, slug, entityType: 'company' };
  }
}

// ── Compute days since date ────────────────────────────────────────────────
function daysSince(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  const then = new Date(dateStr);
  if (isNaN(then.getTime())) return null;
  return Math.floor((now - then) / 86400000);
}

// ── Extract short name from deal title ─────────────────────────────────────
// Deal titles follow patterns like:
//   "[Strong] Aliakbar Nafar — sandboxing agents"
//   "[Medium] Natan Levy — verified runtime"
// We want the name part for compact display.
function extractNameFromTitle(title) {
  // Strip leading [Strength] tag
  let name = title.replace(/^\[(?:Strong|Medium|Weak)\]\s*/i, '');
  // If there's a dash separator, take everything before it
  const dashIdx = name.indexOf(' — ');
  if (dashIdx > 0) return name.substring(0, dashIdx).trim();
  const hyphenIdx = name.indexOf(' - ');
  if (hyphenIdx > 0) return name.substring(0, hyphenIdx).trim();
  // Slash-separated (e.g. "Sarah Chen / Lattice Optics")
  const slashIdx = name.indexOf(' / ');
  if (slashIdx > 0) return name.substring(0, slashIdx).trim();
  return name.trim();
}

// ── Extract subtitle from deal title ───────────────────────────────────────
function extractSubtitleFromTitle(title) {
  let clean = title.replace(/^\[(?:Strong|Medium|Weak)\]\s*/i, '');
  const dashIdx = clean.indexOf(' — ');
  if (dashIdx > 0) return clean.substring(dashIdx + 3).trim();
  const hyphenIdx = clean.indexOf(' - ');
  if (hyphenIdx > 0) return clean.substring(hyphenIdx + 3).trim();
  return '';
}

// ── Map Linear status to group ─────────────────────────────────────────────
function statusGroup(status) {
  if (!status) return 'Triage';
  const s = status.toLowerCase();
  if (s === 'triage') return 'Triage';
  if (s === 'done' || s === 'completed' || s === 'cancelled' || s === 'canceled') return 'Done';
  // Anything else (In Progress, Active, etc.) is "In Progress"
  return 'In Progress';
}

// ── Build enriched deals ───────────────────────────────────────────────────
const enriched = deals.map(d => {
  const pipelineEntry = linearToEntry[d.id] || {};
  const theme = pipelineEntry.theme || null;
  const lastSeen = pipelineEntry.last_seen || null;
  const age = daysSince(lastSeen);
  const name = extractNameFromTitle(d.title || '');
  const subtitle = extractSubtitleFromTitle(d.title || '');

  return {
    id: d.id,
    title: d.title || '',
    name,
    subtitle,
    url: d.url || `https://linear.app/tigerslug/issue/${d.id}`,
    group: statusGroup(d.status),
    theme,
    age,
    labels: d.labels || [],
  };
});

// ── Group deals ────────────────────────────────────────────────────────────
const groups = { 'Triage': [], 'In Progress': [], 'Done': [] };
for (const deal of enriched) {
  if (!groups[deal.group]) groups[deal.group] = [];
  groups[deal.group].push(deal);
}

// ── Write .pipeline file ───────────────────────────────────────────────────
const now = new Date();
const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

const lines = [];
lines.push(`  refreshed: ${timeStr}`);
lines.push('');

for (const groupName of ['Triage', 'In Progress', 'Done']) {
  const groupDeals = groups[groupName] || [];

  if (groupName === 'Done') {
    // Done: just show count
    if (groupDeals.length > 0) {
      lines.push(`  [Done]`);
      lines.push(`  ${groupDeals.length} completed deal${groupDeals.length !== 1 ? 's' : ''}`);
      lines.push('');
    }
    continue;
  }

  if (groupDeals.length === 0) continue;

  lines.push(`  [${groupName}]`);
  for (const deal of groupDeals) {
    // Line 1: DEAL-XXXX  Name — subtitle
    const subtitle = deal.subtitle ? ` — ${deal.subtitle}` : '';
    lines.push(`  ${deal.id}  ${deal.name}${subtitle}`);
    // Line 2: URL
    lines.push(`    ${deal.url}`);
    // Line 3: theme · age
    const parts = [];
    if (deal.theme) parts.push(deal.theme);
    if (deal.age !== null) parts.push(`${deal.age}d`);
    if (parts.length > 0) {
      lines.push(`    ${parts.join(' · ')}`);
    }
    lines.push('');
  }
}

writeFileSync(PIPELINE_FILE, lines.join('\n') + '\n', 'utf8');

// ── Print summary ──────────────────────────────────────────────────────────
const triage = (groups['Triage'] || []).length;
const active = (groups['In Progress'] || []).length;
const done = (groups['Done'] || []).length;
console.log(`Pipeline pane updated: ${triage} triage · ${active} active · ${done} done`);

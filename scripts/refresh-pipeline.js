#!/usr/bin/env node
//
// refresh-pipeline.js — merge Linear deal data with pipeline index, write .pipeline
//
// Usage:
//   node scripts/refresh-pipeline.js '{"deals":[{"id":"DEAL-1601","title":"...","url":"...","status":"Triage","dueDate":"2026-05-18"}]}'
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

// ── Format a date as short month + day ─────────────────────────────────────
function shortDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Extract short name from deal title ─────────────────────────────────────
// Deal titles follow patterns like:
//   "[Strong] Aliakbar Nafar — sandboxing agents"
//   "[Medium] Natan Levy — verified runtime"
// We want the name part for compact display.
function extractNameFromTitle(title) {
  // Strip leading [Strength/Watch] tag
  let name = title.replace(/^\[(?:Strong|Medium|Weak|Watch)\]\s*/i, '');
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
  let clean = title.replace(/^\[(?:Strong|Medium|Weak|Watch)\]\s*/i, '');
  const dashIdx = clean.indexOf(' — ');
  if (dashIdx > 0) return clean.substring(dashIdx + 3).trim();
  const hyphenIdx = clean.indexOf(' - ');
  if (hyphenIdx > 0) return clean.substring(hyphenIdx + 3).trim();
  return '';
}

// ── Statuses to exclude entirely ────────────────────────────────────────────
const EXCLUDED_STATUSES = new Set([
  'done', 'completed', 'cancelled', 'canceled', 'disqualified', 'duplicate',
]);

// ── Map Linear status to group ─────────────────────────────────────────────
function statusGroup(status) {
  if (!status) return 'Triage';
  const s = status.toLowerCase();
  if (EXCLUDED_STATUSES.has(s)) return null; // filtered out
  if (s === 'triage') return 'Triage';
  if (s === 'backlog') return 'Watchlist';
  // Anything else (Doing, Todo, etc.) is "Active"
  return 'Active';
}

// ── Derive display status from all available signals ────────────────────────
function displayStatus({ title, linearStatus, action, age, dueDate }) {
  const t = (title || '').toLowerCase();

  // 1. Title keyword detection (highest priority — most specific)
  if (/meeting scheduled|scheduled/.test(t))       return 'scheduled';
  if (/monitoring response|contacted/.test(t))      return 'reached out';
  if (/pending outreach/.test(t))                   return 'pending outreach';
  if (/draft ready/.test(t))                        return 'draft ready';

  // 2. Snoozed: Backlog + future due date
  if (dueDate) {
    const daysUntil = -daysSince(dueDate);
    if (daysUntil > 0) return `snoozed → ${shortDate(dueDate)}`;
  }

  // 3. Pipeline action + Linear status combos
  const s = (linearStatus || '').toLowerCase();
  if (action === 'REACH_OUT' && (s === 'doing' || s === 'todo'))  return 'reached out';
  if (action === 'REACH_OUT')                                      return 'reached out';
  if (action === 'IN_PROGRESS')                                    return 'in progress';
  if (action === 'WATCH' && s === 'backlog')                       return 'watching';
  if (action === 'WATCH')                                          return 'watching';

  // 4. Fallback to Linear status
  if (s === 'triage') return 'new';
  if (s === 'doing')  return 'in progress';
  if (s === 'todo')   return 'queued';

  return linearStatus || 'unknown';
}

// ── Age qualifier ──────────────────────────────────────────────────────────
function ageTag(age) {
  if (age === null || age === undefined) return null;
  if (age > 30) return 'stale';
  if (age > 14) return 'aging';
  return null;
}

// ── Build enriched deals (excluding completed/canceled/disqualified) ───────
const enriched = deals.map(d => {
  const group = statusGroup(d.status);
  if (group === null) return null; // excluded status

  const pipelineEntry = linearToEntry[d.id] || {};
  const theme = pipelineEntry.theme || null;
  const action = pipelineEntry.action || null;
  const lastSeen = pipelineEntry.last_seen || null;
  const age = daysSince(lastSeen);
  const name = extractNameFromTitle(d.title || '');
  const subtitle = extractSubtitleFromTitle(d.title || '');

  const dStatus = displayStatus({
    title: d.title,
    linearStatus: d.status,
    action,
    age,
    dueDate: d.dueDate,
  });

  return {
    id: d.id,
    title: d.title || '',
    name,
    subtitle,
    url: d.url || `https://linear.app/tigerslug/issue/${d.id}`,
    status: d.status || 'Triage',
    displayStatus: dStatus,
    ageTag: ageTag(age),
    group,
    theme,
    age,
    labels: d.labels || [],
  };
}).filter(Boolean);

// ── Group deals ────────────────────────────────────────────────────────────
const groups = { 'Triage': [], 'Active': [], 'Watchlist': [] };
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

for (const groupName of ['Triage', 'Active', 'Watchlist']) {
  const groupDeals = groups[groupName] || [];
  if (groupDeals.length === 0) continue;

  lines.push(`  [${groupName}]`);
  for (const deal of groupDeals) {
    // Line 1: DEAL-XXXX  Name — subtitle
    const subtitle = deal.subtitle ? ` — ${deal.subtitle}` : '';
    lines.push(`  ${deal.id}  ${deal.name}${subtitle}`);
    // Line 2: URL
    lines.push(`    ${deal.url}`);
    // Line 3: displayStatus · ageTag · theme · age
    const parts = [];
    parts.push(deal.displayStatus);
    if (deal.ageTag) parts.push(deal.ageTag);
    if (deal.theme) parts.push(deal.theme);
    if (deal.age !== null) parts.push(`${deal.age}d`);
    lines.push(`    ${parts.join(' · ')}`);
    lines.push('');
  }
}

writeFileSync(PIPELINE_FILE, lines.join('\n') + '\n', 'utf8');

// ── Print summary ──────────────────────────────────────────────────────────
const triage = (groups['Triage'] || []).length;
const active = (groups['Active'] || []).length;
const watchlist = (groups['Watchlist'] || []).length;
console.log(`Pipeline pane updated: ${triage} triage · ${active} active · ${watchlist} watchlist`);

#!/usr/bin/env node
//
// scan-diff — Compares scan results against the pipeline index.
//
// When re-scanning a domain, this script filters out already-known signals
// and highlights what's NEW vs CHANGED vs KNOWN. Prevents the "I already
// know about this person" problem and focuses attention on net-new intel.
//
// Usage:
//   node scripts/scan-diff.js '{"signals":[{"name":"Dr. Sarah Chen","action":"WATCH",...},...]}'
//   echo '{"signals":[...]}' | node scripts/scan-diff.js
//
// Input: { "signals": [ array of signal objects with at least "name" field ] }
//
// Output:
//   {
//     "new": [...],           // Not in pipeline — fully new signals
//     "changed": [...],       // In pipeline but action or data differs
//     "known": [...],         // In pipeline, no meaningful changes
//     "summary": "5 new, 2 changed, 8 known"
//   }
//
// Each entry in "changed" includes a "changes" array describing what differs.

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const PIPELINE_INDEX = join(PROJECT_ROOT, '.pipeline-index.json');

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function readInput() {
  const arg = process.argv[2];
  if (arg) return JSON.parse(arg);
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString());
}

async function loadIndex() {
  try {
    return JSON.parse(await readFile(PIPELINE_INDEX, 'utf8'));
  } catch {
    return { people: {}, companies: {} };
  }
}

function detectChanges(existing, incoming) {
  const changes = [];

  // Action changed (e.g., was WATCH, now signal suggests REACH_OUT)
  if (incoming.action && existing.action && incoming.action !== existing.action) {
    changes.push({
      field: 'action',
      from: existing.action,
      to: incoming.action,
    });
  }

  // Theme changed or newly assigned
  if (incoming.theme && existing.theme && incoming.theme !== existing.theme) {
    changes.push({
      field: 'theme',
      from: existing.theme,
      to: incoming.theme,
    });
  }

  // Signal strength changed
  if (incoming.signal_strength && existing.signal_strength && incoming.signal_strength !== existing.signal_strength) {
    changes.push({
      field: 'signal_strength',
      from: existing.signal_strength,
      to: incoming.signal_strength,
    });
  }

  // New data fields that weren't present before
  const dataFields = ['work', 'background', 'product', 'funded'];
  for (const field of dataFields) {
    if (incoming[field] && !existing[field]) {
      changes.push({
        field,
        from: null,
        to: incoming[field],
      });
    }
  }

  // New links that weren't present before
  if (incoming.links) {
    for (const [key, url] of Object.entries(incoming.links)) {
      if (url && (!existing.links || !existing.links[key])) {
        changes.push({
          field: `links.${key}`,
          from: null,
          to: url,
        });
      }
    }
  }

  return changes;
}

async function main() {
  const input = await readInput();
  const signals = input.signals || [];

  if (!signals.length) {
    console.log(JSON.stringify({ new: [], changed: [], known: [], summary: 'No signals to compare' }));
    return;
  }

  const index = await loadIndex();

  const results = { new: [], changed: [], known: [] };

  for (const signal of signals) {
    const name = signal.name || signal.title;
    if (!name) continue;

    const slug = signal.slug || slugify(name);
    const entity = signal.entity || 'person';

    // Check if exists in pipeline
    const collection = entity === 'company' ? index.companies : index.people;
    const existing = collection?.[slug];

    if (!existing) {
      // Completely new signal
      results.new.push({ ...signal, slug, _diff: 'new' });
    } else {
      // Known — check for changes
      const changes = detectChanges(existing, signal);

      if (changes.length > 0) {
        results.changed.push({
          ...signal,
          slug,
          _diff: 'changed',
          _changes: changes,
          _existing_action: existing.action,
          _last_seen: existing.last_seen,
        });
      } else {
        results.known.push({
          name,
          slug,
          _diff: 'known',
          action: existing.action,
          last_seen: existing.last_seen,
        });
      }
    }
  }

  const summary = `${results.new.length} new, ${results.changed.length} changed, ${results.known.length} known`;

  console.log(JSON.stringify({ ...results, summary }, null, 2));
}

main().catch(err => {
  console.error(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});

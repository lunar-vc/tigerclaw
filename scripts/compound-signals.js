#!/usr/bin/env node
//
// compound-signals.js — Emergent pattern detection via graph structural analysis.
//
// Detects graph patterns that no individual signal score can capture:
//   A. Team Formation — two co-authors/colleagues both active and tracked
//   B. Cluster Activation — theme with 3+ tracked people all recently active
//   C. Bridge Discovery — person connecting 2+ non-adjacent themes
//
// These patterns surface founding teams forming, thesis areas heating up,
// and cross-pollination opportunities invisible to flat scoring.
//
// Usage:
//   node scripts/compound-signals.js              # run all detectors, print results
//   node scripts/compound-signals.js --write      # also append to .discoveries.jsonl
//   node scripts/compound-signals.js --json       # JSON output only
//   node scripts/compound-signals.js --detector team_formation

import { open, close, ensure } from './graph.js';
import { appendFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const DISCOVERIES = join(PROJECT_ROOT, '.discoveries.jsonl');

// ── Helpers ──────────────────────────────────────────────────────────────

function resultToRows(result) {
  if (!result.data?.length) return [];
  const headers = result.headers || [];
  return result.data.map(row => {
    if (Array.isArray(row)) {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    }
    return row;
  });
}

function cutoffDate(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function timeHHMM() {
  return new Date().toTimeString().slice(0, 5);
}

// ── Detector A: Team Formation ──────────────────────────────────────────
//
// Two co-authors or colleagues, both with fresh activity (last_seen within
// 30 days), both WATCH or REACH_OUT. Strong signal that a founding team
// may be forming.

async function detectTeamFormation(graph) {
  const cutoff = cutoffDate(30);
  const result = await graph.roQuery(`
    MATCH (a:Person)-[:COAUTHORED|WORKED_WITH]-(b:Person)
    WHERE a.slug < b.slug
      AND a.action IN ['WATCH','REACH_OUT','IN_PROGRESS']
      AND b.action IN ['WATCH','REACH_OUT','IN_PROGRESS']
      AND a.last_seen >= $cutoff AND b.last_seen >= $cutoff
    RETURN a.slug AS a_slug, a.name AS a_name, a.action AS a_action,
           b.slug AS b_slug, b.name AS b_name, b.action AS b_action
  `, { params: { cutoff } });

  const rows = resultToRows(result);
  return rows.map(r => ({
    detector: 'team_formation',
    name: `TEAM: ${r.a_name} + ${r.b_name}`,
    detail: `Co-authors/colleagues both active — possible team forming (${r.a_action}, ${r.b_action})`,
    strength: 'STRONG',
    slugs: [r.a_slug, r.b_slug],
  }));
}

// ── Detector B: Cluster Activation ──────────────────────────────────────
//
// Theme with 3+ tracked people all seen in last 14 days. Indicates a
// thesis area is heating up and deserves prioritized scanning.

async function detectClusterActivation(graph) {
  const cutoff = cutoffDate(14);
  const result = await graph.roQuery(`
    MATCH (p:Person)-[:HAS_EXPERTISE_IN]->(t:Theme)
    WHERE p.last_seen >= $cutoff
      AND p.action IN ['WATCH','REACH_OUT','IN_PROGRESS']
    RETURN t.key AS theme_key, t.title AS theme_title,
           collect(p.name) AS people, count(p) AS cnt
  `, { params: { cutoff } });

  const rows = resultToRows(result);
  return rows
    .filter(r => r.cnt >= 3)
    .map(r => ({
      detector: 'cluster_activation',
      name: `CLUSTER: ${r.theme_key}`,
      detail: `${r.cnt} tracked people active in last 14d: ${(r.people || []).slice(0, 5).join(', ')}`,
      strength: r.cnt >= 5 ? 'STRONG' : 'MEDIUM',
      theme_key: r.theme_key,
      people: r.people,
    }));
}

// ── Detector C: Bridge Discovery ────────────────────────────────────────
//
// Person connected to 2+ themes that are NOT ADJACENT_TO each other.
// These cross-pollination bridges are rare and high-signal — they may
// see opportunities at intersections that pure-domain founders miss.

async function detectBridges(graph) {
  const result = await graph.roQuery(`
    MATCH (p:Person)-[:HAS_EXPERTISE_IN]->(t1:Theme),
          (p)-[:HAS_EXPERTISE_IN]->(t2:Theme)
    WHERE t1.key < t2.key
      AND NOT (t1)-[:ADJACENT_TO]-(t2)
      AND p.action IN ['WATCH','REACH_OUT','IN_PROGRESS']
    RETURN p.slug AS slug, p.name AS name, p.action AS action,
           t1.key AS theme1_key, t1.title AS theme1_title,
           t2.key AS theme2_key, t2.title AS theme2_title
  `);

  const rows = resultToRows(result);

  // Group by person (they may bridge multiple non-adjacent pairs)
  const byPerson = new Map();
  for (const r of rows) {
    if (!byPerson.has(r.slug)) {
      byPerson.set(r.slug, {
        slug: r.slug,
        name: r.name,
        action: r.action,
        bridges: [],
      });
    }
    byPerson.get(r.slug).bridges.push({
      themes: [r.theme1_key, r.theme2_key],
      titles: [r.theme1_title, r.theme2_title],
    });
  }

  return [...byPerson.values()].map(p => ({
    detector: 'bridge_discovery',
    name: `BRIDGE: ${p.name}`,
    detail: `Connects ${p.bridges.map(b => b.themes.join(' & ')).join(', ')} (no adjacency)`,
    strength: p.bridges.length >= 2 ? 'STRONG' : 'MEDIUM',
    slug: p.slug,
    bridges: p.bridges,
  }));
}

// ── Public API ───────────────────────────────────────────────────────────

const DETECTORS = {
  team_formation: detectTeamFormation,
  cluster_activation: detectClusterActivation,
  bridge_discovery: detectBridges,
};

/**
 * Run all (or specified) detectors and return compound signals.
 * Accepts an optional graph handle. If not provided, opens its own connection.
 */
export async function detectAll(opts = {}) {
  const detectorNames = opts.detector
    ? [opts.detector]
    : Object.keys(DETECTORS);

  let db, graph;
  let ownConnection = false;

  if (opts.graph) {
    graph = opts.graph;
  } else {
    try {
      const graphMod = await import('./graph.js');
      ({ db, graph } = await graphMod.open());
      await graphMod.ensure(graph);
      ownConnection = true;
    } catch (e) {
      // Graph unavailable — return empty
      return [];
    }
  }

  const results = [];
  try {
    for (const name of detectorNames) {
      const fn = DETECTORS[name];
      if (!fn) continue;
      try {
        const signals = await fn(graph);
        results.push(...signals);
      } catch (e) {
        process.stderr.write(`[compound] Detector ${name} failed: ${e.message}\n`);
      }
    }
  } finally {
    if (ownConnection && db) {
      try { await (await import('./graph.js')).close(db); } catch { /* ignore */ }
    }
  }

  return results;
}

// ── CLI ──────────────────────────────────────────────────────────────────

async function cli() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const jsonOnly = args.includes('--json');
  const detectorArg = args.find(a => a.startsWith('--detector'));
  const detector = detectorArg
    ? (detectorArg.includes('=') ? detectorArg.split('=')[1] : args[args.indexOf(detectorArg) + 1])
    : null;

  if (args.includes('help') || args.includes('--help')) {
    console.log(`Usage: node scripts/compound-signals.js [options]

Options:
  --write              Append results to .discoveries.jsonl
  --json               JSON output only (no human-readable text)
  --detector <name>    Run a specific detector only

Detectors: ${Object.keys(DETECTORS).join(', ')}

Examples:
  node scripts/compound-signals.js
  node scripts/compound-signals.js --write
  node scripts/compound-signals.js --detector team_formation --json`);
    return;
  }

  const results = await detectAll({ detector });

  if (jsonOnly) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    if (results.length === 0) {
      console.log('No compound signals detected.');
    } else {
      console.log(`\nCompound Signals Detected: ${results.length}`);
      console.log('─'.repeat(60));

      for (const r of results) {
        const icon = r.strength === 'STRONG' ? '▲' : '●';
        console.log(`  ${icon} [${r.detector}] ${r.name}`);
        console.log(`    ${r.detail}`);
      }
    }

    console.log('\n' + JSON.stringify({
      ok: true,
      total: results.length,
      by_detector: {
        team_formation: results.filter(r => r.detector === 'team_formation').length,
        cluster_activation: results.filter(r => r.detector === 'cluster_activation').length,
        bridge_discovery: results.filter(r => r.detector === 'bridge_discovery').length,
      },
    }));
  }

  if (write && results.length > 0) {
    const time = timeHHMM();
    const lines = results.map(r => JSON.stringify({
      status: 'compound',
      name: r.name,
      detail: r.detail,
      strength: r.strength,
      time,
    }));
    await appendFile(DISCOVERIES, lines.join('\n') + '\n');
    console.log(`\nWrote ${results.length} compound signals to .discoveries.jsonl`);
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  cli().catch(err => {
    console.error(JSON.stringify({ ok: false, error: err.message }));
    process.exit(1);
  });
}

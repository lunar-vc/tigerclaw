#!/usr/bin/env node
//
// graph-score.js — Graph proximity bonus for founder signal scoring.
//
// Queries the graph for 1-hop and 2-hop neighbors of a candidate,
// computes a proximity bonus (0 to +3) based on connection quality
// to high-value ("excellence") nodes, and returns an explainable breakdown.
//
// The bonus rewards candidates who are close to tracked REACH_OUT/WATCH
// people — co-authors, shared affiliations, or same-theme researchers.
// It does NOT apply to already-funded signals.
//
// Library usage:
//   import { computeProximityBonus } from './graph-score.js';
//   const bonus = await computeProximityBonus(graph, 'jane-doe');
//   // → { bonus: 2, raw: 9.5, paths: [...], explanation: "..." }
//
// CLI usage:
//   node scripts/graph-score.js <slug>
//   node scripts/graph-score.js jane-doe --already-funded   # returns 0

import { open, close, ensure } from './graph.js';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Edge weights (same as ripple.js) ─────────────────────────────────────

const EDGE_WEIGHT = {
  COAUTHORED: 4,
  WORKED_WITH: 3,
  FOUNDED: 3,
  WORKED_AT: 3,
  HAS_EXPERTISE_IN: 2,
  RELATED_TO_THEME: 2,
  ADJACENT_TO: 1,
  INVESTED_IN: 1,
  LED_ROUND: 1,
  ROUND_FOR: 1,
  CUSTOMER_OF: 1,
};

// ── Excellence weights (by pipeline action) ──────────────────────────────

function excellenceWeight(action) {
  switch (action) {
    case 'REACH_OUT':   return 3;
    case 'IN_PROGRESS': return 2;
    case 'WATCH':       return 2;
    default:            return 0;
  }
}

// ── Proximity bonus computation ──────────────────────────────────────────

const MAX_BONUS = 3;
const RAW_DIVISOR = 4; // raw_proximity / 4 → bonus points

export async function computeProximityBonus(graph, slug, opts = {}) {
  if (opts.alreadyFunded) {
    return { bonus: 0, raw: 0, paths: [], explanation: 'Skipped: already funded' };
  }

  // 1. Get hop-1 neighbors (direct connections)
  const hop1Result = await graph.roQuery(`
    MATCH (c:Person {slug: $slug})-[r]-(n)
    WHERE COALESCE(n.slug, n.key) <> $slug
    RETURN COALESCE(n.slug, n.key) AS neighbor_slug,
           COALESCE(n.name, n.title) AS neighbor_name,
           labels(n)[0] AS neighbor_label,
           n.action AS neighbor_action,
           type(r) AS edge_type
  `, { params: { slug } });

  const hop1 = resultToRows(hop1Result);

  // 2. Get hop-2 neighbors (friends-of-friends, excluding hop-1 and self)
  const hop1Slugs = new Set(hop1.map(h => h.neighbor_slug));
  hop1Slugs.add(slug);

  const hop2Result = await graph.roQuery(`
    MATCH (c:Person {slug: $slug})-[r1]-(mid)-[r2]-(n)
    WHERE COALESCE(n.slug, n.key) <> $slug
      AND labels(n)[0] <> 'Theme'
    RETURN COALESCE(n.slug, n.key) AS neighbor_slug,
           COALESCE(n.name, n.title) AS neighbor_name,
           labels(n)[0] AS neighbor_label,
           n.action AS neighbor_action,
           type(r1) AS edge1_type,
           type(r2) AS edge2_type,
           COALESCE(mid.name, mid.title) AS via_name
  `, { params: { slug } });

  const hop2Raw = resultToRows(hop2Result);
  // Exclude hop-1 neighbors from hop-2 (prefer closer connection)
  const hop2 = hop2Raw.filter(h => !hop1Slugs.has(h.neighbor_slug));

  // 3. Score hop-1 connections
  // Group by neighbor to detect multi-path
  const neighborScores = new Map();

  for (const h of hop1) {
    const exc = excellenceWeight(h.neighbor_action);
    if (exc === 0) continue; // only score connections to excellence nodes

    const edgeW = EDGE_WEIGHT[h.edge_type] || 1;
    const pathScore = edgeW * exc;

    if (!neighborScores.has(h.neighbor_slug)) {
      neighborScores.set(h.neighbor_slug, {
        slug: h.neighbor_slug,
        name: h.neighbor_name,
        action: h.neighbor_action,
        paths: [],
        totalScore: 0,
      });
    }
    const entry = neighborScores.get(h.neighbor_slug);
    entry.paths.push({ hop: 1, edge: h.edge_type, score: pathScore });
    entry.totalScore += pathScore;
  }

  // 4. Score hop-2 connections
  for (const h of hop2) {
    const exc = excellenceWeight(h.neighbor_action);
    if (exc === 0) continue;

    const w1 = EDGE_WEIGHT[h.edge1_type] || 1;
    const w2 = EDGE_WEIGHT[h.edge2_type] || 1;
    const pathScore = Math.min(w1, w2) * 0.3 * exc;

    if (!neighborScores.has(h.neighbor_slug)) {
      neighborScores.set(h.neighbor_slug, {
        slug: h.neighbor_slug,
        name: h.neighbor_name,
        action: h.neighbor_action,
        paths: [],
        totalScore: 0,
      });
    }
    const entry = neighborScores.get(h.neighbor_slug);
    entry.paths.push({ hop: 2, edge: `${h.edge1_type} → ${h.via_name} → ${h.edge2_type}`, score: pathScore });
    entry.totalScore += pathScore;
  }

  // 5. Compute multi-path bonus per neighbor (capped at +2 per neighbor)
  let rawProximity = 0;
  const allPaths = [];

  for (const entry of neighborScores.values()) {
    const multiPathBonus = Math.min(Math.max(0, entry.paths.length - 1), 2);
    const neighborTotal = entry.totalScore + multiPathBonus;
    rawProximity += neighborTotal;

    allPaths.push({
      neighbor: entry.name,
      action: entry.action,
      pathCount: entry.paths.length,
      score: Math.round(neighborTotal * 10) / 10,
      detail: entry.paths.map(p => `hop${p.hop}: ${p.edge} (${p.score.toFixed(1)})`),
    });
  }

  // 6. Normalize and cap
  const bonus = Math.min(Math.floor(rawProximity / RAW_DIVISOR), MAX_BONUS);

  // 7. Build explanation
  const parts = allPaths
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(p => `${p.neighbor} [${p.action}] via ${p.pathCount} path(s) = ${p.score}`);

  const explanation = parts.length > 0
    ? `+${bonus} graph bonus (raw ${rawProximity.toFixed(1)}): ${parts.join('; ')}`
    : 'No connections to excellence nodes';

  return {
    bonus,
    raw: Math.round(rawProximity * 10) / 10,
    paths: allPaths,
    explanation,
  };
}

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

// ── CLI ──────────────────────────────────────────────────────────────────

async function cli() {
  const slug = process.argv[2];
  if (!slug || slug === 'help') {
    console.log(`Usage: node scripts/graph-score.js <slug> [--already-funded]

Computes graph proximity bonus (0 to +${MAX_BONUS}) for a person.

Examples:
  node scripts/graph-score.js aliakbar-nafar
  node scripts/graph-score.js kaiyang-zhao --already-funded`);
    return;
  }

  const alreadyFunded = process.argv.includes('--already-funded');
  const { db, graph } = await open();

  try {
    await ensure(graph);
    const result = await computeProximityBonus(graph, slug, { alreadyFunded });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await close(db);
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  cli().catch(err => {
    console.error(JSON.stringify({ ok: false, error: err.message }));
    process.exit(1);
  });
}

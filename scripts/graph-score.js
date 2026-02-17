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

// ── Graph bonus rubric ──────────────────────────────────────────────────
//
// Explicit rubric-based graph scoring. Each feature is a discrete Cypher
// query returning a boolean + points. Adds to (not replaces) the attribute
// score from score-signal.js.

const GRAPH_RUBRIC = [
  {
    key: 'coauthors_in_pipeline',
    label: 'Has co-author(s) in pipeline',
    points: 2,
    query: `
      MATCH (p:Person {slug: $slug})-[:COAUTHORED]-(o:Person)
      WHERE o.action IN ['WATCH','REACH_OUT','IN_PROGRESS']
      RETURN count(o) AS cnt`,
    test: rows => (rows[0]?.cnt || 0) > 0,
  },
  {
    key: 'connected_to_reach_out',
    label: 'Connected to REACH_OUT candidate (1 hop)',
    points: 2,
    query: `
      MATCH (p:Person {slug: $slug})-[]-(o:Person)
      WHERE o.action = 'REACH_OUT'
      RETURN count(o) AS cnt`,
    test: rows => (rows[0]?.cnt || 0) > 0,
  },
  {
    key: 'bridges_themes',
    label: 'Bridges multiple themes',
    points: 2,
    query: `
      MATCH (p:Person {slug: $slug})-[:HAS_EXPERTISE_IN]->(t:Theme)
      RETURN count(t) AS cnt`,
    test: rows => (rows[0]?.cnt || 0) >= 2,
  },
  {
    key: 'affiliation_cluster',
    label: 'Shared affiliation with tracked candidate',
    points: 1,
    query: `
      MATCH (p:Person {slug: $slug})-[:WORKED_WITH]-(o:Person)
      WHERE o.action IN ['WATCH','REACH_OUT','IN_PROGRESS']
      RETURN count(o) AS cnt`,
    test: rows => (rows[0]?.cnt || 0) > 0,
  },
  {
    key: 'network_recent',
    label: 'Network recent activity (connected person seen <14d)',
    points: 1,
    query: `
      MATCH (p:Person {slug: $slug})-[]-(o:Person)
      WHERE o.last_seen >= $cutoff AND o.slug <> $slug
      RETURN count(o) AS cnt`,
    test: rows => (rows[0]?.cnt || 0) > 0,
  },
  {
    key: 'isolated',
    label: 'Isolated node (no person-person connections)',
    points: -1,
    query: `
      MATCH (p:Person {slug: $slug})-[r]-(o)
      WHERE labels(o)[0] <> 'Theme'
      RETURN count(r) AS cnt`,
    test: rows => (rows[0]?.cnt || 0) === 0,
  },
];

// 14 days ago in YYYY-MM-DD format
function cutoffDate(days = 14) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

/**
 * Score one person using the graph rubric.
 * Returns the graph bonus breakdown (separate from attribute score).
 */
export async function graphRubricScore(graph, slug) {
  let total = 0;
  const breakdown = [];
  const cutoff = cutoffDate(14);

  for (const rule of GRAPH_RUBRIC) {
    try {
      const result = await graph.roQuery(rule.query, {
        params: { slug, cutoff },
      });
      const rows = resultToRows(result);
      if (rule.test(rows)) {
        total += rule.points;
        breakdown.push({ key: rule.key, label: rule.label, points: rule.points });
      }
    } catch {
      // Query failed — skip this rule, don't break scoring
    }
  }

  return { graph_bonus: total, graph_breakdown: breakdown };
}

/**
 * Combined scoring: attribute score + graph rubric bonus.
 * Takes a graph handle, slug, and an attribute score result (from score-signal.js).
 */
export async function graphScore(graph, slug, attrResult) {
  const { graph_bonus, graph_breakdown } = await graphRubricScore(graph, slug);

  const combinedScore = attrResult.score + graph_bonus;
  let strength;
  if (combinedScore >= 7) strength = 'strong';
  else if (combinedScore >= 4) strength = 'medium';
  else if (combinedScore >= 1) strength = 'weak';
  else strength = 'pass';

  return {
    score: combinedScore,
    strength,
    attr_score: attrResult.score,
    graph_bonus,
    breakdown: attrResult.breakdown,
    graph_breakdown,
  };
}

/**
 * Batch scoring: opens one graph connection, scores all signals, closes.
 * Mutates signals in place by adding _graph_bonus and _graph_breakdown.
 * Graceful: if graph fails to open, returns signals unchanged.
 */
export async function graphScoreBatch(signals) {
  let db, graph;
  try {
    const graphMod = await import('./graph.js');
    ({ db, graph } = await graphMod.open());
    await graphMod.ensure(graph);
  } catch {
    // Graph unavailable — return signals unchanged
    for (const sig of signals) {
      sig._graph_bonus = 0;
      sig._graph_breakdown = [];
    }
    return signals;
  }

  try {
    for (const sig of signals) {
      const slug = sig.slug || sig.name?.toLowerCase().normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      if (!slug) {
        sig._graph_bonus = 0;
        sig._graph_breakdown = [];
        continue;
      }
      try {
        const { graph_bonus, graph_breakdown } = await graphRubricScore(graph, slug);
        sig._graph_bonus = graph_bonus;
        sig._graph_breakdown = graph_breakdown;
      } catch {
        sig._graph_bonus = 0;
        sig._graph_breakdown = [];
      }
    }
  } finally {
    try { await (await import('./graph.js')).close(db); } catch { /* ignore */ }
  }

  return signals;
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
  const args = process.argv.slice(2).filter(a => !a.startsWith('--') && !a.startsWith('{'));
  const slug = args[0];
  const jsonArg = process.argv.slice(2).find(a => a.startsWith('{'));

  if (!slug || slug === 'help') {
    console.log(`Usage: node scripts/graph-score.js <slug> [--already-funded] ['{"phd_defense":true}']

Computes graph proximity bonus (0 to +${MAX_BONUS}) for a person.
With JSON attrs: runs full attr+graph combined scoring.

Examples:
  node scripts/graph-score.js aliakbar-nafar
  node scripts/graph-score.js aliakbar-nafar '{"phd_defense":true,"new_repo":true}'
  node scripts/graph-score.js kaiyang-zhao --already-funded`);
    return;
  }

  const alreadyFunded = process.argv.includes('--already-funded');
  const { db, graph } = await open();

  try {
    await ensure(graph);

    if (jsonArg) {
      // Combined attr + graph scoring
      const attrs = JSON.parse(jsonArg);
      // Import score-signal rubric
      const { default: scoreModule } = await import('./score-signal-lib.js').catch(() => ({ default: null }));
      // Fallback: use inline minimal scorer if lib not available
      const attrResult = scoreModule
        ? scoreModule(attrs)
        : { score: 0, strength: 'pass', breakdown: [] };

      const rubric = await graphRubricScore(graph, slug);
      const proximity = await computeProximityBonus(graph, slug, { alreadyFunded });

      console.log(JSON.stringify({
        slug,
        attr_score: attrResult.score,
        graph_rubric_bonus: rubric.graph_bonus,
        graph_proximity_bonus: proximity.bonus,
        combined_score: attrResult.score + rubric.graph_bonus,
        graph_rubric_breakdown: rubric.graph_breakdown,
        graph_proximity: { bonus: proximity.bonus, raw: proximity.raw, explanation: proximity.explanation },
        attr_breakdown: attrResult.breakdown,
      }, null, 2));
    } else {
      // Graph-only scoring
      const proximity = await computeProximityBonus(graph, slug, { alreadyFunded });
      const rubric = await graphRubricScore(graph, slug);
      console.log(JSON.stringify({
        slug,
        proximity_bonus: proximity.bonus,
        rubric_bonus: rubric.graph_bonus,
        rubric_breakdown: rubric.graph_breakdown,
        proximity: { raw: proximity.raw, explanation: proximity.explanation, paths: proximity.paths },
      }, null, 2));
    }
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

#!/usr/bin/env node
//
// ripple.js — Propagate a signal event through the graph to surface connected opportunities.
//
// When a new signal fires for person X, ripple walks the graph 1-2 hops out
// and re-evaluates every connected entity. Two WATCH candidates who suddenly
// share a co-authorship + a departure signal = a founding team forming.
//
// Scoring:
//   Edge weights (per hop-1 connection):
//     COAUTHORED .............. 4
//     WORKED_WITH ............. 3
//     FOUNDED / WORKED_AT ..... 3
//     same theme (via HAS_EXPERTISE_IN) .. 2
//     ADJACENT_TO (theme hop) . 1
//
//   Multipliers:
//     trigger strength strong .. x1.5
//     trigger strength medium .. x1.0
//     trigger strength weak .... x0.7
//     multiple distinct paths .. +2 per extra path
//
//   Thresholds:
//     ESCALATE (suggest REACH_OUT) .. 6+
//     REVIEW ...................... 3-5
//     NOTE ........................ 1-2
//
// Usage:
//   node scripts/ripple.js <slug> --event <type> [--strength strong|medium|weak]
//   node scripts/ripple.js <slug> --event phd_defense --strength strong
//   node scripts/ripple.js <slug> --event departure
//   node scripts/ripple.js '{"slug":"x","event":"phd_defense","strength":"strong"}'
//   node scripts/ripple.js <slug> --event new_repo --write   # write to .discoveries.jsonl

import { open, close, ensure, upsertEdge } from './graph.js';
import { appendFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const DISCOVERIES = join(PROJECT_ROOT, '.discoveries.jsonl');
const RIPPLE_SUGGESTIONS = join(PROJECT_ROOT, '.ripple-suggestions.jsonl');

// ── Edge weights ─────────────────────────────────────────────────────────

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

const STRENGTH_MULTIPLIER = {
  strong: 1.5,
  medium: 1.0,
  weak: 0.7,
};

const EVENT_LABELS = {
  phd_defense: 'PhD defense',
  departure: 'left company/lab',
  new_repo: 'new GitHub repo',
  funding: 'raised funding',
  conference: 'conference talk',
  paper: 'new paper published',
  launch: 'product launch',
  hiring: 'hiring signal',
  pivot: 'company pivot',
  exit: 'exit/acquisition',
};

// ── Parse input ──────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);

  // JSON input
  if (args[0]?.startsWith('{')) {
    const input = JSON.parse(args[0]);
    return {
      slug: input.slug,
      event: input.event || 'unknown',
      strength: input.strength || 'medium',
      write: args.includes('--write'),
      persist: args.includes('--persist'),
    };
  }

  // CLI flags
  const slug = args[0];
  let event = 'unknown';
  let strength = 'medium';
  const write = args.includes('--write');
  const persist = args.includes('--persist');

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--event' && args[i + 1]) event = args[++i];
    if (args[i] === '--strength' && args[i + 1]) strength = args[++i];
  }

  return { slug, event, strength, write, persist };
}

// ── Graph queries ────────────────────────────────────────────────────────

async function getTriggerNode(graph, slug) {
  // Try Person, then Company
  let result = await graph.roQuery(
    `MATCH (n:Person {slug: $slug}) RETURN n.name AS name, n.action AS action, n.theme AS theme, labels(n)[0] AS label`,
    { params: { slug } }
  );
  if (result.data?.length) return { ...rowToObj(result, 0), slug, nodeLabel: 'Person' };

  result = await graph.roQuery(
    `MATCH (n:Company {slug: $slug}) RETURN n.name AS name, n.action AS action, n.theme AS theme, labels(n)[0] AS label`,
    { params: { slug } }
  );
  if (result.data?.length) return { ...rowToObj(result, 0), slug, nodeLabel: 'Company' };

  return null;
}

async function getHop1(graph, slug) {
  // All entities directly connected to the trigger (1 hop)
  const result = await graph.roQuery(`
    MATCH (trigger)-[r]-(hop1)
    WHERE trigger.slug = $slug
    RETURN COALESCE(hop1.slug, hop1.key) AS slug,
           COALESCE(hop1.name, hop1.title) AS name,
           labels(hop1)[0] AS label,
           hop1.action AS action,
           hop1.theme AS theme,
           type(r) AS rel
  `, { params: { slug } });
  return resultToRows(result);
}

async function getHop2(graph, slug) {
  // Entities 2 hops from trigger (through any intermediate node)
  // Excludes the trigger itself and direct connections
  const result = await graph.roQuery(`
    MATCH (trigger)-[r1]-(mid)-[r2]-(hop2)
    WHERE trigger.slug = $slug
      AND COALESCE(hop2.slug, hop2.key) <> $slug
      AND COALESCE(hop2.slug, hop2.key) <> COALESCE(mid.slug, mid.key)
    RETURN COALESCE(hop2.slug, hop2.key) AS slug,
           COALESCE(hop2.name, hop2.title) AS name,
           labels(hop2)[0] AS label,
           hop2.action AS action,
           hop2.theme AS theme,
           type(r1) AS rel1,
           COALESCE(mid.name, mid.title) AS via_name,
           labels(mid)[0] AS via_label,
           type(r2) AS rel2
  `, { params: { slug } });
  return resultToRows(result);
}

// ── Scoring ──────────────────────────────────────────────────────────────

function scoreRipple(connections, triggerStrength) {
  const multiplier = STRENGTH_MULTIPLIER[triggerStrength] || 1.0;

  // Group by target slug to merge multi-path connections
  const bySlug = new Map();

  for (const conn of connections) {
    const key = conn.slug;
    if (!key) continue;
    if (!bySlug.has(key)) {
      bySlug.set(key, {
        slug: conn.slug,
        name: conn.name,
        label: conn.label,
        action: conn.action || '',
        theme: conn.theme || '',
        paths: [],
        rawScore: 0,
      });
    }
    const entry = bySlug.get(key);

    // Calculate path score
    let pathScore;
    if (conn.hop === 1) {
      pathScore = EDGE_WEIGHT[conn.rel] || 1;
    } else {
      // Hop 2: take the weaker of the two edges, halved
      const w1 = EDGE_WEIGHT[conn.rel1] || 1;
      const w2 = EDGE_WEIGHT[conn.rel2] || 1;
      pathScore = Math.min(w1, w2) * 0.5;
    }

    entry.paths.push(conn);
    entry.rawScore += pathScore;
  }

  // Apply multiplier + multi-path bonus
  const scored = [];
  for (const entry of bySlug.values()) {
    // Skip themes (they don't get ripple-scored, only people/companies)
    if (entry.label === 'Theme') continue;

    const multiPathBonus = Math.max(0, entry.paths.length - 1) * 2;
    const finalScore = Math.round((entry.rawScore + multiPathBonus) * multiplier * 10) / 10;

    let verdict;
    if (finalScore >= 6) verdict = 'ESCALATE';
    else if (finalScore >= 3) verdict = 'REVIEW';
    else verdict = 'NOTE';

    scored.push({
      ...entry,
      multiPathBonus,
      score: finalScore,
      verdict,
      pathCount: entry.paths.length,
    });
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  return scored;
}

// ── Output formatting ────────────────────────────────────────────────────

function formatRipple(trigger, event, scored) {
  const lines = [];
  const eventLabel = EVENT_LABELS[event] || event;
  lines.push(`RIPPLE: ${trigger.name} — ${eventLabel}`);
  lines.push('─'.repeat(60));

  if (scored.length === 0) {
    lines.push('  No connected entities to ripple to.');
    return lines.join('\n');
  }

  // Group by verdict
  const escalate = scored.filter(s => s.verdict === 'ESCALATE');
  const review = scored.filter(s => s.verdict === 'REVIEW');
  const note = scored.filter(s => s.verdict === 'NOTE');

  if (escalate.length) {
    lines.push('');
    lines.push('ESCALATE (score >= 6 — suggest upgrading to REACH_OUT):');
    for (const s of escalate) {
      lines.push(formatEntry(s));
    }
  }

  if (review.length) {
    lines.push('');
    lines.push('REVIEW (score 3-5 — flag for manual review):');
    for (const s of review) {
      lines.push(formatEntry(s));
    }
  }

  if (note.length) {
    lines.push('');
    lines.push('NOTE (score 1-2 — logged, no action needed):');
    for (const s of note) {
      lines.push(formatEntry(s));
    }
  }

  lines.push('');
  lines.push(`Total: ${escalate.length} escalate, ${review.length} review, ${note.length} note`);

  return lines.join('\n');
}

function formatEntry(s) {
  const actionTag = s.action ? ` [${s.action}]` : '';
  const paths = s.paths.map(p => {
    if (p.hop === 1) return p.rel;
    return `${p.rel1} → ${p.via_name} → ${p.rel2}`;
  }).join(', ');
  return `  ${s.score.toString().padStart(4)}  ${s.label} ${s.name}${actionTag} — via: ${paths} (${s.pathCount} path${s.pathCount > 1 ? 's' : ''})`;
}

// ── Discovery output ─────────────────────────────────────────────────────

async function writeDiscoveries(trigger, event, scored) {
  const now = new Date();
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const eventLabel = EVENT_LABELS[event] || event;
  const lines = [];

  for (const s of scored) {
    if (s.verdict === 'ESCALATE') {
      lines.push(JSON.stringify({
        status: 'found',
        name: s.name,
        detail: `RIPPLE from ${trigger.name} (${eventLabel}) — score ${s.score}`,
        strength: 'STRONG',
        time,
      }));
    } else if (s.verdict === 'REVIEW') {
      lines.push(JSON.stringify({
        status: 'watching',
        name: s.name,
        detail: `RIPPLE from ${trigger.name} (${eventLabel}) — score ${s.score}`,
        time,
      }));
    }
  }

  if (lines.length > 0) {
    await appendFile(DISCOVERIES, lines.join('\n') + '\n');
  }
  return lines.length;
}

// ── Persist (ESCALATE → .ripple-suggestions.jsonl + graph edge) ──────

async function persistEscalations(graph, trigger, event, scored) {
  const now = new Date();
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const timestamp = now.toISOString();
  const lines = [];

  for (const s of scored) {
    if (s.verdict !== 'ESCALATE') continue;

    // Write suggestion to JSONL
    const suggestion = {
      trigger: trigger.slug,
      event,
      target: s.slug,
      target_name: s.name,
      current_action: s.action || 'WATCH',
      suggested: 'REACH_OUT',
      score: s.score,
      paths: s.paths.map(p => p.hop === 1 ? p.rel : `${p.rel1}→${p.via_name}→${p.rel2}`),
      time,
      timestamp,
    };
    lines.push(JSON.stringify(suggestion));

    // Store RIPPLE_SCORED edge on graph
    if (graph && s.slug) {
      try {
        await upsertEdge(graph, 'Person', trigger.slug, 'RIPPLE_SCORED', 'Person', s.slug, {
          event,
          score: String(s.score),
          verdict: s.verdict,
          timestamp,
        });
      } catch {
        // Graph edge write failed — non-blocking
      }
    }
  }

  if (lines.length > 0) {
    await appendFile(RIPPLE_SUGGESTIONS, lines.join('\n') + '\n');
  }
  return lines.length;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function rowToObj(result, idx) {
  const headers = result.headers || [];
  const row = result.data[idx];
  const obj = {};
  if (Array.isArray(row)) {
    headers.forEach((h, i) => { obj[h] = row[i]; });
  } else {
    Object.assign(obj, row);
  }
  return obj;
}

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

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const { slug, event, strength, write, persist } = parseArgs();

  if (!slug) {
    console.log(`Usage: node scripts/ripple.js <slug> --event <type> [--strength strong|medium|weak] [--write] [--persist]

Events: ${Object.entries(EVENT_LABELS).map(([k, v]) => `${k} (${v})`).join(', ')}

Flags:
  --write    Write ESCALATE/REVIEW results to .discoveries.jsonl
  --persist  Write ESCALATE suggestions to .ripple-suggestions.jsonl + graph edges

Examples:
  node scripts/ripple.js natan-levy --event phd_defense --strength strong
  node scripts/ripple.js natan-levy --event departure
  node scripts/ripple.js '{"slug":"natan-levy","event":"new_repo","strength":"medium"}'
  node scripts/ripple.js natan-levy --event phd_defense --write --persist`);
    process.exit(0);
  }

  const { db, graph } = await open();

  try {
    await ensure(graph);

    // 1. Find trigger node
    const trigger = await getTriggerNode(graph, slug);
    if (!trigger) {
      console.error(JSON.stringify({ ok: false, error: `Entity "${slug}" not found in graph` }));
      process.exit(1);
    }

    // 2. Get hop-1 and hop-2 connections
    const hop1Raw = await getHop1(graph, slug);
    const hop2Raw = await getHop2(graph, slug);

    // Tag with hop distance
    const hop1 = hop1Raw.map(r => ({ ...r, hop: 1 }));
    const hop2 = hop2Raw
      .filter(r => !hop1Raw.some(h => h.slug === r.slug))  // dedupe: prefer hop-1
      .map(r => ({ ...r, hop: 2 }));

    const allConnections = [...hop1, ...hop2];

    // 3. Score
    const scored = scoreRipple(allConnections, strength);

    // 4. Output
    console.log(formatRipple(trigger, event, scored));

    // 5. Optionally write to discoveries
    if (write) {
      const count = await writeDiscoveries(trigger, event, scored);
      console.log(`\nWrote ${count} entries to .discoveries.jsonl`);
    }

    // 5b. Optionally persist ESCALATE suggestions
    if (persist) {
      const persistCount = await persistEscalations(graph, trigger, event, scored);
      console.log(`\nPersisted ${persistCount} ESCALATE suggestions to .ripple-suggestions.jsonl`);
    }

    // 6. JSON summary
    console.log('\n' + JSON.stringify({
      ok: true,
      trigger: { slug, name: trigger.name, event, strength },
      hop1_count: hop1.length,
      hop2_count: hop2.length,
      results: scored.map(s => ({
        slug: s.slug, name: s.name, label: s.label,
        action: s.action, score: s.score, verdict: s.verdict,
        pathCount: s.pathCount,
      })),
      escalate: scored.filter(s => s.verdict === 'ESCALATE').length,
      review: scored.filter(s => s.verdict === 'REVIEW').length,
      note: scored.filter(s => s.verdict === 'NOTE').length,
    }));

  } finally {
    await close(db);
  }
}

main().catch(err => {
  console.error(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});

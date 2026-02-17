#!/usr/bin/env node
//
// network-gravity-score — Score a person by proximity to pipeline anchors.
//
// Queries the FalkorDB graph to find how close a person is to known
// REACH_OUT / IN_PROGRESS candidates (anchors). Proximity = higher score.
//
// Scoring rubric:
//   1-hop co-author of anchor .......... +5
//   2-hop from anchor .................. +2
//   Same lab/institution as anchor ..... +1
//   Advised by known founder ........... +2
//
// Usage:
//   node scripts/network-gravity-score.js <person-slug>
//   node scripts/network-gravity-score.js aliakbar-nafar
//
// Output:
//   { "network_gravity_score": 8, "strength": "strong", "breakdown": [...], "anchors": ["slug"] }

import { resolve, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const GRAPH_PATH = resolve(PROJECT_ROOT, 'data', 'graph');
const PIPELINE_INDEX = resolve(PROJECT_ROOT, '.pipeline-index.json');

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error('Usage: network-gravity-score.js <person-slug>');
    process.exit(1);
  }

  const { default: FalkorDBModule } = await import('falkordblite');
  const FalkorDB = FalkorDBModule.FalkorDB || FalkorDBModule;

  // Load pipeline to identify anchors (REACH_OUT / IN_PROGRESS)
  let index;
  try {
    index = JSON.parse(readFileSync(PIPELINE_INDEX, 'utf8'));
  } catch {
    console.log(JSON.stringify({ network_gravity_score: 0, breakdown: [], anchors: [], error: 'No pipeline index' }));
    return;
  }

  const anchorSlugs = Object.entries(index.people || {})
    .filter(([, p]) => p.action === 'REACH_OUT' || p.action === 'IN_PROGRESS')
    .map(([s]) => s);

  if (!anchorSlugs.length) {
    console.log(JSON.stringify({ network_gravity_score: 0, breakdown: [], anchors: [], note: 'No anchors in pipeline' }));
    return;
  }

  const db = await FalkorDB.open({
    path: GRAPH_PATH,
    logLevel: 'warning',
    timeout: 15000,
  });

  const graph = db.selectGraph('tigerclaw');

  let score = 0;
  const breakdown = [];
  const anchorsFound = new Set();

  // 1-hop co-author of anchor (+5 each, deduplicated)
  for (const anchor of anchorSlugs) {
    if (anchor === slug) continue;
    const result = await graph.query(
      `MATCH (a:Person {slug: $a})-[:COAUTHORED]-(b:Person {slug: $b})
       RETURN a.slug AS anchor`,
      { params: { a: slug, b: anchor } }
    );
    if (result.data?.length) {
      score += 5;
      anchorsFound.add(anchor);
      breakdown.push({ rule: '1-hop co-author of anchor', points: 5, anchor });
    }
  }

  // 2-hop from anchor (+2 each, only if not already 1-hop)
  for (const anchor of anchorSlugs) {
    if (anchor === slug || anchorsFound.has(anchor)) continue;
    const result = await graph.query(
      `MATCH (a:Person {slug: $a})-[:COAUTHORED*2]-(b:Person {slug: $b})
       RETURN a.slug AS anchor LIMIT 1`,
      { params: { a: slug, b: anchor } }
    );
    if (result.data?.length) {
      score += 2;
      anchorsFound.add(anchor);
      breakdown.push({ rule: '2-hop from anchor', points: 2, anchor });
    }
  }

  // Same institution as anchor (+1)
  for (const anchor of anchorSlugs) {
    if (anchor === slug) continue;
    const result = await graph.query(
      `MATCH (a:Person {slug: $a})-[:AFFILIATED_WITH]->(i:Institution)<-[:AFFILIATED_WITH]-(b:Person {slug: $b})
       RETURN i.name AS institution LIMIT 1`,
      { params: { a: slug, b: anchor } }
    );
    if (result.data?.length) {
      score += 1;
      anchorsFound.add(anchor);
      breakdown.push({ rule: 'Same institution as anchor', points: 1, anchor, institution: result.data[0].institution });
    }
  }

  // Advised by known founder (+2)
  const result = await graph.query(
    `MATCH (p:Person {slug: $slug})-[:ADVISED_BY]->(advisor:Person)
     WHERE advisor.action IN ['REACH_OUT', 'IN_PROGRESS'] OR advisor.type = 'founder'
     RETURN advisor.slug AS advisor_slug, advisor.name AS advisor_name LIMIT 1`,
    { params: { slug } }
  );
  if (result.data?.length) {
    score += 2;
    breakdown.push({ rule: 'Advised by known founder/anchor', points: 2, advisor: result.data[0].advisor_name });
  }

  await db.close();

  // Determine strength band (mirrors score-signal.js thresholds)
  let strength;
  if (score >= 7) strength = 'strong';
  else if (score >= 4) strength = 'medium';
  else if (score >= 1) strength = 'weak';
  else strength = 'none';

  console.log(JSON.stringify({
    slug,
    network_gravity_score: score,
    strength,
    breakdown,
    anchors: [...anchorsFound],
  }, null, 2));
}

main().catch(err => {
  console.error(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});

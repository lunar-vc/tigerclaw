#!/usr/bin/env node
//
// one-hop-search — Find 1-hop neighbors of a person NOT already in the pipeline.
//
// Given a person slug (typically a REACH_OUT candidate), queries the graph for
// all COAUTHORED, WORKED_WITH, and ADVISED_BY neighbors. Filters out anyone
// already in .pipeline-index.json. Returns candidates for further enrichment.
//
// This is the multiplier: 1 great founder surfaces 3-5 likely co-founders.
//
// Usage:
//   node scripts/one-hop-search.js <person-slug>
//   node scripts/one-hop-search.js aliakbar-nafar
//   node scripts/one-hop-search.js aliakbar-nafar --write-discoveries
//
// Output:
//   { "anchor": "slug", "candidates": [...], "already_tracked": [...] }

import { resolve, dirname } from 'node:path';
import { readFileSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const GRAPH_PATH = resolve(PROJECT_ROOT, 'data', 'graph');
const PIPELINE_INDEX = resolve(PROJECT_ROOT, '.pipeline-index.json');
const DISCOVERIES = resolve(PROJECT_ROOT, '.discoveries.jsonl');

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error('Usage: one-hop-search.js <person-slug>');
    process.exit(1);
  }

  const writeDiscoveries = process.argv.includes('--write-discoveries');

  const { default: FalkorDBModule } = await import('falkordblite');
  const FalkorDB = FalkorDBModule.FalkorDB || FalkorDBModule;

  // Load pipeline to filter out known people
  let index;
  try {
    index = JSON.parse(readFileSync(PIPELINE_INDEX, 'utf8'));
  } catch {
    index = { people: {}, companies: {} };
  }
  const knownSlugs = new Set(Object.keys(index.people || {}));

  const db = await FalkorDB.open({
    path: GRAPH_PATH,
    logLevel: 'warning',
    timeout: 15000,
  });

  const graph = db.selectGraph('tigerclaw');

  // Find the anchor person
  const anchorResult = await graph.query(
    `MATCH (p:Person {slug: $slug}) RETURN p.name AS name, p.action AS action`,
    { params: { slug } }
  );
  if (!anchorResult.data?.length) {
    await db.close();
    console.log(JSON.stringify({ ok: false, error: `Person "${slug}" not found in graph` }));
    return;
  }
  const anchor = anchorResult.data[0];

  // Find all 1-hop neighbors via COAUTHORED, WORKED_WITH, and ADVISED_BY
  const neighborsResult = await graph.query(
    `MATCH (anchor:Person {slug: $slug})-[r:COAUTHORED|WORKED_WITH|ADVISED_BY]-(neighbor:Person)
     WHERE neighbor.slug <> $slug
     RETURN DISTINCT neighbor.slug AS slug, neighbor.name AS name,
            type(r) AS relationship, neighbor.action AS action,
            neighbor.theme AS theme`,
    { params: { slug } }
  );

  // Also check for people at the same institution
  const labResult = await graph.query(
    `MATCH (anchor:Person {slug: $slug})-[:AFFILIATED_WITH]->(i:Institution)<-[:AFFILIATED_WITH]-(peer:Person)
     WHERE peer.slug <> $slug
     RETURN DISTINCT peer.slug AS slug, peer.name AS name,
            'same_institution' AS relationship, peer.action AS action,
            i.name AS institution`,
    { params: { slug } }
  );

  const allNeighbors = [...(neighborsResult.data || []), ...(labResult.data || [])];

  // Deduplicate by slug
  const seen = new Set();
  const candidates = [];
  const alreadyTracked = [];

  for (const neighbor of allNeighbors) {
    if (!neighbor.slug || seen.has(neighbor.slug)) continue;
    seen.add(neighbor.slug);

    if (knownSlugs.has(neighbor.slug)) {
      alreadyTracked.push({
        slug: neighbor.slug,
        name: neighbor.name || neighbor.slug,
        relationship: neighbor.relationship,
        current_action: index.people[neighbor.slug]?.action,
      });
    } else {
      candidates.push({
        slug: neighbor.slug,
        name: neighbor.name || neighbor.slug,
        relationship: neighbor.relationship,
        institution: neighbor.institution || null,
      });
    }
  }

  await db.close();

  // Optionally write to discoveries pane
  if (writeDiscoveries && candidates.length) {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    for (const c of candidates) {
      const entry = {
        status: 'watching',
        name: c.name,
        detail: `${c.relationship} of ${anchor.name || slug}${c.institution ? ` — ${c.institution}` : ''}`,
        network: `1-hop ${c.relationship} of ${anchor.name || slug} (${anchor.action || 'REACH_OUT'})`,
        time,
      };
      appendFileSync(DISCOVERIES, JSON.stringify(entry) + '\n');
    }
  }

  console.log(JSON.stringify({
    ok: true,
    anchor: {
      slug,
      name: anchor.name,
      action: anchor.action,
    },
    candidates,
    already_tracked: alreadyTracked,
    summary: `${candidates.length} new candidates, ${alreadyTracked.length} already tracked`,
  }, null, 2));
}

main().catch(err => {
  console.error(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});

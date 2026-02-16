#!/usr/bin/env node
//
// graph-sync — Sync a single person/company to the FalkorDB graph.
//
// Called by persist-to-memory.js after every pipeline write. Keeps the graph
// in sync without manual backfills.
//
// Usage:
//   node scripts/graph-sync.js '{"entity":"person","slug":"jane-doe","name":"Jane Doe",...}'
//
// Accepts the same JSON signal format as persist-to-memory.js.
// Best-effort — failures here should never block the main persist.

const { resolve, dirname } = require('path');
const { existsSync } = require('fs');
const PROJECT_ROOT = resolve(dirname(__filename), '..');
const GRAPH_PATH = resolve(PROJECT_ROOT, 'data', 'graph');

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: graph-sync.js \'{"entity":"person",...}\'');
    process.exit(1);
  }

  const signal = JSON.parse(arg);
  const slug = signal.slug || slugify(signal.name || signal.title || '');
  if (!slug) {
    console.log(JSON.stringify({ ok: false, error: 'No slug derivable' }));
    return;
  }

  // Check if graph data directory exists
  if (!existsSync(GRAPH_PATH)) {
    console.log(JSON.stringify({ ok: true, skipped: true, reason: 'Graph not initialized' }));
    return;
  }

  const { FalkorDB } = require('falkordblite');
  const db = await FalkorDB.open({
    path: GRAPH_PATH,
    logLevel: 'warning',
    timeout: 15000,
  });

  const graph = db.selectGraph('tigerclaw');

  if (signal.entity === 'person') {
    // Upsert person node
    await graph.query(
      `MERGE (p:Person {slug: $slug})
       SET p.name = $name, p.action = $action, p.theme = $theme,
           p.type = $type, p.last_seen = $last_seen`,
      { params: {
        slug,
        name: signal.name || '',
        action: signal.action || 'WATCH',
        theme: signal.theme || '',
        type: signal.type || 'latent_founder',
        last_seen: new Date().toISOString().split('T')[0],
      } }
    );

    // Process relationships
    const rel = signal.relationships || {};

    // Co-authors
    if (rel.co_authors?.length) {
      for (const coauthorSlug of rel.co_authors) {
        await graph.query(
          `MERGE (p:Person {slug: $slug})`,
          { params: { slug: coauthorSlug } }
        );
        await graph.query(
          `MATCH (a:Person {slug: $a}), (b:Person {slug: $b})
           MERGE (a)-[:CO_AUTHOR]->(b)
           MERGE (b)-[:CO_AUTHOR]->(a)`,
          { params: { a: slug, b: coauthorSlug } }
        );
      }
    }

    // Advisor
    if (rel.advisor) {
      const advisorSlug = slugify(rel.advisor);
      await graph.query(
        `MERGE (p:Person {slug: $slug})
         SET p.name = $name`,
        { params: { slug: advisorSlug, name: rel.advisor } }
      );
      await graph.query(
        `MATCH (s:Person {slug: $student}), (a:Person {slug: $advisor})
         MERGE (s)-[:ADVISED_BY]->(a)`,
        { params: { student: slug, advisor: advisorSlug } }
      );
    }

    // Lab affiliation
    if (rel.lab) {
      await graph.query(
        `MERGE (i:Institution {name: $name})`,
        { params: { name: rel.lab } }
      );
      await graph.query(
        `MATCH (p:Person {slug: $slug}), (i:Institution {name: $name})
         MERGE (p)-[:AFFILIATED_WITH]->(i)`,
        { params: { slug, name: rel.lab } }
      );
    }

    // Prior companies
    if (rel.prior_companies?.length) {
      for (const company of rel.prior_companies) {
        await graph.query(
          `MERGE (c:Company {name: $name})`,
          { params: { name: company } }
        );
        await graph.query(
          `MATCH (p:Person {slug: $slug}), (c:Company {name: $name})
           MERGE (p)-[:WORKED_AT]->(c)`,
          { params: { slug, name: company } }
        );
      }
    }
  } else if (signal.entity === 'company') {
    await graph.query(
      `MERGE (c:Company {name: $name})
       SET c.slug = $slug, c.action = $action, c.theme = $theme`,
      { params: {
        slug,
        name: signal.name || '',
        action: signal.action || 'WATCH',
        theme: signal.theme || '',
      } }
    );
  }

  await db.close();

  console.log(JSON.stringify({ ok: true, entity: signal.entity, slug }));
}

main().catch(err => {
  console.error(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});

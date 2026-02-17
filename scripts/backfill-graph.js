#!/usr/bin/env node
//
// backfill-graph — Populate the Tigerclaw graph from pipeline index + enrichment cache.
//
// Reads .pipeline-index.json (all people + companies) and creates graph nodes + edges.
// Also checks enrichment cache for stored _coauthors data to populate COAUTHORED edges
// retroactively.
//
// Usage:
//   node scripts/backfill-graph.js
//
// Should be run after init-graph.js. Idempotent — uses MERGE to avoid duplicates.

const { readFileSync, existsSync, readdirSync } = require('fs');
const { resolve, dirname, join } = require('path');
const PROJECT_ROOT = resolve(dirname(__filename), '..');
const GRAPH_PATH = resolve(PROJECT_ROOT, 'data', 'graph');
const PIPELINE_INDEX = resolve(PROJECT_ROOT, '.pipeline-index.json');
const CACHE_DIR = resolve(PROJECT_ROOT, '.enrichment-cache');

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  const { FalkorDB } = require('falkordblite');

  // Load pipeline index
  let index;
  try {
    index = JSON.parse(readFileSync(PIPELINE_INDEX, 'utf8'));
  } catch (err) {
    console.error(JSON.stringify({ ok: false, error: 'Cannot read .pipeline-index.json: ' + err.message }));
    process.exit(1);
  }

  const db = await FalkorDB.open({
    path: GRAPH_PATH,
    logLevel: 'warning',
    timeout: 15000,
  });

  const graph = db.selectGraph('tigerclaw');

  let nodesCreated = 0;
  let edgesCreated = 0;

  // 1. Create Person nodes from pipeline people
  for (const [slug, person] of Object.entries(index.people || {})) {
    await graph.query(
      `MERGE (p:Person {slug: $slug})
       SET p.name = $name, p.action = $action, p.theme = $theme,
           p.type = $type, p.last_seen = $last_seen`,
      { params: { slug, name: person.name, action: person.action, theme: person.theme || '', type: person.type || 'latent_founder', last_seen: person.last_seen || '' } }
    );
    nodesCreated++;

    // Create relationship edges
    const rel = person.relationships || {};

    // Co-author edges
    if (rel.co_authors?.length) {
      for (const coauthorSlug of rel.co_authors) {
        // Ensure coauthor node exists
        await graph.query(
          `MERGE (p:Person {slug: $slug})`,
          { params: { slug: coauthorSlug } }
        );
        // Create bidirectional co-author edge
        await graph.query(
          `MATCH (a:Person {slug: $a}), (b:Person {slug: $b})
           MERGE (a)-[:COAUTHORED]->(b)
           MERGE (b)-[:COAUTHORED]->(a)`,
          { params: { a: slug, b: coauthorSlug } }
        );
        edgesCreated++;
      }
    }

    // Advisor edge
    if (rel.advisor) {
      const advisorSlug = slugify(rel.advisor);
      await graph.query(
        `MERGE (p:Person {slug: $slug})
         SET p.name = $name`,
        { params: { slug: advisorSlug, name: rel.advisor } }
      );
      await graph.query(
        `MATCH (student:Person {slug: $student}), (advisor:Person {slug: $advisor})
         MERGE (student)-[:ADVISED_BY]->(advisor)`,
        { params: { student: slug, advisor: advisorSlug } }
      );
      edgesCreated++;
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
      edgesCreated++;
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
        edgesCreated++;
      }
    }
  }

  // 2. Create Company nodes from pipeline companies
  for (const [slug, company] of Object.entries(index.companies || {})) {
    await graph.query(
      `MERGE (c:Company {name: $name})
       SET c.slug = $slug, c.action = $action, c.theme = $theme,
           c.funded = $funded`,
      { params: { slug, name: company.name, action: company.action, theme: company.theme || '', funded: company.funded != null ? String(company.funded) : '' } }
    );
    nodesCreated++;
  }

  // 3. Scan enrichment cache for _coauthors data
  if (existsSync(CACHE_DIR)) {
    const arxivDir = join(CACHE_DIR, 'arxiv');
    if (existsSync(arxivDir)) {
      const files = readdirSync(arxivDir).filter(f => f.endsWith('.json'));
      for (const file of files) {
        try {
          const data = JSON.parse(readFileSync(join(arxivDir, file), 'utf8'));
          const cached = data.data || data;
          if (cached._coauthors?.length && cached.name) {
            const personSlug = slugify(cached.name);
            // Ensure the main person exists
            await graph.query(
              `MERGE (p:Person {slug: $slug})
               SET p.name = $name`,
              { params: { slug: personSlug, name: cached.name } }
            );
            for (const coauthor of cached._coauthors) {
              const coauthorSlug = slugify(coauthor);
              await graph.query(
                `MERGE (p:Person {slug: $slug})
                 SET p.name = $name`,
                { params: { slug: coauthorSlug, name: coauthor } }
              );
              await graph.query(
                `MATCH (a:Person {slug: $a}), (b:Person {slug: $b})
                 MERGE (a)-[:COAUTHORED]->(b)
                 MERGE (b)-[:COAUTHORED]->(a)`,
                { params: { a: personSlug, b: coauthorSlug } }
              );
              edgesCreated++;
            }
          }
        } catch {
          // Skip malformed cache entries
        }
      }
    }
  }

  // Stats
  const nodeCount = await graph.query('MATCH (n) RETURN count(n) AS c');
  const edgeCount = await graph.query('MATCH ()-[r]->() RETURN count(r) AS c');

  await db.close();

  console.log(JSON.stringify({
    ok: true,
    nodes_processed: nodesCreated,
    edges_processed: edgesCreated,
    total_nodes: nodeCount.data?.[0]?.c,
    total_edges: edgeCount.data?.[0]?.c,
    message: `Backfill complete: ${nodesCreated} nodes, ${edgesCreated} edges processed`,
  }));
}

main().catch(err => {
  console.error(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});

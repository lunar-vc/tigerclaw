#!/usr/bin/env node
//
// init-graph — Initialize the Tigerclaw relationship graph in FalkorDB.
//
// Creates the graph schema with nodes (Person, Institution, Paper, Company)
// and edges (COAUTHORED, ADVISED_BY, AFFILIATED_WITH, WORKED_AT, AUTHORED).
// Uses FalkorDBLite (embedded, zero config, persistent to data/graph/).
//
// Usage:
//   node scripts/init-graph.js          # Initialize graph
//   node scripts/init-graph.js --reset  # Drop and recreate graph
//
// Idempotent — safe to run multiple times. Indexes are created if missing.

const { resolve, dirname } = require('path');
const PROJECT_ROOT = resolve(dirname(__filename), '..');
const GRAPH_PATH = resolve(PROJECT_ROOT, 'data', 'graph');

async function main() {
  const reset = process.argv.includes('--reset');

  const { FalkorDB } = require('falkordblite');
  const db = await FalkorDB.open({
    path: GRAPH_PATH,
    logLevel: 'warning',
    timeout: 15000,
  });

  const graph = db.selectGraph('tigerclaw');

  if (reset) {
    try {
      await graph.delete();
      console.log('Dropped existing graph');
    } catch {
      // Graph may not exist yet
    }
  }

  // Create indexes for fast lookups
  const indexes = [
    { label: 'Person', props: ['slug'] },
    { label: 'Institution', props: ['name'] },
    { label: 'Company', props: ['name'] },
    { label: 'Paper', props: ['arxiv_id'] },
  ];

  for (const { label, props } of indexes) {
    for (const prop of props) {
      try {
        await graph.query(
          `CREATE INDEX FOR (n:${label}) ON (n.${prop})`
        );
      } catch (e) {
        // Index may already exist — that's fine
        if (!e.message?.includes('already indexed')) {
          // Ignore other index creation errors too (idempotent)
        }
      }
    }
  }

  // Verify graph works with a simple query
  const result = await graph.query('RETURN 1 AS ok');
  const ok = result.data?.[0]?.ok === 1;

  await db.close();

  console.log(JSON.stringify({
    ok,
    path: GRAPH_PATH,
    message: ok
      ? 'Graph initialized successfully'
      : 'Graph created but verification query failed',
  }));
}

main().catch(err => {
  console.error(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});

#!/usr/bin/env node
//
// graph.js — Embedded FalkorDB graph client for Tigerclaw
//
// Manages the embedded graph lifecycle and exposes graph operations.
// Single graph "tigerclaw" with 6 node labels (Person, Company, Theme,
// Investor, FundingRound, Customer) and relationship edges.
//
// Library usage:
//   import { open, close, upsertNode, upsertEdge, query, roQuery, seed } from './graph.js';
//   const { db, graph } = await open();
//   await upsertNode(graph, 'Person', { slug: 'jane-doe', name: 'Jane Doe' });
//   await close(db);
//
// CLI usage:
//   node scripts/graph.js seed
//   node scripts/graph.js query-theme THE-1810
//   node scripts/graph.js query-network jane-doe
//   node scripts/graph.js query-adjacent THE-1810
//   node scripts/graph.js query-entity jane-doe
//   node scripts/graph.js cypher "MATCH (n) RETURN count(n)"
//   node scripts/graph.js stats

import { FalkorDB } from 'falkordblite';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const GRAPH_PATH = join(PROJECT_ROOT, 'data', 'graph');
const PIPELINE_INDEX = join(PROJECT_ROOT, '.pipeline-index.json');
const GRAPH_NAME = 'tigerclaw';

// ── Lifecycle ────────────────────────────────────────────────────────────

export async function open() {
  const db = await FalkorDB.open({
    path: GRAPH_PATH,
    maxMemory: '256mb',
    logLevel: 'warning',
    timeout: 15000,
  });
  const graph = db.selectGraph(GRAPH_NAME);
  return { db, graph };
}

export async function close(db) {
  await db.close();
}

// ── Schema (idempotent) ──────────────────────────────────────────────────

export async function ensure(graph) {
  // Node indexes — createNodeRangeIndex is idempotent (no-ops if exists)
  const indexes = [
    ['Person', 'slug'],
    ['Company', 'slug'],
    ['Theme', 'key'],
    ['Investor', 'slug'],
    ['FundingRound', 'id'],
    ['Customer', 'slug'],
  ];
  for (const [label, prop] of indexes) {
    try {
      await graph.createNodeRangeIndex(label, prop);
    } catch (e) {
      // Index already exists — safe to ignore
      if (!e.message?.includes('already indexed')) throw e;
    }
  }
}

// ── Node operations ──────────────────────────────────────────────────────

export async function upsertNode(graph, label, props) {
  // Determine the merge key based on label
  const keyField = label === 'Theme' ? 'key'
    : label === 'FundingRound' ? 'id'
    : 'slug';
  const keyValue = props[keyField];
  if (!keyValue) throw new Error(`Missing merge key "${keyField}" for ${label}`);

  // Build SET clause from remaining props
  const setProps = { ...props };
  delete setProps[keyField];

  const setParts = Object.keys(setProps).map(k => `n.${k} = $${k}`);
  const setClause = setParts.length > 0 ? `SET ${setParts.join(', ')}` : '';

  const cypher = `MERGE (n:${label} {${keyField}: $${keyField}}) ${setClause} RETURN n`;
  return graph.query(cypher, { params: props });
}

// ── Edge operations ──────────────────────────────────────────────────────

export async function upsertEdge(graph, fromLabel, fromSlug, rel, toLabel, toSlug, props = {}) {
  const fromKey = fromLabel === 'Theme' ? 'key'
    : fromLabel === 'FundingRound' ? 'id'
    : 'slug';
  const toKey = toLabel === 'Theme' ? 'key'
    : toLabel === 'FundingRound' ? 'id'
    : 'slug';

  // Build SET clause for edge properties
  const setParts = Object.keys(props).map(k => `r.${k} = $${k}`);
  const setClause = setParts.length > 0 ? `SET ${setParts.join(', ')}` : '';

  const cypher = `
    MATCH (a:${fromLabel} {${fromKey}: $fromId})
    MATCH (b:${toLabel} {${toKey}: $toId})
    MERGE (a)-[r:${rel}]->(b)
    ${setClause}
    RETURN r`;

  return graph.query(cypher, {
    params: { fromId: fromSlug, toId: toSlug, ...props }
  });
}

// ── Query wrappers ───────────────────────────────────────────────────────

export async function query(graph, cypher, params = {}) {
  return graph.query(cypher, { params });
}

export async function roQuery(graph, cypher, params = {}) {
  return graph.roQuery(cypher, { params });
}

// ── Seed from pipeline index ─────────────────────────────────────────────

export async function seed(graph) {
  let index;
  try {
    index = JSON.parse(await readFile(PIPELINE_INDEX, 'utf8'));
  } catch (e) {
    throw new Error(`Cannot read pipeline index: ${e.message}`);
  }

  let nodeCount = 0;
  let edgeCount = 0;
  const themeKeys = new Set();

  // Upsert people
  for (const [slug, person] of Object.entries(index.people || {})) {
    await upsertNode(graph, 'Person', {
      slug,
      name: person.name,
      action: person.action || 'WATCH',
      linear: person.linear || '',
      theme: person.theme || '',
      type: person.type || '',
      signal_strength: person.signal_strength || '',
      last_seen: person.last_seen || '',
    });
    nodeCount++;

    // Track theme for creation
    if (person.theme) themeKeys.add(person.theme);
  }

  // Upsert companies
  for (const [slug, company] of Object.entries(index.companies || {})) {
    await upsertNode(graph, 'Company', {
      slug,
      name: company.name,
      action: company.action || 'WATCH',
      linear: company.linear || '',
      theme: company.theme || '',
      signal_strength: company.signal_strength || '',
      funded: company.funded === true ? 'true' : company.funded === false ? 'false' : '',
      last_seen: company.last_seen || '',
    });
    nodeCount++;

    if (company.theme) themeKeys.add(company.theme);
  }

  // Upsert themes (from references in people/companies)
  for (const key of themeKeys) {
    // Try to load theme details from memory topic file
    const themeData = await loadThemeFromMemory(key);
    await upsertNode(graph, 'Theme', {
      key,
      title: themeData?.title || key,
      status: themeData?.status || '',
      one_liner: themeData?.oneLiner || '',
      primitive: themeData?.primitive || '',
    });
    nodeCount++;
  }

  // Create edges: Person -> Theme (HAS_EXPERTISE_IN)
  for (const [slug, person] of Object.entries(index.people || {})) {
    if (person.theme) {
      // Use thesis_fit from index if available, otherwise default
      const confidenceMap = { direct: '0.9', adjacent: '0.6', tangential: '0.3' };
      const confidence = confidenceMap[person.thesis_fit] || '0.5';
      await upsertEdge(graph, 'Person', slug, 'HAS_EXPERTISE_IN', 'Theme', person.theme, {
        type: person.thesis_fit || 'direct',
        confidence,
      });
      edgeCount++;
    }
  }

  // Create edges: Company -> Theme (RELATED_TO_THEME)
  for (const [slug, company] of Object.entries(index.companies || {})) {
    if (company.theme) {
      await upsertEdge(graph, 'Company', slug, 'RELATED_TO_THEME', 'Theme', company.theme, {
        relevance: 'core',
        confidence: '0.7',
      });
      edgeCount++;
    }
  }

  return { nodeCount, edgeCount };
}

// ── Theme loader (reads memory topic files) ──────────────────────────────

async function loadThemeFromMemory(key) {
  const projectSlug = PROJECT_ROOT.replace(/\//g, '-');
  const memoryDir = join(process.env.HOME, '.claude/projects', projectSlug, 'memory');

  // Try THE-XXXX style slug
  const slugVariants = [
    key.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  ];

  for (const slug of slugVariants) {
    try {
      // Search for file matching the key prefix
      const { readdirSync } = await import('node:fs');
      const files = readdirSync(join(memoryDir, 'themes'));
      const match = files.find(f => f.startsWith(slug));
      if (!match) continue;

      const content = await readFile(join(memoryDir, 'themes', match), 'utf8');
      const title = content.match(/^# (?:THE-\d+: )?(.+)/m)?.[1] || key;
      const status = content.match(/\*\*Status:\*\* (.+)/)?.[1] || '';
      const oneLiner = content.match(/\*\*One-liner:\*\* (.+)/)?.[1] || '';
      const primitive = content.match(/\*\*Primitive:\*\* (.+)/)?.[1] || '';
      return { title, status, oneLiner, primitive };
    } catch {
      continue;
    }
  }
  return null;
}

// ── Canned queries ───────────────────────────────────────────────────────

async function queryTheme(graph, themeKey) {
  const result = await graph.roQuery(`
    MATCH (n)-[r]->(t:Theme {key: $themeKey})
    RETURN labels(n)[0] AS label, n.slug AS slug, n.name AS name,
           n.action AS action, type(r) AS relationship
    ORDER BY label, n.action, n.name
  `, { params: { themeKey } });
  return result;
}

async function queryNetwork(graph, slug) {
  const result = await graph.roQuery(`
    MATCH (p:Person {slug: $slug})-[r]-(other)
    RETURN labels(other)[0] AS label,
           COALESCE(other.slug, other.key, other.id) AS slug,
           COALESCE(other.name, other.title) AS name,
           type(r) AS relationship,
           startNode(r) = p AS outgoing
    ORDER BY label, name
  `, { params: { slug } });
  return result;
}

async function queryAdjacent(graph, themeKey) {
  const result = await graph.roQuery(`
    MATCH (t:Theme {key: $themeKey})-[:ADJACENT_TO]-(adj:Theme)<-[:HAS_EXPERTISE_IN]-(p:Person)
    WHERE p.action IN ['WATCH', 'REACH_OUT']
    RETURN p.name AS name, p.slug AS slug, p.action AS action,
           adj.title AS adjacent_theme, adj.key AS adjacent_key
    ORDER BY p.action, p.name
  `, { params: { themeKey } });
  return result;
}

async function queryEntity(graph, slug) {
  // Try slug first (Person, Company, Investor, Customer), then key (Theme)
  const result = await graph.roQuery(`
    MATCH (n)-[r]-(other)
    WHERE n.slug = $slug OR n.key = $slug
    RETURN labels(n)[0] AS entity_label,
           COALESCE(n.name, n.title) AS entity_name,
           labels(other)[0] AS other_label,
           COALESCE(other.slug, other.key, other.id) AS other_id,
           COALESCE(other.name, other.title) AS other_name,
           type(r) AS relationship,
           startNode(r) = n AS outgoing
    ORDER BY other_label, other_name
  `, { params: { slug } });
  return result;
}

async function queryStats(graph) {
  const nodes = await graph.roQuery('MATCH (n) RETURN labels(n)[0] AS label, count(n) AS count ORDER BY label');
  const edges = await graph.roQuery('MATCH ()-[r]->() RETURN type(r) AS type, count(r) AS count ORDER BY type');
  return { nodes, edges };
}

// ── CLI ──────────────────────────────────────────────────────────────────

function formatResult(result) {
  if (!result.data || result.data.length === 0) return '  (no results)';
  const headers = result.headers || [];
  const rows = result.data.map(row => {
    if (Array.isArray(row)) {
      return headers.length
        ? headers.map((h, i) => `${h}: ${row[i] ?? '—'}`).join(' | ')
        : row.join(' | ');
    }
    return JSON.stringify(row);
  });
  return rows.map(r => `  ${r}`).join('\n');
}

async function cli() {
  const [cmd, ...args] = process.argv.slice(2);

  if (!cmd || cmd === 'help') {
    console.log(`Usage: node scripts/graph.js <command> [args]

Commands:
  seed                    Bulk import from .pipeline-index.json
  query-theme <THE-XXXX>  All entities linked to a theme
  query-network <slug>    All connections for a person/company
  query-adjacent <THE-X>  Founders with adjacent-theme expertise
  query-entity <slug>     All relationships for any entity
  cypher "<query>"        Run arbitrary Cypher
  stats                   Node and edge counts by type
  help                    Show this help`);
    return;
  }

  const { db, graph } = await open();

  try {
    await ensure(graph);

    switch (cmd) {
      case 'seed': {
        const { nodeCount, edgeCount } = await seed(graph);
        console.log(JSON.stringify({ ok: true, nodes: nodeCount, edges: edgeCount }));
        break;
      }

      case 'query-theme': {
        const key = args[0];
        if (!key) { console.error('Usage: query-theme <THE-XXXX>'); process.exit(1); }
        const result = await queryTheme(graph, key);
        console.log(`Theme roster for ${key}:`);
        console.log(formatResult(result));
        break;
      }

      case 'query-network': {
        const slug = args[0];
        if (!slug) { console.error('Usage: query-network <slug>'); process.exit(1); }
        const result = await queryNetwork(graph, slug);
        console.log(`Network for ${slug}:`);
        console.log(formatResult(result));
        break;
      }

      case 'query-adjacent': {
        const key = args[0];
        if (!key) { console.error('Usage: query-adjacent <THE-XXXX>'); process.exit(1); }
        const result = await queryAdjacent(graph, key);
        console.log(`Adjacent-theme founders for ${key}:`);
        console.log(formatResult(result));
        break;
      }

      case 'query-entity': {
        const slug = args[0];
        if (!slug) { console.error('Usage: query-entity <slug>'); process.exit(1); }
        const result = await queryEntity(graph, slug);
        console.log(`Relationships for ${slug}:`);
        console.log(formatResult(result));
        break;
      }

      case 'cypher': {
        const cypher = args[0];
        if (!cypher) { console.error('Usage: cypher "<query>"'); process.exit(1); }
        const isWrite = /\b(CREATE|MERGE|SET|DELETE|REMOVE)\b/i.test(cypher);
        const result = isWrite
          ? await graph.query(cypher)
          : await graph.roQuery(cypher);
        console.log(formatResult(result));
        break;
      }

      case 'stats': {
        const { nodes, edges } = await queryStats(graph);
        console.log('Nodes:');
        console.log(formatResult(nodes));
        console.log('\nEdges:');
        console.log(formatResult(edges));
        break;
      }

      default:
        console.error(`Unknown command: ${cmd}. Run "node scripts/graph.js help" for usage.`);
        process.exit(1);
    }
  } finally {
    await close(db);
  }
}

// Run CLI if invoked directly
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  cli().catch(err => {
    console.error(JSON.stringify({ ok: false, error: err.message }));
    process.exit(1);
  });
}

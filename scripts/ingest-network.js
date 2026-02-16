#!/usr/bin/env node
//
// ingest-network.js — Ingest co-author and affiliation networks into the graph.
//
// Takes enriched scan signals and builds the "connective tissue" that makes
// graph proximity scoring work. For each candidate:
//   1. Upserts a Person node (type: scan_candidate)
//   2. Extracts co-authors from Arxiv enrichment cache → reference Person nodes + COAUTHORED edges
//   3. Extracts affiliations → WORKED_WITH edges to existing persons at same institution
//   4. Links to themes via HAS_EXPERTISE_IN edges
//
// This MUST run before scoring so the graph has data for proximity queries.
//
// Library usage:
//   import { ingestNetwork } from './ingest-network.js';
//   const stats = await ingestNetwork(graph, signals);
//
// CLI usage:
//   node scripts/ingest-network.js '[{"name":"Jane","affiliation":"MIT","arxiv":"..."}]'
//   node scripts/ingest-network.js --dry-run '[...]'

import { open, close, ensure, upsertNode, upsertEdge } from './graph.js';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const ENRICHMENT_CACHE = join(PROJECT_ROOT, '.enrichment-cache');

// ── Institution aliases (subset from extract-relationships.js) ───────────

const INSTITUTION_ALIASES = {
  'uiuc': 'UIUC', 'university of illinois urbana-champaign': 'UIUC',
  'university of illinois urbana': 'UIUC',
  'mit': 'MIT', 'massachusetts institute of technology': 'MIT', 'mit csail': 'MIT',
  'stanford': 'Stanford', 'stanford university': 'Stanford',
  'uc berkeley': 'UC Berkeley', 'berkeley': 'UC Berkeley', 'university of california berkeley': 'UC Berkeley',
  'carnegie mellon': 'CMU', 'cmu': 'CMU',
  'michigan state': 'MSU', 'michigan state university': 'MSU', 'msu': 'MSU',
  'university of toronto': 'UofT', 'uoft': 'UofT',
  'tsinghua': 'Tsinghua', 'tsinghua university': 'Tsinghua',
  'tu wien': 'TU Wien', 'vienna university of technology': 'TU Wien',
  'hebrew university': 'Hebrew University', 'hebrew university of jerusalem': 'Hebrew University',
  'university of washington': 'University of Washington',
  'uw madison': 'UW Madison', 'university of wisconsin': 'UW Madison',
  'nus': 'NUS', 'national university of singapore': 'NUS',
  'bar-ilan': 'Bar-Ilan University', 'bar-ilan university': 'Bar-Ilan University',
  'uc riverside': 'UC Riverside', 'ucla': 'UCLA',
  'tu eindhoven': 'TU Eindhoven', 'tu ilmenau': 'TU Ilmenau',
  'fraunhofer': 'Fraunhofer', 'fraunhofer iof': 'Fraunhofer',
  'penn state': 'Penn State', 'pennsylvania state': 'Penn State',
  'google': 'Google', 'google deepmind': 'Google', 'google research': 'Google',
  'meta': 'Meta', 'meta fair': 'Meta', 'meta ai': 'Meta',
  'nvidia': 'NVIDIA', 'samsung': 'Samsung',
  'microsoft': 'Microsoft', 'microsoft research': 'Microsoft',
  'apple': 'Apple', 'amazon': 'Amazon',
};

// ── Helpers ──────────────────────────────────────────────────────────────

function slugify(str) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function extractAffiliations(text) {
  if (!text) return [];
  const found = new Set();
  const lower = text.toLowerCase();
  for (const [pattern, canonical] of Object.entries(INSTITUTION_ALIASES)) {
    if (lower.includes(pattern)) {
      found.add(canonical);
    }
  }
  return [...found];
}

function isRealName(name) {
  if (!name || name === 'anonymous') return false;
  const words = name.trim().split(/\s+/);
  if (words.length < 2 || words.length > 4) return false;
  return words.every(w => /^[A-Z]/.test(w));
}

async function loadArxivCoauthors(arxivUrl) {
  if (!arxivUrl) return [];
  const idMatch = arxivUrl.match(/arxiv\.org\/(?:abs|html)\/(\S+?)(?:v\d+)?$/);
  if (!idMatch) return [];
  const arxivId = idMatch[1];

  try {
    const cachePath = join(ENRICHMENT_CACHE, 'arxiv', `${arxivId.replace('/', '_')}.json`);
    const cached = JSON.parse(await readFile(cachePath, 'utf8'));
    const authors = cached.authors || cached.data?.authors || [];
    return authors.map(a => typeof a === 'string' ? a : a.name || '').filter(Boolean);
  } catch {
    return [];
  }
}

// ── Main ingestion function ──────────────────────────────────────────────

export async function ingestNetwork(graph, signals, opts = {}) {
  const dryRun = opts.dryRun || false;
  const stats = { candidates: 0, references: 0, coauthorEdges: 0, affiliationEdges: 0, themeEdges: 0 };

  // Collect all candidates and their affiliations for cross-matching
  const candidatesByAffiliation = new Map();
  const candidateSlugs = new Set();

  // Phase 1: Upsert candidate nodes + collect affiliations
  for (const sig of signals) {
    if (!isRealName(sig.name)) continue;
    const slug = slugify(sig.name);
    candidateSlugs.add(slug);

    if (!dryRun) {
      await upsertNode(graph, 'Person', {
        slug,
        name: sig.name,
        action: '',  // not scored yet — will be set by persist later
        theme: (sig._themes && sig._themes[0]) || '',
        type: 'scan_candidate',
        last_seen: new Date().toISOString().split('T')[0],
      });
    }
    stats.candidates++;

    // Track affiliations
    const affText = sig.affiliation || sig.background || '';
    const affiliations = extractAffiliations(affText);
    for (const aff of affiliations) {
      if (!candidatesByAffiliation.has(aff)) candidatesByAffiliation.set(aff, []);
      candidatesByAffiliation.get(aff).push({ slug, name: sig.name });
    }

    // Theme edge
    const theme = (sig._themes && sig._themes[0]) || null;
    if (theme && !dryRun) {
      try {
        await upsertEdge(graph, 'Person', slug, 'HAS_EXPERTISE_IN', 'Theme', theme, {
          type: 'scan', confidence: '0.5',
        });
        stats.themeEdges++;
      } catch { /* theme node may not exist yet */ }
    }
  }

  // Phase 2: Ingest co-author networks from enrichment cache
  for (const sig of signals) {
    if (!isRealName(sig.name)) continue;
    const slug = slugify(sig.name);
    const arxivUrl = sig.arxiv || sig._source_url;

    const coauthors = await loadArxivCoauthors(arxivUrl);
    if (coauthors.length === 0) continue;

    for (const authorName of coauthors) {
      if (!isRealName(authorName)) continue;
      const authorSlug = slugify(authorName);
      if (authorSlug === slug) continue; // skip self

      if (!dryRun) {
        // Upsert reference node (won't overwrite if already tracked)
        await upsertNode(graph, 'Person', {
          slug: authorSlug,
          name: authorName,
          type: candidateSlugs.has(authorSlug) ? 'scan_candidate' : 'reference',
          last_seen: new Date().toISOString().split('T')[0],
        });

        await upsertEdge(graph, 'Person', slug, 'COAUTHORED', 'Person', authorSlug, {
          paper_url: arxivUrl || '',
          source: 'scan_ingest',
        });
      }
      stats.references++;
      stats.coauthorEdges++;
    }
  }

  // Phase 3: Create WORKED_WITH edges for candidates at the same institution
  for (const [affiliation, members] of candidatesByAffiliation) {
    if (members.length < 2) continue;
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        if (!dryRun) {
          await upsertEdge(graph, 'Person', members[i].slug, 'WORKED_WITH', 'Person', members[j].slug, {
            context: affiliation,
            source: 'scan_ingest',
          });
        }
        stats.affiliationEdges++;
      }
    }
  }

  return stats;
}

// ── CLI ──────────────────────────────────────────────────────────────────

async function cli() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const jsonArg = args.find(a => a.startsWith('['));

  if (!jsonArg) {
    console.log(`Usage: node scripts/ingest-network.js '[{signals}]' [--dry-run]

Ingests co-author and affiliation networks from enriched scan signals into the graph.

Examples:
  node scripts/ingest-network.js '[{"name":"Jane Doe","affiliation":"MIT","arxiv":"https://arxiv.org/abs/2602.08800"}]'
  node scripts/ingest-network.js --dry-run '[...]'`);
    return;
  }

  const signals = JSON.parse(jsonArg);
  const { db, graph } = await open();

  try {
    await ensure(graph);
    const stats = await ingestNetwork(graph, signals, { dryRun });
    console.log(JSON.stringify({ ok: true, dryRun, ...stats }));
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

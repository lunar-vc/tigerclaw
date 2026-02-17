#!/usr/bin/env node
//
// extract-relationships.js — Detect and write relationship edges to the graph
//
// Reads pipeline index + memory topic files, detects:
//   1. Shared affiliations (same university, lab, company)
//   2. Co-authorship (from Arxiv paper author lists in enrichment cache)
//   3. Theme adjacency (themes sharing people or overlapping primitives)
//
// Usage:
//   node scripts/extract-relationships.js            # detect + write all
//   node scripts/extract-relationships.js --dry-run   # detect only, print results

import { readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { open, close, upsertEdge, ensure, roQuery } from './graph.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const projectSlug = PROJECT_ROOT.replace(/\//g, '-');
const MEMORY_DIR = join(process.env.HOME, '.claude/projects', projectSlug, 'memory');
const ENRICHMENT_CACHE = join(PROJECT_ROOT, '.enrichment-cache');
const PIPELINE_INDEX = join(PROJECT_ROOT, '.pipeline-index.json');

const dryRun = process.argv.includes('--dry-run');

// ── Known institutions (normalized name → canonical name) ────────────────

const INSTITUTION_ALIASES = {
  'uiuc': 'UIUC',
  'university of illinois urbana-champaign': 'UIUC',
  'university of illinois urbana': 'UIUC',
  'university of illinois chicago': 'UIC',
  'mit': 'MIT',
  'massachusetts institute of technology': 'MIT',
  'stanford': 'Stanford',
  'stanford university': 'Stanford',
  'uc berkeley': 'UC Berkeley',
  'berkeley': 'UC Berkeley',
  'university of california berkeley': 'UC Berkeley',
  'carnegie mellon': 'CMU',
  'cmu': 'CMU',
  'tsinghua': 'Tsinghua',
  'tsinghua university': 'Tsinghua',
  'tu wien': 'TU Wien',
  'vienna university of technology': 'TU Wien',
  'hebrew university': 'Hebrew University',
  'hebrew university of jerusalem': 'Hebrew University',
  'university of washington': 'University of Washington',
  'uw madison': 'UW Madison',
  'university of wisconsin': 'UW Madison',
  'nus': 'NUS',
  'national university of singapore': 'NUS',
  'bar-ilan': 'Bar-Ilan University',
  'bar-ilan university': 'Bar-Ilan University',
  'uc riverside': 'UC Riverside',
  'ucla': 'UCLA',
  'tu eindhoven': 'TU Eindhoven',
  'tu ilmenau': 'TU Ilmenau',
  'fraunhofer': 'Fraunhofer',
  'fraunhofer iof': 'Fraunhofer',
  'google': 'Google',
  'meta': 'Meta',
  'nvidia': 'NVIDIA',
  'samsung': 'Samsung',
  'microsoft': 'Microsoft',
  'apple': 'Apple',
  'amazon': 'Amazon',
};

// ── Parse person topic file ──────────────────────────────────────────────

function parsePersonFile(content, slug) {
  const name = content.match(/^# (.+?) —/m)?.[1] || slug;
  const background = content.match(/\*\*Background:\*\* (.+)/)?.[1] || '';
  const work = content.match(/\*\*Work:\*\* (.+)/)?.[1] || '';
  const theme = content.match(/\*\*Theme fit:\*\* (\S+)/)?.[1] || '';
  const paper = content.match(/\*\*Paper:\*\* \[.*?\]\((https?:\/\/[^\)]+)\)/)?.[1]
    || content.match(/\*\*Paper:\*\* (https?:\/\/\S+)/)?.[1] || '';
  const github = content.match(/\*\*Github?:\*\* \[.*?\]\((https?:\/\/[^\)]+)\)/i)?.[1]
    || content.match(/\*\*Github?:\*\* (https?:\/\/\S+)/i)?.[1] || '';

  // Extract affiliations from background
  const affiliations = extractAffiliations(background);

  return { slug, name, background, work, theme, paper, github, affiliations };
}

function extractAffiliations(text) {
  const found = new Set();
  const lower = text.toLowerCase();

  for (const [pattern, canonical] of Object.entries(INSTITUTION_ALIASES)) {
    if (lower.includes(pattern)) {
      found.add(canonical);
    }
  }

  return [...found];
}

// ── Parse theme topic file ───────────────────────────────────────────────

function parseThemeFile(content) {
  const key = content.match(/^# (THE-\d+)/m)?.[1] || '';
  const title = content.match(/^# (?:THE-\d+: )?(.+)/m)?.[1] || '';
  const primitive = content.match(/\*\*Primitive:\*\* (.+)/)?.[1] || '';
  const oneLiner = content.match(/\*\*One-liner:\*\* (.+)/)?.[1] || '';
  return { key, title, primitive, oneLiner };
}

// ── Detect shared affiliations ───────────────────────────────────────────

function detectSharedAffiliations(people) {
  const edges = [];
  const byAffiliation = new Map();

  for (const person of people) {
    for (const aff of person.affiliations) {
      if (!byAffiliation.has(aff)) byAffiliation.set(aff, []);
      byAffiliation.get(aff).push(person);
    }
  }

  for (const [affiliation, members] of byAffiliation) {
    if (members.length < 2) continue;
    // Create edge for each pair
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        edges.push({
          type: 'WORKED_WITH',
          from: members[i].slug,
          to: members[j].slug,
          props: {
            context: affiliation,
            source: 'affiliation_match',
          }
        });
      }
    }
  }

  return { edges, affiliationGroups: byAffiliation };
}

// ── Detect co-authorship from enrichment cache ───────────────────────────

async function detectCoauthorship(people) {
  const edges = [];
  const peopleWithPapers = people.filter(p => p.paper);

  // Try to load Arxiv data from enrichment cache
  for (const person of peopleWithPapers) {
    const arxivId = person.paper.match(/arxiv\.org\/abs\/(\S+)/)?.[1];
    if (!arxivId) continue;

    try {
      const cachePath = join(ENRICHMENT_CACHE, 'arxiv', `${arxivId.replace('/', '_')}.json`);
      const cached = JSON.parse(await readFile(cachePath, 'utf8'));

      // Check if any other tracked person is a co-author
      const coauthors = cached.authors || cached.data?.authors || [];
      for (const other of people) {
        if (other.slug === person.slug) continue;
        const otherName = other.name.toLowerCase();
        const isCoauthor = coauthors.some(a => {
          const authorName = (typeof a === 'string' ? a : a.name || '').toLowerCase();
          // Fuzzy match: check if last name matches
          const otherLast = otherName.split(' ').pop();
          const authorLast = authorName.split(' ').pop();
          return otherLast.length > 2 && authorLast === otherLast
            && authorName.includes(otherName.split(' ')[0].charAt(0));
        });
        if (isCoauthor) {
          edges.push({
            type: 'COAUTHORED',
            from: person.slug,
            to: other.slug,
            props: {
              paper_url: person.paper,
              title: cached.title || cached.data?.title || '',
            }
          });
        }
      }
    } catch {
      // No cache entry — skip
    }
  }

  return edges;
}

// ── Detect theme adjacency ───────────────────────────────────────────────

function detectThemeAdjacency(themes, peopleByTheme) {
  const edges = [];

  // Themes that share people (someone tracked under both themes)
  const themeKeys = [...new Set(themes.map(t => t.key).filter(Boolean))];

  for (let i = 0; i < themeKeys.length; i++) {
    for (let j = i + 1; j < themeKeys.length; j++) {
      const t1 = themeKeys[i];
      const t2 = themeKeys[j];
      const people1 = new Set(peopleByTheme.get(t1) || []);
      const people2 = new Set(peopleByTheme.get(t2) || []);
      const shared = [...people1].filter(p => people2.has(p));

      if (shared.length > 0) {
        edges.push({
          type: 'ADJACENT_TO',
          from: t1,
          to: t2,
          fromLabel: 'Theme',
          toLabel: 'Theme',
          props: {
            shared_people: shared.join(','),
            skill_transfer: `${shared.length} shared researcher(s)`,
            market_overlap: 'shared_expertise',
          }
        });
      }
    }
  }

  // Themes with overlapping primitives
  for (let i = 0; i < themes.length; i++) {
    for (let j = i + 1; j < themes.length; j++) {
      if (!themes[i].key || !themes[j].key) continue;
      if (!themes[i].primitive || !themes[j].primitive) continue;

      const stopWords = new Set([
        'based', 'using', 'that', 'this', 'with', 'from', 'into', 'just',
        'only', 'also', 'more', 'most', 'some', 'each', 'every', 'other',
        'than', 'then', 'when', 'where', 'which', 'while', 'about', 'after',
        'before', 'between', 'through', 'during', 'approach', 'novel', 'system',
        'platform', 'instead', 'returns', 'model', 'policy',
      ]);
      const words1 = new Set(themes[i].primitive.toLowerCase().split(/\W+/).filter(w => w.length > 3 && !stopWords.has(w)));
      const words2 = new Set(themes[j].primitive.toLowerCase().split(/\W+/).filter(w => w.length > 3 && !stopWords.has(w)));
      const overlap = [...words1].filter(w => words2.has(w));

      if (overlap.length >= 2) {
        // Check if we already have an edge from shared people
        const existing = edges.find(e =>
          e.type === 'ADJACENT_TO' &&
          ((e.from === themes[i].key && e.to === themes[j].key) ||
           (e.from === themes[j].key && e.to === themes[i].key))
        );
        if (!existing) {
          edges.push({
            type: 'ADJACENT_TO',
            from: themes[i].key,
            to: themes[j].key,
            fromLabel: 'Theme',
            toLabel: 'Theme',
            props: {
              skill_transfer: `shared primitives: ${overlap.join(', ')}`,
              market_overlap: 'primitive_overlap',
            }
          });
        }
      }
    }
  }

  return edges;
}

// ── Detect founder relationships ────────────────────────────────────────

async function detectFounderEdges(index) {
  const edges = [];
  const companiesDir = join(MEMORY_DIR, 'companies');
  let companyFiles;
  try {
    companyFiles = (await readdir(companiesDir)).filter(f => f.endsWith('.md'));
  } catch {
    return edges;
  }

  // Build person slug lookup from pipeline index
  const personSlugs = new Set(Object.keys(index.people || {}));
  const nameToSlug = new Map();
  for (const [slug, person] of Object.entries(index.people || {})) {
    nameToSlug.set(person.name.toLowerCase(), slug);
  }

  for (const file of companyFiles) {
    try {
      const content = await readFile(join(companiesDir, file), 'utf8');
      const companySlug = file.replace('.md', '');

      // Parse "Founded by:" or "**Founder:**" fields
      const founderMatch = content.match(/\*\*Founded by:\*\* (.+)/i)
        || content.match(/\*\*Founder:\*\* (.+)/i)
        || content.match(/\*\*Founders?:\*\* (.+)/i);

      if (!founderMatch) continue;

      // Split on commas, "and", "&" to handle multiple founders
      const founderNames = founderMatch[1]
        .split(/,|\band\b|&/)
        .map(n => n.trim())
        .filter(Boolean);

      for (const founderName of founderNames) {
        const lowerName = founderName.toLowerCase();
        let founderSlug = nameToSlug.get(lowerName);

        if (!founderSlug) {
          // Try slugifying the name
          const candidateSlug = founderName.toLowerCase().normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          if (personSlugs.has(candidateSlug)) {
            founderSlug = candidateSlug;
          }
        }

        if (founderSlug) {
          edges.push({
            type: 'FOUNDED',
            from: founderSlug,
            to: companySlug,
            fromLabel: 'Person',
            toLabel: 'Company',
            props: { source: 'company_topic_file' },
          });
        }
      }
    } catch { /* skip unreadable files */ }
  }

  return edges;
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  // Load people from memory topic files
  const peopleDir = join(MEMORY_DIR, 'people');
  let peopleFiles;
  try {
    peopleFiles = (await readdir(peopleDir)).filter(f => f.endsWith('.md'));
  } catch {
    peopleFiles = [];
  }

  const people = [];
  for (const file of peopleFiles) {
    if (file === 'anonymous.md' || file === 'test-person.md') continue;
    try {
      const content = await readFile(join(peopleDir, file), 'utf8');
      const slug = file.replace('.md', '');
      people.push(parsePersonFile(content, slug));
    } catch { /* skip unreadable files */ }
  }

  // Load themes
  const themesDir = join(MEMORY_DIR, 'themes');
  let themeFiles;
  try {
    themeFiles = (await readdir(themesDir)).filter(f => f.endsWith('.md'));
  } catch {
    themeFiles = [];
  }

  const themes = [];
  for (const file of themeFiles) {
    try {
      const content = await readFile(join(themesDir, file), 'utf8');
      themes.push(parseThemeFile(content));
    } catch { /* skip */ }
  }

  // Build people-by-theme map
  const peopleByTheme = new Map();
  for (const person of people) {
    if (!person.theme) continue;
    if (!peopleByTheme.has(person.theme)) peopleByTheme.set(person.theme, []);
    peopleByTheme.get(person.theme).push(person.slug);
  }

  // Detect relationships
  console.log(`Analyzing ${people.length} people, ${themes.length} themes...\n`);

  const { edges: affiliationEdges, affiliationGroups } = detectSharedAffiliations(people);
  const coauthorEdges = await detectCoauthorship(people);
  const adjacencyEdges = detectThemeAdjacency(themes, peopleByTheme);

  // Detect founder edges (Person -> Company)
  let index;
  try {
    index = JSON.parse(await readFile(PIPELINE_INDEX, 'utf8'));
  } catch {
    index = { people: {}, companies: {} };
  }
  const founderEdges = await detectFounderEdges(index);

  const allEdges = [...affiliationEdges, ...coauthorEdges, ...adjacencyEdges, ...founderEdges];

  // Report
  console.log(`Shared affiliations:`);
  for (const [aff, members] of affiliationGroups) {
    if (members.length < 2) continue;
    console.log(`  ${aff}: ${members.map(m => m.name).join(', ')}`);
  }

  console.log(`\nCo-authorships detected: ${coauthorEdges.length}`);
  for (const e of coauthorEdges) {
    console.log(`  ${e.from} <-> ${e.to} (${e.props.title || e.props.paper_url})`);
  }

  console.log(`\nTheme adjacencies: ${adjacencyEdges.length}`);
  for (const e of adjacencyEdges) {
    console.log(`  ${e.from} <-> ${e.to} (${e.props.skill_transfer})`);
  }

  console.log(`\nFounder relationships: ${founderEdges.length}`);
  for (const e of founderEdges) {
    console.log(`  ${e.from} -[:FOUNDED]-> ${e.to}`);
  }

  console.log(`\nTotal edges to write: ${allEdges.length}`);

  if (dryRun) {
    console.log('\n(dry run — no edges written to graph)');
    return;
  }

  // Write edges to graph
  const { db, graph } = await open();
  try {
    await ensure(graph);
    let written = 0;
    for (const edge of allEdges) {
      const fromLabel = edge.fromLabel || 'Person';
      const toLabel = edge.toLabel || 'Person';
      try {
        await upsertEdge(graph, fromLabel, edge.from, edge.type, toLabel, edge.to, edge.props);
        written++;
      } catch (e) {
        console.error(`  Failed: ${edge.from} -[${edge.type}]-> ${edge.to}: ${e.message}`);
      }
    }
    console.log(`\nWrote ${written}/${allEdges.length} edges to graph`);
  } finally {
    await close(db);
  }

  console.log(JSON.stringify({
    ok: true,
    affiliations: affiliationEdges.length,
    coauthorships: coauthorEdges.length,
    adjacencies: adjacencyEdges.length,
    founder: founderEdges.length,
    total: allEdges.length,
  }));
}

main().catch(err => {
  console.error(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});

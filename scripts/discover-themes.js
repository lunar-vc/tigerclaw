#!/usr/bin/env node
//
// discover-themes.js — Discover adjacent investment themes from graph signals.
//
// Analyzes scan results + graph topology to propose new themes by finding:
//   1. Orphan signal clusters — candidates that don't map to existing themes
//   2. Bridge nodes — co-authors connecting people across different themes
//   3. Affiliation anomalies — institutions with people spanning multiple themes
//
// Proposals go to Linear THE team as Triage. Humans decide whether to promote.
//
// Library usage:
//   import { discoverThemes } from './discover-themes.js';
//   const proposals = await discoverThemes(graph, signals, opts);
//
// CLI usage:
//   node scripts/discover-themes.js                          # all strategies on current graph
//   node scripts/discover-themes.js --strategy orphan        # orphan clustering only
//   node scripts/discover-themes.js --min-cluster 2          # lower cluster threshold
//   node scripts/discover-themes.js --dry-run                # detect only, don't create issues

import { open, close, ensure, roQuery } from './graph.js';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const PIPELINE_INDEX = join(PROJECT_ROOT, '.pipeline-index.json');

// ── Domain inference from keywords ───────────────────────────────────────

const KEYWORD_TO_DOMAIN = {
  quantum: 'quantum', qubit: 'quantum', entanglement: 'quantum',
  photon: 'photonics', optical: 'photonics', laser: 'photonics', wavelength: 'photonics',
  semiconductor: 'semiconductors', chip: 'semiconductors', transistor: 'semiconductors', dram: 'semiconductors',
  robot: 'robotics', actuator: 'robotics', manipulation: 'robotics',
  biotech: 'biotech', protein: 'biotech', genomic: 'biotech', drug: 'biotech',
  memory: 'infra', checkpoint: 'infra', tiering: 'infra', cache: 'infra', runtime: 'infra',
  agent: 'ai', symbolic: 'ai', prompt: 'ai', inference: 'ai', llm: 'ai', transformer: 'ai',
  security: 'security', firewall: 'security', encryption: 'security',
  network: 'networks', routing: 'networks', switching: 'networks',
  satellite: 'aerospace', orbit: 'aerospace',
  manufactur: 'manufacturing', cnc: 'manufacturing',
  material: 'materials', alloy: 'materials', composite: 'materials',
  sensor: 'iot', embedded: 'iot',
  energy: 'cleantech', solar: 'cleantech', battery: 'cleantech',
};

function inferDomainFromKeywords(keywords) {
  const domainCounts = {};
  for (const kw of keywords) {
    for (const [pattern, domain] of Object.entries(KEYWORD_TO_DOMAIN)) {
      if (kw.includes(pattern)) {
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
      }
    }
  }
  const sorted = Object.entries(domainCounts).sort((a, b) => b[1] - a[1]);
  return sorted.length > 0 ? sorted[0][0] : 'ai'; // default to ai if unknown
}

// ── Strategy 1: Orphan Signal Clustering ─────────────────────────────────

export function findOrphanClusters(signals, opts = {}) {
  const minCluster = opts.minCluster || 3;
  const relevanceThreshold = opts.relevanceThreshold || 0.3;

  // Find orphans: signals where max theme relevance < threshold AND score >= 4
  const orphans = signals.filter(sig => {
    const relevance = sig._theme_relevance || {};
    const maxRelevance = Math.max(0, ...Object.values(relevance));
    const score = sig._score || 0;
    return maxRelevance < relevanceThreshold && score >= 4;
  });

  if (orphans.length < minCluster) return [];

  // Cluster by keyword overlap (2+ shared non-stopword keywords)
  const clusters = [];
  const assigned = new Set();

  for (let i = 0; i < orphans.length; i++) {
    if (assigned.has(i)) continue;
    const cluster = [orphans[i]];
    assigned.add(i);
    const kw_i = new Set(orphans[i]._work_keywords || []);

    for (let j = i + 1; j < orphans.length; j++) {
      if (assigned.has(j)) continue;
      const kw_j = new Set(orphans[j]._work_keywords || []);
      const overlap = [...kw_i].filter(w => kw_j.has(w));
      if (overlap.length >= 2) {
        cluster.push(orphans[j]);
        assigned.add(j);
        // Expand cluster keywords to catch more members
        for (const w of kw_j) kw_i.add(w);
      }
    }

    if (cluster.length >= minCluster) {
      // Find shared keywords across all cluster members
      const allKeywords = cluster.map(s => new Set(s._work_keywords || []));
      const sharedKeywords = [...allKeywords[0]].filter(w =>
        allKeywords.filter(kws => kws.has(w)).length >= Math.ceil(cluster.length * 0.5)
      );

      clusters.push({
        source: 'orphan_cluster',
        signals: cluster.map(s => ({
          name: s.name,
          slug: s.name?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          work: s.work,
          affiliation: s.affiliation,
          score: s._score,
        })),
        shared_keywords: sharedKeywords.slice(0, 10),
        all_keywords: [...new Set(cluster.flatMap(s => s._work_keywords || []))].slice(0, 20),
        domain: inferDomainFromKeywords(sharedKeywords),
      });
    }
  }

  return clusters;
}

// ── Strategy 2: Bridge Node Analysis ─────────────────────────────────────

export async function findBridgeNodes(graph) {
  // Find reference nodes that co-authored with people in 2+ different themes
  const result = await roQuery(graph, `
    MATCH (ref:Person)-[:COAUTHORED]-(p:Person)-[:HAS_EXPERTISE_IN]->(t:Theme)
    WHERE ref.type = 'reference'
    WITH ref, collect(DISTINCT t.key) AS themes, collect(DISTINCT p.name) AS candidates
    WHERE size(themes) >= 2
    RETURN ref.slug AS slug, ref.name AS name,
           themes, candidates
    ORDER BY size(themes) DESC
  `);

  const bridges = resultToRows(result);
  return bridges.map(b => ({
    source: 'bridge_node',
    bridge_person: b.name,
    bridge_slug: b.slug,
    themes_bridged: b.themes,
    connected_candidates: b.candidates,
  }));
}

// ── Strategy 3: Affiliation Density Anomalies ────────────────────────────

export async function findAffiliationAnomalies(graph, opts = {}) {
  const minPeople = opts.minPeople || 3;

  // Find institutions with people in 2+ different themes
  const result = await roQuery(graph, `
    MATCH (p1:Person)-[w:WORKED_WITH]-(p2:Person)
    WHERE p1.slug < p2.slug
    WITH w.context AS institution,
         collect(DISTINCT p1.slug) + collect(DISTINCT p2.slug) AS allSlugs
    WHERE size(allSlugs) >= $minPeople
    UNWIND allSlugs AS slug
    WITH institution, slug
    MATCH (p:Person {slug: slug})-[:HAS_EXPERTISE_IN]->(t:Theme)
    WITH institution,
         collect(DISTINCT t.key) AS themes,
         collect(DISTINCT p.name) AS people
    WHERE size(themes) >= 2
    RETURN institution, themes, people
    ORDER BY size(themes) DESC
  `, { minPeople });

  const anomalies = resultToRows(result);
  return anomalies.map(a => ({
    source: 'affiliation_anomaly',
    institution: a.institution,
    themes_spanned: a.themes,
    people: a.people,
  }));
}

// ── Synthesize proposals ─────────────────────────────────────────────────

function synthesizeTitle(keywords) {
  // Pick the 3-5 most specific keywords and form a phrase
  const specific = keywords
    .filter(w => w.length > 4)
    .slice(0, 5);
  if (specific.length === 0) return 'Untitled adjacent theme';
  return specific.join(' ') + ' — adjacent theme';
}

function buildProposals(orphanClusters, bridges, anomalies, existingThemes) {
  const proposals = [];
  const existingTitlesLower = existingThemes.map(t => (t.title || t.key || '').toLowerCase());

  // Orphan clusters → concrete theme proposals
  for (const cluster of orphanClusters) {
    const title = synthesizeTitle(cluster.shared_keywords);
    const titleLower = title.toLowerCase();

    // Dedup: skip if title keywords heavily overlap with existing theme
    const isDuplicate = existingTitlesLower.some(existing => {
      const existingWords = new Set(existing.split(/\W+/).filter(w => w.length > 3));
      const overlap = cluster.shared_keywords.filter(w => existingWords.has(w));
      return overlap.length >= Math.ceil(cluster.shared_keywords.length * 0.6);
    });
    if (isDuplicate) continue;

    proposals.push({
      type: 'theme_proposal',
      source: 'orphan_cluster',
      suggested_title: `[Auto-discovered] ${title}`,
      suggested_primitive: cluster.shared_keywords.join(', '),
      suggested_domain: cluster.domain,
      confidence: cluster.signals.length >= 5 ? 'strong' : 'medium',
      evidence: {
        signals: cluster.signals,
        keyword_overlap: cluster.shared_keywords,
        all_keywords: cluster.all_keywords,
        cluster_size: cluster.signals.length,
      },
      action: 'CREATE_TRIAGE',
    });
  }

  // Bridge nodes → research suggestions
  for (const bridge of bridges) {
    proposals.push({
      type: 'theme_proposal',
      source: 'bridge_node',
      suggested_title: `[Auto-discovered] Bridge: ${bridge.bridge_person} connects ${bridge.themes_bridged.join(' + ')}`,
      suggested_primitive: `Intersection of ${bridge.themes_bridged.join(' and ')}`,
      suggested_domain: null, // needs research
      confidence: bridge.themes_bridged.length >= 3 ? 'strong' : 'medium',
      evidence: {
        bridge_person: bridge.bridge_person,
        bridge_slug: bridge.bridge_slug,
        parent_themes: bridge.themes_bridged,
        connected_candidates: bridge.connected_candidates,
      },
      action: 'CREATE_TRIAGE',
    });
  }

  // Affiliation anomalies → investigation flags
  for (const anomaly of anomalies) {
    proposals.push({
      type: 'theme_proposal',
      source: 'affiliation_anomaly',
      suggested_title: `[Investigate] ${anomaly.institution} spans ${anomaly.themes_spanned.join(', ')}`,
      suggested_primitive: `Cross-theme research at ${anomaly.institution}`,
      suggested_domain: null,
      confidence: 'weak',
      evidence: {
        institution: anomaly.institution,
        themes_spanned: anomaly.themes_spanned,
        people: anomaly.people,
      },
      action: anomaly.themes_spanned.length >= 3 ? 'CREATE_TRIAGE' : 'LOG_ONLY',
    });
  }

  return proposals;
}

// ── Load existing themes for dedup ───────────────────────────────────────

async function loadExistingThemes(graph) {
  const result = await roQuery(graph, `
    MATCH (t:Theme) RETURN t.key AS key, t.title AS title, t.primitive AS primitive
  `);
  return resultToRows(result);
}

// ── Main discovery function ──────────────────────────────────────────────

export async function discoverThemes(graph, signals, opts = {}) {
  const strategy = opts.strategy || 'all';
  const minCluster = opts.minCluster || 3;
  const stats = { orphan_clusters: 0, bridges: 0, anomalies: 0 };

  const existingThemes = await loadExistingThemes(graph);

  let orphanClusters = [];
  let bridges = [];
  let anomalies = [];

  if (strategy === 'all' || strategy === 'orphan') {
    orphanClusters = findOrphanClusters(signals, { minCluster });
    stats.orphan_clusters = orphanClusters.length;
  }

  if (strategy === 'all' || strategy === 'bridge') {
    bridges = await findBridgeNodes(graph);
    stats.bridges = bridges.length;
  }

  if (strategy === 'all' || strategy === 'affiliation') {
    anomalies = await findAffiliationAnomalies(graph);
    stats.anomalies = anomalies.length;
  }

  const proposals = buildProposals(orphanClusters, bridges, anomalies, existingThemes);

  return { proposals, stats };
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
  const args = process.argv.slice(2);
  if (args.includes('help') || args.includes('--help')) {
    console.log(`Usage: node scripts/discover-themes.js [options]

Discovers adjacent investment themes from graph topology.

Options:
  --strategy orphan|bridge|affiliation|all   Strategy to use (default: all)
  --min-cluster N                            Min signals for orphan cluster (default: 3)
  --dry-run                                  Detect only, don't create issues

Examples:
  node scripts/discover-themes.js
  node scripts/discover-themes.js --strategy orphan --min-cluster 2
  node scripts/discover-themes.js --dry-run`);
    return;
  }

  let strategy = 'all';
  let minCluster = 3;
  const dryRun = args.includes('--dry-run');

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--strategy' && args[i + 1]) strategy = args[++i];
    if (args[i] === '--min-cluster' && args[i + 1]) minCluster = parseInt(args[++i], 10) || 3;
    if (args[i].startsWith('--min-cluster=')) minCluster = parseInt(args[i].split('=')[1], 10) || 3;
    if (args[i].startsWith('--strategy=')) strategy = args[i].split('=')[1];
  }

  const { db, graph } = await open();

  try {
    await ensure(graph);

    // For standalone CLI, load signals from pipeline index (limited data, but bridge + affiliation still work)
    // Orphan clustering works best when called from parallel-scan with full signal data
    const { proposals, stats } = await discoverThemes(graph, [], { strategy, minCluster });

    console.log(JSON.stringify({ ok: true, dryRun, ...stats, proposals }, null, 2));
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

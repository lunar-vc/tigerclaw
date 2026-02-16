#!/usr/bin/env node
//
// query-optimization-report — Analyze query performance and recommend changes.
//
// Reads .query-performance.jsonl and identifies:
//   - High-yield queries (>30% conversion to WATCH/REACH_OUT)
//   - Low-yield queries (<5% conversion with 10+ results)
//   - Never-used signal types
//   - Domain coverage gaps
//
// Usage:
//   node scripts/query-optimization-report.js
//   node scripts/query-optimization-report.js --json
//
// Best run after 4-6 weeks of scan data (50+ entries).

const { readFileSync, existsSync } = require('fs');
const { resolve, dirname } = require('path');
const PROJECT_ROOT = resolve(dirname(__filename), '..');
const LOG_FILE = resolve(PROJECT_ROOT, '.query-performance.jsonl');

const ALL_SIGNAL_TYPES = ['phd', 'github', 'conference', 'research', 'sideproject', 'departure', 'patent'];

function main() {
  const jsonOutput = process.argv.includes('--json');

  if (!existsSync(LOG_FILE)) {
    console.log(jsonOutput
      ? JSON.stringify({ error: 'No data', message: 'Run scans to generate .query-performance.jsonl' })
      : 'No query performance data. Run scans to generate data.');
    return;
  }

  const lines = readFileSync(LOG_FILE, 'utf8').trim().split('\n').filter(Boolean);
  const entries = lines.map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);

  if (entries.length < 10) {
    console.log(jsonOutput
      ? JSON.stringify({ entries: entries.length, message: 'Need 10+ entries for meaningful analysis' })
      : `Only ${entries.length} entries — need 10+ for meaningful analysis.`);
    return;
  }

  // Aggregate by query pattern (normalized)
  const byQuery = {};
  for (const e of entries) {
    const key = e.query;
    if (!byQuery[key]) {
      byQuery[key] = {
        query: key,
        source: e.source,
        domain: e.domain,
        signal_type: e.signal_type,
        runs: 0,
        total_results: 0,
        total_actionable: 0,
      };
    }
    byQuery[key].runs++;
    byQuery[key].total_results += e.results;
    byQuery[key].total_actionable += (e.signals.watch + e.signals.reach_out);
  }

  // Classify queries
  const highYield = [];
  const lowYield = [];

  for (const q of Object.values(byQuery)) {
    q.conversion = q.total_results > 0 ? q.total_actionable / q.total_results : 0;
    if (q.conversion >= 0.3 && q.total_actionable >= 1) {
      highYield.push(q);
    } else if (q.conversion < 0.05 && q.total_results >= 10) {
      lowYield.push(q);
    }
  }

  highYield.sort((a, b) => b.conversion - a.conversion);
  lowYield.sort((a, b) => a.conversion - b.conversion);

  // Find unused signal types
  const usedTypes = new Set(entries.map(e => e.signal_type).filter(Boolean));
  const unusedTypes = ALL_SIGNAL_TYPES.filter(t => !usedTypes.has(t));

  // Domain coverage
  const domainRuns = {};
  for (const e of entries) {
    if (e.domain) domainRuns[e.domain] = (domainRuns[e.domain] || 0) + 1;
  }

  if (jsonOutput) {
    console.log(JSON.stringify({
      total_entries: entries.length,
      unique_queries: Object.keys(byQuery).length,
      high_yield: highYield.map(q => ({ query: q.query, source: q.source, conversion: Math.round(q.conversion * 100), actionable: q.total_actionable })),
      low_yield: lowYield.map(q => ({ query: q.query, source: q.source, conversion: Math.round(q.conversion * 100), results: q.total_results })),
      unused_signal_types: unusedTypes,
      domain_coverage: domainRuns,
    }, null, 2));
    return;
  }

  // Human output
  console.log(`\n  Query Optimization Report (${entries.length} entries)`);
  console.log('  ' + '='.repeat(50));

  if (highYield.length) {
    console.log('\n  HIGH YIELD (>30% conversion):');
    for (const q of highYield.slice(0, 10)) {
      console.log(`    [${Math.round(q.conversion * 100)}%] ${q.source}: "${q.query.slice(0, 60)}..." (${q.total_actionable} actionable)`);
    }
  }

  if (lowYield.length) {
    console.log('\n  LOW YIELD (<5%, consider dropping):');
    for (const q of lowYield.slice(0, 10)) {
      console.log(`    [${Math.round(q.conversion * 100)}%] ${q.source}: "${q.query.slice(0, 60)}..." (${q.total_results} results, ${q.total_actionable} actionable)`);
    }
  }

  if (unusedTypes.length) {
    console.log(`\n  UNUSED SIGNAL TYPES: ${unusedTypes.join(', ')}`);
  }

  console.log('\n  DOMAIN COVERAGE:');
  for (const [domain, runs] of Object.entries(domainRuns).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${domain}: ${runs} queries`);
  }

  console.log(`\n  RECOMMENDATIONS:`);
  if (highYield.length) console.log(`    - Add variants of top ${Math.min(3, highYield.length)} high-yield queries`);
  if (lowYield.length) console.log(`    - Consider dropping ${lowYield.length} low-yield queries`);
  if (unusedTypes.length) console.log(`    - Try signal types: ${unusedTypes.join(', ')}`);
  console.log();
}

main();

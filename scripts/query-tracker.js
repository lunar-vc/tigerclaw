#!/usr/bin/env node
//
// query-tracker — Log query → signal conversion rates.
//
// Tracks which search queries yield WATCH/REACH_OUT signals vs noise.
// After 4-6 weeks of data, use query-optimization-report.js to analyze.
//
// Usage:
//   node scripts/query-tracker.js log '{"query":"...", "source":"departure_scan", "results":5, "signals":{"watch":2,"reach_out":0,"pass":3}}'
//   node scripts/query-tracker.js stats           # Quick summary
//   node scripts/query-tracker.js stats --json    # Machine-readable
//
// Data stored in .query-performance.jsonl (append-only).

const { appendFileSync, readFileSync, existsSync } = require('fs');
const { resolve, dirname } = require('path');
const PROJECT_ROOT = resolve(dirname(__filename), '..');
const LOG_FILE = resolve(PROJECT_ROOT, '.query-performance.jsonl');

function logEntry(data) {
  const entry = {
    timestamp: new Date().toISOString(),
    query: data.query,
    source: data.source || 'unknown',
    domain: data.domain || null,
    signal_type: data.signal_type || null,
    results: data.results || 0,
    signals: {
      reach_out: data.signals?.reach_out || 0,
      watch: data.signals?.watch || 0,
      pass: data.signals?.pass || 0,
    },
    conversion_rate: data.results > 0
      ? ((data.signals?.reach_out || 0) + (data.signals?.watch || 0)) / data.results
      : 0,
  };

  appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
  console.log(JSON.stringify({ ok: true, logged: entry }));
}

function showStats() {
  const jsonOutput = process.argv.includes('--json');

  if (!existsSync(LOG_FILE)) {
    const msg = 'No query performance data yet. Run scans to generate data.';
    console.log(jsonOutput ? JSON.stringify({ entries: 0, message: msg }) : msg);
    return;
  }

  const lines = readFileSync(LOG_FILE, 'utf8').trim().split('\n').filter(Boolean);
  const entries = lines.map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);

  // Aggregate by source
  const bySource = {};
  for (const e of entries) {
    if (!bySource[e.source]) {
      bySource[e.source] = { queries: 0, total_results: 0, total_watch: 0, total_reach_out: 0, total_pass: 0 };
    }
    const s = bySource[e.source];
    s.queries++;
    s.total_results += e.results;
    s.total_watch += e.signals.watch;
    s.total_reach_out += e.signals.reach_out;
    s.total_pass += e.signals.pass;
  }

  // Compute rates
  for (const [source, stats] of Object.entries(bySource)) {
    stats.conversion_rate = stats.total_results > 0
      ? (stats.total_watch + stats.total_reach_out) / stats.total_results
      : 0;
  }

  if (jsonOutput) {
    console.log(JSON.stringify({ total_entries: entries.length, by_source: bySource }, null, 2));
  } else {
    console.log(`\n  Query Performance (${entries.length} entries)`);
    console.log('  ' + '='.repeat(50));
    for (const [source, stats] of Object.entries(bySource)) {
      console.log(`\n  ${source}:`);
      console.log(`    Queries: ${stats.queries}`);
      console.log(`    Results: ${stats.total_results}`);
      console.log(`    REACH_OUT: ${stats.total_reach_out}  WATCH: ${stats.total_watch}  PASS: ${stats.total_pass}`);
      console.log(`    Conversion: ${(stats.conversion_rate * 100).toFixed(1)}%`);
    }
    console.log();
  }
}

function main() {
  const command = process.argv[2];

  if (command === 'log') {
    const data = JSON.parse(process.argv[3]);
    logEntry(data);
  } else if (command === 'stats') {
    showStats();
  } else {
    console.error('Usage:');
    console.error('  node scripts/query-tracker.js log \'{"query":"...","source":"...","results":N,"signals":{...}}\'');
    console.error('  node scripts/query-tracker.js stats [--json]');
    process.exit(1);
  }
}

main();

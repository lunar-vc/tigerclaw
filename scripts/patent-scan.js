#!/usr/bin/env node
//
// patent-scan — Monitor patent filings for founder signals.
//
// First-inventor patents filed by individuals (no corporate assignee) are
// extremely strong founder signals — they indicate someone building IP
// independently, often a precursor to company formation.
//
// Usage:
//   node scripts/patent-scan.js                       # All thesis domains
//   node scripts/patent-scan.js --domain=quantum      # Specific domain
//   node scripts/patent-scan.js --days=30             # Past 30 days
//   node scripts/patent-scan.js --individual-only     # Only individual assignees
//
// Output: JSON with search queries for Claude to execute via brave_web_search.

const DOMAIN_PATENT_QUERIES = {
  quantum: [
    'site:patents.google.com quantum error correction filed:{year}',
    'site:patents.google.com quantum computing qubit filed:{year}',
    'USPTO patent application quantum computing {year}',
    '"patent application" "quantum" "first inventor" filed {year}',
  ],
  ai: [
    'site:patents.google.com large language model inference filed:{year}',
    'site:patents.google.com neural network optimization filed:{year}',
    'USPTO patent application "machine learning" "individual inventor" {year}',
    '"patent application" "artificial intelligence" "first inventor" filed {year}',
  ],
  semiconductors: [
    'site:patents.google.com semiconductor chip design filed:{year}',
    'site:patents.google.com ASIC accelerator filed:{year}',
    'USPTO patent application semiconductor "individual inventor" {year}',
    '"patent application" "integrated circuit" "first inventor" filed {year}',
  ],
  photonics: [
    'site:patents.google.com photonic integrated circuit filed:{year}',
    'site:patents.google.com silicon photonics filed:{year}',
    'USPTO patent application photonics optical "individual inventor" {year}',
    '"patent application" "photonic" "first inventor" filed {year}',
  ],
  biotech: [
    'site:patents.google.com CRISPR gene editing filed:{year}',
    'site:patents.google.com synthetic biology filed:{year}',
    'USPTO patent application genomics "individual inventor" {year}',
    '"patent application" "biotechnology" "first inventor" filed {year}',
  ],
  robotics: [
    'site:patents.google.com autonomous robot manipulation filed:{year}',
    'site:patents.google.com robotic control system filed:{year}',
    'USPTO patent application robotics "individual inventor" {year}',
    '"patent application" "robotic" "first inventor" filed {year}',
  ],
  security: [
    'site:patents.google.com zero trust security filed:{year}',
    'site:patents.google.com cryptographic protocol filed:{year}',
    'USPTO patent application cybersecurity "individual inventor" {year}',
    '"patent application" "security" "encryption" "first inventor" filed {year}',
  ],
  cleantech: [
    'site:patents.google.com battery energy storage filed:{year}',
    'site:patents.google.com solar cell efficiency filed:{year}',
    'USPTO patent application "clean energy" "individual inventor" {year}',
    '"patent application" "renewable energy" "first inventor" filed {year}',
  ],
  aerospace: [
    'site:patents.google.com satellite propulsion filed:{year}',
    'site:patents.google.com spacecraft filed:{year}',
    'USPTO patent application aerospace "individual inventor" {year}',
    '"patent application" "satellite" "spacecraft" "first inventor" filed {year}',
  ],
  manufacturing: [
    'site:patents.google.com additive manufacturing filed:{year}',
    'site:patents.google.com industrial automation filed:{year}',
    'USPTO patent application manufacturing "individual inventor" {year}',
    '"patent application" "manufacturing" "first inventor" filed {year}',
  ],
};

function parseArgs() {
  const args = { domain: null, days: 30, individualOnly: false };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--domain=')) args.domain = arg.split('=')[1];
    else if (arg.startsWith('--days=')) args.days = parseInt(arg.split('=')[1]);
    else if (arg === '--individual-only') args.individualOnly = true;
  }
  return args;
}

function generateQueries(args) {
  const year = new Date().getFullYear();
  const queries = [];
  const domains = args.domain
    ? { [args.domain]: DOMAIN_PATENT_QUERIES[args.domain] }
    : DOMAIN_PATENT_QUERIES;

  for (const [domain, templates] of Object.entries(domains)) {
    if (!templates) continue;
    for (const template of templates) {
      const query = template.replace(/{year}/g, year);
      queries.push({
        query,
        domain,
        source: 'patent_scan',
        signal_type: 'patent',
        freshness: args.days <= 7 ? 'pw' : args.days <= 30 ? 'pm' : 'py',
      });
    }
  }

  // Add cross-domain queries for individual inventors
  if (args.individualOnly) {
    queries.push({
      query: `USPTO "individual inventor" patent application filed ${year} startup`,
      domain: 'cross-domain',
      source: 'patent_scan',
      signal_type: 'patent',
      freshness: 'pm',
    });
  }

  return queries;
}

function main() {
  const args = parseArgs();
  const queries = generateQueries(args);

  const output = {
    scan_type: 'patent',
    generated_at: new Date().toISOString(),
    config: {
      domain: args.domain || 'all',
      days: args.days,
      individual_only: args.individualOnly,
    },
    queries,
    total_queries: queries.length,
    signal_schema: {
      type: 'latent_founder_signal',
      signal_type: 'patent',
      fields: ['name', 'patent_title', 'patent_number', 'filing_date', 'assignee', 'domain', 'source_url'],
    },
    instructions: [
      'Execute queries via brave_web_search',
      'For Google Patents results, extract: inventor name, title, filing date, assignee',
      'HIGHEST SIGNAL: first inventor on patent with NO corporate assignee (individual filing)',
      'MEDIUM SIGNAL: university-assigned patents (may spin out)',
      'LOWER SIGNAL: corporate-assigned patents (employee invention, less likely to spin out)',
      'Score with: node scripts/score-signal.js \'{"patent_filing":true,...}\'',
      'Persist WATCH/REACH_OUT signals via: node scripts/persist-to-memory.js',
    ],
  };

  console.log(JSON.stringify(output, null, 2));
}

main();

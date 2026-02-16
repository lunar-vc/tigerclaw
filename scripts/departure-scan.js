#!/usr/bin/env node
//
// departure-scan — Monitor FAANG/top-lab departures for founder signals.
//
// Searches brave_news_search for recent departure announcements from major
// tech companies. Outputs signals in standard schema for pipeline processing.
//
// Usage:
//   node scripts/departure-scan.js                    # All companies, past week
//   node scripts/departure-scan.js --company=Google   # Specific company
//   node scripts/departure-scan.js --days=14          # Past 2 weeks
//   node scripts/departure-scan.js --domain=ai        # Filter by thesis domain
//
// Output: JSON array of departure signals ready for scoring and persistence.
//
// Designed to use brave_news_search MCP tool — when run standalone, outputs
// query templates that Claude can execute via MCP.

const COMPANIES = [
  'Google', 'Meta', 'Apple', 'Amazon', 'Microsoft', 'OpenAI', 'Anthropic',
  'NVIDIA', 'DeepMind', 'Tesla', 'Palantir', 'Databricks', 'Snowflake',
  'Stripe', 'SpaceX', 'Anduril', 'Scale AI', 'Cohere', 'Mistral',
];

const QUERY_PATTERNS = [
  '"{company}" engineer departed starting startup',
  '"{company}" researcher left founding',
  '"left {company}" "starting" OR "founding" OR "launching"',
  '"departed {company}" engineer researcher',
  '"ex-{company}" founder startup launched',
  '"{company}" VP director departed venture',
];

const DOMAIN_KEYWORDS = {
  ai: ['AI', 'machine learning', 'LLM', 'deep learning', 'neural'],
  quantum: ['quantum', 'qubit', 'quantum computing'],
  biotech: ['biotech', 'genomics', 'drug discovery', 'synthetic biology'],
  security: ['cybersecurity', 'security', 'zero trust', 'cryptography'],
  robotics: ['robotics', 'autonomous', 'robot'],
  semiconductors: ['chip', 'semiconductor', 'ASIC', 'silicon'],
  photonics: ['photonics', 'optical', 'laser', 'fiber'],
  aerospace: ['aerospace', 'satellite', 'space'],
  cleantech: ['cleantech', 'energy', 'battery', 'solar', 'fusion'],
  manufacturing: ['manufacturing', 'factory', 'industrial'],
};

function parseArgs() {
  const args = { companies: COMPANIES, days: 7, domain: null };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--company=')) {
      args.companies = [arg.split('=')[1]];
    } else if (arg.startsWith('--days=')) {
      args.days = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--domain=')) {
      args.domain = arg.split('=')[1];
    }
  }
  return args;
}

function generateQueries(args) {
  const queries = [];

  for (const company of args.companies) {
    for (const pattern of QUERY_PATTERNS) {
      let query = pattern.replace(/{company}/g, company);

      // Add domain filter if specified
      if (args.domain && DOMAIN_KEYWORDS[args.domain]) {
        const keywords = DOMAIN_KEYWORDS[args.domain];
        query += ` (${keywords.join(' OR ')})`;
      }

      queries.push({
        query,
        company,
        freshness: args.days <= 7 ? 'pw' : args.days <= 30 ? 'pm' : 'py',
        source: 'departure_scan',
        signal_type: 'departure',
      });
    }
  }

  return queries;
}

function main() {
  const args = parseArgs();
  const queries = generateQueries(args);

  // Output format depends on context:
  // When piped or used programmatically, output JSON queries
  // Claude will execute these via brave_news_search MCP
  const output = {
    scan_type: 'departure',
    generated_at: new Date().toISOString(),
    config: {
      companies: args.companies,
      days: args.days,
      domain: args.domain,
    },
    queries: queries,
    total_queries: queries.length,
    signal_schema: {
      type: 'founder_signal',
      signal_type: 'departure',
      fields: ['name', 'company', 'role', 'departure_date', 'next_move', 'source_url'],
    },
    instructions: [
      'Execute each query via brave_news_search MCP with the specified freshness',
      'For each result, extract: person name, company, role, what they are doing next',
      'Score each signal using: node scripts/score-signal.js \'{"left_faang":true,"departure":true,...}\'',
      'Persist WATCH/REACH_OUT signals via: node scripts/persist-to-memory.js',
      'Post strong signals to Hookdeck',
    ],
  };

  console.log(JSON.stringify(output, null, 2));
}

main();

#!/usr/bin/env node
//
// departure-scan — Monitor FAANG/top-lab departures for founder signals.
//
// Self-executing: searches Brave Web Search API directly and outputs signals
// in standard schema for pipeline processing.
//
// Usage:
//   node scripts/departure-scan.js                       # All companies, past week
//   node scripts/departure-scan.js --company=Google      # Specific company
//   node scripts/departure-scan.js --days=14             # Past 2 weeks
//   node scripts/departure-scan.js --domain=ai           # Filter by thesis domain
//
// Output: JSON array of departure signals ready for scoring and persistence.

import https from 'node:https';

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
if (!BRAVE_API_KEY) {
  process.stderr.write('Error: BRAVE_API_KEY not set\n');
  console.log('[]');
  process.exit(1);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function getTodayDate() { return new Date().toISOString().split('T')[0]; }

const COMPANIES = [
  'Google', 'Meta', 'Apple', 'Amazon', 'Microsoft', 'OpenAI', 'Anthropic',
  'NVIDIA', 'DeepMind', 'Tesla', 'Palantir', 'Databricks', 'Snowflake',
  'Stripe', 'SpaceX', 'Anduril', 'Scale AI', 'Cohere', 'Mistral',
];

const QUERY_PATTERNS = [
  '"{company}" engineer departed starting startup',
  '"left {company}" "starting" OR "founding" OR "launching"',
  '"ex-{company}" founder startup launched',
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

// ── Brave Search ─────────────────────────────────────────────────────────

async function braveSearch(query, freshness, count = 20) {
  const params = new URLSearchParams({ q: query, count: String(count), freshness });
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.search.brave.com',
      path: `/res/v1/web/search?${params.toString()}`,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': BRAVE_API_KEY,
      },
      timeout: 30000,
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 429) {
          resolve({ web: { results: [] } }); // rate limited — skip
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Brave ${res.statusCode}: ${data.slice(0, 200)}`));
          return;
        }
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Brave parse: ${e.message}`)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Brave timeout')); });
    req.end();
  });
}

// ── Name extraction for departure signals ────────────────────────────────

function extractDepartureName(title, description) {
  const text = `${title} ${description}`;
  const patterns = [
    /([A-Z][a-z]+\s+[A-Z][a-z]+)\s+(?:left|leaves|departed|departs|quits)/i,
    /(?:ex-\w+['']?s?\s+)?([A-Z][a-z]+\s+[A-Z][a-z]+)\s+(?:joins|launches|starts|founds|founding)/i,
    /(?:former|ex)\s+\w+\s+(?:\w+\s+)?([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
    /([A-Z][a-z]+\s+[A-Z][a-z]+),\s+(?:former|ex|who left)/i,
    /([A-Z][a-z]+\s+[A-Z][a-z]+)\s+(?:said|announced|revealed|shared)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const name = m[1].trim();
      if (name.split(/\s+/).length >= 2 && name.split(/\s+/).every(w => /^[A-Z]/.test(w))) {
        return name;
      }
    }
  }
  return 'anonymous';
}

// ── Process results ──────────────────────────────────────────────────────

function processDepartureHit(result, company, domain) {
  const title = result.title || '';
  const description = result.description || '';
  const name = extractDepartureName(title, description);

  return {
    type: 'latent_founder_signal',
    scanned_at: getTodayDate(),
    name,
    affiliation: `ex-${company}`,
    location: null,
    status: `Departed ${company}`,
    work: title,
    primitive: null,
    thesis_fit: 'direct',
    inflection_indicators: ['left big tech', 'departure'],
    signal_strength: 'medium',
    github: null,
    linkedin: null,
    arxiv: null,
    twitter: null,
    action: name !== 'anonymous' ? 'WATCH' : 'PASS - anonymous',
    _source_url: result.url,
    _signal_type: 'departure',
    _search_domain: domain || 'infra',
    _departure_company: company,
    _name_confidence: name !== 'anonymous' ? 0.7 : 0,
    _name_source: name !== 'anonymous' ? 'pattern' : 'none',
  };
}

// ── CLI ──────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = { companies: COMPANIES, days: 7, domain: null };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--company=')) args.companies = [arg.split('=')[1]];
    else if (arg.startsWith('--days=')) args.days = parseInt(arg.split('=')[1]);
    else if (arg.startsWith('--domain=')) args.domain = arg.split('=')[1];
  }
  return args;
}

async function main() {
  const args = parseArgs();
  const freshness = args.days <= 7 ? 'pw' : args.days <= 30 ? 'pm' : 'py';
  const signals = [];

  // Pick subset of companies for efficiency (3 highest-signal patterns × companies)
  const queries = [];
  for (const company of args.companies) {
    for (const pattern of QUERY_PATTERNS) {
      let query = pattern.replace(/{company}/g, company);
      if (args.domain && DOMAIN_KEYWORDS[args.domain]) {
        query += ` (${DOMAIN_KEYWORDS[args.domain].join(' OR ')})`;
      }
      queries.push({ query, company });
    }
  }

  process.stderr.write(`Departure scan: ${queries.length} queries, freshness=${freshness}\n`);

  for (let i = 0; i < queries.length; i++) {
    const { query, company } = queries[i];
    try {
      process.stderr.write(`  [${i + 1}/${queries.length}] ${company}...\n`);
      const response = await braveSearch(query, freshness, 10);
      const results = response.web?.results || [];

      for (const result of results) {
        const signal = processDepartureHit(result, company, args.domain);
        if (signal.name !== 'anonymous') {
          signals.push(signal);
          process.stderr.write(`##SIGNAL##${JSON.stringify({ event: 'result', name: signal.name, affiliation: signal.affiliation, work: signal.work.slice(0, 60) })}\n`);
        }
      }

      await sleep(1200); // rate limit
    } catch (err) {
      process.stderr.write(`  Error: ${err.message}\n`);
    }
  }

  // Dedup by name
  const seen = new Set();
  const deduped = signals.filter(s => {
    const key = s.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  process.stderr.write(`Departure scan: ${deduped.length} unique signals\n`);
  console.log(JSON.stringify(deduped, null, 2));
}

main().catch(err => {
  process.stderr.write(`Fatal: ${err.message}\n`);
  console.log('[]');
  process.exit(1);
});

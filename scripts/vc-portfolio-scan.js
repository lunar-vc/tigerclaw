#!/usr/bin/env node
//
// vc-portfolio-scan — Surface pre-seed/seed European startups from VC portfolios and startup press.
//
// Searches VC blogs, portfolio pages, and European startup media for recently announced
// companies matching a thesis domain. Catches companies that generic web searches miss
// because they're only covered in niche VC/startup outlets.
//
// Usage:
//   node scripts/vc-portfolio-scan.js --domain=robotics        # Single domain
//   node scripts/vc-portfolio-scan.js --domain=materials        # Materials science
//   node scripts/vc-portfolio-scan.js --domain=defense          # Defense/aerospace
//   node scripts/vc-portfolio-scan.js --query="VLA robotics"    # Custom query
//   node scripts/vc-portfolio-scan.js --days=30                 # Freshness (default 90)
//   node scripts/vc-portfolio-scan.js --limit=20                # Results per query (default 10)
//
// Output: JSON array of startup signals ready for scoring and persistence.

import https from 'node:https';

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
if (!BRAVE_API_KEY) {
  process.stderr.write('Error: BRAVE_API_KEY not set\n');
  console.log('[]');
  process.exit(1);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function getTodayDate() { return new Date().toISOString().split('T')[0]; }

// ── European VC firms and accelerators to monitor ─────────────────────────
const EU_VCS = [
  // Nordics
  'FOV Ventures', 'Creandum', 'Northzone', 'EQT Ventures', 'byFounders',
  // DACH
  'Speedinvest', 'Cherry Ventures', 'Earlybird', 'HV Capital', 'Lakestar',
  'UVC Partners', 'Vsquared', 'Notion Capital',
  // France
  'Elaia', 'Serena', 'Partech', 'Breega',
  // UK
  'Seedcamp', 'Octopus Ventures', 'Balderton', 'Atomico', 'Air Street Capital',
  // Pan-EU
  'Entrepreneur First', 'Antler', 'Join Capital',
  // Deep tech specific
  'DCVC', 'Amadeus Capital', 'IQ Capital', 'Molten Ventures',
  'nato innovation fund', 'Vsquared Ventures',
];

// ── European startup media outlets ────────────────────────────────────────
const EU_MEDIA = [
  'sifted.eu', 'eu-startups.com', 'tech.eu', 'breakit.se',
  'nordic9.com', 'arcticstartup.com', 'gruenderszene.de',
  'maddyness.com', 'startupvalley.news',
];

// ── Domain keywords ───────────────────────────────────────────────────────
const DOMAIN_KEYWORDS = {
  robotics: ['robotics', 'robot', 'manipulation', 'autonomous', 'embodied AI', 'VLA', 'humanoid'],
  materials: ['materials science', 'computational materials', 'interatomic potential', 'MLIP', 'molecular dynamics', 'materials discovery'],
  defense: ['defense', 'defence', 'military', 'dual-use', 'NATO', 'tactical AI', 'autonomous systems defense'],
  aerospace: ['aerospace', 'satellite', 'space tech', 'launch', 'earth observation'],
  semiconductors: ['semiconductor', 'chip design', 'ASIC', 'EDA', 'silicon photonics'],
  photonics: ['photonics', 'optical', 'laser', 'fiber optic', 'photonic integrated'],
  security: ['cybersecurity', 'security', 'zero trust', 'OT security', 'SCADA'],
  ai: ['artificial intelligence', 'machine learning', 'foundation model', 'LLM infrastructure'],
  quantum: ['quantum computing', 'quantum', 'qubit', 'quantum sensing'],
  cleantech: ['cleantech', 'energy storage', 'battery', 'fusion', 'hydrogen'],
};

// ── Build queries ─────────────────────────────────────────────────────────

function buildQueries(domain, customQuery) {
  const queries = [];
  const keywords = DOMAIN_KEYWORDS[domain] || [domain];
  const year = new Date().getFullYear();

  // Strategy 1: VC portfolio announcements
  // Pick a subset of VCs to keep query count reasonable
  const vcSubset = EU_VCS.slice(0, 15);
  for (const kw of keywords.slice(0, 3)) {
    queries.push(`"${kw}" startup seed pre-seed Europe ${year}`);
  }

  // Strategy 2: VC-specific portfolio searches (top 6 deep-tech VCs)
  const deepTechVCs = ['Speedinvest', 'Cherry Ventures', 'Earlybird', 'DCVC', 'Atomico', 'Seedcamp'];
  for (const vc of deepTechVCs) {
    queries.push(`"${vc}" portfolio ${keywords[0]} ${year}`);
  }

  // Strategy 3: European startup media
  for (const kw of keywords.slice(0, 2)) {
    queries.push(`site:sifted.eu "${kw}" startup ${year}`);
    queries.push(`site:eu-startups.com "${kw}" ${year}`);
  }

  // Strategy 4: "Startups to watch" and "top startups" lists
  for (const kw of keywords.slice(0, 2)) {
    queries.push(`"${kw}" "startups to watch" ${year} Europe`);
    queries.push(`"${kw}" startup "raised" "pre-seed" OR "seed" Europe ${year}`);
  }

  // Strategy 5: Accelerator/program announcements
  queries.push(`Entrepreneur First ${keywords[0]} startup ${year}`);
  queries.push(`Antler ${keywords[0]} startup cohort ${year}`);

  // Strategy 6: Nordic-specific (often missed by generic searches)
  queries.push(`${keywords[0]} startup Denmark OR Sweden OR Finland OR Norway ${year}`);

  // Custom query override
  if (customQuery) {
    queries.unshift(`${customQuery} startup Europe seed ${year}`);
    queries.unshift(`${customQuery} startup raised pre-seed ${year}`);
  }

  return queries;
}

// ── Brave Search ─────────────────────────────────────────────────────────

async function braveSearch(query, freshness, count = 10) {
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
          resolve({ web: { results: [] } });
          return;
        }
        if (res.statusCode !== 200) {
          process.stderr.write(`    Brave ${res.statusCode}: ${data.slice(0, 200)}\n`);
          resolve({ web: { results: [] } });
          return;
        }
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve({ web: { results: [] } }); }
      });
    });
    req.on('error', () => resolve({ web: { results: [] } }));
    req.on('timeout', () => { req.destroy(); resolve({ web: { results: [] } }); });
    req.end();
  });
}

// ── Extract startup signals from search results ──────────────────────────

function extractSignals(results, query, domain) {
  const signals = [];
  for (const r of (results?.web?.results || [])) {
    signals.push({
      type: 'vc_portfolio_signal',
      scanned_at: getTodayDate(),
      title: r.title || '',
      url: r.url || '',
      description: (r.description || '').replace(/<[^>]*>/g, ''),
      domain: domain,
      source_query: query,
      source_type: 'vc_portfolio_scan',
    });
  }
  return signals;
}

// ── Deduplicate by URL ───────────────────────────────────────────────────

function dedup(signals) {
  const seen = new Set();
  return signals.filter(s => {
    const key = s.url.replace(/\/$/, '').toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Main ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flags = {};
for (const a of args) {
  const m = a.match(/^--(\w[\w-]*)=(.+)$/);
  if (m) flags[m[1]] = m[2];
  else if (a.startsWith('--')) flags[a.slice(2)] = true;
}

const domain = flags.domain || 'robotics';
const customQuery = flags.query || null;
const days = parseInt(flags.days || '90', 10);
const limit = parseInt(flags.limit || '10', 10);

// Map days to Brave freshness parameter
let freshness = 'py';
if (days <= 1) freshness = 'pd';
else if (days <= 7) freshness = 'pw';
else if (days <= 31) freshness = 'pm';
else freshness = 'py';

const queries = buildQueries(domain, customQuery);

process.stderr.write(`VC portfolio scan: ${queries.length} queries for domain="${domain}" (freshness=${freshness})\n`);

let allSignals = [];

for (let i = 0; i < queries.length; i++) {
  const q = queries[i];
  process.stderr.write(`  [${i + 1}/${queries.length}] ${q.slice(0, 80)}...\n`);
  try {
    const results = await braveSearch(q, freshness, limit);
    const signals = extractSignals(results, q, domain);
    allSignals.push(...signals);
  } catch (e) {
    process.stderr.write(`    Error: ${e.message}\n`);
  }
  // Rate limit: 1 req/sec for Brave free tier
  if (i < queries.length - 1) await sleep(1100);
}

allSignals = dedup(allSignals);

process.stderr.write(`\nTotal: ${allSignals.length} unique results across ${queries.length} queries\n`);
console.log(JSON.stringify(allSignals, null, 2));

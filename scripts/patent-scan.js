#!/usr/bin/env node
//
// patent-scan — Monitor patent filings for founder signals.
//
// Self-executing: searches Brave Web Search API directly for patent filings.
// First-inventor patents filed by individuals (no corporate assignee) are
// extremely strong founder signals — they indicate someone building IP
// independently, often a precursor to company formation.
//
// Usage:
//   node scripts/patent-scan.js                          # All thesis domains
//   node scripts/patent-scan.js --domain=quantum         # Specific domain
//   node scripts/patent-scan.js --individual-only        # Only individual assignees
//
// Output: JSON array of patent signals.

import https from 'node:https';

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
if (!BRAVE_API_KEY) {
  process.stderr.write('Error: BRAVE_API_KEY not set\n');
  console.log('[]');
  process.exit(1);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function getTodayDate() { return new Date().toISOString().split('T')[0]; }

const DOMAIN_PATENT_QUERIES = {
  quantum: [
    'site:patents.google.com quantum error correction filed:{year}',
    'site:patents.google.com quantum computing qubit filed:{year}',
  ],
  ai: [
    'site:patents.google.com large language model inference filed:{year}',
    'site:patents.google.com neural network optimization filed:{year}',
  ],
  semiconductors: [
    'site:patents.google.com semiconductor chip design filed:{year}',
    'site:patents.google.com ASIC accelerator filed:{year}',
  ],
  photonics: [
    'site:patents.google.com photonic integrated circuit filed:{year}',
    'site:patents.google.com silicon photonics filed:{year}',
  ],
  biotech: [
    'site:patents.google.com CRISPR gene editing filed:{year}',
    'site:patents.google.com synthetic biology filed:{year}',
  ],
  robotics: [
    'site:patents.google.com autonomous robot manipulation filed:{year}',
    'site:patents.google.com robotic control system filed:{year}',
  ],
  security: [
    'site:patents.google.com zero trust security filed:{year}',
    'site:patents.google.com cryptographic protocol filed:{year}',
  ],
  cleantech: [
    'site:patents.google.com battery energy storage filed:{year}',
    'site:patents.google.com solar cell efficiency filed:{year}',
  ],
  aerospace: [
    'site:patents.google.com satellite propulsion filed:{year}',
  ],
  manufacturing: [
    'site:patents.google.com additive manufacturing filed:{year}',
  ],
};

// ── Brave Search ─────────────────────────────────────────────────────────

async function braveSearch(query, count = 10) {
  const params = new URLSearchParams({ q: query, count: String(count), freshness: 'py' });
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
          reject(new Error(`Brave ${res.statusCode}`));
          return;
        }
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Parse: ${e.message}`)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

// ── Extract inventor name ────────────────────────────────────────────────

function extractInventorName(title, description, url) {
  const text = `${title} ${description}`;
  const patterns = [
    /(?:inventor|filed by|applicant)[:\s]+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
    /([A-Z][a-z]+\s+[A-Z][a-z]+)\s*[-–]\s*(?:patent|Google Patents)/i,
    /patent.*?([A-Z][a-z]+\s+[A-Z][a-z]+)/,
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

function isIndividualAssignee(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  // No corporate indicators = likely individual
  const corporatePatterns = [
    /\b(?:inc|corp|co\.|ltd|llc|gmbh|s\.a\.|plc|corporation|company)\b/,
    /\b(?:google|microsoft|apple|meta|amazon|nvidia|intel|samsung|tsmc|ibm|qualcomm)\b/,
    /\b(?:university|institute|lab|research center)\b/,
  ];
  return !corporatePatterns.some(p => p.test(text));
}

// ── Process results ──────────────────────────────────────────────────────

function processPatentHit(result, domain) {
  const title = result.title || '';
  const description = result.description || '';
  const name = extractInventorName(title, description, result.url);
  const individual = isIndividualAssignee(title, description);

  return {
    type: 'latent_founder_signal',
    scanned_at: getTodayDate(),
    name,
    affiliation: individual ? 'Independent inventor' : 'unknown',
    location: null,
    status: 'Patent inventor',
    work: title,
    primitive: null,
    thesis_fit: 'direct',
    inflection_indicators: individual
      ? ['patent filing', 'individual inventor']
      : ['patent filing'],
    signal_strength: individual ? 'strong' : 'weak',
    github: null,
    linkedin: null,
    arxiv: null,
    twitter: null,
    action: name !== 'anonymous' && individual ? 'WATCH' : 'PASS - ' + (name === 'anonymous' ? 'anonymous' : 'corporate patent'),
    _source_url: result.url,
    _signal_type: 'patent',
    _search_domain: domain,
    _individual_assignee: individual,
    _name_confidence: name !== 'anonymous' ? 0.6 : 0,
    _name_source: name !== 'anonymous' ? 'pattern' : 'none',
  };
}

// ── CLI ──────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = { domain: null, individualOnly: false };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--domain=')) args.domain = arg.split('=')[1];
    else if (arg === '--individual-only') args.individualOnly = true;
  }
  return args;
}

async function main() {
  const args = parseArgs();
  const year = new Date().getFullYear();
  const domains = args.domain
    ? { [args.domain]: DOMAIN_PATENT_QUERIES[args.domain] }
    : DOMAIN_PATENT_QUERIES;

  const signals = [];
  let totalQueries = 0;
  for (const templates of Object.values(domains)) {
    if (templates) totalQueries += templates.length;
  }

  process.stderr.write(`Patent scan: ${totalQueries} queries, year=${year}\n`);
  let queryIdx = 0;

  for (const [domain, templates] of Object.entries(domains)) {
    if (!templates) continue;
    for (const template of templates) {
      queryIdx++;
      const query = template.replace(/{year}/g, year);
      try {
        process.stderr.write(`  [${queryIdx}/${totalQueries}] ${domain}...\n`);
        const response = await braveSearch(query, 10);
        const results = response.web?.results || [];

        for (const result of results) {
          const signal = processPatentHit(result, domain);
          if (signal.name !== 'anonymous') {
            if (args.individualOnly && !signal._individual_assignee) continue;
            signals.push(signal);
            process.stderr.write(`##SIGNAL##${JSON.stringify({ event: 'result', name: signal.name, affiliation: signal.affiliation, work: signal.work.slice(0, 60) })}\n`);
          }
        }

        await sleep(1200); // rate limit
      } catch (err) {
        process.stderr.write(`  Error: ${err.message}\n`);
      }
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

  process.stderr.write(`Patent scan: ${deduped.length} unique signals\n`);
  console.log(JSON.stringify(deduped, null, 2));
}

main().catch(err => {
  process.stderr.write(`Fatal: ${err.message}\n`);
  console.log('[]');
  process.exit(1);
});

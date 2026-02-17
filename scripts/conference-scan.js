#!/usr/bin/env node
//
// conference-scan — Find invited/keynote speakers at top conferences.
//
// Self-executing: searches Brave Web Search API directly for conference speaker
// lists. Invited speakers are high-signal — emerging thought leaders get invited
// before they're widely known.
//
// Usage:
//   node scripts/conference-scan.js                       # All domains
//   node scripts/conference-scan.js --domain=ai           # Specific domain
//   node scripts/conference-scan.js --year=2026           # Specific year
//
// Output: JSON array of conference speaker signals.

import https from 'node:https';

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
if (!BRAVE_API_KEY) {
  process.stderr.write('Error: BRAVE_API_KEY not set\n');
  console.log('[]');
  process.exit(1);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function getTodayDate() { return new Date().toISOString().split('T')[0]; }

const CONFERENCES = {
  ai: [
    { name: 'NeurIPS', query: 'NeurIPS {year} invited speakers program' },
    { name: 'ICML', query: 'ICML {year} keynote speakers program schedule' },
    { name: 'ICLR', query: 'ICLR {year} invited talks speakers' },
  ],
  semiconductors: [
    { name: 'ISSCC', query: 'ISSCC {year} keynote speakers program' },
    { name: 'DAC', query: 'DAC {year} Design Automation Conference keynote speakers' },
    { name: 'Hot Chips', query: 'Hot Chips {year} speakers program' },
  ],
  photonics: [
    { name: 'OFC', query: 'OFC {year} Optical Fiber Conference keynote speakers' },
    { name: 'CLEO', query: 'CLEO {year} conference keynote invited speakers' },
    { name: 'Photonics West', query: 'SPIE Photonics West {year} keynote plenary' },
  ],
  security: [
    { name: 'IEEE S&P', query: 'IEEE Symposium Security Privacy {year} keynote speakers' },
    { name: 'USENIX Security', query: 'USENIX Security {year} keynote invited talks' },
  ],
  robotics: [
    { name: 'ICRA', query: 'ICRA {year} IEEE robotics keynote speakers' },
    { name: 'CoRL', query: 'CoRL {year} Conference Robot Learning keynote' },
  ],
  quantum: [
    { name: 'QIP', query: 'QIP {year} Quantum Information Processing invited speakers' },
    { name: 'APS March Meeting', query: 'APS March Meeting {year} quantum keynote speakers' },
  ],
  biotech: [
    { name: 'ASHG', query: 'ASHG {year} Annual Meeting keynote speakers' },
    { name: 'SynBioBeta', query: 'SynBioBeta {year} speakers keynote program' },
  ],
  aerospace: [
    { name: 'IAC', query: 'International Astronautical Congress {year} keynote speakers' },
  ],
  cleantech: [
    { name: 'ARPA-E Summit', query: 'ARPA-E Energy Innovation Summit {year} speakers' },
  ],
  manufacturing: [
    { name: 'Hannover Messe', query: 'Hannover Messe {year} keynote speakers industry' },
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

// ── Extract speaker names ────────────────────────────────────────────────

function extractSpeakerName(title, description) {
  const text = `${title} ${description}`;
  const patterns = [
    /(?:keynote|invited|plenary)\s+(?:speaker|talk)\s+(?:by\s+)?(?:Dr\.?\s+)?([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
    /(?:Dr\.?\s+|Prof\.?\s+)([A-Z][a-z]+\s+[A-Z][a-z]+)/,
    /([A-Z][a-z]+\s+[A-Z][a-z]+),?\s+(?:keynote|invited|plenary|speaker)/i,
    /([A-Z][a-z]+\s+[A-Z][a-z]+)\s+(?:from|at|of)\s+(?:[A-Z])/,
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

function processConferenceHit(result, conference, domain) {
  const title = result.title || '';
  const description = result.description || '';
  const name = extractSpeakerName(title, description);

  // Check if content mentions keynote/invited
  const isKeynoteMention = /keynote|invited\s+talk|plenary/i.test(`${title} ${description}`);

  return {
    type: 'latent_founder_signal',
    scanned_at: getTodayDate(),
    name,
    affiliation: 'unknown',
    location: null,
    status: `Conference speaker at ${conference}`,
    work: title,
    primitive: null,
    thesis_fit: 'direct',
    inflection_indicators: isKeynoteMention
      ? ['conference presentation', 'keynote speaker']
      : ['conference presentation'],
    signal_strength: isKeynoteMention ? 'medium' : 'weak',
    github: null,
    linkedin: null,
    arxiv: null,
    twitter: null,
    action: name !== 'anonymous' ? 'WATCH' : 'PASS - anonymous',
    _source_url: result.url,
    _signal_type: 'conference',
    _search_domain: domain,
    _conference: conference,
    _needs_puppeteer: /program|schedule|agenda/.test(result.url || ''),
    _name_confidence: name !== 'anonymous' ? 0.65 : 0,
    _name_source: name !== 'anonymous' ? 'pattern' : 'none',
  };
}

// ── CLI ──────────────────────────────────────────────────────────────────

function parseArgs() {
  const currentYear = new Date().getFullYear();
  const args = { domain: null, year: currentYear };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--domain=')) args.domain = arg.split('=')[1];
    else if (arg.startsWith('--year=')) args.year = parseInt(arg.split('=')[1]);
  }
  return args;
}

async function main() {
  const args = parseArgs();
  const domains = args.domain ? { [args.domain]: CONFERENCES[args.domain] } : CONFERENCES;
  const signals = [];

  let totalQueries = 0;
  for (const confs of Object.values(domains)) {
    if (confs) totalQueries += confs.length;
  }

  process.stderr.write(`Conference scan: ${totalQueries} queries, year=${args.year}\n`);
  let queryIdx = 0;

  for (const [domain, conferences] of Object.entries(domains)) {
    if (!conferences) continue;
    for (const conf of conferences) {
      queryIdx++;
      const query = conf.query.replace(/{year}/g, args.year);
      try {
        process.stderr.write(`  [${queryIdx}/${totalQueries}] ${conf.name}...\n`);
        const response = await braveSearch(query, 10);
        const results = response.web?.results || [];

        for (const result of results) {
          const signal = processConferenceHit(result, conf.name, domain);
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
  }

  // Dedup by name
  const seen = new Set();
  const deduped = signals.filter(s => {
    const key = s.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  process.stderr.write(`Conference scan: ${deduped.length} unique signals\n`);
  console.log(JSON.stringify(deduped, null, 2));
}

main().catch(err => {
  process.stderr.write(`Fatal: ${err.message}\n`);
  console.log('[]');
  process.exit(1);
});

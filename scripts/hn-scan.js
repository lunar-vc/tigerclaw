#!/usr/bin/env node
//
// hn-scan — Search HackerNews via Algolia API for founder signals.
//
// Three signal surfaces:
// 1. Show HN posts — builder launching something
// 2. Career transition comments — "I left Google to build..."
//
// HN usernames aren't real names, but posts often link to GitHub repos
// (→ real name via enrichment) or contain "I'm [First Last]" patterns.
//
// Usage:
//   node scripts/hn-scan.js --query="silicon photonics" --freshness=30
//   node scripts/hn-scan.js --query="ternary bitcell" --limit=20
//
// Output: JSON array of signals in standard schema with _hn_url.

import https from 'node:https';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function getTodayDate() { return new Date().toISOString().split('T')[0]; }

// ── HN Algolia API ──────────────────────────────────────────────────────

async function hnSearch(query, tags, numericFilters, hitsPerPage = 20) {
  const params = new URLSearchParams({
    query,
    tags: tags || '',
    hitsPerPage: String(hitsPerPage),
  });
  if (numericFilters) params.set('numericFilters', numericFilters);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'hn.algolia.com',
      path: `/api/v1/search_by_date?${params.toString()}`,
      method: 'GET',
      headers: {
        'User-Agent': 'Tigerclaw/1.0 (VC research)',
        'Accept': 'application/json',
      },
      timeout: 20000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HN API ${res.statusCode}`));
          return;
        }
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`HN parse: ${e.message}`)); }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('HN timeout')); });
    req.end();
  });
}

// ── Extract person name from HN content ─────────────────────────────────

function extractPersonName(text) {
  if (!text) return null;
  // "I'm First Last" or "My name is First Last"
  const patterns = [
    /I['']m\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/,
    /my name is\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
    /I['']m\s+([A-Z][a-z]+),/,
    /—\s*([A-Z][a-z]+\s+[A-Z][a-z]+)\s*$/,
    /by\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1];
  }
  return null;
}

// ── Extract GitHub URL from HN content ──────────────────────────────────

function extractGithubUrl(text, url) {
  const combined = `${text || ''} ${url || ''}`;
  const m = combined.match(/https?:\/\/github\.com\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)?/);
  return m ? m[0] : null;
}

// ── Convert HN hits to signal schema ────────────────────────────────────

function hitToSignal(hit, signalType, domain) {
  const title = hit.title || hit.story_title || '';
  const text = hit.comment_text || hit.story_text || '';
  const url = hit.url || hit.story_url || `https://news.ycombinator.com/item?id=${hit.objectID}`;

  const personName = extractPersonName(text) || extractPersonName(title);
  const githubUrl = extractGithubUrl(text, url);

  // Extract GitHub username as fallback name
  let name = personName || 'anonymous';
  if (name === 'anonymous' && githubUrl) {
    const ghMatch = githubUrl.match(/github\.com\/([a-zA-Z0-9_-]+)/);
    if (ghMatch) name = ghMatch[1]; // GitHub username — will need enrichment
  }

  const hnUrl = `https://news.ycombinator.com/item?id=${hit.objectID}`;

  return {
    type: 'latent_founder_signal',
    scanned_at: getTodayDate(),
    name,
    affiliation: 'unknown',
    location: null,
    status: signalType === 'show_hn' ? 'Builder' : 'Career transition',
    work: title || text.slice(0, 200),
    primitive: null,
    thesis_fit: 'direct',
    inflection_indicators: signalType === 'show_hn'
      ? ['product launch', 'side project']
      : ['career transition'],
    signal_strength: signalType === 'show_hn' ? 'medium' : 'weak',
    github: githubUrl,
    linkedin: null,
    arxiv: null,
    twitter: null,
    action: signalType === 'show_hn' ? 'WATCH' : 'PASS - needs enrichment',
    _source_url: url !== hnUrl ? url : hnUrl,
    _signal_type: signalType === 'show_hn' ? 'sideproject' : 'departure',
    _search_domain: domain || 'infra',
    _hn_url: hnUrl,
    _hn_points: hit.points || 0,
    _hn_comments: hit.num_comments || 0,
    _name_confidence: personName ? 0.7 : 0.3,
    _name_source: personName ? 'hn_text' : (githubUrl ? 'github_username' : 'none'),
  };
}

// ── CLI ──────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = { query: '', freshness: 30, limit: 20, domain: 'infra' };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--query='))       args.query = arg.split('=').slice(1).join('=');
    else if (arg.startsWith('--freshness=')) args.freshness = parseInt(arg.split('=')[1]) || 30;
    else if (arg.startsWith('--limit='))     args.limit = parseInt(arg.split('=')[1]) || 20;
    else if (arg.startsWith('--domain='))    args.domain = arg.split('=')[1];
  }
  return args;
}

async function main() {
  const args = parseArgs();

  if (!args.query) {
    process.stderr.write('Usage: hn-scan.js --query="search terms" [--freshness=30] [--limit=20]\n');
    console.log('[]');
    process.exit(1);
  }

  // Calculate timestamp cutoff
  const cutoff = Math.floor(Date.now() / 1000) - (args.freshness * 86400);
  const numericFilters = `created_at_i>${cutoff}`;

  process.stderr.write(`HN scan: query="${args.query}" freshness=${args.freshness}d limit=${args.limit}\n`);

  const allSignals = [];

  try {
    // 1. Show HN posts
    process.stderr.write('  Searching Show HN...\n');
    const showHN = await hnSearch(`Show HN ${args.query}`, 'show_hn', numericFilters, args.limit);
    const showHits = showHN.hits || [];
    process.stderr.write(`  Show HN: ${showHits.length} hits\n`);
    for (const hit of showHits) {
      allSignals.push(hitToSignal(hit, 'show_hn', args.domain));
    }

    await sleep(1000); // rate limit

    // 2. Career transition comments
    process.stderr.write('  Searching career transitions...\n');
    const transitionQuery = `"left" OR "starting" OR "building" ${args.query}`;
    const transitions = await hnSearch(transitionQuery, 'comment', numericFilters, args.limit);
    const transHits = transitions.hits || [];
    process.stderr.write(`  Transitions: ${transHits.length} hits\n`);
    for (const hit of transHits) {
      allSignals.push(hitToSignal(hit, 'transition', args.domain));
    }

    process.stderr.write(`HN total: ${allSignals.length} signals\n`);
    console.log(JSON.stringify(allSignals, null, 2));
  } catch (err) {
    process.stderr.write(`HN error: ${err.message}\n`);
    console.log(JSON.stringify(allSignals, null, 2));
    process.exit(allSignals.length > 0 ? 0 : 1);
  }
}

main().catch(err => {
  process.stderr.write(`Fatal: ${err.message}\n`);
  console.log('[]');
  process.exit(1);
});

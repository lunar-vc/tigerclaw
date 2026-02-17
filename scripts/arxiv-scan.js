#!/usr/bin/env node
//
// arxiv-scan — Search arXiv papers by category + keywords.
//
// Uses arXiv's search API (export.arxiv.org) to find recent papers with full
// author data. Unlike Brave-based research queries that find pages ABOUT papers,
// this finds the actual papers with complete author lists and affiliations.
//
// Usage:
//   node scripts/arxiv-scan.js --domain=quantum --freshness=30 --limit=20
//   node scripts/arxiv-scan.js --query="ternary bitcell SRAM inference" --limit=10
//   node scripts/arxiv-scan.js --domain=ai --query="LLM memory checkpoint"
//
// Output: JSON array of signals in standard schema with _coauthors arrays.

import https from 'node:https';

// ── arXiv category mapping per domain ────────────────────────────────────

const ARXIV_CATEGORIES = {
  quantum:       ['quant-ph'],
  ai:            ['cs.AI', 'cs.LG', 'cs.CV', 'cs.CL'],
  robotics:      ['cs.RO'],
  semiconductors:['cond-mat.mes-hall', 'cs.AR'],
  photonics:     ['physics.optics'],
  biotech:       ['q-bio.BM', 'q-bio.GN'],
  security:      ['cs.CR'],
  materials:     ['cond-mat.mtrl-sci'],
  cleantech:     ['cond-mat.mtrl-sci', 'physics.chem-ph'],
  infra:         ['cs.DC', 'cs.DB'],
  networks:      ['cs.NI'],
  manufacturing: ['cs.CE'],
  aerospace:     ['astro-ph.IM', 'physics.space-ph'],
  iot:           ['cs.NI', 'cs.DC'],
  xr:            ['cs.HC', 'cs.GR'],
  web3:          ['cs.CR', 'cs.DC'],
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function getTodayDate() { return new Date().toISOString().split('T')[0]; }

// ── arXiv API ────────────────────────────────────────────────────────────

async function searchArxiv(categories, keywords, maxResults = 50, startDate = null) {
  // Build query: cat:X AND all:keyword1 AND all:keyword2
  const catQuery = categories.map(c => `cat:${c}`).join('+OR+');
  const keywordParts = keywords.split(/\s+/).filter(w => w.length > 2).slice(0, 4);
  const keyQuery = keywordParts.map(k => `all:${encodeURIComponent(k)}`).join('+AND+');

  const searchQuery = keyQuery ? `(${catQuery})+AND+${keyQuery}` : catQuery;

  const url = `/api/query?search_query=${searchQuery}&sortBy=submittedDate&sortOrder=descending&max_results=${maxResults}`;

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'export.arxiv.org',
      path: url,
      method: 'GET',
      headers: { 'User-Agent': 'Tigerclaw/1.0 (VC research; morris@lunarventures.eu)' },
      timeout: 30000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(parseArxivResponse(data, startDate));
        } catch (e) {
          reject(new Error(`arXiv parse error: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('arXiv timeout')); });
    req.end();
  });
}

function parseArxivResponse(xml, startDate) {
  const entries = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];

    const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/\s+/g, ' ').trim() || '';
    const abstract = entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.replace(/\s+/g, ' ').trim() || '';
    const published = entry.match(/<published>([^<]+)<\/published>/)?.[1]?.split('T')[0] || '';
    const id = entry.match(/<id>([^<]+)<\/id>/)?.[1] || '';

    // Filter by date if startDate provided
    if (startDate && published && published < startDate) continue;

    // Extract all authors
    const authors = [];
    const affiliations = [];
    const authorRegex = /<author>\s*<name>([^<]+)<\/name>(?:\s*<arxiv:affiliation[^>]*>([^<]*)<\/arxiv:affiliation>)?/g;
    let authorMatch;
    while ((authorMatch = authorRegex.exec(entry)) !== null) {
      authors.push(authorMatch[1].trim());
      if (authorMatch[2]) affiliations.push(authorMatch[2].trim());
    }

    // Extract categories
    const categories = [];
    const catRegex = /<category[^>]*term="([^"]+)"/g;
    let catMatch;
    while ((catMatch = catRegex.exec(entry)) !== null) {
      categories.push(catMatch[1]);
    }

    if (authors.length === 0) continue;

    entries.push({
      title,
      abstract: abstract.slice(0, 500),
      published,
      arxiv_url: id.replace('http:', 'https:'),
      authors,
      affiliations: [...new Set(affiliations)],
      categories,
    });
  }

  return entries;
}

// ── Convert arXiv entries to signal schema ───────────────────────────────

function entryToSignal(entry, domain) {
  const firstAuthor = entry.authors[0];
  const affiliation = entry.affiliations[0] || 'unknown';

  return {
    type: 'latent_founder_signal',
    scanned_at: getTodayDate(),
    name: firstAuthor,
    affiliation,
    location: null,
    status: 'Researcher',
    work: entry.title,
    primitive: null,
    thesis_fit: 'direct',
    inflection_indicators: ['research paper', 'arxiv preprint'],
    signal_strength: 'medium',
    github: null,
    linkedin: null,
    arxiv: entry.arxiv_url,
    twitter: null,
    action: 'WATCH',
    _source_url: entry.arxiv_url,
    _signal_type: 'research',
    _search_domain: domain,
    _coauthors: entry.authors.slice(1),
    _arxiv_published: entry.published,
    _arxiv_categories: entry.categories,
    _name_confidence: 0.9, // arXiv author names are reliable
    _name_source: 'arxiv_api',
  };
}

// ── CLI ──────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = { domain: 'ai', query: '', freshness: 30, limit: 20 };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--domain='))    args.domain = arg.split('=')[1];
    else if (arg.startsWith('--query='))    args.query = arg.split('=').slice(1).join('=');
    else if (arg.startsWith('--freshness=')) args.freshness = parseInt(arg.split('=')[1]) || 30;
    else if (arg.startsWith('--limit='))     args.limit = parseInt(arg.split('=')[1]) || 20;
  }
  return args;
}

async function main() {
  const args = parseArgs();
  const categories = ARXIV_CATEGORIES[args.domain] || ['cs.AI'];

  // Calculate start date from freshness
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - args.freshness);
  const startDateStr = startDate.toISOString().split('T')[0];

  process.stderr.write(`arXiv scan: categories=${categories.join(',')} query="${args.query}" since=${startDateStr}\n`);

  try {
    const entries = await searchArxiv(categories, args.query, args.limit, startDateStr);
    process.stderr.write(`arXiv: ${entries.length} papers found\n`);

    // Rate limit: 3s between requests per arXiv guidelines
    await sleep(3000);

    const signals = entries.map(e => entryToSignal(e, args.domain));
    console.log(JSON.stringify(signals, null, 2));
  } catch (err) {
    process.stderr.write(`arXiv error: ${err.message}\n`);
    console.log('[]');
    process.exit(1);
  }
}

main().catch(err => {
  process.stderr.write(`Fatal: ${err.message}\n`);
  console.log('[]');
  process.exit(1);
});

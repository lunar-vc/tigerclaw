#!/usr/bin/env node
//
// semantic-scholar-scan — Search Semantic Scholar papers + co-author graphs.
//
// Semantic Scholar has 200M+ papers with full co-author graphs. The free API
// (100 req/5min, no key) gives paper search by keywords + year range, author
// profiles with affiliations, and co-author lists with author IDs.
//
// Usage:
//   node scripts/semantic-scholar-scan.js --query="ternary weight inference" --limit=10
//   node scripts/semantic-scholar-scan.js --query="silicon photonics" --year=2025 --limit=20
//
// Output: JSON array of signals with _s2_author_id, _s2_paper_id, _coauthors.

import https from 'node:https';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function getTodayDate() { return new Date().toISOString().split('T')[0]; }

// ── Semantic Scholar API ─────────────────────────────────────────────────

async function s2Request(path, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await new Promise((resolve, reject) => {
        const options = {
          hostname: 'api.semanticscholar.org',
          path,
          method: 'GET',
          headers: {
            'User-Agent': 'Tigerclaw/1.0 (VC research)',
            'Accept': 'application/json',
          },
          timeout: 30000,
        };

        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', chunk => { data += chunk; });
          res.on('end', () => {
            if (res.statusCode === 429) {
              reject(new Error('S2 rate limited'));
              return;
            }
            if (res.statusCode !== 200) {
              reject(new Error(`S2 API ${res.statusCode}: ${data.slice(0, 200)}`));
              return;
            }
            try { resolve(JSON.parse(data)); }
            catch (e) { reject(new Error(`S2 parse: ${e.message}`)); }
          });
        });

        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('S2 timeout')); });
        req.end();
      });
      return result;
    } catch (err) {
      if (err.message.includes('rate limited') && attempt < retries) {
        const backoff = attempt * 5000;
        process.stderr.write(`  S2 rate limited, retrying in ${backoff / 1000}s (attempt ${attempt}/${retries})...\n`);
        await sleep(backoff);
        continue;
      }
      throw err;
    }
  }
}

async function searchPapers(query, year, limit) {
  const fields = 'title,abstract,authors,year,externalIds,publicationDate,citationCount';
  const yearParam = year ? `&year=${year}-` : '';
  const path = `/graph/v1/paper/search?query=${encodeURIComponent(query)}&fields=${fields}&limit=${limit}${yearParam}`;
  return s2Request(path);
}

// ── Convert S2 papers to signal schema ───────────────────────────────────

function paperToSignal(paper, domain) {
  if (!paper.authors || paper.authors.length === 0) return null;

  const firstAuthor = paper.authors[0];
  const authorName = firstAuthor.name || 'anonymous';

  // Build co-authors list
  const coauthors = paper.authors.slice(1).map(a => ({
    name: a.name,
    s2_id: a.authorId,
  }));

  // Determine signal strength from citation count
  let strength = 'weak';
  if (paper.citationCount > 50) strength = 'strong';
  else if (paper.citationCount > 10) strength = 'medium';

  return {
    type: 'latent_founder_signal',
    scanned_at: getTodayDate(),
    name: authorName,
    affiliation: 'unknown', // S2 paper search doesn't include affiliations
    location: null,
    status: 'Researcher',
    work: paper.title || '',
    primitive: null,
    thesis_fit: 'direct',
    inflection_indicators: ['research paper'],
    signal_strength: strength,
    github: null,
    linkedin: null,
    arxiv: paper.externalIds?.ArXiv ? `https://arxiv.org/abs/${paper.externalIds.ArXiv}` : null,
    twitter: null,
    action: strength === 'strong' ? 'WATCH' : 'PASS - weak signal',
    _source_url: paper.externalIds?.ArXiv
      ? `https://arxiv.org/abs/${paper.externalIds.ArXiv}`
      : `https://api.semanticscholar.org/graph/v1/paper/${paper.paperId}`,
    _signal_type: 'research',
    _search_domain: domain || 'infra',
    _s2_paper_id: paper.paperId,
    _s2_author_id: firstAuthor.authorId,
    _coauthors: coauthors.map(c => c.name),
    _s2_citations: paper.citationCount,
    _name_confidence: 0.9,
    _name_source: 'semantic_scholar',
  };
}

// ── CLI ──────────────────────────────────────────────────────────────────

function parseArgs() {
  const currentYear = new Date().getFullYear();
  const args = { query: '', year: currentYear - 1, limit: 20, domain: 'infra' };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--query='))      args.query = arg.split('=').slice(1).join('=');
    else if (arg.startsWith('--year='))  args.year = parseInt(arg.split('=')[1]) || currentYear - 1;
    else if (arg.startsWith('--limit=')) args.limit = parseInt(arg.split('=')[1]) || 20;
    else if (arg.startsWith('--domain=')) args.domain = arg.split('=')[1];
  }
  return args;
}

async function main() {
  const args = parseArgs();

  if (!args.query) {
    process.stderr.write('Usage: semantic-scholar-scan.js --query="search terms" [--year=2025] [--limit=20]\n');
    console.log('[]');
    process.exit(1);
  }

  process.stderr.write(`S2 scan: query="${args.query}" year>=${args.year} limit=${args.limit}\n`);

  try {
    const response = await searchPapers(args.query, args.year, args.limit);
    const papers = response.data || [];
    process.stderr.write(`S2: ${papers.length} papers found (total: ${response.total || '?'})\n`);

    // Rate limit: 3s between requests (100 req/5min = 1 req/3s)
    await sleep(3000);

    const signals = papers
      .map(p => paperToSignal(p, args.domain))
      .filter(Boolean);

    console.log(JSON.stringify(signals, null, 2));
  } catch (err) {
    process.stderr.write(`S2 error: ${err.message}\n`);
    console.log('[]');
    process.exit(1);
  }
}

main().catch(err => {
  process.stderr.write(`Fatal: ${err.message}\n`);
  console.log('[]');
  process.exit(1);
});

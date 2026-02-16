#!/usr/bin/env node
//
// conference-scan — Find invited/keynote speakers at top conferences.
//
// Generates search queries targeting speaker lists for top conferences in each
// thesis domain. Invited speakers are high-signal — emerging thought leaders
// get invited before they're widely known.
//
// Usage:
//   node scripts/conference-scan.js                    # All domains
//   node scripts/conference-scan.js --domain=ai        # Specific domain
//   node scripts/conference-scan.js --year=2026        # Specific year
//
// Output: JSON with search queries for Claude to execute via brave_web_search
//         or puppeteer_navigate (for JS-rendered conference sites).

const CONFERENCES = {
  ai: [
    { name: 'NeurIPS', query: 'NeurIPS {year} invited speakers program' },
    { name: 'ICML', query: 'ICML {year} keynote speakers program schedule' },
    { name: 'ICLR', query: 'ICLR {year} invited talks speakers' },
    { name: 'AAAI', query: 'AAAI {year} keynote invited speakers' },
    { name: 'ACL', query: 'ACL {year} keynote speakers NLP' },
  ],
  semiconductors: [
    { name: 'ISSCC', query: 'ISSCC {year} keynote speakers program' },
    { name: 'DAC', query: 'DAC {year} Design Automation Conference keynote speakers' },
    { name: 'Hot Chips', query: 'Hot Chips {year} speakers program' },
    { name: 'VLSI Symposium', query: 'VLSI Symposium {year} keynote speakers' },
    { name: 'IEDM', query: 'IEDM {year} keynote invited talks' },
  ],
  photonics: [
    { name: 'OFC', query: 'OFC {year} Optical Fiber Conference keynote speakers' },
    { name: 'CLEO', query: 'CLEO {year} conference keynote invited speakers' },
    { name: 'Photonics West', query: 'SPIE Photonics West {year} keynote plenary' },
    { name: 'ECOC', query: 'ECOC {year} keynote speakers optical' },
    { name: 'IEEE Photonics Conference', query: 'IEEE Photonics Conference {year} keynote' },
  ],
  security: [
    { name: 'IEEE S&P', query: 'IEEE Symposium Security Privacy {year} keynote speakers' },
    { name: 'USENIX Security', query: 'USENIX Security {year} keynote invited talks' },
    { name: 'CCS', query: 'ACM CCS {year} keynote speakers' },
    { name: 'NDSS', query: 'NDSS {year} keynote speakers program' },
    { name: 'Black Hat', query: 'Black Hat {year} keynote speakers schedule' },
  ],
  robotics: [
    { name: 'ICRA', query: 'ICRA {year} IEEE robotics keynote speakers' },
    { name: 'IROS', query: 'IROS {year} keynote speakers program' },
    { name: 'CoRL', query: 'CoRL {year} Conference Robot Learning keynote' },
    { name: 'RSS', query: 'RSS {year} Robotics Science Systems keynote speakers' },
    { name: 'HRI', query: 'HRI {year} Human-Robot Interaction keynote' },
  ],
  quantum: [
    { name: 'QIP', query: 'QIP {year} Quantum Information Processing invited speakers' },
    { name: 'APS March Meeting', query: 'APS March Meeting {year} quantum keynote speakers' },
    { name: 'IEEE Quantum Week', query: 'IEEE Quantum Week {year} keynote plenary speakers' },
    { name: 'Q2B', query: 'Q2B {year} quantum computing conference speakers' },
    { name: 'Qiskit Summit', query: 'Qiskit Summit {year} speakers program' },
  ],
  biotech: [
    { name: 'ASHG', query: 'ASHG {year} Annual Meeting keynote speakers' },
    { name: 'SynBioBeta', query: 'SynBioBeta {year} speakers keynote program' },
    { name: 'Bio-IT World', query: 'Bio-IT World {year} keynote speakers' },
    { name: 'AACR', query: 'AACR {year} Annual Meeting keynote plenary speakers' },
    { name: 'J.P. Morgan Healthcare', query: 'J.P. Morgan Healthcare Conference {year} presenters speakers' },
  ],
  aerospace: [
    { name: 'IAC', query: 'International Astronautical Congress {year} keynote speakers' },
    { name: 'Space Symposium', query: 'Space Symposium {year} keynote speakers' },
    { name: 'AIAA SciTech', query: 'AIAA SciTech {year} keynote plenary speakers' },
    { name: 'SmallSat', query: 'SmallSat Conference {year} keynote speakers' },
    { name: 'Satellite', query: 'SATELLITE {year} conference keynote speakers' },
  ],
  cleantech: [
    { name: 'ARPA-E Summit', query: 'ARPA-E Energy Innovation Summit {year} speakers' },
    { name: 'RE+', query: 'RE+ {year} conference keynote speakers solar' },
    { name: 'BloombergNEF', query: 'BloombergNEF Summit {year} speakers' },
    { name: 'The Battery Show', query: 'The Battery Show {year} keynote speakers' },
    { name: 'COP Climate', query: 'COP {year} climate tech speakers innovators' },
  ],
  manufacturing: [
    { name: 'Hannover Messe', query: 'Hannover Messe {year} keynote speakers industry' },
    { name: 'Automate', query: 'Automate {year} conference keynote speakers' },
    { name: 'IMTS', query: 'IMTS {year} keynote speakers manufacturing' },
    { name: 'Formnext', query: 'Formnext {year} keynote speakers additive manufacturing' },
    { name: 'Fabtech', query: 'Fabtech {year} keynote speakers program' },
  ],
};

function parseArgs() {
  const currentYear = new Date().getFullYear();
  const args = { domain: null, year: currentYear };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--domain=')) args.domain = arg.split('=')[1];
    else if (arg.startsWith('--year=')) args.year = parseInt(arg.split('=')[1]);
  }
  return args;
}

function generateQueries(args) {
  const queries = [];
  const domains = args.domain ? { [args.domain]: CONFERENCES[args.domain] } : CONFERENCES;

  for (const [domain, conferences] of Object.entries(domains)) {
    if (!conferences) continue;
    for (const conf of conferences) {
      queries.push({
        query: conf.query.replace(/{year}/g, args.year),
        conference: conf.name,
        domain,
        year: args.year,
        source: 'conference_scan',
        signal_type: 'conference',
        scrape_hint: 'May need puppeteer_navigate for JS-rendered conference program pages',
      });
    }
  }

  return queries;
}

function main() {
  const args = parseArgs();
  const queries = generateQueries(args);

  const output = {
    scan_type: 'conference',
    generated_at: new Date().toISOString(),
    config: {
      domain: args.domain || 'all',
      year: args.year,
    },
    queries,
    total_queries: queries.length,
    signal_schema: {
      type: 'latent_founder_signal',
      signal_type: 'conference',
      fields: ['name', 'affiliation', 'talk_title', 'conference', 'domain', 'source_url'],
    },
    instructions: [
      'Execute queries via brave_web_search to find conference program pages',
      'For JS-rendered pages, use puppeteer_navigate + puppeteer_evaluate to extract speaker lists',
      'Extract: speaker name, affiliation, talk title, session type (keynote/invited/oral)',
      'Keynote and invited speakers are highest signal — they indicate emerging thought leaders',
      'Score with: node scripts/score-signal.js \'{"conference_top_venue":true,...}\'',
      'Persist WATCH/REACH_OUT signals via: node scripts/persist-to-memory.js',
    ],
  };

  console.log(JSON.stringify(output, null, 2));
}

main();

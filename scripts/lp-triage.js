#!/usr/bin/env node
//
// lp-triage.js — Daily Gmail triage for LP prospects
//
// Usage:
//   node scripts/lp-triage.js              # Default: last 48h
//   node scripts/lp-triage.js --hours=24   # Custom window
//   node scripts/lp-triage.js --json       # JSON output for piping
//
// Loads .lp-index.json, queries Gmail in batches, cross-references,
// and outputs a prioritized report of LP emails needing attention.
//

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TC_HOME = resolve(__dirname, '..');
const LP_INDEX = resolve(TC_HOME, '.lp-index.json');
const GMAIL_SEARCH = resolve(TC_HOME, '.claude/skills/agent-skills/gmail-monitor/scripts/search.js');

// ── Parse flags ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flags = {};
for (const arg of args) {
  const m = arg.match(/^--([\w-]+)(?:=(.+))?$/);
  if (m) flags[m[1]] = m[2] ?? 'true';
}

const hours = parseInt(flags.hours, 10) || 48;
const jsonOutput = flags.json === 'true';

// ── Load LP index ────────────────────────────────────────────────────────

let index;
try {
  index = JSON.parse(readFileSync(LP_INDEX, 'utf8'));
} catch (e) {
  console.error('Error: .lp-index.json not found. Run parse-lp-csv.js first.');
  process.exit(1);
}

// ── Detect user email for inbound/outbound classification ────────────────

let userEmail = null;
try {
  const identity = JSON.parse(readFileSync(resolve(TC_HOME, '.user-identity.json'), 'utf8'));
  userEmail = identity.email;
} catch {
  // Fallback — will classify based on labels instead
}

// ── Build LP lookup maps ─────────────────────────────────────────────────

const slugToLp = {};
for (const lp of index.lps) {
  slugToLp[lp.slug] = lp;
}

// domain → LP slugs (for non-common domains)
const domainToLps = index.domain_to_lps || {};

// address → LP slugs (for common/free email domains)
const addressToLps = index.address_to_lps || {};

// ── Gmail freshness string ───────────────────────────────────────────────

function freshnessStr(h) {
  if (h <= 24) return '1d';
  if (h <= 48) return '2d';
  if (h <= 72) return '3d';
  if (h <= 168) return '7d';
  return `${Math.ceil(h / 24)}d`;
}

const newer = freshnessStr(hours);

// ── Build batched Gmail queries ──────────────────────────────────────────

const BATCH_SIZE = 15;

// Collect unique domains (excluding common ones — those go by address)
const uniqueDomains = Object.keys(domainToLps);

// Collect common-domain addresses
const commonAddresses = Object.keys(addressToLps);

function buildDomainBatches(domains) {
  const batches = [];
  for (let i = 0; i < domains.length; i += BATCH_SIZE) {
    const batch = domains.slice(i, i + BATCH_SIZE);
    // Gmail OR syntax: {from:@domain1.com from:@domain2.com}
    const fromPart = batch.map(d => `from:@${d}`).join(' ');
    batches.push(`{${fromPart}} newer_than:${newer}`);
  }
  return batches;
}

function buildAddressBatches(addresses) {
  const batches = [];
  for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
    const batch = addresses.slice(i, i + BATCH_SIZE);
    const fromPart = batch.map(a => `from:${a}`).join(' ');
    batches.push(`{${fromPart}} newer_than:${newer}`);
  }
  return batches;
}

const queries = [
  ...buildDomainBatches(uniqueDomains),
  ...buildAddressBatches(commonAddresses),
];

// Also add outbound query (sent mail to LP domains)
const sentDomainBatches = [];
for (let i = 0; i < uniqueDomains.length; i += BATCH_SIZE) {
  const batch = uniqueDomains.slice(i, i + BATCH_SIZE);
  const toPart = batch.map(d => `to:@${d}`).join(' ');
  sentDomainBatches.push(`in:sent {${toPart}} newer_than:${newer}`);
}
queries.push(...sentDomainBatches);

// Sent to common-domain addresses
if (commonAddresses.length > 0) {
  for (let i = 0; i < commonAddresses.length; i += BATCH_SIZE) {
    const batch = commonAddresses.slice(i, i + BATCH_SIZE);
    const toPart = batch.map(a => `to:${a}`).join(' ');
    queries.push(`in:sent {${toPart}} newer_than:${newer}`);
  }
}

// ── Execute Gmail queries ────────────────────────────────────────────────

function runGmailSearch(query) {
  return new Promise((resolve, reject) => {
    execFile('node', [GMAIL_SEARCH, `--limit=50`, query], {
      timeout: 30000,
    }, (err, stdout, stderr) => {
      if (err) {
        // Non-fatal — log and continue
        if (!jsonOutput) process.stderr.write(`  warn: query failed: ${err.message}\n`);
        resolve({ query, total_estimate: 0, returned: 0, messages: [] });
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        if (!jsonOutput) process.stderr.write(`  warn: bad JSON from query\n`);
        resolve({ query, total_estimate: 0, returned: 0, messages: [] });
      }
    });
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Match message to LP ──────────────────────────────────────────────────

const EMAIL_RE = /[\w.+-]+@[\w.-]+\.\w{2,}/gi;

function extractEmailDomain(addr) {
  const match = addr.match(EMAIL_RE);
  if (!match) return { email: null, domain: null };
  const email = match[0].toLowerCase();
  return { email, domain: email.split('@')[1] };
}

function matchToLp(msg, direction) {
  // direction: 'inbound' checks From, 'outbound' checks To
  const field = direction === 'inbound' ? msg.from : msg.to;
  if (!field) return [];

  const matches = new Set();

  // Extract all emails from the field
  const emails = (field.match(EMAIL_RE) || []).map(e => e.toLowerCase());

  for (const email of emails) {
    const domain = email.split('@')[1];

    // Check address-level match first (common domains)
    if (addressToLps[email]) {
      for (const slug of addressToLps[email]) matches.add(slug);
    }

    // Check domain-level match
    if (domainToLps[domain]) {
      for (const slug of domainToLps[domain]) matches.add(slug);
    }
  }

  return [...matches];
}

// ── Classify messages ────────────────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return 'unknown';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'unknown';
  const diffMs = Date.now() - d.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 1) return `${Math.floor(diffMs / 60000)}m ago`;
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

function isInbound(msg) {
  // Inbound = not sent by user, or INBOX label present
  if (msg.labels && msg.labels.includes('SENT')) return false;
  return true;
}

function needsResponse(msg) {
  // Inbound + in INBOX (not archived)
  if (!isInbound(msg)) return false;
  if (msg.labels && msg.labels.includes('INBOX')) return true;
  // If no label data, assume inbound means needs attention
  return msg.labels ? false : true;
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  if (!jsonOutput) {
    process.stderr.write(`Scanning ${index.stats.total} LPs across ${index.stats.unique_domains} domains (last ${hours}h)...\n`);
    process.stderr.write(`Running ${queries.length} Gmail queries...\n`);
  }

  // Execute queries sequentially with delay
  const allMessages = [];
  const seenThreads = new Set();

  for (let i = 0; i < queries.length; i++) {
    const result = await runGmailSearch(queries[i]);

    for (const msg of result.messages || []) {
      // Deduplicate by threadId
      if (seenThreads.has(msg.threadId)) continue;
      seenThreads.add(msg.threadId);
      allMessages.push(msg);
    }

    if (i < queries.length - 1) await sleep(200);
  }

  if (!jsonOutput) {
    process.stderr.write(`Found ${allMessages.length} unique threads\n`);
  }

  // Match messages to LPs and classify
  const needsResponseItems = [];
  const recentActivityItems = [];

  for (const msg of allMessages) {
    const inbound = isInbound(msg);
    const direction = inbound ? 'inbound' : 'outbound';
    const matchField = inbound ? msg.from : msg.to;

    // Try matching against LP index
    const lpSlugs = [
      ...matchToLp(msg, 'inbound'),
      ...matchToLp(msg, 'outbound'),
    ];
    const uniqueSlugs = [...new Set(lpSlugs)];

    if (uniqueSlugs.length === 0) continue;  // Not from/to an LP

    for (const slug of uniqueSlugs) {
      const lp = slugToLp[slug];
      if (!lp) continue;

      const item = {
        lp_name: lp.name,
        lp_slug: slug,
        tier: lp.tier,
        tier_priority: lp.tier_priority,
        ticket_size_m: lp.ticket_size_m,
        subject: msg.subject,
        from: msg.from,
        to: msg.to,
        date: msg.date,
        time_ago: timeAgo(msg.date),
        snippet: msg.snippet,
        thread_id: msg.threadId,
        message_id: msg.id,
        direction: inbound ? 'inbound' : 'outbound',
        labels: msg.labels || [],
      };

      // Find the matching contact name
      const fromEmails = (msg.from || '').match(EMAIL_RE) || [];
      const toEmails = (msg.to || '').match(EMAIL_RE) || [];
      const relevantEmails = inbound ? fromEmails : toEmails;
      const matchedContact = lp.contacts.find(c =>
        c.email && relevantEmails.some(e => e.toLowerCase() === c.email)
      );
      item.contact_name = matchedContact?.name || (inbound ? msg.from : msg.to);

      if (inbound && needsResponse(msg)) {
        needsResponseItems.push(item);
      } else {
        recentActivityItems.push(item);
      }
    }
  }

  // Sort: tier priority (existing > warm > cold), then recency
  const sortFn = (a, b) => {
    if (a.tier_priority !== b.tier_priority) return a.tier_priority - b.tier_priority;
    return new Date(b.date || 0) - new Date(a.date || 0);
  };

  needsResponseItems.sort(sortFn);
  recentActivityItems.sort(sortFn);

  // ── Output ──────────────────────────────────────────────────────────

  if (jsonOutput) {
    console.log(JSON.stringify({
      scanned_at: new Date().toISOString(),
      window_hours: hours,
      lps_checked: index.stats.total,
      domains_checked: index.stats.unique_domains,
      queries_run: queries.length,
      threads_found: allMessages.length,
      needs_response: needsResponseItems,
      recent_activity: recentActivityItems,
    }, null, 2));
    return;
  }

  // Human-readable output
  const tierLabel = (tier, ticket) => {
    const label = tier === 'existing_lp' ? 'Existing LP' : tier === 'warm' ? 'Warm' : 'Cold';
    return ticket ? `${label} / ${ticket}M` : label;
  };

  console.log(`\n=== LP TRIAGE — ${new Date().toISOString().split('T')[0]} ===\n`);

  if (needsResponseItems.length > 0) {
    console.log(`NEEDS RESPONSE (${needsResponseItems.length}):`);
    for (const item of needsResponseItems) {
      console.log(`  [${tierLabel(item.tier, item.ticket_size_m)}] ${item.lp_name} — ${item.contact_name}`);
      console.log(`    Subject: "${item.subject}" — ${item.time_ago}`);
      if (item.snippet) console.log(`    ${item.snippet.substring(0, 100)}`);
      console.log('');
    }
  } else {
    console.log('NEEDS RESPONSE: none\n');
  }

  if (recentActivityItems.length > 0) {
    console.log(`RECENT ACTIVITY (${recentActivityItems.length}):`);
    for (const item of recentActivityItems) {
      const dir = item.direction === 'outbound' ? 'outbound from you' : 'read/archived';
      console.log(`  [${tierLabel(item.tier, item.ticket_size_m)}] ${item.lp_name} — ${dir}, ${item.time_ago}`);
      console.log(`    Subject: "${item.subject}"`);
      console.log('');
    }
  } else {
    console.log('RECENT ACTIVITY: none\n');
  }

  console.log('---');
  console.log(`${needsResponseItems.length} need response / ${recentActivityItems.length} recent / checked ${index.stats.total} LPs across ${index.stats.unique_domains} domains`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

#!/usr/bin/env node
//
// parse-lp-csv.js — Parse LP fundraising CSV into .lp-index.json
//
// Usage:
//   node scripts/parse-lp-csv.js ~/Downloads/Lunar\ 3\ Fundraising\ All.csv
//
// Reads a Attio-exported CSV with LP prospects, extracts contacts/emails,
// classifies tiers, and writes .lp-index.json at project root.
//

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TC_HOME = resolve(__dirname, '..');
const OUTPUT = resolve(TC_HOME, '.lp-index.json');

// ── CSV parsing (handles quoted fields with commas/newlines) ─────────────

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
        row.push(field);
        field = '';
        if (row.length > 1) rows.push(row);
        row = [];
        if (ch === '\r') i++;
      } else {
        field += ch;
      }
    }
  }
  // Last field/row
  if (field || row.length > 0) {
    row.push(field);
    if (row.length > 1) rows.push(row);
  }
  return rows;
}

// ── Tier mapping ─────────────────────────────────────────────────────────

function classifyTier(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('existing lp')) return { tier: 'existing_lp', priority: 1 };
  if (s.includes('warm'))        return { tier: 'warm', priority: 2 };
  if (s.includes('contacted'))   return { tier: 'warm', priority: 2 };
  return { tier: 'cold', priority: 3 };
}

// ── Slug generation ──────────────────────────────────────────────────────

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Email extraction from mixed name/email Team field ────────────────────

const EMAIL_RE = /[\w.+-]+@[\w.-]+\.\w{2,}/g;

function extractEmails(text) {
  if (!text) return [];
  const matches = text.match(EMAIL_RE) || [];
  return [...new Set(matches.map(e => e.toLowerCase()))];
}

// ── Extract contact names from Team field (non-email tokens) ─────────────

function extractContacts(teamField, mainContact, emailsInTeam) {
  const contacts = [];
  const emailSet = new Set(emailsInTeam);

  // Parse Team field — comma-separated mix of names and emails
  if (teamField) {
    const tokens = teamField.split(',').map(t => t.trim()).filter(Boolean);
    for (const token of tokens) {
      if (EMAIL_RE.test(token)) continue;  // Skip bare emails
      // Skip obvious non-person tokens
      if (/^(investments|onboarding|operations|funds?|team)$/i.test(token.trim())) continue;
      contacts.push({ name: token.trim(), email: null, primary: false });
    }
  }

  // Try to match emails to contacts by domain or name overlap
  const unmatchedEmails = [...emailSet];
  for (const contact of contacts) {
    const nameParts = contact.name.toLowerCase().split(/[\s|]+/).filter(Boolean);
    for (let i = unmatchedEmails.length - 1; i >= 0; i--) {
      const email = unmatchedEmails[i];
      const localPart = email.split('@')[0].toLowerCase();
      // Match if local part contains first name or surname
      if (nameParts.some(part => part.length > 2 && localPart.includes(part))) {
        contact.email = email;
        unmatchedEmails.splice(i, 1);
        break;
      }
    }
  }

  // Mark primary contact
  if (mainContact) {
    const mainLower = mainContact.toLowerCase().trim();
    const found = contacts.find(c =>
      c.name.toLowerCase().includes(mainLower) || mainLower.includes(c.name.toLowerCase())
    );
    if (found) found.primary = true;
  }
  // If no primary set, pick first with email, else first
  if (!contacts.some(c => c.primary)) {
    const withEmail = contacts.find(c => c.email);
    if (withEmail) withEmail.primary = true;
    else if (contacts.length > 0) contacts[0].primary = true;
  }

  return contacts;
}

// ── Domains to ignore (internal Lunar domains) ──────────────────────────

const INTERNAL_DOMAINS = new Set([
  'lunarventures.eu', 'lunar.vc', 'lunar-vc.com', 'lunarvc.eu',
  'lunarvetures.eu', 'lunarventures.vc',
]);

// ── Common/free email domains (match by address, not domain) ─────────────

const COMMON_DOMAINS = new Set([
  'gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com',
  'protonmail.com', 'proton.me', 'me.com', 'live.com', 'aol.com',
  'mail.com', 'gmx.com', 'gmx.de', 'web.de', 'posteo.de',
]);

// ── Main ─────────────────────────────────────────────────────────────────

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: node scripts/parse-lp-csv.js <path-to-csv>');
  process.exit(1);
}

const fullPath = resolve(csvPath);
const raw = readFileSync(fullPath, 'utf8');
const rows = parseCSV(raw);

// First row is header
const header = rows[0];
const data = rows.slice(1);

// Column indices
const COL = {
  record:          2,   // Record (LP name)
  status:          3,   // Status → tier
  mainContact:     6,   // Main Contact name
  close:           7,   // Close target
  ticketSize:     10,   // Ticket Size (millions)
  lastInteraction: 11,  // Parent Record > Last interaction > When
  team:           12,   // Parent Record > Team (mixed names/emails)
  emailAddresses: 15,   // Main Contact > Email addresses
};

const lps = [];
const domainToLps = {};
const stats = { total: 0, existing_lp: 0, warm: 0, cold: 0, with_email: 0, unique_domains: 0 };

for (const row of data) {
  const name = (row[COL.record] || '').trim();
  if (!name) continue;

  const { tier, priority } = classifyTier(row[COL.status]);
  const slug = slugify(name);

  // Collect all emails from Team field + email column
  const teamEmails = extractEmails(row[COL.team]);
  const colEmails = extractEmails(row[COL.emailAddresses]);
  const allEmails = [...new Set([...colEmails, ...teamEmails])];

  // Filter out internal Lunar emails
  const externalEmails = allEmails.filter(e => !INTERNAL_DOMAINS.has(e.split('@')[1]));

  // Extract contacts from Team field
  const contacts = extractContacts(row[COL.team], row[COL.mainContact], externalEmails);

  // Also add emails from col 15 that weren't matched to contacts
  const contactEmails = new Set(contacts.filter(c => c.email).map(c => c.email));
  for (const email of externalEmails) {
    if (!contactEmails.has(email)) {
      // Unmatched email — add as standalone contact
      contacts.push({ name: email.split('@')[0], email, primary: contacts.length === 0 });
    }
  }

  // Build domain list (external, non-internal)
  const domains = [...new Set(
    externalEmails.map(e => e.split('@')[1]).filter(d => !COMMON_DOMAINS.has(d))
  )];

  // Ticket size
  const ticketRaw = (row[COL.ticketSize] || '').trim();
  const ticketSize = ticketRaw ? parseFloat(ticketRaw) : null;

  // Last interaction
  const lastRaw = (row[COL.lastInteraction] || '').trim();
  const lastInteraction = lastRaw ? lastRaw.split('T')[0] : null;

  const lp = {
    name,
    slug,
    tier,
    tier_priority: priority,
    ticket_size_m: ticketSize,
    close_target: (row[COL.close] || '').trim() || null,
    last_interaction: lastInteraction,
    contacts,
    email_addresses: externalEmails,
    email_domains: domains,
  };

  lps.push(lp);

  // Build domain → LP reverse lookup
  for (const d of domains) {
    if (!domainToLps[d]) domainToLps[d] = [];
    if (!domainToLps[d].includes(slug)) domainToLps[d].push(slug);
  }

  // Stats
  stats.total++;
  stats[tier]++;
  if (externalEmails.length > 0) stats.with_email++;
}

stats.unique_domains = Object.keys(domainToLps).length;

// Also build an address-to-LP lookup for common-domain emails
const addressToLps = {};
for (const lp of lps) {
  for (const email of lp.email_addresses) {
    const domain = email.split('@')[1];
    if (COMMON_DOMAINS.has(domain)) {
      if (!addressToLps[email]) addressToLps[email] = [];
      if (!addressToLps[email].includes(lp.slug)) addressToLps[email].push(lp.slug);
    }
  }
}

const output = {
  version: 1,
  parsed_at: new Date().toISOString().split('T')[0],
  source_file: fullPath,
  stats,
  lps,
  domain_to_lps: domainToLps,
  address_to_lps: addressToLps,
};

writeFileSync(OUTPUT, JSON.stringify(output, null, 2) + '\n', 'utf8');

console.log(`Wrote ${OUTPUT}`);
console.log(`  ${stats.total} LPs: ${stats.existing_lp} existing · ${stats.warm} warm · ${stats.cold} cold`);
console.log(`  ${stats.with_email} with email · ${stats.unique_domains} unique domains`);
console.log(`  ${Object.keys(addressToLps).length} common-domain addresses tracked`);

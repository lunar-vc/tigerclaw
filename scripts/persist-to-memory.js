#!/usr/bin/env node
//
// persist-to-memory — Atomically persists a signal to the Tigerclaw memory system.
//
// Takes a JSON signal (person, company, or theme) and writes to all three stores:
//   1. .pipeline-index.json  — dedup index (project root)
//   2. memory/<type>/<slug>.md  — topic file (Claude Code memory)
//   3. MEMORY.md index table   — compact index row
//
// Usage:
//   node scripts/persist-to-memory.js '{"entity":"person","slug":"jane-doe",...}'
//   echo '{"entity":"person",...}' | node scripts/persist-to-memory.js
//
// Entity types: "person", "company", "theme"
//
// Person schema:
//   { "entity": "person", "slug": "jane-doe", "name": "Jane Doe",
//     "action": "WATCH", "theme": "THE-1810", "linear": "DEAL-1234",
//     "background": "PhD at MIT", "work": "Runtime verification",
//     "signal_strength": "medium", "signal": "PhD defense",
//     "links": { "paper": "url", "website": "url", "linkedin": "url", "github": "url", "twitter": "url" },
//     "relationships": {
//       "co_authors": ["wei-liu", "sarah-chen"],
//       "advisor": "prof-michael-jordan",
//       "lab": "Berkeley RISE Lab",
//       "prior_companies": ["Google", "DeepMind"]
//     },
//     "memo": "research/2026-02-15-scan.md",
//     "next_step": "Monitor for PhD defense" }
//
// Company schema:
//   { "entity": "company", "slug": "acme-inc", "name": "Acme Inc",
//     "action": "WATCH", "theme": "THE-1810", "linear": "DEAL-1234",
//     "founded_by": "Jane Doe", "product": "...", "funded": null,
//     "links": { ... },
//     "memo": "research/...", "next_step": "..." }
//
// Theme schema:
//   { "entity": "theme", "slug": "the-9999-new-theme", "key": "THE-9999",
//     "title": "New Theme Title", "status": "Live",
//     "one_liner": "...", "primitive": "...",
//     "memo": "research/..." }

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

// Derive Claude Code memory path from project root (matches Claude's slug convention)
const projectSlug = PROJECT_ROOT.replace(/\//g, '-');
const MEMORY_DIR = join(process.env.HOME, '.claude/projects', projectSlug, 'memory');

const PIPELINE_INDEX = join(PROJECT_ROOT, '.pipeline-index.json');
const MEMORY_INDEX = join(MEMORY_DIR, 'MEMORY.md');

// ── Read input ──────────────────────────────────────────────────────────

async function readInput() {
  // Try CLI argument first
  const arg = process.argv[2];
  if (arg) return JSON.parse(arg);

  // Fall back to stdin
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString());
}

// ── Slugify ─────────────────────────────────────────────────────────────

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── 1. Update pipeline index ────────────────────────────────────────────

async function updatePipelineIndex(signal) {
  let index;
  try {
    index = JSON.parse(await readFile(PIPELINE_INDEX, 'utf8'));
  } catch {
    index = { version: 1, updated_at: today(), people: {}, companies: {} };
  }

  const slug = signal.slug || slugify(signal.name || signal.title);

  if (signal.entity === 'person') {
    const entry = {
      name: signal.name,
      action: signal.action || 'WATCH',
      linear: signal.linear || null,
      theme: signal.theme || null,
      type: signal.type || 'latent_founder',
      last_seen: today(),
      memo: signal.memo || null
    };
    // Persist relationships if provided (backwards-compatible — old entries work without)
    if (signal.relationships) {
      // Merge with existing relationships if updating an existing entry
      const existing = index.people[slug]?.relationships || {};
      entry.relationships = {
        co_authors: dedup([...(existing.co_authors || []), ...(signal.relationships.co_authors || [])]),
        advisor: signal.relationships.advisor || existing.advisor || null,
        lab: signal.relationships.lab || existing.lab || null,
        prior_companies: dedup([...(existing.prior_companies || []), ...(signal.relationships.prior_companies || [])]),
      };
      // Remove empty fields
      if (!entry.relationships.co_authors.length) delete entry.relationships.co_authors;
      if (!entry.relationships.advisor) delete entry.relationships.advisor;
      if (!entry.relationships.lab) delete entry.relationships.lab;
      if (!entry.relationships.prior_companies.length) delete entry.relationships.prior_companies;
      if (!Object.keys(entry.relationships).length) delete entry.relationships;
    } else if (index.people[slug]?.relationships) {
      // Preserve existing relationships when updating without new ones
      entry.relationships = index.people[slug].relationships;
    }
    index.people[slug] = entry;
  } else if (signal.entity === 'company') {
    index.companies[slug] = {
      name: signal.name,
      action: signal.action || 'WATCH',
      linear: signal.linear || null,
      theme: signal.theme || null,
      funded: signal.funded ?? null,
      last_seen: today(),
      memo: signal.memo || null
    };
  }
  // Themes are not tracked in pipeline index (they're in Linear/memory only)

  index.updated_at = today();
  await writeFile(PIPELINE_INDEX, JSON.stringify(index, null, 2) + '\n');
  return slug;
}

// ── 2. Write topic file ─────────────────────────────────────────────────

async function writeTopicFile(signal, slug) {
  let subdir, content;

  if (signal.entity === 'person') {
    subdir = 'people';
    content = renderPersonFile(signal);
  } else if (signal.entity === 'company') {
    subdir = 'companies';
    content = renderCompanyFile(signal);
  } else if (signal.entity === 'theme') {
    subdir = 'themes';
    content = renderThemeFile(signal);
  } else {
    throw new Error(`Unknown entity type: ${signal.entity}`);
  }

  // Append outreach drafts for REACH_OUT people
  if (signal.entity === 'person' && signal.action === 'REACH_OUT') {
    content += generateOutreach(signal);
  }

  const dir = join(MEMORY_DIR, subdir);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, `${slug}.md`), content);
}

function renderPersonFile(s) {
  const lines = [`# ${s.name} — ${s.action || 'WATCH'}`, ''];
  lines.push(`- **Action:** ${s.action || 'WATCH'}`);
  if (s.linear) lines.push(`- **Linear:** ${s.linear}`);
  if (s.background) lines.push(`- **Background:** ${s.background}`);
  if (s.work) lines.push(`- **Work:** ${s.work}`);
  if (s.signal) lines.push(`- **Signal:** ${s.signal}`);
  if (s.theme) lines.push(`- **Theme fit:** ${s.theme}${s.thesis_fit ? ` (${s.thesis_fit})` : ''}`);
  if (s.signal_strength) lines.push(`- **Signal strength:** ${s.signal_strength}`);
  if (s.links) {
    for (const [k, v] of Object.entries(s.links)) {
      if (v) lines.push(`- **${capitalize(k)}:** ${v}`);
    }
  }
  if (s.memo) lines.push(`- **Memo:** ${s.memo}`);
  if (s.next_step) lines.push(`- **Next step:** ${s.next_step}`);
  // Network section for relationships
  if (s.relationships) {
    lines.push('');
    lines.push('## Network');
    const r = s.relationships;
    if (r.co_authors?.length) lines.push(`- **Co-authors:** ${r.co_authors.join(', ')}`);
    if (r.advisor) lines.push(`- **Advisor:** ${r.advisor}`);
    if (r.lab) lines.push(`- **Lab:** ${r.lab}`);
    if (r.prior_companies?.length) lines.push(`- **Prior companies:** ${r.prior_companies.join(', ')}`);
  }
  lines.push('');
  return lines.join('\n');
}

function renderCompanyFile(s) {
  const lines = [`# ${s.name} — ${s.action || 'WATCH'}`, ''];
  if (s.founded_by) lines.push(`- **Founded by:** ${s.founded_by}`);
  if (s.product) lines.push(`- **Product:** ${s.product}`);
  if (s.funded !== undefined && s.funded !== null) lines.push(`- **Funding:** ${s.funded === true ? 'Funded' : s.funded === false ? 'Not funded' : s.funded}`);
  else lines.push(`- **Funding:** Unknown`);
  if (s.theme) lines.push(`- **Theme:** ${s.theme}`);
  if (s.linear) lines.push(`- **Linear:** ${s.linear}`);
  if (s.links) {
    for (const [k, v] of Object.entries(s.links)) {
      if (v) lines.push(`- **${capitalize(k)}:** ${v}`);
    }
  }
  if (s.memo) lines.push(`- **Memo:** ${s.memo}`);
  if (s.next_step) lines.push(`- **Next step:** ${s.next_step}`);
  lines.push('');
  return lines.join('\n');
}

function renderThemeFile(s) {
  const lines = [`# ${s.key ? s.key + ': ' : ''}${s.title}`, ''];
  if (s.status) lines.push(`- **Status:** ${s.status}`);
  if (s.one_liner) lines.push(`- **One-liner:** ${s.one_liner}`);
  if (s.primitive) lines.push(`- **Primitive:** ${s.primitive}`);
  lines.push(`- **Last researched:** ${s.last_researched || today()}`);
  if (s.memo) lines.push(`- **Memo:** ${s.memo}`);
  lines.push('');
  return lines.join('\n');
}

// ── 3. Update MEMORY.md index table ─────────────────────────────────────

async function updateMemoryIndex(signal, slug) {
  let content = await readFile(MEMORY_INDEX, 'utf8');

  if (signal.entity === 'person') {
    // Check if already in the table
    if (content.includes(`people/${slug}.md`)) {
      // Update existing row
      const rowPattern = new RegExp(`^\\|[^|]*\\|[^|]*\\|[^|]*\\|[^|]*\\| people/${slug}\\.md \\|$`, 'm');
      const newRow = `| ${signal.name} | ${signal.action || 'WATCH'} | ${signal.theme || '—'} | ${signal.linear || '—'} | people/${slug}.md |`;
      if (rowPattern.test(content)) {
        content = content.replace(rowPattern, newRow);
      }
    } else {
      // Append new row before the next section
      const newRow = `| ${signal.name} | ${signal.action || 'WATCH'} | ${signal.theme || '—'} | ${signal.linear || '—'} | people/${slug}.md |`;
      content = appendToTable(content, 'Tracked People', newRow);
      content = incrementCount(content, 'Tracked People');
    }
  } else if (signal.entity === 'company') {
    if (content.includes(`companies/${slug}.md`)) {
      const rowPattern = new RegExp(`^\\|[^|]*\\|[^|]*\\|[^|]*\\|[^|]*\\| companies/${slug}\\.md \\|$`, 'm');
      const funded = signal.funded === true ? 'Yes' : signal.funded === false ? 'No' : 'Unknown';
      const newRow = `| ${signal.name} | ${signal.action || 'WATCH'} | ${signal.theme || '—'} | ${funded} | companies/${slug}.md |`;
      if (rowPattern.test(content)) {
        content = content.replace(rowPattern, newRow);
      }
    } else {
      const funded = signal.funded === true ? 'Yes' : signal.funded === false ? 'No' : 'Unknown';
      const newRow = `| ${signal.name} | ${signal.action || 'WATCH'} | ${signal.theme || '—'} | ${funded} | companies/${slug}.md |`;
      content = appendToTable(content, 'Tracked Companies', newRow);
      content = incrementCount(content, 'Tracked Companies');
    }
  } else if (signal.entity === 'theme') {
    if (content.includes(`themes/${slug}.md`)) {
      // Theme already exists, skip
    } else {
      const newRow = `| ${signal.key || '—'} | ${signal.title} | ${signal.status || 'Live'} | themes/${slug}.md |`;
      content = appendToTable(content, 'Active Themes', newRow);
      content = incrementCount(content, 'Active Themes');
    }
  }

  await writeFile(MEMORY_INDEX, content);
}

function appendToTable(content, sectionName, row) {
  // Find the last row of the table in the given section
  const sectionRegex = new RegExp(`(## ${sectionName}[^\n]*\n(?:.*\n)*?)(\\|[^\n]+\\|\n)(\n|$)`);
  const match = content.match(sectionRegex);
  if (match) {
    const beforeLastRow = content.slice(0, match.index + match[1].length + match[2].length);
    const afterLastRow = content.slice(match.index + match[1].length + match[2].length);
    return beforeLastRow + row + '\n' + afterLastRow;
  }
  // Fallback: just append to end
  return content + '\n' + row + '\n';
}

function incrementCount(content, sectionName) {
  const pattern = new RegExp(`(## ${sectionName} \\()(\\d+)(\\))`);
  return content.replace(pattern, (_, pre, num, post) => `${pre}${parseInt(num) + 1}${post}`);
}

// ── 4. Generate outreach drafts (REACH_OUT only) ────────────────────────

function generateOutreach(signal) {
  const name = signal.name?.split(' ')[0] || signal.name; // first name
  const work = signal.work || 'your research';
  const affiliation = signal.affiliation || signal.background || '';
  const primitive = signal.primitive || work;
  const theme = signal.theme || 'deep tech';

  // Pick a specific detail from available links/data
  let specificDetail = '';
  if (signal.links?.paper) specificDetail = `your paper (${signal.links.paper})`;
  else if (signal.links?.github) specificDetail = `your recent work on GitHub (${signal.links.github})`;
  else if (signal.signal) specificDetail = `your ${signal.signal}`;
  else specificDetail = `your work on ${work}`;

  const linkedin = `## LinkedIn Message

Hi ${name} — I'm Morris Clay, GP at Lunar Ventures. We invest at day -1 into deep tech.

I came across ${specificDetail}${affiliation ? ` at ${affiliation}` : ''} — particularly your focus on ${primitive}.

We're exploring ${theme} as an investment thesis and your research is directly relevant.

Would love to learn more about where you're taking this. Open to a quick chat?`;

  const email = `## Email Draft

Subject: Your work on ${primitive} — Lunar Ventures

Hi ${name},

I'm Morris Clay, a GP at Lunar Ventures — a deep tech fund that invests at inception (day -1 to day 0).

${specificDetail.charAt(0).toUpperCase() + specificDetail.slice(1)} caught my attention because it aligns with our thesis around ${theme}.

I'd love to hear more about where you're headed with this. No pitch needed — just genuinely curious about your research direction and whether there's a venture-scale opportunity here.

Happy to share more about what we're seeing in this space if useful.

Best,
Morris`;

  return `\n${linkedin}\n\n${email}\n`;
}

// ── Helpers ─────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().split('T')[0];
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function dedup(arr) {
  return [...new Set(arr.filter(Boolean))];
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  const signal = await readInput();

  if (!signal.entity) {
    console.error('Error: "entity" field required (person, company, or theme)');
    process.exit(1);
  }

  const slug = signal.slug || slugify(signal.name || signal.title);

  // All three writes + graph sync
  await updatePipelineIndex(signal);
  await writeTopicFile(signal, slug);
  await updateMemoryIndex(signal, slug);

  // Graph sync (additive — failures are non-blocking)
  let graphSynced = false;
  try {
    const { open, close, upsertNode, upsertEdge, ensure } = await import('./graph.js');
    const { db, graph } = await open();
    try {
      await ensure(graph);
      if (signal.entity === 'person') {
        await upsertNode(graph, 'Person', {
          slug, name: signal.name, action: signal.action || 'WATCH',
          linear: signal.linear || '', theme: signal.theme || '',
          type: signal.type || 'latent_founder', last_seen: today(),
        });
        if (signal.theme) {
          await upsertNode(graph, 'Theme', { key: signal.theme, title: signal.theme });
          await upsertEdge(graph, 'Person', slug, 'HAS_EXPERTISE_IN', 'Theme', signal.theme,
            { type: 'direct', confidence: '0.7' });
        }
        // Sync relationship edges
        const rel = signal.relationships || {};
        if (rel.co_authors?.length) {
          for (const coauthor of rel.co_authors) {
            await upsertNode(graph, 'Person', { slug: coauthor, name: coauthor });
            await upsertEdge(graph, 'Person', slug, 'CO_AUTHOR', 'Person', coauthor, {});
          }
        }
        if (rel.advisor) {
          const advisorSlug = slugify(rel.advisor);
          await upsertNode(graph, 'Person', { slug: advisorSlug, name: rel.advisor });
          await upsertEdge(graph, 'Person', slug, 'ADVISED_BY', 'Person', advisorSlug, {});
        }
        if (rel.lab) {
          await upsertNode(graph, 'Institution', { name: rel.lab });
          await upsertEdge(graph, 'Person', slug, 'AFFILIATED_WITH', 'Institution', rel.lab, {});
        }
        if (rel.prior_companies?.length) {
          for (const company of rel.prior_companies) {
            const companySlug = slugify(company);
            await upsertNode(graph, 'Company', { slug: companySlug, name: company });
            await upsertEdge(graph, 'Person', slug, 'WORKED_AT', 'Company', companySlug, {});
          }
        }
      } else if (signal.entity === 'company') {
        await upsertNode(graph, 'Company', {
          slug, name: signal.name, action: signal.action || 'WATCH',
          linear: signal.linear || '', theme: signal.theme || '',
          funded: signal.funded === true ? 'true' : signal.funded === false ? 'false' : '',
          last_seen: today(),
        });
        if (signal.theme) {
          await upsertNode(graph, 'Theme', { key: signal.theme, title: signal.theme });
          await upsertEdge(graph, 'Company', slug, 'RELATED_TO_THEME', 'Theme', signal.theme,
            { relevance: 'core', confidence: '0.7' });
        }
      } else if (signal.entity === 'theme') {
        await upsertNode(graph, 'Theme', {
          key: signal.key, title: signal.title || '',
          status: signal.status || '', one_liner: signal.one_liner || '',
          primitive: signal.primitive || '',
        });
      }
      graphSynced = true;
    } finally {
      await close(db);
    }
  } catch (e) {
    console.error(JSON.stringify({ graph_warning: `Graph sync failed: ${e.message}` }));
  }

  const entityLabel = signal.entity === 'person' ? signal.name
    : signal.entity === 'company' ? signal.name
    : signal.title;

  console.log(JSON.stringify({
    ok: true,
    entity: signal.entity,
    slug,
    action: signal.action || (signal.entity === 'theme' ? signal.status : 'WATCH'),
    graphSynced,
    message: `Persisted ${signal.entity} "${entityLabel}" to pipeline index, topic file, and memory index${graphSynced ? ' + graph' : ''}`
  }));
}

main().catch(err => {
  console.error(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});

#!/usr/bin/env node
//
// session-handoff — Writes a session summary to memory/sessions/.
//
// Called at the end of each session by Claude. Takes a JSON summary
// and writes it as a structured markdown file that the next session's
// welcome popup reads for context.
//
// Usage:
//   node scripts/session-handoff.js '{"researched":["..."],"findings":["..."],"open_questions":["..."],"next_steps":["..."]}'
//   echo '{"researched":[...]}' | node scripts/session-handoff.js
//
// Schema:
//   {
//     "date": "2026-02-15",           // optional, defaults to today
//     "domains_scanned": ["quantum", "ai"],  // optional
//     "researched": ["Scanned quantum domain for latent founders", "Deep dive on Acme Inc"],
//     "findings": ["3 new WATCH candidates in quantum", "Acme Inc raising Series A"],
//     "open_questions": ["Christine Lee — check for new GitHub activity", "THE-1810 — 3 candidates need enrichment"],
//     "next_steps": ["Enrich quantum WATCH candidates", "Follow up on Acme funding round"],
//     "signals_added": 5,              // optional, count of new pipeline entries
//     "signals_updated": 2             // optional, count of updated entries
//   }
//
// Output: memory/sessions/YYYY-MM-DD.md
// If multiple sessions on the same day, appends a suffix: YYYY-MM-DD-2.md

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

const projectSlug = PROJECT_ROOT.replace(/\//g, '-');
const MEMORY_DIR = join(process.env.HOME, '.claude/projects', projectSlug, 'memory');

const SESSIONS_DIR = join(MEMORY_DIR, 'sessions');

function today() {
  return new Date().toISOString().split('T')[0];
}

async function readInput() {
  const arg = process.argv[2];
  if (arg) return JSON.parse(arg);
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString());
}

async function findAvailablePath(date) {
  await mkdir(SESSIONS_DIR, { recursive: true });

  const basePath = join(SESSIONS_DIR, `${date}.md`);
  try {
    await readFile(basePath);
  } catch {
    // File doesn't exist, use base path
    return basePath;
  }

  // File exists, find next suffix
  const files = await readdir(SESSIONS_DIR);
  let n = 2;
  while (files.includes(`${date}-${n}.md`)) n++;
  return join(SESSIONS_DIR, `${date}-${n}.md`);
}

function renderHandoff(data) {
  const date = data.date || today();
  const lines = [`# Session — ${date}`, ''];

  // Domains scanned
  if (data.domains_scanned?.length) {
    lines.push(`**Domains:** ${data.domains_scanned.join(', ')}`);
  }

  // Stats
  const stats = [];
  if (data.signals_added) stats.push(`${data.signals_added} signals added`);
  if (data.signals_updated) stats.push(`${data.signals_updated} updated`);
  if (stats.length) lines.push(`**Stats:** ${stats.join(', ')}`);

  if (data.domains_scanned?.length || stats.length) lines.push('');

  // What was researched/done
  if (data.researched?.length) {
    lines.push('## What was done');
    lines.push('');
    for (const item of data.researched) {
      lines.push(`- ${item}`);
    }
    lines.push('');
  }

  // Key findings
  if (data.findings?.length) {
    lines.push('## Key findings');
    lines.push('');
    for (const item of data.findings) {
      lines.push(`- ${item}`);
    }
    lines.push('');
  }

  // Open questions
  if (data.open_questions?.length) {
    lines.push('## Open questions');
    lines.push('');
    for (const item of data.open_questions) {
      lines.push(`- ${item}`);
    }
    lines.push('');
  }

  // Next steps
  if (data.next_steps?.length) {
    lines.push('## Next steps');
    lines.push('');
    for (const item of data.next_steps) {
      lines.push(`- ${item}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

async function main() {
  const data = await readInput();
  const date = data.date || today();
  const filePath = await findAvailablePath(date);
  const content = renderHandoff(data);

  await writeFile(filePath, content);

  const filename = filePath.split('/').pop();
  console.log(JSON.stringify({
    ok: true,
    file: `memory/sessions/${filename}`,
    date,
    message: `Session handoff written to ${filename}`
  }));
}

main().catch(err => {
  console.error(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});

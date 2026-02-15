#!/usr/bin/env node
//
// enrichment-cache — Cached enrichment fetcher for founder research.
//
// Caches GitHub profiles, Arxiv papers, and web page metadata with TTLs.
// Check cache before making API calls; return cached data if fresh.
//
// Usage:
//   node scripts/enrichment-cache.js get github schen-qec
//   node scripts/enrichment-cache.js get arxiv 2501.12345
//   node scripts/enrichment-cache.js get web "https://natan-levy.com"
//   node scripts/enrichment-cache.js set github schen-qec '{"login":"schen-qec","repos":5,...}'
//   node scripts/enrichment-cache.js stats
//   node scripts/enrichment-cache.js prune
//
// TTLs (days): github=7, arxiv=30, web=14, linkedin=14
//
// Returns JSON:
//   { "hit": true, "data": {...}, "age_days": 3 }
//   { "hit": false }
//

import { readFile, writeFile, mkdir, readdir, unlink, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const CACHE_DIR = join(PROJECT_ROOT, '.enrichment-cache');

const TTLS = {
  github: 7,
  arxiv: 30,
  web: 14,
  linkedin: 14
};

// ── Helpers ─────────────────────────────────────────────────────────────

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/https?:\/\//, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

function hash(str) {
  return createHash('sha256').update(str).digest('hex').slice(0, 12);
}

function cacheKey(source, id) {
  const slug = slugify(id);
  // Use hash suffix to handle collisions from long URLs
  return `${slug}-${hash(id)}`;
}

function ageDays(fetchedAt) {
  const ms = Date.now() - new Date(fetchedAt).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function isExpired(entry, source) {
  const ttl = TTLS[source] || 14;
  return ageDays(entry.fetched_at) > ttl;
}

async function ensureDir(source) {
  const dir = join(CACHE_DIR, source);
  await mkdir(dir, { recursive: true });
  return dir;
}

// ── Commands ────────────────────────────────────────────────────────────

async function get(source, id) {
  const dir = await ensureDir(source);
  const key = cacheKey(source, id);
  const file = join(dir, `${key}.json`);

  try {
    const raw = await readFile(file, 'utf8');
    const entry = JSON.parse(raw);

    if (isExpired(entry, source)) {
      return { hit: false, expired: true, age_days: ageDays(entry.fetched_at) };
    }

    return {
      hit: true,
      data: entry.data,
      age_days: ageDays(entry.fetched_at),
      fetched_at: entry.fetched_at
    };
  } catch {
    return { hit: false };
  }
}

async function set(source, id, data) {
  const dir = await ensureDir(source);
  const key = cacheKey(source, id);
  const file = join(dir, `${key}.json`);

  const entry = {
    source,
    id,
    fetched_at: new Date().toISOString(),
    ttl_days: TTLS[source] || 14,
    data: typeof data === 'string' ? JSON.parse(data) : data
  };

  await writeFile(file, JSON.stringify(entry, null, 2) + '\n');
  return { ok: true, key, file };
}

async function stats() {
  const result = {};
  let totalFiles = 0;
  let totalBytes = 0;
  let expiredCount = 0;

  for (const source of Object.keys(TTLS)) {
    const dir = join(CACHE_DIR, source);
    try {
      const files = await readdir(dir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      let sourceBytes = 0;
      let sourceExpired = 0;

      for (const f of jsonFiles) {
        const filePath = join(dir, f);
        const s = await stat(filePath);
        sourceBytes += s.size;
        try {
          const entry = JSON.parse(await readFile(filePath, 'utf8'));
          if (isExpired(entry, source)) sourceExpired++;
        } catch { /* skip malformed */ }
      }

      result[source] = {
        entries: jsonFiles.length,
        expired: sourceExpired,
        size_kb: Math.round(sourceBytes / 1024)
      };
      totalFiles += jsonFiles.length;
      totalBytes += sourceBytes;
      expiredCount += sourceExpired;
    } catch {
      result[source] = { entries: 0, expired: 0, size_kb: 0 };
    }
  }

  return {
    sources: result,
    total_entries: totalFiles,
    total_expired: expiredCount,
    total_size_kb: Math.round(totalBytes / 1024)
  };
}

async function prune() {
  let pruned = 0;

  for (const source of Object.keys(TTLS)) {
    const dir = join(CACHE_DIR, source);
    try {
      const files = await readdir(dir);
      for (const f of files.filter(f => f.endsWith('.json'))) {
        const filePath = join(dir, f);
        try {
          const entry = JSON.parse(await readFile(filePath, 'utf8'));
          if (isExpired(entry, source)) {
            await unlink(filePath);
            pruned++;
          }
        } catch {
          // Malformed file — remove it
          await unlink(filePath);
          pruned++;
        }
      }
    } catch { /* dir doesn't exist yet */ }
  }

  return { ok: true, pruned };
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  const [cmd, source, id, data] = process.argv.slice(2);

  if (!cmd) {
    console.error('Usage: enrichment-cache.js <get|set|stats|prune> [source] [id] [data]');
    process.exit(1);
  }

  let result;

  switch (cmd) {
    case 'get':
      if (!source || !id) {
        console.error('Usage: enrichment-cache.js get <github|arxiv|web|linkedin> <id>');
        process.exit(1);
      }
      result = await get(source, id);
      break;

    case 'set':
      if (!source || !id) {
        console.error('Usage: enrichment-cache.js set <github|arxiv|web|linkedin> <id> <json_data>');
        process.exit(1);
      }
      // Data can be arg or stdin
      let inputData = data;
      if (!inputData) {
        const chunks = [];
        for await (const chunk of process.stdin) chunks.push(chunk);
        inputData = Buffer.concat(chunks).toString();
      }
      result = await set(source, id, inputData);
      break;

    case 'stats':
      result = await stats();
      break;

    case 'prune':
      result = await prune();
      break;

    default:
      console.error(`Unknown command: ${cmd}`);
      process.exit(1);
  }

  console.log(JSON.stringify(result));
}

main().catch(err => {
  console.error(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});

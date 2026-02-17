#!/usr/bin/env node
//
// parallel-scan — Fan-out/fan-in orchestrator for latent founder signal scanning.
//
// Runs multiple search.js instances in parallel (fan-out), then sequentially
// processes results through diff/score/persist pipeline (fan-in). No concurrent
// writes to shared files — all write hazards are eliminated by design.
//
// Usage:
//   node scripts/parallel-scan.js                            # scan all Live themes (reads .themes)
//   node scripts/parallel-scan.js THE-2186 THE-2187          # scan specific themes
//   node scripts/parallel-scan.js --domains quantum,ai       # scan by domain
//   node scripts/parallel-scan.js --all                      # scan all 16 domains
//   node scripts/parallel-scan.js --themes THE-1811:quantum   # legacy format
//   node scripts/parallel-scan.js --limit=5 --no-enrich      # override defaults
//   node scripts/parallel-scan.js --dry-run                  # print plan without executing
//

import { execFile, spawn } from 'node:child_process';
import { appendFile, open, readFile, readdir, unlink, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isLikelyPersonName } from './name-validation.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const SEARCH_SCRIPT = join(PROJECT_ROOT, '.claude/skills/agent-skills/latent-founder-signals/scripts/search.js');
const SCAN_DIFF_SCRIPT = join(PROJECT_ROOT, 'scripts/scan-diff.js');
const PERSIST_SCRIPT = join(PROJECT_ROOT, 'scripts/persist-to-memory.js');
const TOUCH_THEME_SCRIPT = join(PROJECT_ROOT, 'scripts/touch-theme.js');
const DISCOVERIES_FILE = join(PROJECT_ROOT, '.discoveries.jsonl');
const PIPELINE_INDEX = join(PROJECT_ROOT, '.pipeline-index.json');
const LOCK_FILE = PIPELINE_INDEX + '.lock';
const THEMES_FILE = join(PROJECT_ROOT, '.themes');
const ARXIV_SCAN_SCRIPT = join(PROJECT_ROOT, 'scripts/arxiv-scan.js');
const S2_SCAN_SCRIPT = join(PROJECT_ROOT, 'scripts/semantic-scholar-scan.js');
const HN_SCAN_SCRIPT = join(PROJECT_ROOT, 'scripts/hn-scan.js');
const DEPARTURE_SCAN_SCRIPT = join(PROJECT_ROOT, 'scripts/departure-scan.js');
const CONFERENCE_SCAN_SCRIPT = join(PROJECT_ROOT, 'scripts/conference-scan.js');
const PATENT_SCAN_SCRIPT = join(PROJECT_ROOT, 'scripts/patent-scan.js');

const MEMORY_BASE = join(
  process.env.HOME, '.claude/projects',
  '-Users-morrisclay-Dev-tigerclaw', 'memory/themes'
);

const ALL_DOMAINS = [
  'quantum', 'manufacturing', 'materials', 'aerospace', 'ai', 'biotech',
  'networks', 'security', 'photonics', 'iot', 'robotics', 'semiconductors',
  'cleantech', 'xr', 'web3', 'infra'
];

// ── Label-to-Domain Mapping ──────────────────────────────────────────────

const LABEL_TO_DOMAIN = {
  'optical networking': 'photonics',
  'optical': 'photonics',
  'photonic': 'photonics',
  'semiconductors': 'semiconductors',
  'chip design': 'semiconductors',
  'robotics': 'robotics',
  'manufacturing': 'manufacturing',
  'aerospace': 'aerospace',
  'quantum': 'quantum',
  'biotech': 'biotech',
  'cleantech': 'cleantech',
  'security': 'security',
  'networking': 'networks',
  'iot': 'iot',
  'xr': 'xr',
  'web3': 'web3',
  'infrastructure': 'infra',
};

// Fallback: keywords in theme titles that hint at a domain
const TITLE_DOMAIN_HINTS = {
  'quantum': 'quantum',
  'photon': 'photonics',
  'optical': 'photonics',
  'laser': 'photonics',
  'wavelength': 'photonics',
  'resonator': 'photonics',
  'fiber': 'photonics',
  'semiconductor': 'semiconductors',
  'chip': 'semiconductors',
  'cxl': 'semiconductors',
  'dram': 'semiconductors',
  'transistor': 'semiconductors',
  'neural net': 'ai',
  'llm': 'ai',
  'machine learning': 'ai',
  'hallucination': 'ai',
  'inference': 'ai',
  'quantized': 'ai',
  'agentic': 'ai',
  'prompt': 'ai',
  'robot': 'robotics',
  'biotech': 'biotech',
  'drug': 'biotech',
  'genom': 'biotech',
  'security': 'security',
  'firewall': 'security',
  'injection': 'security',
  'permission': 'security',
  'sandbox': 'security',
  'manufactur': 'manufacturing',
  'material': 'materials',
  'aerospace': 'aerospace',
  'satellite': 'aerospace',
  'network': 'networks',
  'iot': 'iot',
  'sensor': 'iot',
  'cleantech': 'cleantech',
  'energy': 'cleantech',
  'solar': 'cleantech',
  'vr': 'xr',
  'web3': 'web3',
  'blockchain': 'web3',
  'infra': 'infra',
  'checkpoint': 'infra',
  'memory tier': 'infra',
};

// ── Concurrency Semaphore ──────────────────────────────────────────────────

function createSemaphore(max) {
  let active = 0;
  const queue = [];
  return {
    async acquire() {
      if (active < max) { active++; return; }
      await new Promise(r => queue.push(r));
      active++;
    },
    release() {
      active--;
      if (queue.length) queue.shift()();
    }
  };
}

// ── Scoring Rubric (copied from score-signal.js lines 37-76) ──────────────

const RUBRIC = [
  { key: 'phd_defense',   points:  3, test: s => s.phd_defense || (s.phd_defense_months != null && s.phd_defense_months <= 6) },
  { key: 'left_faang',    points:  3, test: s => s.left_faang || s.left_lab || s.departure },
  { key: 'new_repo',      points:  2, test: s => s.new_repo || s.active_repo },
  { key: 'conference',    points:  2, test: s => s.conference_top_venue || s.conference },
  { key: 'converging',    points:  2, test: s => s.converging_signals || s.multiple_signals },
  { key: 'venture_scale', points:  2, test: s => s.venture_scale || s.large_tam },
  { key: 'prior_startup', points:  2, test: s => s.prior_startup || s.prior_exit },
  { key: 'oss_traction',  points:  1, test: s => s.oss_traction },
  { key: 'social_active', points:  1, test: s => s.social_active || s.twitter_active },
  { key: 'academic_only', points: -2, test: s => s.academic_only },
  { key: 'stale_signal',  points: -2, test: s => s.stale || s.stale_signal || (s.days_since_signal != null && s.days_since_signal > 90) },
  { key: 'already_funded',points: -3, test: s => s.already_funded || s.funded },
];

function scoreSignal(attrs) {
  let total = 0;
  const breakdown = [];
  for (const rule of RUBRIC) {
    if (rule.test(attrs)) {
      total += rule.points;
      breakdown.push({ key: rule.key, points: rule.points });
    }
  }
  let strength;
  if (total >= 8)      strength = 'strong';
  else if (total >= 4) strength = 'medium';
  else if (total >= 1) strength = 'weak';
  else                 strength = 'pass';
  return { score: total, strength, breakdown };
}

function mapSignalToScoringAttrs(signal) {
  const attrs = {};
  const indicators = (signal.inflection_indicators || []).join(' ').toLowerCase();
  const status = (signal.status || '').toLowerCase();

  if (status.includes('phd defended') || indicators.includes('thesis defense') || indicators.includes('degree completion')) {
    attrs.phd_defense = true;
  }
  if (indicators.includes('left big tech') || indicators.includes('departure')) {
    attrs.left_faang = true;
  }
  if (indicators.includes('new github repo') || indicators.includes('software release')) {
    attrs.new_repo = true;
  }
  if (indicators.includes('conference presentation') || indicators.includes('public speaking')) {
    attrs.conference_top_venue = true;
  }
  if ((signal.inflection_indicators || []).length >= 3) {
    attrs.converging_signals = true;
  }
  const hasBuilder = signal.github || indicators.includes('repo') || indicators.includes('release') || indicators.includes('launch');
  if (!hasBuilder && (status.includes('phd') || status.includes('professor') || status.includes('researcher') || status.includes('postdoc'))) {
    attrs.academic_only = true;
  }
  if (signal._github_followers > 100 || indicators.includes('pinned repos')) {
    attrs.oss_traction = true;
  }
  if (signal._twitter_followers > 1000 || signal.twitter) {
    attrs.social_active = true;
  }
  if (indicators.includes('funded')) {
    attrs.already_funded = true;
  }
  return attrs;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function nowISO() { return new Date().toISOString(); }
function timeHHMM() { return new Date().toTimeString().slice(0, 5); }
function slugify(str) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Name validation delegated to scripts/name-validation.mjs (imported as isLikelyPersonName)
// Alias for backward compatibility in this file
const isRealName = isLikelyPersonName;

// ── Theme File Parsing ───────────────────────────────────────────────────

function inferDomain(labels, title) {
  const labelText = labels.join(' ').toLowerCase();
  for (const [pattern, domain] of Object.entries(LABEL_TO_DOMAIN)) {
    if (labelText.includes(pattern)) return domain;
  }
  const titleLower = title.toLowerCase();
  for (const [hint, domain] of Object.entries(TITLE_DOMAIN_HINTS)) {
    if (titleLower.includes(hint)) return domain;
  }
  return null;
}

async function loadThemeVocabulary(theme) {
  // Try to find the memory topic file for this theme
  let files;
  try {
    files = await readdir(MEMORY_BASE);
  } catch {
    return { keywords: extractThemeKeywords(theme.title || theme.key), source: 'title' };
  }

  const prefix = theme.key.toLowerCase();
  const file = files.find(f => f.startsWith(prefix));
  if (!file) return { keywords: extractThemeKeywords(theme.title || theme.key), source: 'title' };

  let content;
  try {
    content = await readFile(join(MEMORY_BASE, file), 'utf8');
  } catch {
    return { keywords: extractThemeKeywords(theme.title || theme.key), source: 'title' };
  }

  // Parse one-liner and primitive from frontmatter
  const oneLiner = content.match(/\*\*One-liner:\*\*\s*(.+)/)?.[1] || '';
  const primitive = content.match(/\*\*Primitive:\*\*\s*(.+)/)?.[1] || '';

  // Combine title + one-liner + primitive, extract keywords
  const fullText = `${theme.title || ''} ${oneLiner} ${primitive}`;
  const keywords = extractThemeKeywords(fullText);

  return { keywords, oneLiner, primitive, source: 'memory' };
}

async function parseThemesFile() {
  let content;
  try {
    content = await readFile(THEMES_FILE, 'utf8');
  } catch {
    return [];
  }

  const themes = [];
  const lines = content.split('\n');
  let i = 0;

  while (i < lines.length) {
    const match = lines[i].match(/^\s+(THE-\d+)\s+(.+)$/);
    if (match) {
      const theme = { key: match[1], title: match[2].trim(), labels: [], domain: null };
      i++;
      // Read detail lines (4+ spaces indentation)
      while (i < lines.length) {
        const line = lines[i];
        if (line.trim() === '') { i++; break; }
        if (/^\s+THE-\d+/.test(line)) break; // next theme
        if (!line.startsWith('    ')) { i++; continue; }

        const trimmed = line.trim();
        if (trimmed.startsWith('https://')) {
          // URL — skip
        } else if (trimmed.startsWith('researched:')) {
          // Research status — skip
        } else if (trimmed) {
          // Labels (may be comma-separated)
          theme.labels.push(...trimmed.split(',').map(l => l.trim()).filter(Boolean));
        }
        i++;
      }
      theme.domain = inferDomain(theme.labels, theme.title);
      themes.push(theme);
    } else {
      i++;
    }
  }

  return themes;
}

// ── Cross-Theme Classification ───────────────────────────────────────────

const STOPWORDS = new Set([
  'the', 'a', 'an', 'for', 'to', 'in', 'of', 'and', 'or', 'via',
  'based', 'as', 'by', 'with', 'from', 'per', 'non', 'new', 'hot',
  'cold', 'low', 'high', 'using', 'replacing', 'enabling',
]);

function extractThemeKeywords(title) {
  return title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
}

const WORK_STOPWORDS = new Set([
  ...STOPWORDS,
  'research', 'study', 'paper', 'novel', 'approach', 'method', 'system',
  'framework', 'tool', 'project', 'work', 'building', 'developing',
  'analysis', 'design', 'implementation', 'application', 'model',
  'data', 'learning', 'deep', 'machine', 'neural', 'network',
  'university', 'professor', 'student', 'phd', 'lab', 'group',
  'first', 'author', 'paper', 'published', 'conference',
]);

function mergeRelevance(a, b) {
  const merged = { ...(a || {}) };
  for (const [key, val] of Object.entries(b || {})) {
    merged[key] = Math.max(merged[key] || 0, val);
  }
  return merged;
}

function extractWorkKeywords(work, primitive) {
  const text = `${work} ${primitive}`.toLowerCase();
  return text
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !WORK_STOPWORDS.has(w));
}

function classifySignalToThemes(signal, themesInDomain) {
  if (!themesInDomain || themesInDomain.length === 0) return [];

  const matched = [];
  const sigText = [signal.work, signal.name, signal.affiliation, signal.status]
    .filter(Boolean).join(' ').toLowerCase();

  for (const theme of themesInDomain) {
    const keywords = extractThemeKeywords(theme.title);
    const matchCount = keywords.filter(kw => sigText.includes(kw)).length;
    if (matchCount > 0 || themesInDomain.length === 1) {
      matched.push({ key: theme.key, relevance: keywords.length > 0 ? matchCount / keywords.length : 0 });
    }
  }

  return matched.length > 0 ? matched : themesInDomain.map(t => ({ key: t.key, relevance: 0 }));
}

// ── Discovery Feed ─────────────────────────────────────────────────────────

async function writeDiscovery(entry) {
  await appendFile(DISCOVERIES_FILE, JSON.stringify(entry) + '\n');
}

// ── Advisory File Lock ─────────────────────────────────────────────────────

const LOCK_STALE_MS = 5 * 60 * 1000;
const LOCK_WAIT_MS  = 30 * 1000;
const LOCK_RETRY_MS = 500;

async function acquireLock() {
  const deadline = Date.now() + LOCK_WAIT_MS;
  while (Date.now() < deadline) {
    try {
      const fd = await open(LOCK_FILE, 'wx');
      await fd.writeFile(JSON.stringify({ pid: process.pid, ts: nowISO() }));
      await fd.close();
      return;
    } catch (err) {
      if (err.code === 'EEXIST') {
        try {
          const lockStat = await stat(LOCK_FILE);
          if (Date.now() - lockStat.mtimeMs > LOCK_STALE_MS) {
            process.stderr.write('[lock] Removing stale lock\n');
            await unlink(LOCK_FILE);
            continue;
          }
        } catch { continue; }
        await new Promise(r => setTimeout(r, LOCK_RETRY_MS));
      } else {
        throw err;
      }
    }
  }
  throw new Error('Failed to acquire pipeline lock within 30s');
}

async function releaseLock() {
  try { await unlink(LOCK_FILE); } catch { /* already gone */ }
}

// ── Spawn search.js (one child process per domain) ─────────────────────────

function spawnSearch(domain, flags, abortCtl, onSignal) {
  return new Promise(resolve => {
    const args = [SEARCH_SCRIPT, `--domain=${domain}`];
    if (flags.enrich)            args.push('--enrich');
    if (flags.freshness)         args.push(`--freshness=${flags.freshness}`);
    if (flags.limit)             args.push(`--limit=${flags.limit}`);
    if (flags.signalTypes)       args.push(`--signal-type=${flags.signalTypes}`);
    if (flags.geo)               args.push(`--geo=${flags.geo}`);
    if (flags.geoIncludeUnknown) args.push('--geo-include-unknown');

    const startMs = Date.now();
    process.stderr.write(`[${domain}] Starting search...\n`);

    const child = spawn('node', args, {
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Close stdin immediately so search.js's readStdin() resolves via 'end' event
    child.stdin.end();

    abortCtl.children.push(child);

    // Set a kill timer matching the old 180s timeout
    const killTimer = setTimeout(() => {
      try { child.kill('SIGTERM'); } catch { /* ignore */ }
    }, 180_000);

    let stdoutBuf = '';
    let stderrPartial = '';

    child.stdout.on('data', chunk => { stdoutBuf += chunk; });

    // Stream stderr line-by-line, parsing ##SIGNAL## lines for live callbacks
    child.stderr.on('data', chunk => {
      stderrPartial += chunk;
      const lines = stderrPartial.split('\n');
      stderrPartial = lines.pop(); // keep incomplete last line in buffer

      for (const line of lines) {
        if (!line) continue;
        if (line.startsWith('##SIGNAL##')) {
          try {
            const payload = JSON.parse(line.slice(10));
            if (onSignal) onSignal(domain, payload);
          } catch { /* malformed signal line — ignore */ }
        } else {
          process.stderr.write(`  [${domain}] ${line}\n`);
        }
      }
    });

    child.on('close', (code) => {
      clearTimeout(killTimer);

      // Flush remaining stderr
      if (stderrPartial) {
        if (stderrPartial.startsWith('##SIGNAL##')) {
          try {
            const payload = JSON.parse(stderrPartial.slice(10));
            if (onSignal) onSignal(domain, payload);
          } catch { /* ignore */ }
        } else {
          process.stderr.write(`  [${domain}] ${stderrPartial}\n`);
        }
      }

      // Remove from abort tracking
      const idx = abortCtl.children.indexOf(child);
      if (idx !== -1) abortCtl.children.splice(idx, 1);
      const durationMs = Date.now() - startMs;

      if (code !== 0 && code !== null) {
        process.stderr.write(`[${domain}] Error after ${durationMs}ms: exit code ${code}\n`);
        resolve({ domain, signals: [], error: `exit code ${code}`, duration_ms: durationMs });
        return;
      }

      try {
        const signals = JSON.parse(stdoutBuf);
        process.stderr.write(`[${domain}] Done: ${Array.isArray(signals) ? signals.length : 0} signals in ${durationMs}ms\n`);
        resolve({ domain, signals: Array.isArray(signals) ? signals : [], error: null, duration_ms: durationMs });
      } catch (e) {
        process.stderr.write(`[${domain}] JSON parse error: ${e.message}\n`);
        resolve({ domain, signals: [], error: `JSON parse: ${e.message}`, duration_ms: durationMs });
      }
    });

    child.on('error', (err) => {
      clearTimeout(killTimer);
      const idx = abortCtl.children.indexOf(child);
      if (idx !== -1) abortCtl.children.splice(idx, 1);
      const durationMs = Date.now() - startMs;
      process.stderr.write(`[${domain}] Spawn error after ${durationMs}ms: ${err.message}\n`);
      resolve({ domain, signals: [], error: err.message, duration_ms: durationMs });
    });
  });
}

// ── Spawn search.js per theme with theme vocabulary ───────────────────────

function spawnThemeSearch(theme, vocab, flags, abortCtl, onSignal) {
  return new Promise(resolve => {
    // Pick top 6 most distinctive keywords from theme vocabulary
    const queryTerms = vocab.keywords.slice(0, 6).join(' ');

    const args = [SEARCH_SCRIPT, `--domain=${theme.domain}`, `--query=${queryTerms}`];
    if (flags.enrich)            args.push('--enrich');
    if (flags.freshness)         args.push(`--freshness=${flags.freshness}`);
    if (flags.limit)             args.push(`--limit=${flags.limit}`);
    if (flags.signalTypes)       args.push(`--signal-type=${flags.signalTypes}`);
    if (flags.geo)               args.push(`--geo=${flags.geo}`);
    if (flags.geoIncludeUnknown) args.push('--geo-include-unknown');

    const startMs = Date.now();
    const label = `${theme.key}:${theme.domain}`;
    process.stderr.write(`[${label}] Starting theme search (query: ${queryTerms.slice(0, 60)})...\n`);

    const child = spawn('node', args, {
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    child.stdin.end();
    abortCtl.children.push(child);

    const killTimer = setTimeout(() => {
      try { child.kill('SIGTERM'); } catch { /* ignore */ }
    }, 180_000);

    let stdoutBuf = '';
    let stderrPartial = '';

    child.stdout.on('data', chunk => { stdoutBuf += chunk; });

    child.stderr.on('data', chunk => {
      stderrPartial += chunk;
      const lines = stderrPartial.split('\n');
      stderrPartial = lines.pop();

      for (const line of lines) {
        if (!line) continue;
        if (line.startsWith('##SIGNAL##')) {
          try {
            const payload = JSON.parse(line.slice(10));
            if (onSignal) onSignal(theme.key, theme.domain, payload);
          } catch { /* malformed signal line */ }
        } else {
          process.stderr.write(`  [${label}] ${line}\n`);
        }
      }
    });

    child.on('close', (code) => {
      clearTimeout(killTimer);

      if (stderrPartial) {
        if (stderrPartial.startsWith('##SIGNAL##')) {
          try {
            const payload = JSON.parse(stderrPartial.slice(10));
            if (onSignal) onSignal(theme.key, theme.domain, payload);
          } catch { /* ignore */ }
        } else {
          process.stderr.write(`  [${label}] ${stderrPartial}\n`);
        }
      }

      const idx = abortCtl.children.indexOf(child);
      if (idx !== -1) abortCtl.children.splice(idx, 1);
      const durationMs = Date.now() - startMs;

      if (code !== 0 && code !== null) {
        process.stderr.write(`[${label}] Error after ${durationMs}ms: exit code ${code}\n`);
        resolve({ domain: theme.domain, themeKey: theme.key, signals: [], error: `exit code ${code}`, duration_ms: durationMs, source: 'brave' });
        return;
      }

      try {
        const signals = JSON.parse(stdoutBuf);
        const count = Array.isArray(signals) ? signals.length : 0;
        process.stderr.write(`[${label}] Done: ${count} signals in ${durationMs}ms\n`);
        // Tag each signal with the theme that found it
        const tagged = (Array.isArray(signals) ? signals : []).map(sig => {
          sig._themes = [theme.key];
          sig._theme_relevance = { [theme.key]: 1.0 };
          return sig;
        });
        resolve({ domain: theme.domain, themeKey: theme.key, signals: tagged, error: null, duration_ms: durationMs, source: 'brave' });
      } catch (e) {
        process.stderr.write(`[${label}] JSON parse error: ${e.message}\n`);
        resolve({ domain: theme.domain, themeKey: theme.key, signals: [], error: `JSON parse: ${e.message}`, duration_ms: durationMs, source: 'brave' });
      }
    });

    child.on('error', (err) => {
      clearTimeout(killTimer);
      const idx = abortCtl.children.indexOf(child);
      if (idx !== -1) abortCtl.children.splice(idx, 1);
      const durationMs = Date.now() - startMs;
      process.stderr.write(`[${label}] Spawn error after ${durationMs}ms: ${err.message}\n`);
      resolve({ domain: theme.domain, themeKey: theme.key, signals: [], error: err.message, duration_ms: durationMs, source: 'brave' });
    });
  });
}

// ── Spawn external scan script (arXiv, S2, HN, departure, conference, patent) ─

function spawnExternalScan(scriptPath, scriptArgs, label, themeKey, domain, abortCtl) {
  return new Promise(resolve => {
    const startMs = Date.now();
    process.stderr.write(`[${label}] Starting...\n`);

    const child = spawn('node', [scriptPath, ...scriptArgs], {
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    child.stdin.end();
    abortCtl.children.push(child);

    const killTimer = setTimeout(() => {
      try { child.kill('SIGTERM'); } catch { /* ignore */ }
    }, 120_000);

    let stdoutBuf = '';
    let stderrBuf = '';

    child.stdout.on('data', chunk => { stdoutBuf += chunk; });
    child.stderr.on('data', chunk => { stderrBuf += chunk; });

    child.on('close', (code) => {
      clearTimeout(killTimer);
      const idx = abortCtl.children.indexOf(child);
      if (idx !== -1) abortCtl.children.splice(idx, 1);
      const durationMs = Date.now() - startMs;

      if (stderrBuf.trim()) {
        for (const line of stderrBuf.trim().split('\n').slice(-5)) {
          process.stderr.write(`  [${label}] ${line}\n`);
        }
      }

      if (code !== 0 && code !== null) {
        process.stderr.write(`[${label}] Error after ${durationMs}ms: exit code ${code}\n`);
        resolve({ domain, themeKey, signals: [], error: `exit code ${code}`, duration_ms: durationMs, source: label.split(':')[0] });
        return;
      }

      try {
        const signals = JSON.parse(stdoutBuf);
        const arr = Array.isArray(signals) ? signals : [];
        const tagged = arr.map(sig => {
          if (themeKey) {
            sig._themes = [themeKey];
            sig._theme_relevance = { [themeKey]: 1.0 };
          }
          return sig;
        });
        process.stderr.write(`[${label}] Done: ${tagged.length} signals in ${durationMs}ms\n`);
        resolve({ domain, themeKey, signals: tagged, error: null, duration_ms: durationMs, source: label.split(':')[0] });
      } catch (e) {
        process.stderr.write(`[${label}] JSON parse error: ${e.message}\n`);
        resolve({ domain, themeKey, signals: [], error: `JSON parse: ${e.message}`, duration_ms: durationMs, source: label.split(':')[0] });
      }
    });

    child.on('error', (err) => {
      clearTimeout(killTimer);
      const idx = abortCtl.children.indexOf(child);
      if (idx !== -1) abortCtl.children.splice(idx, 1);
      const durationMs = Date.now() - startMs;
      process.stderr.write(`[${label}] Spawn error: ${err.message}\n`);
      resolve({ domain, themeKey, signals: [], error: err.message, duration_ms: durationMs, source: label.split(':')[0] });
    });
  });
}

// ── Merge & Dedup (cross-theme aware) ────────────────────────────────────

function mergeResults(domainResults, domainToThemes) {
  const allSignals = [];
  for (const { domain, signals, themeKey } of domainResults) {
    for (const sig of signals) {
      sig._search_domain = sig._search_domain || domain;
      // If signal already has _themes set (theme-driven mode), keep them.
      // Otherwise, classify against themes in its domain (legacy domain-driven mode).
      if (!sig._themes || sig._themes.length === 0) {
        const themes = domainToThemes[domain] || [];
        const themeMatches = classifySignalToThemes(sig, themes);
        sig._themes = themeMatches.map(m => m.key);
        sig._theme_relevance = Object.fromEntries(themeMatches.map(m => [m.key, m.relevance]));
      }
      // Extract work keywords for theme discovery clustering
      sig._work_keywords = extractWorkKeywords(sig.work || '', sig.primitive || '');
      allSignals.push(sig);
    }
  }

  // Pass 1: dedup by _source_url
  const byUrl = new Map();
  for (const sig of allSignals) {
    const url = sig._source_url;
    if (!url) { byUrl.set(Symbol(), sig); continue; }
    if (!byUrl.has(url)) {
      byUrl.set(url, sig);
    } else {
      const existing = byUrl.get(url);
      // Merge themes + relevance from duplicate
      const merged = new Set([...(existing._themes || []), ...(sig._themes || [])]);
      existing._themes = [...merged];
      existing._theme_relevance = mergeRelevance(existing._theme_relevance, sig._theme_relevance);
    }
  }

  // Pass 2: dedup by name (keep strongest signal)
  const strengthRank = { strong: 3, medium: 2, weak: 1 };
  const byName = new Map();
  for (const sig of byUrl.values()) {
    const name = (sig.name || '').toLowerCase().trim();
    if (!name || name === 'anonymous') { byName.set(Symbol(), sig); continue; }

    if (!byName.has(name)) {
      byName.set(name, sig);
    } else {
      const existing = byName.get(name);
      const existRank = strengthRank[existing.signal_strength] || 0;
      const newRank = strengthRank[sig.signal_strength] || 0;
      if (newRank > existRank) {
        // New signal is stronger — keep it, merge themes + relevance from existing
        const merged = new Set([...(sig._themes || []), ...(existing._themes || [])]);
        sig._themes = [...merged];
        sig._theme_relevance = mergeRelevance(sig._theme_relevance, existing._theme_relevance);
        sig._work_keywords = [...new Set([...(sig._work_keywords || []), ...(existing._work_keywords || [])])];
        byName.set(name, sig);
      } else {
        // Existing is stronger — merge themes + relevance from new signal
        const merged = new Set([...(existing._themes || []), ...(sig._themes || [])]);
        existing._themes = [...merged];
        existing._theme_relevance = mergeRelevance(existing._theme_relevance, sig._theme_relevance);
        existing._work_keywords = [...new Set([...(existing._work_keywords || []), ...(sig._work_keywords || [])])];
      }
    }
  }

  return Array.from(byName.values());
}

// ── Scan Diff (child process) ──────────────────────────────────────────────

function runScanDiff(signals) {
  return new Promise(resolve => {
    const input = JSON.stringify({ signals });
    const child = execFile('node', [SCAN_DIFF_SCRIPT], {
      timeout: 30_000,
      maxBuffer: 10 * 1024 * 1024,
    }, (error, stdout) => {
      if (error) {
        process.stderr.write(`[scan-diff] Error: ${error.message}\n`);
        resolve({ new: signals, changed: [], known: [], summary: 'diff failed - treating all as new' });
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        process.stderr.write(`[scan-diff] Parse error: ${e.message}\n`);
        resolve({ new: signals, changed: [], known: [], summary: 'diff parse failed' });
      }
    });
    child.stdin.write(input);
    child.stdin.end();
  });
}

// ── Persist Signal (child process, sequential under lock) ──────────────────

function persistSignal(signal, theme) {
  return new Promise(resolve => {
    const action = (signal.action || 'WATCH').split(' - ')[0].trim();
    const payload = {
      entity: 'person',
      name: signal.name,
      slug: slugify(signal.name),
      action,
      theme: theme || null,
      background: signal.affiliation || null,
      work: signal.work || null,
      signal: signal._signal_type || null,
      signal_strength: signal.signal_strength,
      links: {
        github: signal.github || null,
        linkedin: signal.linkedin || null,
        paper: signal.arxiv || null,
        twitter: signal.twitter || null,
      },
      next_step: action === 'REACH_OUT' ? 'Prepare outreach' : 'Monitor for updates',
    };

    execFile('node', [PERSIST_SCRIPT, JSON.stringify(payload)], {
      timeout: 15_000,
      maxBuffer: 1024 * 1024,
    }, (error, stdout) => {
      if (error) {
        process.stderr.write(`[persist] Error for ${signal.name}: ${error.message}\n`);
        resolve({ ok: false, name: signal.name, error: error.message });
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        resolve({ ok: true });
      }
    });
  });
}

// ── Touch Theme (child process) ────────────────────────────────────────────

function touchTheme(themeKey, value) {
  return new Promise(resolve => {
    const args = [TOUCH_THEME_SCRIPT, themeKey];
    if (value) args.push(value);

    execFile('node', args, { timeout: 10_000 }, (error, stdout) => {
      if (error) {
        process.stderr.write(`[touch-theme] Error for ${themeKey}: ${error.message}\n`);
        resolve({ ok: false });
        return;
      }
      try { resolve(JSON.parse(stdout)); } catch { resolve({ ok: true }); }
    });
  });
}

// ── CLI Argument Parsing ───────────────────────────────────────────────────

const ALL_SOURCES = ['brave', 'arxiv', 's2', 'hn', 'departure', 'conference', 'patent'];
const DEFAULT_SOURCES = ['brave'];

function parseArgs(argv) {
  const opts = {
    domains: [],
    all: false,
    themes: [],
    sources: null, // null = use defaults; set explicitly via --sources=
    concurrency: 4,
    enrich: true,
    freshness: 30,
    limit: 20,
    signalTypes: null,
    geo: null,
    geoIncludeUnknown: false,
    persist: true,
    discover: true,
    createThemes: false,
    dryRun: false,
    explicitDomain: false, // true when --domains= is explicitly passed
  };

  for (const arg of argv) {
    if (arg === '--all')                opts.all = true;
    else if (arg === '--enrich')        opts.enrich = true;
    else if (arg === '--no-enrich')     opts.enrich = false;
    else if (arg === '--persist')       opts.persist = true;
    else if (arg === '--no-persist')    opts.persist = false;
    else if (arg === '--discover')      opts.discover = true;
    else if (arg === '--no-discover')   opts.discover = false;
    else if (arg === '--create-themes') opts.createThemes = true;
    else if (arg === '--dry-run')       opts.dryRun = true;
    else if (arg === '--geo-include-unknown') opts.geoIncludeUnknown = true;
    else if (arg.startsWith('--sources='))
      opts.sources = arg.slice(10).split(',').map(s => s.trim()).filter(s => ALL_SOURCES.includes(s));
    else if (arg.startsWith('--domains=')) {
      opts.domains = arg.slice(10).split(',').map(d => d.trim()).filter(Boolean);
      opts.explicitDomain = true;
    }
    else if (arg.startsWith('--themes='))
      opts.themes = arg.slice(9).split(',').map(pair => {
        const [key, domain] = pair.split(':');
        return { key: key.trim(), domain: domain?.trim() || null, title: null, labels: [] };
      }).filter(t => t.key);
    else if (arg.startsWith('--concurrency='))
      opts.concurrency = Math.max(1, parseInt(arg.slice(14), 10) || 4);
    else if (arg.startsWith('--freshness='))
      opts.freshness = parseInt(arg.slice(12), 10) || 30;
    else if (arg.startsWith('--limit='))
      opts.limit = parseInt(arg.slice(8), 10) || 20;
    else if (arg.startsWith('--signal-types='))
      opts.signalTypes = arg.slice(15);
    else if (arg.startsWith('--geo='))
      opts.geo = arg.slice(6);
    else if (/^THE-\d+$/.test(arg))
      opts.themes.push({ key: arg, domain: null, title: null, labels: [] });
  }

  if (opts.all) {
    opts.domains = [...ALL_DOMAINS];
  } else if (opts.themes.length > 0 && opts.domains.length === 0) {
    // Extract domains from themes that already have one (--themes=THE-X:domain format)
    for (const t of opts.themes) {
      if (t.domain && !opts.domains.includes(t.domain)) opts.domains.push(t.domain);
    }
  }

  return opts;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  // Auto-read .themes when no domains or themes specified
  if (opts.domains.length === 0 && opts.themes.length === 0 && !opts.all) {
    const parsedThemes = await parseThemesFile();
    if (parsedThemes.length === 0) {
      process.stderr.write('Error: No .themes file found and no domains specified.\n');
      process.stderr.write('Usage: node scripts/parallel-scan.js [THE-XXXX ...] [--domains=X,Y] [--all]\n');
      process.exit(1);
    }
    const scannable = parsedThemes.filter(t => t.domain);
    const skipped = parsedThemes.filter(t => !t.domain);
    if (skipped.length > 0) {
      process.stderr.write(`Skipping ${skipped.length} themes with no domain mapping: ${skipped.map(t => t.key).join(', ')}\n`);
    }
    opts.themes = scannable;
    for (const t of scannable) {
      if (!opts.domains.includes(t.domain)) opts.domains.push(t.domain);
    }
  }

  // Resolve positional THE-XXXX args that need domain lookup
  if (opts.themes.length > 0 && opts.domains.length === 0) {
    const parsedThemes = await parseThemesFile();
    const themeMap = new Map(parsedThemes.map(t => [t.key, t]));
    for (const t of opts.themes) {
      if (!t.domain && themeMap.has(t.key)) {
        const parsed = themeMap.get(t.key);
        t.domain = parsed.domain;
        t.title = parsed.title;
        t.labels = parsed.labels;
      }
      if (t.domain && !opts.domains.includes(t.domain)) opts.domains.push(t.domain);
    }
  }

  if (opts.domains.length === 0) {
    process.stderr.write('Error: No scannable domains found.\n');
    process.stderr.write('Ensure .themes file exists with labeled themes, or use --domains=X,Y\n');
    process.exit(1);
  }

  const invalid = opts.domains.filter(d => !ALL_DOMAINS.includes(d));
  if (invalid.length > 0) {
    process.stderr.write(`Error: Unknown domains: ${invalid.join(', ')}\nAvailable: ${ALL_DOMAINS.join(', ')}\n`);
    process.exit(1);
  }

  const id = 'ps-' + nowISO().replace(/[:.]/g, '-').slice(0, -2);
  const startedAt = nowISO();

  // Build domain-to-themes mapping (one domain may have multiple themes)
  const domainToThemes = {};
  for (const t of opts.themes) {
    if (t.domain) {
      if (!domainToThemes[t.domain]) domainToThemes[t.domain] = [];
      domainToThemes[t.domain].push({ key: t.key, title: t.title || t.key, labels: t.labels || [] });
    }
  }

  // ── Dry Run ───────────────────────────────────────────────────────────
  if (opts.dryRun) {
    const plan = {
      scan_id: id,
      mode: opts.themes.length > 0 && !opts.explicitDomain ? 'theme-driven' : 'domain-driven',
      sources: opts.sources || DEFAULT_SOURCES,
      domains: opts.domains,
      themes: opts.themes.map(t => ({ key: t.key, domain: t.domain })),
      concurrency: opts.concurrency,
      enrich: opts.enrich,
      freshness: opts.freshness,
      limit: opts.limit,
      signal_types: opts.signalTypes || 'all',
      geo: opts.geo || 'none',
      persist: opts.persist,
      estimated_queries: opts.themes.length > 0
        ? opts.themes.filter(t => t.domain).length * (opts.sources || DEFAULT_SOURCES).length * 10
        : opts.domains.length * 10,
    };
    process.stderr.write('\n=== DRY RUN ===\n' + JSON.stringify(plan, null, 2) + '\n');
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  process.stderr.write(`\n=== Parallel Scan ${id} ===\n`);
  process.stderr.write(`Sources: ${(opts.sources || DEFAULT_SOURCES).join(', ')}\n`);
  process.stderr.write(`Domains: ${opts.domains.join(', ')}\n`);
  if (opts.themes.length) process.stderr.write(`Themes: ${opts.themes.map(t => `${t.key}:${t.domain || '?'}`).join(', ')}\n`);
  process.stderr.write(`Concurrency: ${opts.concurrency} | Enrich: ${opts.enrich} | Freshness: ${opts.freshness}d | Limit: ${opts.limit}\n\n`);

  // ── Phase 0: Mark themes as researching ───────────────────────────────
  for (const t of opts.themes) {
    await touchTheme(t.key, 'researching');
  }

  // ── Phase 1: Fan-Out with streaming discoveries ───────────────────────
  const semaphore = createSemaphore(opts.concurrency);
  const abortCtl = { aborting: false, children: [] };

  let sigintCount = 0;
  const sigintHandler = () => {
    sigintCount++;
    if (sigintCount === 1) {
      process.stderr.write('\n[SIGINT] Aborting gracefully — collecting partial results...\n');
      abortCtl.aborting = true;
      for (const child of abortCtl.children) {
        try { child.kill('SIGTERM'); } catch { /* ignore */ }
      }
    } else {
      process.stderr.write('\n[SIGINT] Force exit\n');
      process.exit(1);
    }
  };
  process.on('SIGINT', sigintHandler);

  const searchFlags = {
    enrich: opts.enrich,
    freshness: opts.freshness,
    limit: opts.limit,
    signalTypes: opts.signalTypes,
    geo: opts.geo,
    geoIncludeUnknown: opts.geoIncludeUnknown,
  };

  // Resolve sources (default: brave only; expand with --sources=)
  const activeSources = opts.sources || DEFAULT_SOURCES;
  const effectiveConcurrency = activeSources.length > 1
    ? Math.max(opts.concurrency, 6) // raise concurrency when multi-source (independent rate limits)
    : opts.concurrency;
  const fanOutSemaphore = createSemaphore(effectiveConcurrency);

  // Stream discoveries in real-time via ##SIGNAL## stderr protocol
  const allResults = [];
  const liveSeenNames = new Set(); // dedup evaluating entries across domains

  function handleLiveSignal(themeKeyOrDomain, domainOrPayload, payloadOrUndef) {
    // Support both old (domain, payload) and new (themeKey, domain, payload) signatures
    const payload = payloadOrUndef || domainOrPayload;
    if (payload.event === 'result' && payload.name && isRealName(payload.name)) {
      const nameKey = payload.name.toLowerCase();
      if (!liveSeenNames.has(nameKey)) {
        liveSeenNames.add(nameKey);
        writeDiscovery({
          status: 'evaluating',
          name: payload.name,
          detail: `${payload.affiliation || 'unknown'} — ${(payload.work || '').slice(0, 60)}`,
          time: timeHHMM(),
        }).catch(() => {}); // fire-and-forget, don't block search
      }
    }
  }

  const promises = [];
  const useThemeDrivenMode = opts.themes.length > 0 && !opts.explicitDomain;

  if (useThemeDrivenMode) {
    // ── Theme-driven mode: spawn per theme with theme vocabulary ──────
    process.stderr.write(`Mode: theme-driven (${opts.themes.length} themes × ${activeSources.length} sources)\n`);

    for (const theme of opts.themes) {
      if (!theme.domain) continue;
      const vocab = await loadThemeVocabulary(theme);
      process.stderr.write(`  ${theme.key}: ${vocab.keywords.slice(0, 6).join(', ')} (from ${vocab.source})\n`);

      // Brave web search
      if (activeSources.includes('brave')) {
        promises.push((async () => {
          if (abortCtl.aborting) return;
          await fanOutSemaphore.acquire();
          try {
            if (abortCtl.aborting) return;
            const result = await spawnThemeSearch(theme, vocab, searchFlags, abortCtl, handleLiveSignal);
            allResults.push(result);
          } finally { fanOutSemaphore.release(); }
        })());
      }

      // arXiv paper search
      if (activeSources.includes('arxiv')) {
        const queryTerms = vocab.keywords.slice(0, 6).join(' ');
        promises.push((async () => {
          if (abortCtl.aborting) return;
          await fanOutSemaphore.acquire();
          try {
            if (abortCtl.aborting) return;
            const result = await spawnExternalScan(
              ARXIV_SCAN_SCRIPT,
              [`--domain=${theme.domain}`, `--query=${queryTerms}`, `--freshness=${searchFlags.freshness}`, `--limit=${searchFlags.limit}`],
              `arxiv:${theme.key}`, theme.key, theme.domain, abortCtl
            );
            allResults.push(result);
          } finally { fanOutSemaphore.release(); }
        })());
      }

      // Semantic Scholar
      if (activeSources.includes('s2')) {
        const queryTerms = vocab.keywords.slice(0, 6).join(' ');
        promises.push((async () => {
          if (abortCtl.aborting) return;
          await fanOutSemaphore.acquire();
          try {
            if (abortCtl.aborting) return;
            const result = await spawnExternalScan(
              S2_SCAN_SCRIPT,
              [`--query=${queryTerms}`, `--limit=${searchFlags.limit}`],
              `s2:${theme.key}`, theme.key, theme.domain, abortCtl
            );
            allResults.push(result);
          } finally { fanOutSemaphore.release(); }
        })());
      }

      // HackerNews
      if (activeSources.includes('hn')) {
        const queryTerms = vocab.keywords.slice(0, 4).join(' ');
        promises.push((async () => {
          if (abortCtl.aborting) return;
          await fanOutSemaphore.acquire();
          try {
            if (abortCtl.aborting) return;
            const result = await spawnExternalScan(
              HN_SCAN_SCRIPT,
              [`--query=${queryTerms}`, `--freshness=${searchFlags.freshness}`],
              `hn:${theme.key}`, theme.key, theme.domain, abortCtl
            );
            allResults.push(result);
          } finally { fanOutSemaphore.release(); }
        })());
      }

      // Departure scan
      if (activeSources.includes('departure')) {
        promises.push((async () => {
          if (abortCtl.aborting) return;
          await fanOutSemaphore.acquire();
          try {
            if (abortCtl.aborting) return;
            const result = await spawnExternalScan(
              DEPARTURE_SCAN_SCRIPT,
              [`--domain=${theme.domain}`, `--days=${searchFlags.freshness}`],
              `departure:${theme.key}`, theme.key, theme.domain, abortCtl
            );
            allResults.push(result);
          } finally { fanOutSemaphore.release(); }
        })());
      }

      // Conference scan
      if (activeSources.includes('conference')) {
        promises.push((async () => {
          if (abortCtl.aborting) return;
          await fanOutSemaphore.acquire();
          try {
            if (abortCtl.aborting) return;
            const result = await spawnExternalScan(
              CONFERENCE_SCAN_SCRIPT,
              [`--domain=${theme.domain}`],
              `conference:${theme.key}`, theme.key, theme.domain, abortCtl
            );
            allResults.push(result);
          } finally { fanOutSemaphore.release(); }
        })());
      }

      // Patent scan
      if (activeSources.includes('patent')) {
        promises.push((async () => {
          if (abortCtl.aborting) return;
          await fanOutSemaphore.acquire();
          try {
            if (abortCtl.aborting) return;
            const result = await spawnExternalScan(
              PATENT_SCAN_SCRIPT,
              [`--domain=${theme.domain}`],
              `patent:${theme.key}`, theme.key, theme.domain, abortCtl
            );
            allResults.push(result);
          } finally { fanOutSemaphore.release(); }
        })());
      }
    }
  } else {
    // ── Legacy domain-driven mode: spawn per domain ──────────────────
    process.stderr.write(`Mode: domain-driven (${opts.domains.length} domains)\n`);

    for (const domain of opts.domains) {
      promises.push((async () => {
        if (abortCtl.aborting) return;
        await fanOutSemaphore.acquire();
        try {
          if (abortCtl.aborting) return;
          const result = await spawnSearch(domain, searchFlags, abortCtl, handleLiveSignal);
          allResults.push(result);
        } finally { fanOutSemaphore.release(); }
      })());
    }
  }
  await Promise.all(promises);

  process.removeListener('SIGINT', sigintHandler);

  // ── Phase 2: Fan-In (sequential, single-process) ─────────────────────
  process.stderr.write('\n=== Fan-In Phase ===\n');

  const domainsFailed = [];
  let totalRaw = 0;

  for (const r of allResults) {
    totalRaw += r.signals.length;
    if (r.error && r.error !== 'aborted') domainsFailed.push(r.domain);
  }

  // Merge & dedup (cross-theme aware)
  process.stderr.write(`Merging ${totalRaw} raw signals...\n`);
  const deduped = mergeResults(allResults, domainToThemes);
  process.stderr.write(`Deduped to ${deduped.length} unique signals\n`);

  // Progress heartbeat: merge complete
  await writeDiscovery({
    status: 'progress',
    name: '—',
    detail: `Merged ${totalRaw} → ${deduped.length} signals, running diff...`,
    time: timeHHMM(),
  });

  // Build per-theme counts
  const perTheme = {};
  for (const t of opts.themes) {
    perTheme[t.key] = { title: t.title || t.key, domain: t.domain, total: 0, new: 0, changed: 0, known: 0 };
  }
  for (const sig of deduped) {
    for (const themeKey of (sig._themes || [])) {
      if (perTheme[themeKey]) perTheme[themeKey].total++;
    }
  }

  // Partition: named signals go through scan-diff, anonymous/junk skip it (always "new")
  const namedSignals = deduped.filter(s => isRealName(s.name));
  const anonSignals = deduped.filter(s => !isRealName(s.name));
  process.stderr.write(`Named: ${namedSignals.length} | Anonymous/junk: ${anonSignals.length}\n`);

  // Scan diff (named only — anonymous are dropped, not merged)
  process.stderr.write('Running scan diff...\n');
  const diffResult = await runScanDiff(namedSignals);
  const diff = {
    new: diffResult.new,
    changed: diffResult.changed,
    known: diffResult.known,
    dropped: anonSignals.length,
    summary: `${diffResult.new.length} new, ${diffResult.changed.length} changed, ${diffResult.known.length} known, ${anonSignals.length} dropped`,
  };
  process.stderr.write(`Diff: ${diff.summary}\n`);

  // Progress heartbeat: diff complete
  await writeDiscovery({
    status: 'progress',
    name: '—',
    detail: `Diff: ${diff.new.length} new, ${diff.changed.length} changed — ingesting network...`,
    time: timeHHMM(),
  });

  // ── Phase 2b: Graph network ingestion (before scoring) ────────────────
  // Ingest co-author and affiliation networks so proximity scoring has data.
  let graphHandle = null; // { db, graph } — kept open through scoring
  let graphAvailable = false;

  try {
    const graphMod = await import('./graph.js');
    const { ingestNetwork } = await import('./ingest-network.js');
    const { db, graph } = await graphMod.open();
    await graphMod.ensure(graph);
    graphHandle = { db, graph, close: graphMod.close };

    const allNamedSignals = [...diff.new, ...diff.changed].filter(s => isRealName(s.name));
    if (allNamedSignals.length > 0) {
      const ingestStats = await ingestNetwork(graph, allNamedSignals);
      process.stderr.write(`[graph] Ingested network: ${ingestStats.candidates} candidates, ${ingestStats.references} references, ${ingestStats.coauthorEdges} co-author edges, ${ingestStats.affiliationEdges} affiliation edges\n`);
    }
    graphAvailable = true;
  } catch (e) {
    process.stderr.write(`[graph] Network ingestion skipped: ${e.message}\n`);
  }

  // Import graph-score for proximity bonus (if graph is available)
  let computeProximityBonus = null;
  if (graphAvailable) {
    try {
      const mod = await import('./graph-score.js');
      computeProximityBonus = mod.computeProximityBonus;
    } catch (e) {
      process.stderr.write(`[graph] Proximity scoring unavailable: ${e.message}\n`);
      graphAvailable = false;
    }
  }

  // Score and write verdicts incrementally (one signal at a time)
  process.stderr.write('Scoring signals...\n');
  for (const sig of diff.new) {
    if (!isRealName(sig.name)) continue; // safety net — skip junk that slipped through
    // Score (flat rubric)
    const attrs = mapSignalToScoringAttrs(sig);
    const result = scoreSignal(attrs);
    const flatScore = result.score;

    // Graph proximity bonus (capped at +3, skipped for already-funded)
    if (graphAvailable && computeProximityBonus && isRealName(sig.name)) {
      const isAlreadyFunded = attrs.already_funded;
      if (!isAlreadyFunded) {
        try {
          const slug = slugify(sig.name);
          const proximity = await computeProximityBonus(graphHandle.graph, slug, { alreadyFunded: false });
          if (proximity.bonus > 0) {
            result.score += proximity.bonus;
            result.breakdown.push({ key: 'graph_proximity', points: proximity.bonus });
            // Recalculate strength band
            if (result.score >= 8)      result.strength = 'strong';
            else if (result.score >= 4) result.strength = 'medium';
            else if (result.score >= 1) result.strength = 'weak';
            else                        result.strength = 'pass';
            process.stderr.write(`[graph] ${sig.name}: +${proximity.bonus} proximity (flat ${flatScore} → ${result.score})\n`);
          }
          sig._graph_bonus = proximity.bonus;
          sig._graph_raw = proximity.raw;
          sig._graph_explanation = proximity.explanation;
        } catch (e) {
          process.stderr.write(`[graph] Score error for ${sig.name}: ${e.message}\n`);
        }
      }
    }

    sig._score = result.score;
    sig._scored_strength = result.strength;
    sig._score_breakdown = result.breakdown;

    if (result.strength !== 'pass') {
      sig.signal_strength = result.strength;
    }

    // Recalculate action from scored strength
    if (result.score <= 0) {
      sig.action = 'PASS - low score';
    } else if (result.strength === 'strong' && sig.thesis_fit === 'direct') {
      sig.action = 'REACH_OUT';
    } else if (result.strength === 'strong' || result.strength === 'medium') {
      sig.action = 'WATCH';
    } else {
      sig.action = 'PASS - weak signal';
    }

    // Write verdict immediately
    const action = (sig.action || '').split(' - ')[0].trim();
    const status = action === 'REACH_OUT' ? 'found' : action === 'WATCH' ? 'watching' : 'disqualified';
    const entry = {
      status,
      name: sig.name || 'anonymous',
      detail: `${sig.affiliation || 'unknown'} — ${(sig.work || '').slice(0, 60)}`,
      time: timeHHMM(),
    };
    if (status === 'found') entry.strength = (sig.signal_strength || 'medium').toUpperCase();
    if (status === 'disqualified') entry.reason = sig.action?.split(' - ')[1] || 'low score';
    await writeDiscovery(entry);

    for (const themeKey of (sig._themes || [])) {
      if (perTheme[themeKey]) perTheme[themeKey].new++;
    }
  }

  for (const sig of diff.changed) {
    // Score changed signals too (flat rubric + graph bonus)
    const attrs = mapSignalToScoringAttrs(sig);
    const result = scoreSignal(attrs);
    const flatScore = result.score;

    // Graph proximity bonus for changed signals too
    if (graphAvailable && computeProximityBonus && isRealName(sig.name)) {
      const isAlreadyFunded = attrs.already_funded;
      if (!isAlreadyFunded) {
        try {
          const slug = slugify(sig.name);
          const proximity = await computeProximityBonus(graphHandle.graph, slug, { alreadyFunded: false });
          if (proximity.bonus > 0) {
            result.score += proximity.bonus;
            result.breakdown.push({ key: 'graph_proximity', points: proximity.bonus });
            if (result.score >= 8)      result.strength = 'strong';
            else if (result.score >= 4) result.strength = 'medium';
            else if (result.score >= 1) result.strength = 'weak';
            else                        result.strength = 'pass';
          }
          sig._graph_bonus = proximity.bonus;
          sig._graph_raw = proximity.raw;
          sig._graph_explanation = proximity.explanation;
        } catch { /* graph errors are non-blocking */ }
      }
    }

    sig._score = result.score;
    sig._scored_strength = result.strength;
    sig._score_breakdown = result.breakdown;

    if (result.strength !== 'pass') {
      sig.signal_strength = result.strength;
    }

    if (result.score <= 0) {
      sig.action = 'PASS - low score';
    } else if (result.strength === 'strong' && sig.thesis_fit === 'direct') {
      sig.action = 'REACH_OUT';
    } else if (result.strength === 'strong' || result.strength === 'medium') {
      sig.action = 'WATCH';
    } else {
      sig.action = 'PASS - weak signal';
    }

    if (!isRealName(sig.name)) continue; // skip anonymous/junk in feed
    await writeDiscovery({
      status: 'watching',
      name: sig.name,
      detail: `UPDATED — ${sig._changes?.map(c => c.field).join(', ') || 'data changed'}`,
      time: timeHHMM(),
    });

    for (const themeKey of (sig._themes || [])) {
      if (perTheme[themeKey]) perTheme[themeKey].changed++;
    }
  }

  for (const sig of diff.known) {
    for (const themeKey of (sig._themes || [])) {
      if (perTheme[themeKey]) perTheme[themeKey].known++;
    }
  }

  // ── Phase 2e: Theme Discovery ──────────────────────────────────────────
  let themeProposals = [];

  if (opts.discover && graphAvailable) {
    try {
      const { discoverThemes } = await import('./discover-themes.js');
      const allScored = [...diff.new, ...diff.changed];
      const { proposals, stats: discoverStats } = await discoverThemes(graphHandle.graph, allScored, {
        strategy: 'all',
        minCluster: 3,
      });
      themeProposals = proposals;

      if (proposals.length > 0) {
        process.stderr.write(`[discover] Found ${proposals.length} theme proposal(s): ${discoverStats.orphan_clusters} orphan clusters, ${discoverStats.bridges} bridges, ${discoverStats.anomalies} affiliation anomalies\n`);

        for (const proposal of proposals) {
          // Log to discoveries pane
          const status = proposal.confidence === 'weak' ? 'watching' : 'found';
          await writeDiscovery({
            status,
            name: proposal.suggested_title.replace('[Auto-discovered] ', '').replace('[Investigate] ', ''),
            detail: `THEME PROPOSAL (${proposal.source}) — ${proposal.suggested_primitive}`,
            strength: proposal.confidence === 'strong' ? 'STRONG' : 'MEDIUM',
            time: timeHHMM(),
          });
        }

        // Create Linear issues if --create-themes flag is set
        if (opts.createThemes) {
          process.stderr.write(`[discover] Creating ${proposals.filter(p => p.action === 'CREATE_TRIAGE').length} Linear theme issues...\n`);
          // Linear creation is handled by the calling agent (Claude) after the scan
          // because it requires MCP tools not available from this script.
          // The proposals are included in the scan output JSON for the agent to act on.
        }
      } else {
        process.stderr.write('[discover] No theme proposals found\n');
      }
    } catch (e) {
      process.stderr.write(`[discover] Theme discovery failed: ${e.message}\n`);
    }
  }

  // Persist phase (sequential, under advisory lock)
  let persisted = 0;
  const persistErrors = [];

  if (opts.persist) {
    const toPersist = [...diff.new, ...diff.changed].filter(sig => {
      if (!isRealName(sig.name)) return false; // never persist anonymous/junk
      const action = (sig.action || '').split(' - ')[0].trim();
      return action === 'REACH_OUT' || action === 'WATCH';
    });

    if (toPersist.length > 0) {
      // Progress heartbeat: persist phase starting
      await writeDiscovery({
        status: 'progress',
        name: '—',
        detail: `Persisting ${toPersist.length} signals...`,
        time: timeHHMM(),
      });
      process.stderr.write(`\nPersisting ${toPersist.length} signals (under lock)...\n`);
      try {
        await acquireLock();
        process.stderr.write('[lock] Acquired pipeline lock\n');

        for (const sig of toPersist) {
          // Use first matched theme from cross-theme classification
          const theme = (sig._themes && sig._themes[0]) || null;
          const result = await persistSignal(sig, theme);
          if (result.ok !== false) {
            persisted++;
            process.stderr.write(`[persist] + ${sig.name}\n`);
          } else {
            persistErrors.push({ name: sig.name, error: result.error });
            process.stderr.write(`[persist] x ${sig.name}: ${result.error}\n`);
          }
        }
      } finally {
        await releaseLock();
        process.stderr.write('[lock] Released pipeline lock\n');
      }
    }
  }

  // ── Compound signal detection ──────────────────────────────────────
  let compoundSignals = [];
  if (graphAvailable && graphHandle) {
    try {
      const { detectAll } = await import('./compound-signals.js');
      compoundSignals = await detectAll({ graph: graphHandle.graph });
      for (const c of compoundSignals) {
        await writeDiscovery({
          status: 'compound',
          name: c.name,
          detail: c.detail,
          strength: c.strength,
          time: timeHHMM(),
        });
      }
      if (compoundSignals.length > 0) {
        process.stderr.write(`[compound] Detected ${compoundSignals.length} compound signals\n`);
      }
    } catch (e) {
      process.stderr.write(`[compound] Skipped: ${e.message}\n`);
    }
  }

  // ── Graph densification (extract-relationships) ──────────────────
  if (graphAvailable && persisted > 0) {
    try {
      const extractScript = join(PROJECT_ROOT, 'scripts/extract-relationships.js');
      await new Promise(resolve => {
        execFile('node', [extractScript], { timeout: 30_000 }, (error, stdout) => {
          if (error) {
            process.stderr.write(`[extract-rel] Error: ${error.message}\n`);
          } else {
            process.stderr.write(`[extract-rel] ${stdout.split('\n').pop() || 'done'}\n`);
          }
          resolve();
        });
      });
    } catch (e) {
      process.stderr.write(`[extract-rel] Skipped: ${e.message}\n`);
    }
  }

  // Close graph handle (kept open through ingestion + scoring phases)
  if (graphHandle) {
    try {
      await graphHandle.close(graphHandle.db);
      process.stderr.write('[graph] Closed\n');
    } catch { /* non-blocking */ }
  }

  // ── Phase 3: Cleanup ──────────────────────────────────────────────────

  const themesTouched = [];
  for (const t of opts.themes) {
    await touchTheme(t.key);
    themesTouched.push(t.key);
  }

  // Summary discovery entry
  const watchCount = [...diff.new, ...diff.changed].filter(s => (s.action || '').startsWith('WATCH')).length;
  const reachOutCount = [...diff.new, ...diff.changed].filter(s => (s.action || '').startsWith('REACH_OUT')).length;
  const passCount = [...diff.new, ...diff.changed].filter(s => (s.action || '').startsWith('PASS')).length;
  const summaryName = opts.themes.length > 0
    ? opts.themes.map(t => t.key).join(', ')
    : opts.domains.join(', ');

  await writeDiscovery({
    status: 'summary',
    name: summaryName,
    detail: `${reachOutCount} reach out · ${watchCount} watch · ${passCount} pass · ${diff.dropped || 0} dropped`,
    results: deduped.length,
    time: timeHHMM(),
  });

  // ── Final Output (stdout JSON) ────────────────────────────────────────
  const completedAt = nowISO();
  const durationSeconds = Math.round((new Date(completedAt) - new Date(startedAt)) / 1000);

  const output = {
    scan_id: id,
    started_at: startedAt,
    completed_at: completedAt,
    duration_seconds: durationSeconds,
    domains_scanned: opts.domains,
    domains_failed: domainsFailed,
    concurrency: opts.concurrency,
    results: {
      total_raw: totalRaw,
      total_deduped: deduped.length,
      new: diff.new.length,
      changed: diff.changed.length,
      known: diff.known.length,
      persisted,
      errors: persistErrors,
    },
    diff: {
      new: diff.new,
      changed: diff.changed,
      known: diff.known.map(s => ({ name: s.name, slug: s.slug, action: s.action })),
    },
    per_theme: perTheme,
    themes_touched: themesTouched,
    theme_proposals: themeProposals,
    compound_signals: compoundSignals,
  };

  console.log(JSON.stringify(output, null, 2));

  process.stderr.write(`\n=== Scan Complete ===\n`);
  process.stderr.write(`Duration: ${durationSeconds}s | Raw: ${totalRaw} | Deduped: ${deduped.length}\n`);
  process.stderr.write(`New: ${diff.new.length} | Changed: ${diff.changed.length} | Known: ${diff.known.length}\n`);
  if (opts.persist) process.stderr.write(`Persisted: ${persisted}\n`);
  if (themeProposals.length) process.stderr.write(`Theme proposals: ${themeProposals.length}\n`);
  if (domainsFailed.length) process.stderr.write(`Failed domains: ${domainsFailed.join(', ')}\n`);
}

main().catch(err => {
  process.stderr.write(`Fatal error: ${err.message}\n${err.stack}\n`);
  process.exit(1);
});

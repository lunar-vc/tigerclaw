---
description: Scan Live themes for latent founder signals
---

Run a parallel scan for latent founder signals across the active themes.

## How to run

1. Read `.themes` to identify what to scan
2. Run: `node scripts/parallel-scan.js $ARGUMENTS`
3. Monitor `.discoveries.jsonl` — signals stream in real-time as each domain completes
4. When complete, review the JSON output for new/changed signals
5. For REACH_OUT signals: create Linear issues + persist to memory
6. For WATCH signals: persist to memory

## Default behavior

With no arguments, scans all Live themes with: enrich, persist, concurrency 4, freshness 30d, limit 20.

## User can specify

- Theme IDs: `/scan THE-2186 THE-2187` — scan only those themes
- `--limit=N` — results per query
- `--freshness=N` — recency in days
- `--no-enrich` — skip enrichment
- `--no-persist` — skip pipeline persistence
- `--dry-run` — print plan without executing

## After scan completes

Review the diff output:
- **new** signals: evaluate for Linear issues
- **changed** signals: check what changed
- **cross-theme** signals (matching 2+ themes via `_themes` array): flag as high-value

# Plan: Graph Proximity Scoring — Cluster-of-Excellence Bonus

**Date:** 2026-02-16
**Status:** Implemented
**Scope:** New `scripts/graph-score.js`, `scripts/ingest-network.js` + changes to `score-signal.js`, `parallel-scan.js`

## Problem

Current scoring is flat. `score-signal.js` counts individual attributes (PhD +3, new repo +2, conference +2, etc.) but has zero awareness of who a candidate is connected to in the graph. Two identical CVs produce identical scores — even if one person co-authored three papers with a REACH_OUT founder and the other is completely isolated.

The graph already stores COAUTHORED, WORKED_WITH, WORKED_AT, and HAS_EXPERTISE_IN edges. Ripple alerts use these reactively (when an event fires on an existing node). But **at initial scoring time** — when a new candidate first appears in a scan — the graph is never consulted.

**Additional gap:** The graph is empty when scoring runs because signals only get persisted to the graph AFTER scoring (in `persist-to-memory.js`). The scan needs to ingest co-author and affiliation networks BEFORE scoring.

## Solution: Network Ingestion + Graph Proximity Bonus

Two new modules, two modified scripts. The scan pipeline now has an explicit graph phase.

### New pipeline flow (parallel-scan.js)

```
Phase 0: Touch themes as researching
Phase 1: Fan-out (spawn search.js per domain)
Phase 2: Fan-in
  2a. Merge & dedup
  2b. Scan diff
  2c. ** Network ingestion ** — ingest candidates + co-authors + affiliations into graph
  2d. Score (flat rubric + graph proximity bonus, max +3)
  2e. Write verdicts to discoveries
  2f. Persist WATCH/REACH_OUT
Phase 3: Close graph, cleanup, touch themes done
```

### Network Ingestion (`scripts/ingest-network.js`)

For each named signal from the scan:

1. **Upsert Person node** (type: `scan_candidate`) — creates the candidate in the graph before scoring
2. **Extract co-authors** from Arxiv enrichment cache → upsert reference Person nodes (type: `reference`) + COAUTHORED edges
3. **Extract affiliations** from background text → WORKED_WITH edges between candidates at the same institution
4. **Link to themes** via HAS_EXPERTISE_IN edges

Reference nodes are lightweight connective tissue — not tracked in the pipeline, but they enable proximity scoring by connecting candidates who share co-authors.

### Graph Proximity Bonus (`scripts/graph-score.js`)

After computing the flat score, query the graph for the candidate's neighborhood:

**Excellence weights (by pipeline action):**
- `action = REACH_OUT` → weight 3
- `action = IN_PROGRESS` → weight 2
- `action = WATCH` → weight 2
- All others → weight 0 (no bonus from connecting to untracked nodes)

**Edge weights (same as ripple.js):**
- COAUTHORED: 4
- WORKED_WITH: 3
- FOUNDED / WORKED_AT: 3
- Same theme (HAS_EXPERTISE_IN): 2
- ADJACENT_TO: 1

**Scoring:**
```
hop1_score = sum of (edge_weight × neighbor_excellence_weight)
hop2_score = sum of (min(edge1_weight, edge2_weight) × 0.3 × neighbor_excellence_weight)
multi_path_bonus = min(extra_paths_per_neighbor, 2) per neighbor

raw_proximity = hop1_score + hop2_score + multi_path_bonus
proximity_bonus = min(floor(raw_proximity / 4), 3)    ← cap at +3
```

**Already-funded guard:** If a signal has `already_funded: true`, the proximity bonus is **always 0**. This prevents the +3 graph bonus from overcoming the -3 funded penalty and accidentally promoting funded companies.

### Calibration (tested)

| Connection type | Raw score | Bonus |
|----------------|-----------|-------|
| COAUTHORED with REACH_OUT (1 hop) | 12 | **+3** (max) |
| WORKED_WITH with REACH_OUT (1 hop) | 9 | **+2** |
| WORKED_WITH with WATCH (1 hop) | 6 | **+1** |
| 2-hop theme connection to WATCH | 1.2 | **+0** |
| COAUTHORED + WORKED_WITH with REACH_OUT (multi-path) | 14 | **+3** (capped) |

This means:
- Co-authorship with a REACH_OUT candidate → max bonus (+3), can promote medium → strong
- Shared university with a WATCH candidate → modest bonus (+1), nudges score up but doesn't change bands alone
- Weak 2-hop theme connections → no bonus, correctly treated as noise
- Already-funded signals → **never boosted**, regardless of connections

### Files

| File | Change |
|------|--------|
| `scripts/graph-score.js` | **New.** Proximity scoring module. Exports `computeProximityBonus(graph, slug, opts)`. |
| `scripts/ingest-network.js` | **New.** Network ingestion from scan results. Exports `ingestNetwork(graph, signals, opts)`. |
| `scripts/score-signal.js` | `--graph` flag. After flat score, calls graph-score. Skips bonus if already-funded. |
| `scripts/parallel-scan.js` | Phase 2b (network ingestion) + graph bonus in scoring loops. Graph handle kept open through both phases. |
| `scripts/ripple.js` | No change (already does event-driven graph walks). |

### What This Does NOT Do

- **No PageRank / eigenvector centrality.** Too opaque. Every point traces to a named connection.
- **No formal community detection.** Graph is too small (~30 nodes). Proximity scoring naturally rewards density.
- **No negative proximity.** Being connected to a PASS candidate doesn't penalize.
- **No self-reinforcing loops.** A candidate's own excellence weight doesn't count in their own proximity score.
- **No boost for already-funded signals.** The guard is absolute — funded = 0 bonus, always.

### Future Considerations

1. **Company proximity bonuses** — companies founded by well-connected people could inherit some score. Defer to v2.
2. **Recency decay** — co-authors from 5 years ago are less predictive than 6-month-old collaborations. Could use `last_seen` on edges. Defer to v2.
3. **Enrichment cache population** — co-authorship extraction depends on Arxiv data being in `.enrichment-cache/`. Running scans with `--enrich` populates this. Future scans will get richer proximity scoring as the cache grows.

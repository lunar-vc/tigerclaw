# Plan: Adjacent Theme Discovery from Graph Signals

**Date:** 2026-02-16
**Status:** Implemented
**Depends on:** Graph proximity scoring (implemented), network ingestion (implemented)

## Problem

Themes are created manually — someone reads a paper, notices a market shift, or spots a HN post, then writes a thesis and adds it to Linear. The graph already holds signals that *imply* new themes exist, but nobody's looking at the gaps.

Three categories of evidence sit unused today:

1. **Orphan signals** — Candidates who score medium+ on the flat rubric but map weakly (relevance < 0.3) or not at all to existing themes. `classifySignalToThemes()` in `parallel-scan.js` force-assigns them to the closest theme, but the low relevance score means they're really working on something else. That "something else" might be a theme.

2. **Bridge clusters** — Reference nodes (co-authors) from `ingest-network.js` that connect people across two different themes. If Candidate A (THE-2171, CXL memory) co-authored with Reference R, and Candidate B (THE-1882, agent frameworks) also co-authored with Reference R, then R sits at an intersection. What does R work on? That intersection could be a theme (e.g., "memory-aware agent runtimes").

3. **Primitive gaps** — Two existing themes share enough people or primitives to be ADJACENT_TO in the graph, but the adjacency itself represents an unexplored thesis. THE-2171 (memory tiering) adjacent to a hypothetical "AI checkpoint systems" theme — the *intersection* is "checkpoint-aware memory tiering," which is narrower and more investable than either parent.

## Proposal: Theme Suggestion Phase in the Scan Pipeline

A new optional phase after scoring and before persist that analyzes the scan results + graph topology to **propose** adjacent themes. Proposals go to Linear as Triage issues in the THE team — a human still decides whether to promote them to Live.

### Phase 2e: Theme Discovery (after scoring, before persist)

```
Phase 2d: Score (flat + graph)
Phase 2e: ** Theme discovery ** — analyze orphans, bridges, primitive gaps
Phase 2f: Persist WATCH/REACH_OUT
```

### Three detection strategies

#### Strategy 1: Orphan Signal Clustering

**Input:** All scored signals where `max(relevance to any theme) < 0.3` AND `score >= 4` (medium+).

**Process:**
1. Extract "work" keywords from each orphan signal (the `sig.work` and `sig.primitive` fields)
2. Cluster orphans by keyword overlap — two signals cluster together if they share 2+ non-stopword keywords in their `work` description
3. If a cluster has 3+ signals, propose a theme:
   - Title: synthesized from the shared keywords (e.g., "memory-aware agent runtimes")
   - Primitive: the intersection of shared keywords
   - Evidence: the orphan signals that formed the cluster
   - Domain: inferred from the majority domain of the signals

**Why 3+ signals?** One orphan is noise. Two is coincidence. Three working on the same unlisted topic is a pattern worth investigating.

**Graph query to find orphans retroactively:**
```cypher
MATCH (p:Person)
WHERE p.type = 'scan_candidate' AND p.action IN ['WATCH', 'REACH_OUT', '']
OPTIONAL MATCH (p)-[r:HAS_EXPERTISE_IN]->(t:Theme)
WITH p, collect({theme: t.key, confidence: r.confidence}) AS themes
WHERE size(themes) = 0 OR all(t IN themes WHERE toFloat(t.confidence) < 0.3)
RETURN p.slug, p.name
```

#### Strategy 2: Bridge Node Analysis

**Input:** Reference nodes from `ingest-network.js` that connect to people in 2+ different themes.

**Process:**
1. After network ingestion, query the graph for reference nodes with cross-theme connections:
   ```cypher
   MATCH (ref:Person {type: 'reference'})-[:COAUTHORED]-(p1:Person)-[:HAS_EXPERTISE_IN]->(t1:Theme),
         (ref)-[:COAUTHORED]-(p2:Person)-[:HAS_EXPERTISE_IN]->(t2:Theme)
   WHERE t1.key <> t2.key AND p1.slug <> p2.slug
   RETURN ref.name AS bridge_person,
          collect(DISTINCT t1.key) + collect(DISTINCT t2.key) AS themes,
          collect(DISTINCT p1.name) + collect(DISTINCT p2.name) AS connected_candidates
   ```
2. For each bridge person connecting 2+ themes: research what they work on (their papers, affiliation)
3. If the bridge person's research area doesn't match any existing theme, propose a theme:
   - Title: derived from the bridge person's research area
   - Primitive: what they're working on that isn't covered by either parent theme
   - Evidence: the bridge person + the candidates they connect
   - Parent themes: the themes being bridged (useful for ADJACENT_TO edge)

**Why this works:** Co-authorship is a strong signal of intellectual overlap. If someone co-authored with a CXL memory researcher AND an agent framework researcher, they're probably working on something at the intersection. That intersection is a theme candidate.

#### Strategy 3: Affiliation Density Anomalies

**Input:** The WORKED_WITH edges from `ingest-network.js` and `extract-relationships.js`.

**Process:**
1. Find institutions where 3+ tracked people work but they're spread across different themes:
   ```cypher
   MATCH (p1:Person)-[w:WORKED_WITH {source: 'affiliation_match'}]-(p2:Person)
   WHERE p1.slug < p2.slug
   WITH w.context AS institution, collect(DISTINCT p1.slug) + collect(DISTINCT p2.slug) AS people
   WHERE size(people) >= 3
   UNWIND people AS slug
   MATCH (p:Person {slug: slug})-[:HAS_EXPERTISE_IN]->(t:Theme)
   WITH institution, collect(DISTINCT t.key) AS themes, collect(DISTINCT p.name) AS people
   WHERE size(themes) >= 2
   RETURN institution, themes, people
   ```
2. If an institution has people in 3+ different themes, the institution itself may host a research group working on something that bridges those themes
3. Don't propose a theme directly — instead flag for research: "CMU has 4 tracked people across THE-2171, THE-1882, and THE-1810. Investigate whether there's an unreported research group bridging these areas."

This is a weaker signal than orphan clustering or bridge analysis — it suggests *where to look*, not *what the theme is*.

### Output: Theme Proposals

Each proposed theme produces a structured suggestion:

```json
{
  "type": "theme_proposal",
  "source": "orphan_cluster | bridge_node | affiliation_anomaly",
  "suggested_title": "Checkpoint-aware CXL memory management for AI training",
  "suggested_primitive": "CXL memory tiering optimized for AI checkpoint I/O patterns",
  "suggested_domain": "infra",
  "confidence": "medium",
  "evidence": {
    "signals": ["kaiyang-zhao", "kevin-song", "new-candidate-x"],
    "bridge_people": ["Prof. Dimitrios Skarlatos"],
    "parent_themes": ["THE-2171", "THE-1882"],
    "keyword_overlap": ["memory", "checkpoint", "tiering", "CXL"]
  },
  "action": "CREATE_TRIAGE"
}
```

### Linear Integration

For each proposal with `confidence >= medium`:

1. Check existing themes to avoid duplicates (fuzzy match on title keywords)
2. Create a Linear issue in THE team, status Triage:
   ```
   Title: [Medium] Checkpoint-aware CXL memory management for AI training

   Description:
   **Source:** Auto-discovered from scan orphan clustering
   **One-liner:** Multiple scan candidates working on CXL memory + AI checkpointing
     don't map to any existing theme
   **Primitive:** CXL memory tiering optimized for AI checkpoint I/O patterns
   **Evidence:**
   - Kaiyang Zhao (CMU) — CXL memory tiering, Equilibria paper
   - Kevin Song (UofT) — HybridTier, ASPLOS 2025
   - [new candidate] — checkpoint-aware allocation
   **Parent themes:** THE-2171 (memory tiering), THE-1882 (agent frameworks)
   **Action:** DEEP_DIVE — validate whether this intersection is investable
   ```
3. Persist to memory via `persist-to-memory.js` with `entity: "theme"`
4. Create ADJACENT_TO edges to parent themes in the graph
5. Log to `.discoveries.jsonl` as a `found` entry with `strength: MEDIUM`

### Graph Model Extensions Needed

**New edge property on HAS_EXPERTISE_IN:**
- `relevance` (float, 0-1) — how strongly a person maps to a theme. Currently `confidence` is always hardcoded to `0.7`. Should be set from `classifySignalToThemes()` relevance score during network ingestion. This is how we identify orphan signals (relevance < 0.3).

**New node property on Person:**
- `work_keywords` (string, comma-separated) — extracted keywords from the person's `work` field. Used for orphan clustering without having to re-read memory files. Set during network ingestion.

**New edge type: BRIDGES**
- `(:Person)-[:BRIDGES]->(:Theme)` — a reference node that connects candidates across themes. Created when bridge analysis detects cross-theme co-authorship. Properties: `via_person` (the candidate slugs), `detected_at` (date).

Actually, BRIDGES might be over-engineering. The bridge detection can be done as a query against existing COAUTHORED + HAS_EXPERTISE_IN edges without a new edge type. Defer the new edge type to v2 if the query approach proves too slow.

### Where It Runs

**New module: `scripts/discover-themes.js`**

```
discover-themes.js [--strategy orphan|bridge|affiliation|all] [--min-cluster 3] [--dry-run]
  → { proposals: [...], stats: { orphan_clusters: N, bridges: N, anomalies: N } }
```

Callable standalone (for ad-hoc theme discovery from existing graph data) or from within `parallel-scan.js` as Phase 2e.

**Integration into `parallel-scan.js`:**
- After scoring, before persist
- Enabled by default, disabled with `--no-discover`
- Proposals written to `.discoveries.jsonl` as they're found
- Linear issue creation is gated by `--create-themes` flag (off by default — proposals are logged but not auto-created unless explicitly requested)

### What This Does NOT Do

- **No automatic promotion to Live.** Proposals go to Triage. A human decides if they're real themes.
- **No theme merging.** If two existing themes are discovered to be essentially the same, this doesn't merge them. It might flag the overlap, but merging is a human decision.
- **No theme deprecation.** If a theme has zero candidates across multiple scans, this doesn't suggest killing it.
- **No recursive discovery.** A proposed theme doesn't immediately get scanned for more candidates or further adjacencies. That happens in the next scan cycle if the theme is promoted to Live.

### Risks

1. **Noise from keyword clustering.** Work descriptions from search.js are often vague or generic. Clustering on keywords like "machine learning" or "neural network" would produce garbage themes. Need aggressive stopword filtering and a minimum keyword specificity threshold.

2. **Cold graph problem.** With only ~30 people and sparse co-authorship data, bridge analysis will find very few bridges initially. This feature gets more valuable as the graph grows. First useful threshold: ~100 people with enrichment cache populated.

3. **Duplicate theme proposals.** Multiple scans might propose the same adjacent theme if the underlying signals persist. Need dedup against both existing themes AND previous proposals (could use `.pipeline-index.json` themes section or a separate proposals log).

4. **Title quality.** Auto-generated theme titles from keyword clustering will be clunky ("memory checkpoint tiering CXL agent"). The Linear issue should flag that the title needs human refinement. Template: `[Auto-discovered] <best-effort title> — needs refinement`.

### Implementation Order

1. Add `relevance` to HAS_EXPERTISE_IN edges during network ingestion (from `classifySignalToThemes` scores) — prerequisite for orphan detection
2. Build `discover-themes.js` with Strategy 1 (orphan clustering) only — simplest, most immediate value
3. Add Strategy 2 (bridge analysis) — requires enrichment cache to be populated for co-authorship data
4. Wire into `parallel-scan.js` as Phase 2e
5. Add Linear auto-creation behind `--create-themes` flag
6. Strategy 3 (affiliation anomalies) last — weakest signal, most likely to produce noise

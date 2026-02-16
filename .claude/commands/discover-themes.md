---
description: Discover new adjacent themes from graph intersections
---

Discover new investment themes by analyzing intersections between existing themes in the FalkorDB graph. Finds gaps where no theme exists but evidence suggests one should.

## Specificity requirement — this is the most important rule

Every candidate theme MUST match the granularity of existing themes. A theme names a **specific technology or mechanism** that **solves a specific problem** for a **specific use case**. It reads like a product spec, not a sector label.

### The pattern

```
[Specific technology/mechanism] + [solving/replacing/enabling] + [specific problem in specific context]
```

### Examples from the live portfolio

| Theme | Technology | Problem | Context |
|-------|-----------|---------|---------|
| THE-2186 | Micro-ring resonator optical I/O chiplets | die-to-die photonic interconnect | — |
| THE-2180 | MEMS/piezo-based optical circuit switches | replacing static patch panels | AI fabrics |
| THE-2187 | Vision-guided robotic fiber alignment | replacing manual photonic packaging | — |
| THE-2191 | Processing-in-DRAM architectures | eliminating memory wall | LLM inference |
| THE-2171 | Hot-cold memory tiering | rapid AI checkpoint cycles | — |
| THE-1822 | Firecracker-based permission envelopes | sandboxing | AI agents |

### How to narrow a broad intersection into a specific theme

When you find an intersection zone (e.g., "photonics + CXL"), do NOT stop there. Drill into the search results until you find the **specific technical approach** that someone is building or could build. Ask:

1. **What exact hardware/software mechanism?** Not "optical CXL" but "wavelength-division multiplexed silicon photonic transceivers replacing electrical retimers on CXL 3.0 links"
2. **What does it replace or eliminate?** Not "better interconnect" but "eliminating electrical retimer hops that add 15ns per CXL switch stage"
3. **For what specific workload?** Not "AI inference" but "cross-chassis KV cache access in multi-node LLM serving"

If you can't name the mechanism, you don't have a theme yet — you have a sector. Keep searching.

### Bad vs good theme titles

| Bad (sector label) | Good (specific theme) |
|----|------|
| Optical CXL | WDM silicon photonic transceivers eliminating electrical retimers on CXL 3.0 memory links |
| CXL fabric orchestration | Software-defined CXL switch topology managers enabling dynamic memory pool reconfiguration without host reboot |
| Non-float PIM | SRAM-embedded XNOR bitcell arrays executing ternary LLM layers at sub-milliwatt power on edge |
| Photonic test & assembly | Wafer-level double-sided electro-optical probe cards enabling pre-packaging yield screening for CPO |
| Agent authorization | Cedar-style declarative policy engines enforcing fine-grained tool permissions for MCP-connected AI agents |

## How to run

1. **Rebuild the graph:**
   ```bash
   node scripts/graph.js seed
   node scripts/extract-relationships.js
   ```

2. **Query for cross-theme bridges** — people who `WORKED_WITH` someone in a different theme:
   ```cypher
   MATCH (p1:Person)-[:HAS_EXPERTISE_IN]->(t1:Theme),
         (p2:Person)-[:HAS_EXPERTISE_IN]->(t2:Theme)
   WHERE p1 <> p2 AND t1 <> t2 AND (p1)-[:WORKED_WITH]-(p2)
   RETURN t1.key, t1.title, t2.key, t2.title, p1.name, p2.name
   ```

3. **Identify theme clusters** from `.themes` — group by shared labels, shared domain, or conceptual overlap. Look for themes that are tracked separately but share an underlying primitive.

4. **Map intersection zones** — for each cluster or bridge, identify the broad gap first, then **narrow it**:
   - Search for papers, startups, and products in the intersection zone
   - From the results, extract the **specific mechanism** being built or researched
   - Formulate the theme title using the `[mechanism] + [solving] + [problem in context]` pattern
   - If multiple specific mechanisms exist within one intersection, produce multiple themes (one per mechanism)

5. **Validate with search** — for each candidate theme, run `brave_web_search` with freshness=py to find:
   - Recent papers (arxiv, conferences) — look for the specific technique, not the broad area
   - Startups or product launches — what EXACTLY are they building?
   - Industry convergence signals (multiple incumbents publishing simultaneously)
   - Market-forming moments (first product in category)

6. **Specificity check** — before presenting, verify each candidate passes ALL of these:
   - [ ] Could you build exactly ONE company around this? (If the theme describes 3 different companies, it's too broad — split it)
   - [ ] Does the title name a specific technology or mechanism? (Not a category)
   - [ ] Does it specify what's being replaced, eliminated, or enabled? (Not just "better X")
   - [ ] Would a technical founder read this and say "yes, that's what I'm building"? (Not "that's the space I'm in")
   - [ ] Is it at the same granularity as themes in `.themes`? (Compare side-by-side before presenting)

7. **Present candidates** with:
   - Which existing themes intersect to produce it
   - The graph bridge (people, institutions, or conceptual overlap)
   - The specific mechanism (what exact technology)
   - What it replaces or eliminates (the before/after)
   - Why now (timing signal)
   - Signal strength: Strong (startup + papers + industry convergence) / Medium (papers only) / Weak (conceptual only)
   - Recommended action: FIND_FOUNDERS / MAP_LANDSCAPE / WATCH

8. **On user approval**, for each new theme:
   - Create Linear issue in **THE** team, status **Live**, assigned to **me**, current cycle
   - Set `relatedTo` with the parent theme IDs that produced the intersection
   - Run `node scripts/persist-to-memory.js` with theme entity
   - Create missing theme nodes in graph if needed
   - Write `ADJACENT_TO` edges between the new theme and its parent themes
   - Append to `.themes` pane file

## User can specify

- Theme IDs: `/discover-themes THE-1810 THE-1811` — only analyze intersections involving those themes
- `--dry-run` — identify candidates but don't create Linear issues
- `--no-search` — skip web validation, use graph + conceptual analysis only
- `--min-strength=medium` — only surface Medium+ candidates (default: all)

## What to skip

- Themes that already exist (check `.themes` and pipeline index first)
- **Sector labels** — "AI infrastructure", "photonics", "CXL" are not themes
- **Category intersections without a specific mechanism** — "photonics + memory" is not a theme until you name the exact technique
- Intersections with no validation signals
- Intersections where one parent theme already covers the gap

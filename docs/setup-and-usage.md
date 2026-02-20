# Tigerclaw Setup and Usage Guide

Tigerclaw is an agentic VC research analyst built on Claude Code. It scans public data for pre-founder signals, tracks deals and investment themes in Linear, and uses a graph database to surface connections between people, companies, and themes.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Environment Validation](#environment-validation)
- [Launching Tigerclaw](#launching-tigerclaw)
- [Architecture Overview](#architecture-overview)
- [Core Workflows](#core-workflows)
- [Scripts Reference](#scripts-reference)
- [MCP Integrations](#mcp-integrations)
- [Memory System](#memory-system)
- [Graph Database](#graph-database)
- [Linear Pipeline Management](#linear-pipeline-management)
- [tmux Layout and Panes](#tmux-layout-and-panes)
- [Shell Aliases](#shell-aliases)
- [Thematic Sourcing Guide](#thematic-sourcing-guide)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Glossary](#glossary)
- [FAQ](#faq)

---

## Prerequisites

| Dependency | Install | Notes |
|------------|---------|-------|
| [Flox](https://flox.dev/) | `curl -fsSL https://flox.dev/install \| bash` | Reproducible environment manager |
| [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | `npm install -g @anthropic-ai/claude-code` | AI coding agent |
| [Brave Search API key](https://brave.com/search/api/) | Sign up at brave.com | Required for scanning |
| Git | Included via Flox | For repo operations |
| Chrome/Chromium | System Chrome or `npx puppeteer browsers install chrome` | For Puppeteer MCP |

## Installation

```bash
# 1. Clone the repo
git clone https://github.com/lunar-vc/tigerclaw.git && cd tigerclaw

# 2. Activate the Flox environment
#    This installs Node.js 22, git, curl, jq, ripgrep, tmux, fswatch,
#    gemini-cli, and clones the agent-skills repo automatically.
flox activate

# 3. Copy the env template and add your API keys
cp .env.example .env
# Edit .env with your keys (see Configuration below)

# 4. Re-activate to load the keys into the shell
flox activate

# 5. Validate everything works
tigerclaw-doctor

# 6. Launch
tigerclaw
```

### What `flox activate` does

1. Installs Node.js 22, git, gh, curl, jq, ripgrep, tmux, fswatch, gemini-cli via Nix
2. Loads `.env` into the shell environment
3. Auto-detects Chrome/Chromium for Puppeteer (checks `~/.cache/puppeteer/`, then system Chrome)
4. Runs `npm install` if `node_modules/` is missing
5. Clones [lunar-vc/agent-skills](https://github.com/lunar-vc/agent-skills) into `.claude/skills/agent-skills/`
6. Auto-pulls from origin (fast-forward only) and warns if behind
7. Creates `research/` and `data/graph/` directories
8. Sets up shell aliases (`tigerclaw`, `tigerclaw-doctor`, `skills`, `search-founders`, `post-hookdeck`)

### Platform Support

Flox locks dependencies for:

- **macOS Apple Silicon** (`aarch64-darwin`) — primary dev environment
- **Linux x86-64** (`x86_64-linux`)
- **Linux ARM64** (`aarch64-linux`)

---

## Configuration

### API Keys (`.env`)

Copy `.env.example` to `.env` and fill in values:

| Key | Required | Purpose |
|-----|----------|---------|
| `BRAVE_API_KEY` | Yes | Web and news search for scanning |
| `HOOKDECK_API_KEY` | Yes | Event routing for alerts |
| `HOOKDECK_ENDPOINT` | Yes | Hookdeck webhook URL |
| `ANTHROPIC_API_KEY` | No | Programmatic Claude API calls |
| `OPENAI_API_KEY` | No | Alternative LLM access |
| `GITHUB_TOKEN` | No | Higher GitHub rate limits, private repos |
| `TWITTER_API_KEY` | No | Founder social signal enrichment |

### MCP Servers (`.mcp.json`)

Three MCP servers are pre-configured:

| Server | Type | Purpose |
|--------|------|---------|
| `linear` | HTTP (OAuth) | Deal and theme tracking |
| `brave-search` | stdio | Web/news search, summarization |
| `puppeteer` | stdio | Headless Chrome for JS-rendered pages |

**Linear authentication:** Run `/mcp` inside Claude Code and click "Authenticate" for the Linear server. This uses OAuth — no API key needed.

---

## Environment Validation

Run the health check to verify your setup:

```bash
tigerclaw-doctor
```

This checks six areas:

1. **Environment** — Flox, Node.js v20+, Claude Code, jq, rg, gh, tmux, gemini
2. **API Keys** — Validates `BRAVE_API_KEY` with a live HTTP request, checks Hookdeck and optional keys
3. **MCP Servers** — `.mcp.json` exists, linear/brave-search/puppeteer configured, Linear endpoint reachable
4. **Chrome/Puppeteer** — Finds Chrome in Puppeteer cache, `PUPPETEER_EXECUTABLE_PATH`, or system install
5. **Agent Skills** — `agent-skills/` repo cloned, `latent-founder-signals` and `hookdeck` present
6. **Project Structure** — `research/`, `data/graph/` directories, CLAUDE.md, falkordblite installed

Use `--fix` to auto-repair common issues:

```bash
tigerclaw-doctor --fix
```

---

## Launching Tigerclaw

```bash
# Launch the tmux session with all panes
tigerclaw

# Or spawn an additional session
tigerclaw-new
```

This opens a tmux session with a 2x2 pane layout (see [tmux Layout](#tmux-layout-and-panes)) and starts Claude Code in the bottom-right pane.

### Session Startup

When Claude Code starts, it automatically runs four background tasks:

1. **Refreshes the themes pane** — Fetches Live themes from Linear, checks memory for research dates, writes `.themes`
2. **Populates the pipeline pane** — Queries Linear Dealflow, runs `refresh-pipeline.js`, writes `.pipeline`
3. **Syncs pipeline statuses** — Reads `.pipeline-index.json`, checks each Linear issue status, updates local actions
4. **Checks ripple suggestions** — Reads `.ripple-suggestions.jsonl` for unprocessed ESCALATE entries

All four run concurrently. You can start typing commands immediately.

### Session Shutdown

When ending a session, say "done" or "wrap up" to trigger a session handoff:

```bash
# Claude runs this automatically:
node scripts/session-handoff.js '{"researched":[...],"findings":[...],"open_questions":[...],"next_steps":[...]}'
```

This writes a summary to `memory/sessions/YYYY-MM-DD.md` so the next session has context.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  Claude Code (Agentic Research Layer)                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ search-  │ │ search-  │ │ search-  │ │ search-  │ │ compound │ │
│  │ academic │ │ builder  │ │ media    │ │ social   │ │ signals  │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ │
│       └─────────────┴────────────┴─────────────┴────────────┘       │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Scoring Pipeline: score-signal.js + graph-score.js          │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                              ▼                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐      │
│  │ Pipeline     │  │ Memory       │  │ FalkorDB Graph       │      │
│  │ Index (.json)│  │ (topic files)│  │ (data/graph/)        │      │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘      │
│         └──────────────────┴─────────────────────┘                  │
│                              ▼                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐      │
│  │ Linear MCP   │  │ Hookdeck     │  │ Brave Search MCP     │      │
│  │ (deals/      │  │ (alerts)     │  │ (web/news search)    │      │
│  │  themes)     │  │              │  │                      │      │
│  └──────────────┘  └──────────────┘  └──────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Stores

| Store | File | Purpose |
|-------|------|---------|
| Pipeline Index | `.pipeline-index.json` | Dedup index of all tracked people and companies |
| Memory | `~/.claude/projects/.../memory/` | Topic files for people, companies, themes, sessions |
| Graph | `data/graph/` | FalkorDB relationship database |
| Enrichment Cache | `.enrichment-cache/` | Cached GitHub/Arxiv/LinkedIn data (TTL-based) |
| Discoveries | `.discoveries.jsonl` | Real-time scan feed (per-session) |

---

## Core Workflows

### 1. Latent Founder Signal Scanning

Find pre-founders at inflection points (PhD defense, FAANG departure, new repo).

```bash
# Inside Claude Code — scan a theme
"Scan THE-1810 for latent founder signals"

# Or use the /scan command for all Live themes
/scan

# Direct CLI usage
search-founders "quantum computing"
search-founders --domain=ai --signal-type=phd --freshness=7 --enrich
```

**What happens:**

1. Theme is marked as "researching" in the pane
2. Parallel agents search across Brave, arXiv, Semantic Scholar, HackerNews, departures, conferences, patents
3. Results are diffed against the pipeline index (new/changed/known)
4. Each signal is mechanically scored via `score-signal.js`
5. Graph scoring adds proximity bonuses
6. Discoveries stream to `.discoveries.jsonl` in real time
7. REACH_OUT and WATCH candidates get Linear issues + memory entries
8. Research memo saved to `research/YYYY-MM-DD-*.md`
9. Theme marked as researched with today's date

**Signal types:** `phd`, `github`, `conference`, `research`, `sideproject`

**Supported domains (16):** quantum, manufacturing, materials, aerospace, ai, biotech, networks, security, photonics, iot, robotics, semiconductors, cleantech, xr, web3, infra

### 2. Company Deep Dive

```
"Deep dive on Acme Inc"
```

Researches: product, market, team, traction, competitive landscape, risks. Outputs a research memo, creates a DEAL issue in Linear, and persists to memory.

### 3. Founder Research

```
"Research Sarah Chen — ex-Google AI, rumored to be starting something"
```

Checks: professional history, prior exits, patents, publications, open-source work, social signals, founder-market fit.

### 4. Market Landscape Mapping

```
"Map the optical interconnect market"
```

Identifies: all players (startups/incumbents), categorizes by stage/approach/geography, finds white space, assesses market timing.

### 5. Investment Theme Development

```
"Develop a thesis on processing-in-DRAM for LLM inference"
```

Defines hypothesis, maps the landscape, identifies tailwinds, finds proof points and counter-evidence, lists target companies/founders.

### 6. Ripple Alerts

When a tracked person gets a new signal, propagate it through the graph:

```bash
node scripts/ripple.js jane-doe --event phd_defense --strength strong --write --persist
```

Walks 1-2 hops, re-scores connected entities. Multi-path connections compound — two WATCH candidates sharing co-authorship + affiliation + a departure signal = a founding team forming.

### 7. Compound Signal Detection

```bash
node scripts/compound-signals.js --write
```

Detects emergent patterns:
- **Team Formation** — two co-authors/colleagues both active, both WATCH/REACH_OUT
- **Cluster Activation** — theme with 3+ tracked people all seen recently
- **Bridge Discovery** — person connected to 2+ unlinked themes

---

## Scripts Reference

### Scanning

| Script | Purpose |
|--------|---------|
| `parallel-scan.js` | Orchestrates multi-source fan-out/fan-in scanning |
| `arxiv-scan.js` | arXiv API — papers, authors, first-inventor detection |
| `semantic-scholar-scan.js` | Semantic Scholar — 200M+ papers, co-author graphs |
| `hn-scan.js` | HackerNews Algolia — Show HN, career comments |
| `departure-scan.js` | FAANG/top-lab departure monitoring |
| `conference-scan.js` | Top-5 conferences per domain — speaker discovery |
| `patent-scan.js` | First-inventor patent filings |

### Scoring

| Script | Purpose |
|--------|---------|
| `score-signal.js` | Mechanical scoring rubric (7+ = Strong, 4-6 = Medium, 1-3 = Weak) |
| `graph-score.js` | Graph proximity + rubric scoring |
| `network-gravity-score.js` | Proximity to REACH_OUT anchors |

### Graph

| Script | Purpose |
|--------|---------|
| `graph.js` | FalkorDB client + CLI (seed, query, cypher, stats) |
| `init-graph.js` | Initialize or reset graph schema |
| `backfill-graph.js` | Populate graph from pipeline index |
| `graph-sync.js` | Sync a single entity to graph |
| `extract-relationships.js` | Detect co-author + affiliation edges from memory |
| `one-hop-search.js` | Find undiscovered 1-hop neighbors |
| `ripple.js` | Signal propagation through graph |
| `compound-signals.js` | Detect team formation, cluster activation, bridges |

### Data Management

| Script | Purpose |
|--------|---------|
| `persist-to-memory.js` | Atomic write to pipeline index + memory + MEMORY.md |
| `scan-diff.js` | Compare scan results vs pipeline (new/changed/known) |
| `enrichment-cache.js` | TTL-based cache for GitHub/Arxiv/LinkedIn |
| `update-pipeline-status.js` | Sync Linear status to pipeline action |
| `refresh-pipeline.js` | Hydrate `.pipeline` from Linear |
| `touch-theme.js` | Update theme research status |
| `theme-coverage-report.js` | Show which themes need attention |
| `session-handoff.js` | Write session summary for next session |
| `query-tracker.js` | Log query-to-signal conversion rates |

### Panes and UX

| Script | Purpose |
|--------|---------|
| `themes-pane.sh` | Render themes (clickable links, relative dates) |
| `pipeline-pane.sh` | Render deals (grouped by status, aging warnings) |
| `discoveries-pane.sh` | Live founder feed (evaluating/found/watching/disqualified) |
| `welcome-popup.sh` | Session startup with last handoff context |
| `help-popup.sh` | Context-sensitive help |
| `logo.sh` | ASCII art banner |
| `tigerclaw-launch.sh` | Launch tmux session |
| `doctor.sh` | Environment health check |

---

## MCP Integrations

### Linear

Project management for deals and investment themes.

| Team | Prefix | Purpose |
|------|--------|---------|
| Dealflow | `DEAL` | Companies, founders, signals |
| Theme and Thesis | `THE` | Investment themes and theses |

All new issues start in **Triage** and are assigned to the creating user.

```
# Authenticate (one-time)
/mcp  →  click "Authenticate" for linear

# Usage inside Claude Code
"Create a deal for Sarah Chen — ex-Google AI, launching CV for manufacturing"
"List my open deals"
"What's the status of DEAL-1234?"
```

### Brave Search

Web and news search with freshness filtering.

| Tool | Purpose |
|------|---------|
| `brave_web_search` | General web search |
| `brave_news_search` | Recent news (funding, launches, departures) |
| `brave_summarizer` | AI summarization of results |
| `brave_image_search` | Image search |
| `brave_video_search` | Video search |

### Puppeteer

Headless Chrome for JavaScript-rendered pages.

| Tool | Purpose |
|------|---------|
| `puppeteer_navigate` | Load a URL |
| `puppeteer_screenshot` | Capture screenshots |
| `puppeteer_click` | Click elements |
| `puppeteer_fill` | Type into inputs |
| `puppeteer_evaluate` | Execute JavaScript in page context |

Use for pages that WebFetch can't handle — SPAs, sites that block HTTP fetches, or interactive pages (Crunchbase, LinkedIn).

---

## Memory System

### Storage Layout

```
~/.claude/projects/<project-slug>/memory/
  MEMORY.md              # Index (auto-loaded, <200 lines)
  people/<slug>.md       # One file per tracked person
  companies/<slug>.md    # One file per tracked company
  themes/<slug>.md       # One file per investment theme
  sessions/<date>.md     # Session handoff summaries
```

### Pipeline Index (`.pipeline-index.json`)

The dedup index maps all tracked people and companies:

```json
{
  "version": 1,
  "updated_at": "2026-02-20",
  "people": {
    "jane-doe": {
      "name": "Jane Doe",
      "action": "WATCH",
      "linear": "DEAL-1234",
      "theme": "THE-1810",
      "type": "latent_founder",
      "last_seen": "2026-02-20",
      "relationships": {
        "co_authors": ["wei-liu"],
        "advisor": "prof-smith",
        "lab": "MIT CSAIL"
      }
    }
  },
  "companies": { ... }
}
```

### Persisting Data

Always use the script (writes to all three stores atomically):

```bash
# Person
node scripts/persist-to-memory.js '{"entity":"person","name":"Jane Doe","action":"WATCH","theme":"THE-1810","background":"PhD at MIT","work":"Runtime verification","signal":"PhD defense","signal_strength":"medium","links":{"paper":"url"},"relationships":{"co_authors":["wei-liu"]}}'

# Company
node scripts/persist-to-memory.js '{"entity":"company","name":"Acme Inc","action":"WATCH","theme":"THE-1810","founded_by":"Jane Doe","product":"Verification platform"}'

# Theme
node scripts/persist-to-memory.js '{"entity":"theme","slug":"the-9999","key":"THE-9999","title":"New Theme","status":"Live","one_liner":"Why now","primitive":"..."}'
```

---

## Graph Database

Tigerclaw uses FalkorDB (embedded, Redis-compatible) to track relationships between people, companies, and themes.

### Node Types

| Label | Key Fields |
|-------|------------|
| `:Person` | slug, name, action, theme, type, last_seen |
| `:Company` | slug, name, action, theme, funded, last_seen |
| `:Theme` | key, title, status, one_liner, primitive |
| `:Investor` | slug, name |
| `:FundingRound` | id, round_type, amount |
| `:Customer` | slug, name |

### Edge Types

| Edge | From | To |
|------|------|----|
| `COAUTHORED` | Person | Person |
| `WORKED_WITH` | Person | Person |
| `FOUNDED` | Person | Company |
| `WORKED_AT` | Person | Company |
| `HAS_EXPERTISE_IN` | Person | Theme |
| `RELATED_TO_THEME` | Company | Theme |
| `ADJACENT_TO` | Theme | Theme |
| `INVESTED_IN` | Investor | Company |
| `ROUND_FOR` | FundingRound | Company |
| `CUSTOMER_OF` | Customer | Company |

### CLI Usage

```bash
node scripts/graph.js seed                       # Bootstrap from pipeline index
node scripts/graph.js query-theme THE-1810       # Entities linked to a theme
node scripts/graph.js query-network jane-doe     # Person's co-authors, affiliations
node scripts/graph.js query-entity THE-1810      # All relationships for an entity
node scripts/graph.js cypher "MATCH (p:Person) RETURN p.name"  # Arbitrary Cypher
node scripts/graph.js stats                      # Node and edge counts
```

### Scoring Rubric

| Feature | Points |
|---------|--------|
| Has co-author(s) in pipeline | +2 |
| Connected to REACH_OUT candidate (1 hop) | +2 |
| Bridges multiple themes | +2 |
| Shared affiliation with tracked candidate | +1 |
| Network recent activity (connected person seen <14d) | +1 |
| Isolated node (no person-person connections) | -1 |

---

## Linear Pipeline Management

### Signal Scoring Rubric

Signals are scored mechanically using `score-signal.js`:

| Signal | Points |
|--------|--------|
| PhD defense in last 6 months | +3 |
| Left FAANG/top lab in last 90 days | +3 |
| Network gravity (co-author of anchor) | +3 |
| New GitHub repo with 10+ commits | +2 |
| Conference talk at top venue | +2 |
| Patent filing (first inventor) | +2 |
| Venture-scale problem (TAM >$1B) | +2 |
| Prior startup experience | +2 |
| Convergence bonus (3+ positive signals) | +2 |
| Open-source project with traction | +1 |
| Active on social with tech focus | +1 |
| Advisor prestige | +1 |
| Recent signal (0-30 days) | +1 |
| Academic-only pattern (no builder signal) | -2 |
| Stale signal (>180 days) | -2 |
| Already funded (seed+) | -3 |

**Bands:** Strong = 7+ | Medium = 4-6 | Weak = 1-3 | Pass = 0 or below

```bash
node scripts/score-signal.js '{"phd_defense":true,"new_repo":true,"venture_scale":true,"days_since_signal":10}'
# {"score":10,"strength":"strong","breakdown":[...]}
```

### Pipeline Actions

| Action | Meaning |
|--------|---------|
| `REACH_OUT` | High-confidence signal, initiate contact |
| `WATCH` | Interesting but needs more data |
| `IN_PROGRESS` | Active conversation or research |
| `DONE` | Completed (invested, passed after diligence, etc.) |
| `PASS` | Ruled out |

### Theme Actions

| Action | Meaning |
|--------|---------|
| `MAP_LANDSCAPE` | Identify all players, white space, market structure |
| `DEEP_DIVE` | Full investment memo with TAM, risks, timing |
| `FIND_FOUNDERS` | Run latent founder scans for this thesis |
| `WATCH` | Interesting but timing/evidence insufficient |
| `PASS` | Thesis doesn't hold up |

---

## tmux Layout and Panes

Tigerclaw launches a 2x2 tmux grid:

```
┌──────────────────────┬────────────────────────┐
│ FOUNDER LEADS        │ THEMES                 │
│ (discoveries feed)   │ (Linear themes)        │
├──────────────────────┼────────────────────────┤
│ PIPELINE             │ SOURCE                 │
│ (deal dashboard)     │ (Claude Code)          │
└──────────────────────┴────────────────────────┘
```

### Keybindings

| Key | Action |
|-----|--------|
| `C-a` | Prefix (replaces default `C-b`) |
| `Alt+Arrows` | Navigate between panes (no prefix) |
| `C-a d` | Split right |
| `C-a D` | Split down |
| `C-a t` | New window |
| `C-a ]` / `C-a [` | Next/prev window |
| `Shift+Arrows` | Resize pane |
| `Enter` | Enter copy mode, select text, `Enter` copies |

### Pane Files

All are gitignored and auto-populated:

| File | Pane | Updated By |
|------|------|------------|
| `.themes` | Themes | Claude at session start / `touch-theme.js` |
| `.pipeline` | Pipeline | `refresh-pipeline.js` from Linear |
| `.discoveries.jsonl` | Founder Leads | Claude during scans |

Panes auto-refresh via `fswatch` (or 2-second polling fallback).

---

## Shell Aliases

Available after `flox activate`:

| Alias | Command |
|-------|---------|
| `tigerclaw` | Launch Claude Code with tmux layout |
| `tigerclaw-new` | Spawn additional tigerclaw session |
| `tigerclaw-doctor` | Run environment health check |
| `skills` | List available agent skills |
| `search-founders` | Run latent founder signal scan |
| `post-hookdeck` | Post JSON event to Hookdeck |

---

## Thematic Sourcing Guide

Thematic sourcing is Tigerclaw's primary use case: systematically finding founders and companies that match specific investment theses before they show up on everyone's radar.

### How Thematic Sourcing Works

The process flows: **Define a theme** -> **Scan for signals** -> **Score and rank** -> **Track in pipeline** -> **Monitor for changes**.

Each theme represents a specific, actionable investment thesis — granular enough that you could build exactly one company around it. Themes live in the Linear **THE** (Theme and Thesis) team and are the anchor that connects people, companies, and research.

### Step 1: Define Investment Themes

Good themes name a specific technology solving a specific problem in a specific context.

**Good themes:**
- "Micro-ring resonator optical I/O chiplets for die-to-die photonic interconnect"
- "Vision-guided robotic fiber alignment replacing manual photonic packaging"
- "Firecracker-based permission envelopes for AI agents"

**Bad themes:**
- "AI infrastructure" (too broad — which infrastructure? for what?)
- "Cybersecurity" (sector label, not a thesis)
- "Datalakehouses" (generic category)

**Self-check:** Can you build exactly ONE company around this? Does the title name a specific mechanism? Does it say what's being replaced or enabled?

To create a theme inside Claude Code:

```
"Create a theme: Processing-in-DRAM architectures eliminating memory wall for LLM inference"
```

Or use the `/discover-themes` command to generate theme ideas from graph intersections and market signals.

### Step 2: Scan Themes for Founder Signals

Once themes are Live in Linear, scan them for latent founder signals:

```
# Scan all Live themes
/scan

# Scan a specific theme
"Scan THE-1810 for latent founder signals"

# Scan with options
/scan THE-1810 --freshness=30 --limit=20
```

A scan searches across seven sources in parallel:

| Source | What It Finds |
|--------|--------------|
| Brave Search | Web mentions, blog posts, announcements |
| arXiv | Research papers, PhD defenses, co-author networks |
| Semantic Scholar | 200M+ papers, citation graphs, author profiles |
| HackerNews | Show HN posts, career transition comments |
| Departure scan | FAANG/top-lab departures in news |
| Conference scan | Speakers at top-5 conferences per domain |
| Patent scan | First-inventor patent filings (strong founder signal) |

Results stream to the **Founder Leads** pane in real time. Each signal is mechanically scored and classified as REACH_OUT, WATCH, or PASS.

### Step 3: Develop the Theme

Go deeper on a theme with market mapping and thesis development:

```
"Map the landscape for THE-1810"
"Develop the thesis for processing-in-DRAM"
```

This produces:
- Market map of all players (startups, incumbents, adjacent)
- Tailwind analysis (regulatory, technical, market timing)
- White space identification
- Proof points and counter-evidence
- Research memo saved to `research/` and published to Linear as a document

### Step 4: Track Coverage and Gaps

See which themes need attention:

```bash
node scripts/theme-coverage-report.js
```

This shows:
- Themes never researched
- Themes with stale data (>30 days since last scan)
- Themes with zero pipeline signals
- Recommended next scan target

The themes pane also shows research dates at a glance — green for recently scanned, aging dates for stale themes.

### Step 5: Monitor for Emergent Patterns

As you track more people across multiple themes, the graph surfaces patterns invisible to individual scanning:

```bash
# Run compound signal detection
node scripts/compound-signals.js --write

# Propagate a new signal through the graph
node scripts/ripple.js jane-doe --event phd_defense --strength strong --write --persist
```

**Team Formation:** Two co-authors both marked WATCH, both active in the last 30 days — they may be forming a company together.

**Cluster Activation:** Three or more tracked people in the same theme, all seen in the last 14 days — something is happening in this space.

**Bridge Discovery:** A person connected to two themes that aren't linked — they sit at an intersection that could define a new thesis.

### Thematic Sourcing Checklist

For each theme, work through this sequence:

1. Create the theme in Linear (THE team, Triage) with a specific, actionable title
2. Mark it as "researching": `node scripts/touch-theme.js THE-XXXX researching`
3. Run a scan: `/scan THE-XXXX`
4. Review discoveries in the Founder Leads pane
5. Create DEAL issues for REACH_OUT and WATCH candidates
6. Persist every tracked person to memory
7. Run compound signal detection across themes
8. Write a research memo and publish it to Linear
9. Mark the theme as done: `node scripts/touch-theme.js THE-XXXX`
10. Re-scan periodically (every 2-4 weeks) to catch new signals

### Example: End-to-End Thematic Sourcing Session

```
# 1. Check which themes need attention
"Run the theme coverage report"

# 2. Start scanning the most stale theme
"Scan THE-2132 for latent founder signals"

# 3. Claude will:
#    - Mark theme as "researching"
#    - Fan out across 7 sources
#    - Stream discoveries in real time
#    - Score each signal mechanically
#    - Diff against the pipeline (skip known people)
#    - Create DEAL issues for strong signals
#    - Persist everyone to memory
#    - Save a research memo
#    - Mark theme as researched

# 4. Look for connections
"Run compound signals to check for team formation"

# 5. Go deeper on a specific signal
"Deep dive on Dr. Sarah Chen — she came up in the quantum scan"

# 6. Check the pipeline
"Show me all WATCH candidates for THE-2132"
```

---

## Troubleshooting

Run `tigerclaw-doctor` first — it checks everything and tells you what to fix. Use `tigerclaw-doctor --fix` for auto-repair.

### Common Issues

**"No .env file found" warning**
```bash
cp .env.example .env
# Edit .env with your API keys
```

**"No Chrome found" warning**
```bash
npx puppeteer browsers install chrome
```

**Agent skills not cloning**
Check your network connection. If behind a firewall, set `GITHUB_TOKEN` in `.env` and ensure `github.com` is accessible.

**`claude` command not found**
```bash
npm install -g @anthropic-ai/claude-code
```

**`flox` command not found**
```bash
curl -fsSL https://flox.dev/install | bash
```

**Linear MCP not authenticating**
Run `/mcp` inside Claude Code, then click "Authenticate" for the Linear server. This uses OAuth and does not require an API key.

**Graph database errors**
```bash
# Reset and rebuild
node scripts/init-graph.js --reset
node scripts/backfill-graph.js
```

**Stale "researching" status on themes**
This happens when a previous session crashed mid-scan. It auto-cleans on next session start, or manually:
```bash
node scripts/touch-theme.js --cleanup
```

**Pipeline pane shows stale data**
```bash
# Inside Claude Code:
"refresh pipeline"
# Or manually:
node scripts/refresh-pipeline.js '<linear-json>'
```

---

## Contributing

### Repository Structure

```
tigerclaw/
  .claude/           # Claude Code config, agents, commands, skills
  .flox/             # Flox environment (manifest.toml, lockfiles)
  scripts/           # Node.js and Bash scripts (core logic)
  research/          # Research output (memos, scans)
  data/              # Graph database storage
  docs/              # Documentation
  CLAUDE.md          # System instructions for the AI agent
  README.md          # Quick start
  CHANGELOG.md       # Release notes
```

### Getting Started as a Contributor

1. Fork and clone the repo
2. Run `flox activate` to set up the environment
3. Copy `.env.example` to `.env` and add your API keys
4. Run `tigerclaw-doctor` to verify your setup
5. Create a feature branch from `master`

### Adding a New Script

Scripts live in `scripts/` and follow these conventions:

- **ES modules** — use `import`/`export`, not `require`
- **CLI-first** — every script should work from the command line with `node scripts/<name>.js`
- **JSON in, JSON out** — accept JSON arguments via CLI args or stdin, return structured JSON
- **No external dependencies** unless absolutely necessary — the project has one dependency (FalkorDBLite)
- **Document in CLAUDE.md** — add usage examples so the AI agent knows how to call the script

### Adding a New Agent

Custom agents live in `.claude/agents/` as Markdown files. Each agent defines:

- What sources it searches
- What query patterns it uses
- What output format it returns (always JSON arrays)
- What tools it has access to

Agents are designed to run in parallel during multi-source scans.

### Adding a New Claude Code Command

Commands live in `.claude/commands/` as Markdown files. They define slash commands (e.g., `/scan`, `/discover-themes`) that users invoke inside Claude Code.

### Modifying the Flox Environment

The environment is defined in `.flox/env/manifest.toml`. To add a new system dependency:

1. Add the package to the `[install]` section
2. Run `flox activate` to test
3. The lockfile updates automatically

### Submitting Changes

1. Create a feature branch: `git checkout -b your-name/feature-description`
2. Make your changes
3. Run `tigerclaw-doctor` to verify nothing is broken
4. Test your changes inside Claude Code (launch with `tigerclaw`)
5. Push and open a PR against `master`

### Code Style

- Node.js scripts use ES modules (`"type": "module"` in package.json)
- Bash scripts use `#!/usr/bin/env bash` and `set -euo pipefail`
- JSON files use 2-space indentation
- Markdown files use ATX-style headers (`#`)
- Filenames use kebab-case (`departure-scan.js`, not `departureScan.js`)

---

## Glossary

### Latent Founder
A person showing pre-founder signals — PhD defense, FAANG departure, new open-source repo, conference keynote — who has not yet announced a company. Tigerclaw's primary target. The thesis is that catching founders at "day -1" (before they've decided to start a company) creates deal flow that traditional sourcing misses.

### Theme
A specific, actionable investment thesis granular enough to build exactly one company around. Not a sector label ("AI") or a category ("cybersecurity") — a theme names a specific technology or mechanism solving a specific problem in a specific context. Example: "Firecracker-based permission envelopes for AI agents."

### Primitive
The underlying technical or market mechanism that makes a theme work. For "vision-guided robotic fiber alignment replacing manual photonic packaging," the primitive is "automated photonic alignment." Primitives help connect themes that share similar underlying dynamics.

### Signal
An observable event that suggests a person may be starting a company. Signals include PhD defenses, corporate departures, new GitHub repos, patent filings, conference talks, and hiring activity. Each signal has a type and a strength (strong/medium/weak).

### Signal Strength
A mechanically scored rating based on a point rubric. **Strong** (7+ points): high confidence, worth immediate outreach. **Medium** (4-6): interesting but needs more data. **Weak** (1-3): early or ambiguous signal. **Pass** (0 or below): not investable.

### Pipeline Actions

| Action | Meaning |
|--------|---------|
| **REACH_OUT** | High-confidence signal. Initiate contact with this person or company. |
| **WATCH** | Interesting but insufficient evidence. Monitor for additional signals. |
| **IN_PROGRESS** | Active engagement — conversation, diligence, or deeper research underway. |
| **DONE** | Terminal state — invested, passed after diligence, or otherwise resolved. |
| **PASS** | Ruled out. Reason is logged for future reference. |

### Theme Actions

| Action | Meaning |
|--------|---------|
| **MAP_LANDSCAPE** | Identify all players, white space, and market structure in this theme. |
| **DEEP_DIVE** | Write a full investment memo with TAM, risks, timing, and thesis validation. |
| **FIND_FOUNDERS** | Run latent founder scans targeting this thesis. |
| **WATCH** | Thesis is interesting but timing or evidence is insufficient. Revisit later. |
| **PASS** | Thesis doesn't hold up. Reason is logged. |

### Thesis Fit
How closely a signal aligns with an investment theme. **Direct**: the person/company is building exactly what the theme describes. **Adjacent**: related domain, could pivot into the theme. **Tangential**: loosely connected, worth noting but not a match.

### Ripple
Signal propagation through the graph. When person X gets a new signal, ripple walks 1-2 hops through their co-author, colleague, and affiliation connections, re-scoring every connected entity. Multi-path connections compound — if two WATCH candidates share co-authorship AND affiliation AND one just departed, that's a team-forming signal.

### Compound Signal
An emergent pattern invisible to individual scoring. Three types:
- **Team Formation** — two connected people (co-authors, ex-colleagues) both active and both tracked
- **Cluster Activation** — a theme with 3+ tracked people all seen recently
- **Bridge Discovery** — a person connected to two themes that aren't otherwise linked

### Network Gravity
A scoring bonus for proximity to high-value nodes in the graph. A person who co-authored a paper with someone already marked REACH_OUT gets +5 points. Same lab as an anchor gets +1. Gravity makes the graph self-reinforcing — each tracked person improves scoring for their network.

### Pipeline Index
The `.pipeline-index.json` file — a flat JSON map of every tracked person and company. Acts as the dedup layer: before creating a Linear issue, check the index to avoid duplicates. Updated atomically by `persist-to-memory.js`.

### Enrichment Cache
A local cache (`.enrichment-cache/`) that stores GitHub profiles, arXiv papers, LinkedIn data, and web pages to avoid redundant API calls. TTLs: GitHub 7 days, arXiv 30 days, LinkedIn/web 14 days.

### MCP (Model Context Protocol)
A standard for connecting AI agents to external tools. Tigerclaw uses three MCP servers: **Linear** (project management via OAuth), **Brave Search** (web/news search), and **Puppeteer** (headless Chrome).

### Scan Diff
The process of comparing new scan results against the pipeline index. Results are classified as **new** (not in pipeline), **changed** (in pipeline but action/data differs), or **known** (in pipeline, nothing new). Focus effort on new signals, review changed, skip known.

### Session Handoff
A summary written at the end of each session to `memory/sessions/YYYY-MM-DD.md`. Contains what was researched, key findings, open questions, and next steps. The next session's welcome screen displays this context so nothing is lost between sessions.

---

## FAQ

### General

**What is Tigerclaw for?**

Tigerclaw is a VC research analyst that helps investors find and track founders before they've announced a company. It scans public data (academic papers, GitHub repos, news, patents, conferences) for signals that someone with deep technical expertise is about to start something new.

**Do I need to be a VC to use it?**

The system is designed for venture capital workflows (deal tracking, thesis development, portfolio monitoring), but anyone doing systematic talent scouting or market research could adapt it.

**How is this different from using Claude Code directly?**

Tigerclaw adds a structured research layer on top of Claude Code: a pipeline tracking system (Linear), persistent memory across sessions, a graph database for relationship analysis, mechanical scoring rubrics, multi-source scanning, and a tmux dashboard for real-time visibility. Without Tigerclaw, you'd have to rebuild all of this context every session.

### Setup

**Which API keys are actually required?**

Only `BRAVE_API_KEY` is truly required for scanning. `HOOKDECK_API_KEY` and `HOOKDECK_ENDPOINT` are required for alert routing. All others are optional but improve coverage (GitHub for repo enrichment, Twitter for social signals).

**Can I use this without Flox?**

Flox is strongly recommended because it guarantees reproducible dependencies. Without it, you'd need to manually install Node.js 22, git, gh, jq, ripgrep, tmux, fswatch, and clone the agent-skills repo. The activation hook in `manifest.toml` automates all of this.

**Does it work on Linux?**

Yes. Flox locks dependencies for `x86_64-linux` and `aarch64-linux`. The main difference is Chrome: on Linux, Flox can provide Chromium directly via Nixpkgs. On macOS, it auto-detects system Chrome.

**How do I authenticate Linear?**

Run `/mcp` inside Claude Code, then click "Authenticate" next to the Linear server. It uses OAuth — no API key needed. Your credentials are stored in `.mcp-auth/` (gitignored).

### Scanning and Research

**How often should I scan themes?**

Every 2-4 weeks for active themes. Use `node scripts/theme-coverage-report.js` to see which themes are stale. The themes pane shows research dates so you can spot gaps at a glance.

**What does the scoring rubric actually measure?**

The rubric measures how likely someone is to start a venture-scale company. High scores come from: recent PhD defense + new GitHub repo + venture-scale problem area + prior startup experience. Low scores come from: academic-only pattern, stale signals, or already being funded.

**Can I customize the scoring rubric?**

The rubric is defined in `scripts/score-signal.js`. You can modify point values or add new signal types by editing the script. Graph scoring weights are in `scripts/graph-score.js`.

**What happens to PASS candidates?**

They're logged with a reason but not tracked in the pipeline. If a PASS candidate later shows a strong new signal (e.g., they leave Google and start a repo), they'll show up as "new" in the next scan because they aren't in the pipeline index.

**How does dedup work across scans?**

The pipeline index (`.pipeline-index.json`) maps every tracked person and company by slug. Before processing scan results, `scan-diff.js` classifies each result as new/changed/known. Known signals are skipped entirely. Changed signals are flagged for review.

### Graph and Relationships

**Do I need to set up the graph database manually?**

No. FalkorDB is embedded (no separate server). It's installed via `npm install` and persists to `data/graph/`. The graph is seeded from the pipeline index the first time you run `node scripts/graph.js seed`.

**What if the graph gets corrupted?**

Reset and rebuild: `node scripts/init-graph.js --reset && node scripts/backfill-graph.js`. The three flat stores (pipeline index, memory files, MEMORY.md) are the source of truth — the graph is always rebuildable.

**How are relationships detected?**

`extract-relationships.js` reads memory files and identifies shared affiliations (same lab, same company), co-authorships (papers with multiple tracked authors), and advisor relationships. These become edges in the graph. The `persist-to-memory.js` script also syncs relationships to the graph automatically.

### Memory and Sessions

**Where does memory actually live?**

Three places, kept in sync by `persist-to-memory.js`:
1. `.pipeline-index.json` — flat JSON dedup index (project root)
2. Topic files in `~/.claude/projects/<slug>/memory/` — detailed Markdown per person/company/theme
3. `MEMORY.md` — compact index table (auto-loaded by Claude Code at session start)

**What happens if I lose `.pipeline-index.json`?**

You can rebuild it from the memory topic files and Linear issues. The topic files contain all the data — the pipeline index is a convenience layer for fast lookups and dedup.

**Do sessions share memory?**

Yes. The memory system is persistent across sessions. Each session also writes a handoff file (`memory/sessions/YYYY-MM-DD.md`) so the next session starts with context about what was done, what was found, and what needs follow-up.

### Panes and Dashboard

**Can I use Tigerclaw without tmux?**

Yes. The tmux layout is optional — you can run Claude Code directly with `claude` in the project directory. You'll lose the dashboard panes (themes, pipeline, discoveries) but all core functionality works.

**Why isn't my discoveries pane updating?**

The pane watches `.discoveries.jsonl` via `fswatch` (or 2-second polling). Make sure `fswatch` is installed (included in Flox) and the file exists. You can also check: `cat .discoveries.jsonl` to see if entries are being written.

**How do I clear the discoveries pane?**

Truncate the file: `> .discoveries.jsonl`. Each new scan session typically starts by clearing this file.

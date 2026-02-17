# Changelog

## 2026-02-17
- Add auto-fetch + behind-origin warning to Flox activate hook
- Cast wider net: theme-driven queries, multi-source scan, graph edge fix
- Cast wider net: theme-driven query architecture replaces generic domain-based searches — queries now use vocabulary extracted from theme memory files (one-liner, primitive, title keywords) instead of static domain terms
- Add multi-source fan-out: `--sources=brave,arxiv,s2,hn,departure,conference,patent` enables parallel searches across Brave, arXiv API, Semantic Scholar API, HackerNews Algolia, and self-executing scan scripts
- New arXiv scan script (`scripts/arxiv-scan.js`): searches papers by category + keywords with full author/co-author extraction
- New Semantic Scholar scan script (`scripts/semantic-scholar-scan.js`): 200M+ paper search with co-author graphs and citation data, retry logic for rate limits
- New HackerNews scan script (`scripts/hn-scan.js`): Show HN posts and career transition comments via Algolia API
- Make departure/conference/patent scans self-executing with embedded Brave search, name extraction, and `##SIGNAL##` live streaming (previously query-template generators only)
- Standardize graph edge type `CO_AUTHOR` → `COAUTHORED` across all writers and readers (graph-sync, backfill-graph, persist-to-memory, one-hop-search, network-gravity-score, init-graph)
- Convert one-hop-search.js and network-gravity-score.js from CJS to ESM
- Update changelog with graph-integrated scoring summary
- Wire graph into scoring pipeline: 6-rule rubric scoring, compound signal detection (team formation, cluster activation, bridge discovery), ripple persistence, and end-to-end signal_strength flow

## 2026-02-16
- Make user identity dynamic from Linear MCP instead of hardcoded
- Filter completed/canceled/disqualified from pipeline pane and show Linear status
- Rewrite pipeline pane as Linear-powered deal dashboard
- Add auto-updating changelog and show latest updates in welcome popup
- Add /discover-themes command and enforce theme specificity
- Add --fix mode, API key validation, and MCP auth checks to doctor
- Add network gravity scoring, new signal sources, and Flox dependency hardening
- Add adjacent theme discovery from graph signals
- Add graph proximity scoring for scan pipeline talent ranking
- Add FalkorDB embedded graph layer with ripple alert propagation
- Add Linear document publishing, scan memos, and touch-theme hardening
- Add real-time discovery streaming, progress heartbeats, and name quality fixes

## 2026-02-15
- Add scan summary status, discovery pane rendering, pipeline fix, and research memos
- Extract shared logo into scripts/logo.sh and use claw design
- Simplify welcome popup and add live research status to themes pane
- Add scrollable welcome popup, clickable themes, spawn command, and background startup
- Add outreach generation, pipeline sync, scoring rubric, scan diff, session handoff, and 2x2 layout
- Add Mac-friendly tmux keybindings and isolate tigerclaw on its own socket

## 2026-02-09
- Add portable statusline and bc dependency for flox environment
- Add tigerclaw-doctor health check and improve first-run experience
- Fix MCP portability: remove flox-specific env var dependencies
- Add flox lockfiles and metadata for portable environment

## 2026-02-06
- Add tigerclaw launcher with ASCII art banner
- Add Brave Search, Memory, and Puppeteer MCP servers
- Add Linear MCP integration with deal/theme routing rules
- Initial tigerclaw environment

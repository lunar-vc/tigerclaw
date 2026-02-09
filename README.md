# Tigerclaw

Flox environment for agentic VC research with Claude Code.

## Prerequisites

| Dependency | Install |
|------------|---------|
| [Flox](https://flox.dev/) | `curl -fsSL https://flox.dev/install \| bash` |
| [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | `npm install -g @anthropic-ai/claude-code` |
| API keys | See `.env.example` — at minimum you need a [Brave Search API key](https://brave.com/search/api/) |

## Quick Start

```bash
# 1. Clone the repo
git clone <your-tigerclaw-repo-url> && cd tigerclaw

# 2. Activate the environment (installs Node.js, tools, clones skills)
flox activate

# 3. Copy and fill in your API keys
cp .env.example .env
# Edit .env — BRAVE_API_KEY is required, others are optional

# 4. Re-activate to load keys
flox activate

# 5. Validate everything works
tigerclaw-doctor

# 6. Launch Claude Code
tigerclaw
```

### What `flox activate` does

1. Installs Node.js 22, git, curl, jq, ripgrep via Nix (reproducible, locked)
2. Loads `.env` into the shell environment
3. Auto-detects Chrome/Chromium for Puppeteer
4. Clones [agent-skills](https://github.com/lunar-vc/agent-skills) into `.claude/skills/agent-skills/`
5. Creates `research/` directory
6. Sets up `tigerclaw`, `tigerclaw-doctor`, `skills`, `search-founders`, `post-hookdeck` commands

### Validating your setup

```bash
tigerclaw-doctor
```

This checks: Flox, Node.js, Claude Code, `.env` keys (validates Brave API key with a live request), Chrome/Puppeteer, agent-skills, MCP config, and project structure. Run it after setup or any time something seems off.

## Directory Structure

```
tigerclaw/
  .claude/
    settings.json          # Project-level Claude Code permissions
    settings.local.json    # Machine-local settings (gitignored)
    skills/
      agent-skills/        # Cloned from lunar-vc/agent-skills (gitignored)
        hookdeck/           # Event routing skill
        latent-founder-signals/  # Founder signal scanning skill
  .flox/
    env/manifest.toml      # Flox environment config
  .memory/
    vc-research.jsonl      # Persistent knowledge graph (gitignored)
  research/                # Research output directory
    YYYY-MM-DD-slug.md     # Research memos
  scripts/
    doctor.sh              # Environment health check
  .env                     # API keys (gitignored)
  .env.example             # API key template
  .mcp.json                # MCP servers (Linear, Brave, Memory, Puppeteer)
  CLAUDE.md                # Claude Code system instructions
  README.md                # This file
```

## Platform Support

Flox locks dependencies for these platforms:

- **macOS Apple Silicon** (`aarch64-darwin`) — primary dev environment
- **Linux x86-64** (`x86_64-linux`)
- **Linux ARM64** (`aarch64-linux`)

## Available Skills

### Latent Founder Signals

Scans public data for pre-founder signals — PhD defenses, new repos, conference talks, research papers.

```bash
search-founders "quantum computing"
search-founders --domain=ai --signal-type=phd --freshness=7 --enrich
# or directly:
node .claude/skills/agent-skills/latent-founder-signals/scripts/search.js "query"
```

### Hookdeck Event Router

Posts structured JSON payloads (founder signals, investment themes) to Hookdeck.

```bash
post-hookdeck '{"type": "founder_signal", "name": "...", ...}'
# or piped:
echo '{"type": "investment_theme", ...}' | post-hookdeck
```

### Linear (MCP)

Project management. Deals go to the **DEAL** team, themes to the **THE** team. Always Triage, always assigned.

```
# Inside Claude Code, authenticate first:
/mcp  → click "Authenticate" for linear-server

# Then use naturally:
"Create a deal for Sarah Chen — ex-Google AI, launching CV for manufacturing"
"Create a theme: Proactive SRE incident prediction using telemetry agents"
```

### Brave Search (MCP)

Web and news search with freshness filtering. Uses your `BRAVE_API_KEY` from `.env`.

Tools: `brave_web_search`, `brave_news_search`, `brave_summarizer`, `brave_image_search`, `brave_video_search`

### Memory (MCP)

Persistent knowledge graph across Claude Code sessions. Stores people, companies, themes, and relationships. Data lives in `.memory/vc-research.jsonl`.

Tools: `create_entities`, `create_relations`, `add_observations`, `search_nodes`, `open_nodes`, `read_graph`

### Puppeteer (MCP)

Headless Chrome for JS-rendered pages. Uses the auto-detected Chrome from `PUPPETEER_EXECUTABLE_PATH`.

Tools: `puppeteer_navigate`, `puppeteer_screenshot`, `puppeteer_click`, `puppeteer_fill`, `puppeteer_evaluate`

## Shell Aliases

| Alias | Description |
|-------|-------------|
| `tigerclaw` | Launch Claude Code with banner |
| `tigerclaw-doctor` | Check environment health |
| `skills` | List available agent skills |
| `search-founders` | Run latent founder signal scan |
| `post-hookdeck` | Post event to Hookdeck |

## Ralph Wiggum

The Ralph Wiggum plugin enables autonomous research loops. Inside Claude Code:

```
/ralph-loop
```

Example prompts for research loops:

- "Map the AI code review market and produce an investment memo"
- "Find founders leaving FAANG who show signs of starting dev tools companies"
- "Deep dive on [Company]: product, team, competition, funding, risks"

## Chromium / Puppeteer Notes

- **macOS**: Chromium is not available in Nixpkgs for macOS. The environment auto-detects Chrome from:
  1. Puppeteer's cache (`~/.cache/puppeteer/`)
  2. System Chrome (`/Applications/Google Chrome.app`)
- **Linux**: Flox can provide Chromium directly via Nixpkgs.
- To install Chrome for Puppeteer: `npx puppeteer browsers install chrome`
- The `PUPPETEER_EXECUTABLE_PATH` env var is set automatically.

## Troubleshooting

Run `tigerclaw-doctor` first — it checks everything and tells you exactly what to fix.

**"No .env file found" warning**
Copy `.env.example` to `.env` and fill in your API keys.

**"No Chrome found" warning**
Run `npx puppeteer browsers install chrome` to install a local Chrome for Puppeteer.

**Agent skills not cloning**
Check your network connection. If behind a firewall, set `GITHUB_TOKEN` in `.env` and ensure `github.com` is accessible.

**`claude` command not found**
Install Claude Code: `npm install -g @anthropic-ai/claude-code`

**`flox` command not found**
Install Flox: `curl -fsSL https://flox.dev/install | bash`

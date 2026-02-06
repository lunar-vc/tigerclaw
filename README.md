# Tigerclaw

Flox environment for agentic VC research with Claude Code.

## Prerequisites

- [Flox](https://flox.dev/) installed
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed
- API keys (see `.env.example`)

## Quick Start

```bash
# 1. Activate the environment (installs packages, clones skills)
flox activate

# 2. Copy and fill in your API keys
cp .env.example .env
# Edit .env with your keys

# 3. Re-activate to load keys
flox activate

# 4. Launch Claude Code
claude
```

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
  research/                # Research output directory
    YYYY-MM-DD-slug.md     # Research memos
  .env                     # API keys (gitignored)
  .env.example             # API key template
  CLAUDE.md                # Claude Code system instructions
  README.md                # This file
```

## Available Skills

### Latent Founder Signals

Scans public data for signals that a founder may be starting a new company.

```
search-founders <query>
# or
node .claude/skills/agent-skills/latent-founder-signals/index.js
```

### Hookdeck Event Router

Posts structured research events to Hookdeck for downstream processing.

```
post-hookdeck <payload>
# or
node .claude/skills/agent-skills/hookdeck/index.js
```

## Shell Aliases

| Alias | Description |
|-------|-------------|
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

**"No .env file found" warning**
Copy `.env.example` to `.env` and fill in your API keys.

**"No Chrome found" warning**
Run `npx puppeteer browsers install chrome` to install a local Chrome for Puppeteer.

**Agent skills not cloning**
Check your network connection. If behind a firewall, set `GITHUB_TOKEN` in `.env` and ensure `github.com` is accessible.

**`claude` command not found**
Install Claude Code: `npm install -g @anthropic-ai/claude-code`

#!/usr/bin/env bash
#
# tigerclaw doctor — validate that the environment is ready to use
#
# Usage:
#   tigerclaw doctor        (inside flox activate)
#   bash scripts/doctor.sh  (standalone)
#

set -uo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
DIM='\033[2m'
BOLD='\033[1m'
RESET='\033[0m'

PASS=0
WARN=0
FAIL=0

pass() { printf "  ${GREEN}✔${RESET} %s\n" "$1"; PASS=$((PASS + 1)); }
warn() { printf "  ${YELLOW}!${RESET} %s\n" "$1"; WARN=$((WARN + 1)); }
fail() { printf "  ${RED}✘${RESET} %s\n" "$1"; FAIL=$((FAIL + 1)); }
hint() { printf "    ${DIM}→ %s${RESET}\n" "$1"; }

# Resolve project root (script lives in scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

printf "\n${BOLD}Tigerclaw Doctor${RESET}\n\n"

# ── 1. Flox ─────────────────────────────────────────────────────────────────

printf "${BOLD}Environment${RESET}\n"

if command -v flox >/dev/null 2>&1; then
  pass "Flox installed ($(flox --version 2>/dev/null || echo 'unknown version'))"
else
  fail "Flox not installed"
  hint "Install: curl -fsSL https://flox.dev/install | bash"
fi

if command -v node >/dev/null 2>&1; then
  NODE_VER="$(node --version 2>/dev/null)"
  NODE_MAJOR="${NODE_VER#v}"
  NODE_MAJOR="${NODE_MAJOR%%.*}"
  if [ "$NODE_MAJOR" -ge 20 ] 2>/dev/null; then
    pass "Node.js $NODE_VER"
  else
    warn "Node.js $NODE_VER (v20+ recommended)"
    hint "Run: flox activate  (provides Node.js 22)"
  fi
else
  fail "Node.js not found"
  hint "Run: flox activate  (provides Node.js 22)"
fi

if command -v claude >/dev/null 2>&1; then
  pass "Claude Code installed"
else
  fail "Claude Code not installed"
  hint "Install: npm install -g @anthropic-ai/claude-code"
fi

if command -v jq >/dev/null 2>&1; then
  pass "jq available"
else
  warn "jq not found (optional, used for JSON processing)"
  hint "Run: flox activate  (provides jq)"
fi

if command -v rg >/dev/null 2>&1; then
  pass "ripgrep available"
else
  warn "ripgrep not found (optional, used for fast search)"
  hint "Run: flox activate  (provides ripgrep)"
fi

# ── 2. API Keys ─────────────────────────────────────────────────────────────

printf "\n${BOLD}API Keys (.env)${RESET}\n"

ENV_FILE="$PROJECT_ROOT/.env"

if [ -f "$ENV_FILE" ]; then
  pass ".env file exists"

  # Source .env to check values
  set -a
  source "$ENV_FILE" 2>/dev/null || true
  set +a

  # Required keys
  if [ -n "${BRAVE_API_KEY:-}" ]; then
    # Validate Brave key with a test request
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
      -H "Accept: application/json" \
      -H "X-Subscription-Token: $BRAVE_API_KEY" \
      "https://api.search.brave.com/res/v1/web/search?q=test&count=1" 2>/dev/null || echo "000")

    if [ "$HTTP_STATUS" = "200" ]; then
      pass "BRAVE_API_KEY set and valid"
    elif [ "$HTTP_STATUS" = "401" ] || [ "$HTTP_STATUS" = "403" ]; then
      fail "BRAVE_API_KEY set but invalid (HTTP $HTTP_STATUS)"
      hint "Get a key at https://brave.com/search/api/"
    elif [ "$HTTP_STATUS" = "000" ]; then
      warn "BRAVE_API_KEY set but could not validate (network error)"
    else
      warn "BRAVE_API_KEY set but got unexpected HTTP $HTTP_STATUS"
    fi
  else
    fail "BRAVE_API_KEY not set (required)"
    hint "Get a key at https://brave.com/search/api/"
  fi

  if [ -n "${HOOKDECK_ENDPOINT:-}" ]; then
    pass "HOOKDECK_ENDPOINT set"
  else
    warn "HOOKDECK_ENDPOINT not set (needed for signal routing)"
    hint "Set up at https://hookdeck.com/docs"
  fi

  # Optional keys
  if [ -n "${GITHUB_TOKEN:-}" ]; then
    pass "GITHUB_TOKEN set (higher rate limits)"
  else
    warn "GITHUB_TOKEN not set (optional — helps with GitHub rate limits)"
  fi

  if [ -n "${TWITTER_API_KEY:-}" ]; then
    pass "TWITTER_API_KEY set (founder enrichment)"
  else
    warn "TWITTER_API_KEY not set (optional — enables Twitter enrichment)"
  fi
else
  fail ".env file not found"
  hint "Run: cp .env.example .env  then fill in your keys"
fi

# ── 3. Chrome / Puppeteer ───────────────────────────────────────────────────

printf "\n${BOLD}Chrome / Puppeteer${RESET}\n"

CHROME_FOUND=""

# Check PUPPETEER_EXECUTABLE_PATH (set by flox activate)
if [ -n "${PUPPETEER_EXECUTABLE_PATH:-}" ] && [ -x "${PUPPETEER_EXECUTABLE_PATH:-}" ]; then
  CHROME_FOUND="$PUPPETEER_EXECUTABLE_PATH"
fi

# Check Puppeteer cache
if [ -z "$CHROME_FOUND" ]; then
  for candidate in \
    "$HOME/.cache/puppeteer/chrome/mac_arm-"*/chrome-mac-arm64/Google\ Chrome\ for\ Testing.app/Contents/MacOS/Google\ Chrome\ for\ Testing \
    "$HOME/.cache/puppeteer/chrome/mac-"*/chrome-mac-x64/Google\ Chrome\ for\ Testing.app/Contents/MacOS/Google\ Chrome\ for\ Testing \
    "$HOME/.cache/puppeteer/chrome/linux-"*/chrome-linux64/chrome; do
    if [ -x "$candidate" ] 2>/dev/null; then
      CHROME_FOUND="$candidate"
      break
    fi
  done
fi

# Check system Chrome (macOS)
if [ -z "$CHROME_FOUND" ]; then
  SYSTEM_CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  if [ -x "$SYSTEM_CHROME" ]; then
    CHROME_FOUND="$SYSTEM_CHROME"
  fi
fi

# Check system chromium (Linux)
if [ -z "$CHROME_FOUND" ] && command -v chromium >/dev/null 2>&1; then
  CHROME_FOUND="$(command -v chromium)"
fi
if [ -z "$CHROME_FOUND" ] && command -v chromium-browser >/dev/null 2>&1; then
  CHROME_FOUND="$(command -v chromium-browser)"
fi

if [ -n "$CHROME_FOUND" ]; then
  pass "Chrome found: $(basename "$CHROME_FOUND")"
else
  fail "No Chrome/Chromium found (needed for Puppeteer MCP)"
  hint "Install: npx puppeteer browsers install chrome"
fi

# ── 4. Agent Skills ─────────────────────────────────────────────────────────

printf "\n${BOLD}Agent Skills${RESET}\n"

SKILLS_DIR="$PROJECT_ROOT/.claude/skills/agent-skills"

if [ -d "$SKILLS_DIR/.git" ]; then
  pass "agent-skills repo cloned"

  if [ -f "$SKILLS_DIR/latent-founder-signals/scripts/search.js" ]; then
    pass "latent-founder-signals skill present"
  else
    fail "latent-founder-signals skill missing"
    hint "Try: rm -rf $SKILLS_DIR && git clone https://github.com/lunar-vc/agent-skills.git $SKILLS_DIR"
  fi

  if [ -f "$SKILLS_DIR/hookdeck/scripts/post.js" ]; then
    pass "hookdeck skill present"
  else
    fail "hookdeck skill missing"
    hint "Try: rm -rf $SKILLS_DIR && git clone https://github.com/lunar-vc/agent-skills.git $SKILLS_DIR"
  fi
else
  fail "agent-skills repo not cloned"
  hint "Run: flox activate  (auto-clones on activation)"
  hint "Or:  git clone https://github.com/lunar-vc/agent-skills.git $SKILLS_DIR"
fi

# ── 5. MCP Servers ──────────────────────────────────────────────────────────

printf "\n${BOLD}MCP Configuration${RESET}\n"

MCP_FILE="$PROJECT_ROOT/.mcp.json"

if [ -f "$MCP_FILE" ]; then
  pass ".mcp.json exists"

  # Check each server is configured
  for server in linear brave-search memory puppeteer; do
    if jq -e ".mcpServers.\"$server\"" "$MCP_FILE" >/dev/null 2>&1; then
      pass "$server server configured"
    else
      warn "$server server not configured in .mcp.json"
    fi
  done
else
  fail ".mcp.json not found"
  hint "This file should be checked into git — something is wrong with your clone"
fi

# ── 6. Directories ──────────────────────────────────────────────────────────

printf "\n${BOLD}Project Structure${RESET}\n"

if [ -d "$PROJECT_ROOT/research" ]; then
  pass "research/ directory exists"
else
  warn "research/ directory missing"
  hint "Run: mkdir -p research"
fi

if [ -d "$PROJECT_ROOT/.memory" ]; then
  pass ".memory/ directory exists"
else
  warn ".memory/ directory missing (will be created on first use)"
  hint "Run: mkdir -p .memory"
fi

if [ -f "$PROJECT_ROOT/CLAUDE.md" ]; then
  pass "CLAUDE.md present"
else
  fail "CLAUDE.md missing — Claude Code won't have project instructions"
fi

# ── Summary ─────────────────────────────────────────────────────────────────

printf "\n${BOLD}Summary${RESET}\n"
printf "  ${GREEN}$PASS passed${RESET}  "
if [ "$WARN" -gt 0 ]; then
  printf "${YELLOW}$WARN warnings${RESET}  "
fi
if [ "$FAIL" -gt 0 ]; then
  printf "${RED}$FAIL failed${RESET}  "
fi
printf "\n"

if [ "$FAIL" -eq 0 ] && [ "$WARN" -eq 0 ]; then
  printf "\n  ${GREEN}${BOLD}All clear — ready to go.${RESET}\n\n"
  exit 0
elif [ "$FAIL" -eq 0 ]; then
  printf "\n  ${YELLOW}${BOLD}Functional with warnings.${RESET} Fix the items above for full capability.\n\n"
  exit 0
else
  printf "\n  ${RED}${BOLD}Not ready.${RESET} Fix the failed items above before using Tigerclaw.\n\n"
  exit 1
fi

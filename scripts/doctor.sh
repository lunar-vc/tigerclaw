#!/usr/bin/env bash
#
# tigerclaw doctor — validate that the environment is ready to use
#
# Usage:
#   tigerclaw doctor        (inside flox activate)
#   bash scripts/doctor.sh  (standalone)
#   bash scripts/doctor.sh --fix   (auto-repair what it can)
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
FIX_MODE=false

[[ "${1:-}" == "--fix" ]] && FIX_MODE=true

pass() { printf "  ${GREEN}✔${RESET} %s\n" "$1"; PASS=$((PASS + 1)); }
warn() { printf "  ${YELLOW}!${RESET} %s\n" "$1"; WARN=$((WARN + 1)); }
fail() { printf "  ${RED}✘${RESET} %s\n" "$1"; FAIL=$((FAIL + 1)); }
hint() { printf "    ${DIM}→ %s${RESET}\n" "$1"; }
fixed() { printf "  ${GREEN}⟳${RESET} %s\n" "$1"; }

# Resolve project root (script lives in scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

printf "\n${BOLD}Tigerclaw Doctor${RESET}\n\n"

# ── 1. Environment ─────────────────────────────────────────────────────────

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

for tool in jq rg gh tmux; do
  if command -v "$tool" >/dev/null 2>&1; then
    pass "$tool available"
  else
    warn "$tool not found"
    hint "Run: flox activate"
  fi
done

if command -v gh >/dev/null 2>&1; then
  if gh auth status >/dev/null 2>&1; then
    pass "gh authenticated"
  else
    warn "gh not authenticated"
    hint "Run: gh auth login"
  fi
fi

if command -v gemini >/dev/null 2>&1; then
  pass "Gemini CLI available"
else
  warn "Gemini CLI not found (needed for LinkedIn/Reddit fetching)"
  hint "Run: flox activate"
fi

# ── 2. API Keys ────────────────────────────────────────────────────────────

printf "\n${BOLD}API Keys${RESET}\n"

ENV_FILE="$PROJECT_ROOT/.env"

if [ ! -f "$ENV_FILE" ]; then
  if $FIX_MODE && [ -f "$PROJECT_ROOT/.env.example" ]; then
    cp "$PROJECT_ROOT/.env.example" "$ENV_FILE"
    fixed "Created .env from .env.example — fill in your keys"
  else
    fail ".env file not found"
    hint "Run: cp .env.example .env  (or use --fix)"
  fi
fi

if [ -f "$ENV_FILE" ]; then
  set -a; source "$ENV_FILE" 2>/dev/null || true; set +a

  # BRAVE_API_KEY — required, validate with a test request
  if [ -n "${BRAVE_API_KEY:-}" ]; then
    HTTP=$(curl -s -o /dev/null -w "%{http_code}" \
      -H "Accept: application/json" \
      -H "X-Subscription-Token: $BRAVE_API_KEY" \
      "https://api.search.brave.com/res/v1/web/search?q=test&count=1" 2>/dev/null || echo "000")
    if [ "$HTTP" = "200" ]; then
      pass "BRAVE_API_KEY valid"
    elif [ "$HTTP" = "401" ] || [ "$HTTP" = "403" ]; then
      fail "BRAVE_API_KEY invalid (HTTP $HTTP)"
      hint "Get a key at https://brave.com/search/api/"
    else
      warn "BRAVE_API_KEY set (could not validate — HTTP $HTTP)"
    fi
  else
    fail "BRAVE_API_KEY not set (required for search)"
    hint "Get a key at https://brave.com/search/api/"
  fi

  # HOOKDECK_ENDPOINT — required for signal routing
  if [ -n "${HOOKDECK_ENDPOINT:-}" ]; then
    pass "HOOKDECK_ENDPOINT set"
  else
    warn "HOOKDECK_ENDPOINT not set (needed for signal routing)"
    hint "Set up at https://hookdeck.com/docs"
  fi

  # Optional keys
  for key in GITHUB_TOKEN TWITTER_API_KEY ANTHROPIC_API_KEY; do
    if [ -n "${!key:-}" ]; then
      pass "$key set"
    else
      warn "$key not set (optional)"
    fi
  done
fi

# ── 3. MCP Servers ─────────────────────────────────────────────────────────

printf "\n${BOLD}MCP Servers${RESET}\n"

MCP_FILE="$PROJECT_ROOT/.mcp.json"

if [ -f "$MCP_FILE" ]; then
  pass ".mcp.json exists"

  # Check each server is configured
  for server in linear brave-search puppeteer; do
    if command -v jq >/dev/null 2>&1; then
      if jq -e ".mcpServers.\"$server\"" "$MCP_FILE" >/dev/null 2>&1; then
        pass "$server configured"
      else
        fail "$server not in .mcp.json"
      fi
    fi
  done

  # Linear MCP auth — HTTP/OAuth, managed by Claude Code
  # Test by curling the MCP endpoint (unauthenticated returns 401)
  if command -v jq >/dev/null 2>&1; then
    LINEAR_URL=$(jq -r '.mcpServers.linear.url // empty' "$MCP_FILE" 2>/dev/null)
    if [ -n "$LINEAR_URL" ]; then
      LINEAR_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$LINEAR_URL" 2>/dev/null || echo "000")
      if [ "$LINEAR_HTTP" = "000" ]; then
        warn "Linear MCP unreachable (network error)"
      else
        pass "Linear MCP endpoint reachable"
        hint "Auth is managed by Claude Code — run /mcp in Claude Code if issues arise"
      fi
    fi
  fi
else
  fail ".mcp.json not found"
  hint "This file should be checked into git"
fi

# ── 4. Chrome / Puppeteer ──────────────────────────────────────────────────

printf "\n${BOLD}Chrome / Puppeteer${RESET}\n"

CHROME_FOUND=""
for candidate in \
  "${PUPPETEER_EXECUTABLE_PATH:-}" \
  "$HOME/.cache/puppeteer/chrome/mac_arm-"*/chrome-mac-arm64/Google\ Chrome\ for\ Testing.app/Contents/MacOS/Google\ Chrome\ for\ Testing \
  "$HOME/.cache/puppeteer/chrome/mac-"*/chrome-mac-x64/Google\ Chrome\ for\ Testing.app/Contents/MacOS/Google\ Chrome\ for\ Testing \
  "$HOME/.cache/puppeteer/chrome/linux-"*/chrome-linux64/chrome \
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"; do
  if [ -n "$candidate" ] && [ -x "$candidate" ] 2>/dev/null; then
    CHROME_FOUND="$candidate"
    break
  fi
done

if [ -z "$CHROME_FOUND" ] && command -v chromium >/dev/null 2>&1; then
  CHROME_FOUND="$(command -v chromium)"
fi

if [ -n "$CHROME_FOUND" ]; then
  pass "Chrome found"
else
  warn "No Chrome/Chromium found (needed for Puppeteer MCP)"
  hint "Install: npx puppeteer browsers install chrome"
fi

# ── 5. Agent Skills ────────────────────────────────────────────────────────

printf "\n${BOLD}Agent Skills${RESET}\n"

SKILLS_DIR="$PROJECT_ROOT/.claude/skills/agent-skills"

if [ -d "$SKILLS_DIR/.git" ]; then
  pass "agent-skills repo cloned"
  [ -f "$SKILLS_DIR/latent-founder-signals/scripts/search.js" ] && pass "latent-founder-signals skill" || fail "latent-founder-signals missing"
  [ -f "$SKILLS_DIR/hookdeck/scripts/post.js" ] && pass "hookdeck skill" || fail "hookdeck skill missing"
else
  if $FIX_MODE; then
    git clone https://github.com/lunar-vc/agent-skills.git "$SKILLS_DIR" 2>/dev/null && fixed "Cloned agent-skills repo" || fail "Could not clone agent-skills"
  else
    fail "agent-skills repo not cloned"
    hint "Run: flox activate  (auto-clones on activation)"
  fi
fi

# ── 6. Project Structure ──────────────────────────────────────────────────

printf "\n${BOLD}Project Structure${RESET}\n"

for dir in research data/graph; do
  if [ -d "$PROJECT_ROOT/$dir" ]; then
    pass "$dir/ exists"
  elif $FIX_MODE; then
    mkdir -p "$PROJECT_ROOT/$dir" && fixed "Created $dir/"
  else
    warn "$dir/ missing"
    hint "Run: mkdir -p $dir  (or use --fix)"
  fi
done

[ -f "$PROJECT_ROOT/CLAUDE.md" ] && pass "CLAUDE.md present" || fail "CLAUDE.md missing"

if [ -d "$PROJECT_ROOT/node_modules/falkordblite" ]; then
  pass "falkordblite installed"
elif $FIX_MODE; then
  (cd "$PROJECT_ROOT" && npm install 2>/dev/null) && fixed "Ran npm install" || warn "npm install failed"
else
  warn "falkordblite not in node_modules"
  hint "Run: npm install  (or use --fix)"
fi

# ── Summary ────────────────────────────────────────────────────────────────

printf "\n${BOLD}Summary${RESET}\n"
printf "  ${GREEN}$PASS passed${RESET}  "
[ "$WARN" -gt 0 ] && printf "${YELLOW}$WARN warnings${RESET}  "
[ "$FAIL" -gt 0 ] && printf "${RED}$FAIL failed${RESET}  "
printf "\n"

if [ "$FAIL" -eq 0 ] && [ "$WARN" -eq 0 ]; then
  printf "\n  ${GREEN}${BOLD}All clear — ready to go.${RESET}\n\n"
  exit 0
elif [ "$FAIL" -eq 0 ]; then
  printf "\n  ${YELLOW}${BOLD}Functional with warnings.${RESET} Fix items above for full capability.\n\n"
  exit 0
else
  printf "\n  ${RED}${BOLD}Not ready.${RESET} Fix failed items above."
  $FIX_MODE || printf " Try ${BOLD}--fix${RESET} to auto-repair what's possible."
  printf "\n\n"
  exit 1
fi

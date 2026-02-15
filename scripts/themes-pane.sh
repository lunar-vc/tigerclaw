#!/usr/bin/env bash
#
# themes-pane — live display of themes from .themes file
# Populated by Claude via Linear MCP on session start.
# Watches the file for changes and re-renders automatically.
#
# Expected .themes file format (one theme per block):
#   THE-XXXX  Title of the theme
#     https://linear.app/tigerslug/issue/THE-XXXX
#     Label1, Label2
#

set -uo pipefail

TC_HOME="${TC_HOME:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
THEMES_FILE="$TC_HOME/.themes"

# Colors
ORANGE='\033[38;5;208m'
AMBER='\033[38;5;214m'
WHITE='\033[1;37m'
DIM='\033[38;5;240m'
GREY='\033[38;5;245m'
BOLD='\033[1m'
RESET='\033[0m'
TAG_BG='\033[38;5;130m'

render() {
  clear

  # Count themes (lines starting with THE-)
  local count=0
  if [ -f "$THEMES_FILE" ] && [ -s "$THEMES_FILE" ]; then
    count=$(grep -c '^  THE-' "$THEMES_FILE" 2>/dev/null || true)
  fi

  # Header
  printf '\n'
  printf "  ${AMBER}${BOLD}Active Themes${RESET}"
  if [ "$count" -gt 0 ]; then
    printf "  ${DIM}(%s · Linear / THE / Live)${RESET}" "$count"
  else
    printf "  ${DIM}(Linear / THE / Live)${RESET}"
  fi
  printf '\n'
  printf "  ${DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"

  if [ ! -f "$THEMES_FILE" ]; then
    printf '\n'
    printf "  ${DIM}Waiting for Claude to fetch themes via Linear MCP...${RESET}\n"
    printf "  ${DIM}Ask Claude: \"refresh themes\"${RESET}\n"
    return
  fi

  local content
  content=$(cat "$THEMES_FILE" 2>/dev/null)

  if [ -z "$content" ]; then
    printf '\n'
    printf "  ${DIM}No themes loaded yet.${RESET}\n"
    printf "  ${DIM}Ask Claude: \"refresh themes\"${RESET}\n"
    return
  fi

  # Parse and colorize the themes file
  printf '\n'
  while IFS= read -r line; do
    # THE-XXXX key line (starts with spaces + THE-)
    if [[ "$line" =~ ^[[:space:]]*(THE-[0-9]+)[[:space:]]+(.+)$ ]]; then
      local key="${BASH_REMATCH[1]}"
      local title="${BASH_REMATCH[2]}"
      printf "  ${ORANGE}${BOLD}%s${RESET}  ${WHITE}%s${RESET}\n" "$key" "$title"
    # URL line (starts with spaces + http)
    elif [[ "$line" =~ ^[[:space:]]+(https?://.+)$ ]]; then
      printf "    ${DIM}%s${RESET}\n" "${BASH_REMATCH[1]}"
    # Label line (starts with spaces, not URL, not key)
    elif [[ "$line" =~ ^[[:space:]]+(.+)$ ]]; then
      local labels="${BASH_REMATCH[1]}"
      # Skip blank-ish lines
      [[ -z "${labels// /}" ]] && continue
      # Skip if it looks like a THE- line we missed
      [[ "$labels" =~ ^THE- ]] && continue
      # Skip if it's a URL
      [[ "$labels" =~ ^https?:// ]] && continue
      # Render labels as tags
      printf "    "
      IFS=',' read -ra label_arr <<< "$labels"
      for label in "${label_arr[@]}"; do
        label=$(echo "$label" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        [ -z "$label" ] && continue
        printf "${TAG_BG}▏${GREY}%s${RESET}  " "$label"
      done
      printf '\n'
    # Blank line = spacing between themes
    elif [ -z "$line" ]; then
      printf '\n'
    fi
  done < "$THEMES_FILE"

  # Footer
  printf "  ${DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
  local mtime
  if stat -f '%Sm' -t '%H:%M:%S' "$THEMES_FILE" &>/dev/null; then
    mtime=$(stat -f '%Sm' -t '%H:%M:%S' "$THEMES_FILE")
  else
    mtime=$(date -r "$THEMES_FILE" +%H:%M:%S 2>/dev/null || echo "?")
  fi
  printf "  ${DIM}Updated %s · Ask Claude: \"refresh themes\"${RESET}\n" "$mtime"
}

# ── Main run loop ────────────────────────────────────────────────────────
run() {
  # Initial render
  render

  # Watch for file changes — use fswatch if available (macOS), fall back to polling
  if command -v fswatch &>/dev/null; then
    fswatch -o "$THEMES_FILE" 2>/dev/null | while read -r _; do
      sleep 0.2  # debounce
      render
    done
  else
    # Poll fallback — check mtime every 5s
    local last_mtime=""
    while true; do
      sleep 5
      if [ -f "$THEMES_FILE" ]; then
        local current_mtime
        current_mtime=$(stat -f '%m' "$THEMES_FILE" 2>/dev/null || stat -c '%Y' "$THEMES_FILE" 2>/dev/null || echo "0")
      else
        local current_mtime="0"
      fi
      if [ "$current_mtime" != "$last_mtime" ]; then
        last_mtime="$current_mtime"
        render
      fi
    done
  fi
}

# ── Restart loop for crash recovery ──────────────────────────────────────
while true; do
  run 2>/dev/null || true
  sleep 2
done

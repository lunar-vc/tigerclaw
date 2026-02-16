#!/usr/bin/env bash
#
# themes-pane — live display of themes from .themes file
# Populated by Claude via Linear MCP on session start.
# Watches the file for changes and re-renders automatically.
#
# Expected .themes file format (one theme per block):
#   THE-XXXX  Title of the theme
#     https://linear.app/tigerslug/issue/THE-XXXX
#     researched: 2026-02-15
#     Label1, Label2
#
# Features:
#   - THE-XXXX keys are OSC 8 clickable links (iTerm2, kitty, etc.)
#   - "last researched" dates shown as relative age per theme
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
GREEN='\033[38;5;112m'
BOLD='\033[1m'
RESET='\033[0m'
TAG_BG='\033[38;5;130m'

# ── Relative date ─────────────────────────────────────────────────────────
relative_date() {
  local date_str="$1"
  if [ -z "$date_str" ]; then printf 'never'; return; fi

  local now_epoch date_epoch diff
  now_epoch=$(date +%s)
  date_epoch=$(date -j -f '%Y-%m-%d' "$date_str" +%s 2>/dev/null || echo 0)

  if [ "$date_epoch" -eq 0 ]; then printf 'unknown'; return; fi

  diff=$(( (now_epoch - date_epoch) / 86400 ))

  if [ $diff -eq 0 ]; then printf 'today'
  elif [ $diff -eq 1 ]; then printf 'yesterday'
  elif [ $diff -lt 7 ]; then printf '%dd ago' "$diff"
  elif [ $diff -lt 30 ]; then printf '%dw ago' "$(( diff / 7 ))"
  elif [ $diff -lt 365 ]; then printf '%dmo ago' "$(( diff / 30 ))"
  else printf '%dy ago' "$(( diff / 365 ))"
  fi
}

# ── OSC 8 hyperlink helper ────────────────────────────────────────────────
# Usage: link URL VISIBLE_TEXT
# Wraps text in an OSC 8 clickable hyperlink (iTerm2, kitty, etc.)
osc8() {
  printf '\033]8;;%s\007%s\033]8;;\007' "$1" "$2"
}

render() {
  clear

  # Count themes
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

  # Validate content — must contain at least one THE- line (catch mid-write corruption)
  if ! echo "$content" | grep -q 'THE-'; then
    printf '\n'
    printf "  ${DIM}Themes file updating, retrying...${RESET}\n"
    return
  fi

  # ── Pre-parse themes into parallel arrays ──────────────────────────────
  local t_keys=() t_titles=() t_urls=() t_dates=() t_labels=()
  local cur_key="" cur_title="" cur_url="" cur_date="" cur_labels=""

  while IFS= read -r line; do
    if [[ "$line" =~ ^[[:space:]]*(THE-[0-9]+)[[:space:]]+(.+)$ ]]; then
      # Save previous theme
      if [ -n "$cur_key" ]; then
        t_keys+=("$cur_key"); t_titles+=("$cur_title")
        t_urls+=("$cur_url"); t_dates+=("$cur_date")
        t_labels+=("$cur_labels")
      fi
      cur_key="${BASH_REMATCH[1]}"
      cur_title="${BASH_REMATCH[2]}"
      cur_url="" ; cur_date="" ; cur_labels=""
    elif [[ "$line" =~ ^[[:space:]]+researched:[[:space:]]+(.+)$ ]]; then
      cur_date="${BASH_REMATCH[1]}"
    elif [[ "$line" =~ ^[[:space:]]+(https?://.+)$ ]]; then
      cur_url="${BASH_REMATCH[1]}"
    elif [[ "$line" =~ ^[[:space:]]+(.+)$ ]]; then
      local text="${BASH_REMATCH[1]}"
      [[ "$text" =~ ^THE- || "$text" =~ ^https?:// || "$text" =~ ^researched: ]] && continue
      [[ -z "${text// /}" ]] && continue
      cur_labels="$text"
    fi
  done < "$THEMES_FILE"

  # Don't forget last theme
  if [ -n "$cur_key" ]; then
    t_keys+=("$cur_key"); t_titles+=("$cur_title")
    t_urls+=("$cur_url"); t_dates+=("$cur_date")
    t_labels+=("$cur_labels")
  fi

  # ── Render themes ──────────────────────────────────────────────────────
  printf '\n'
  local i
  for ((i=0; i<${#t_keys[@]}; i++)); do
    local key="${t_keys[$i]}"
    local title="${t_titles[$i]}"
    local url="${t_urls[$i]}"
    local rdate="${t_dates[$i]}"
    local lbls="${t_labels[$i]}"

    # Line 1: clickable key + title
    printf '  '
    if [ -n "$url" ]; then
      osc8 "$url" "$(printf "${ORANGE}${BOLD}%s${RESET}" "$key")"
    else
      printf "${ORANGE}${BOLD}%s${RESET}" "$key"
    fi
    printf "  ${WHITE}%s${RESET}\n" "$title"

    # Line 2: research age + labels
    local rel
    rel=$(relative_date "$rdate")

    printf '    '
    if [ "$rdate" = "researching" ]; then
      printf "${GREEN}● researching${RESET}"
    elif [ "$rel" = "never" ]; then
      printf "${DIM}never researched${RESET}"
    elif [ "$rel" = "today" ] || [ "$rel" = "yesterday" ]; then
      printf "${GREEN}%s${RESET}" "$rel"
    else
      printf "${GREY}%s${RESET}" "$rel"
    fi

    if [ -n "$lbls" ]; then
      printf "  "
      IFS=',' read -ra label_arr <<< "$lbls"
      local label
      for label in "${label_arr[@]}"; do
        label=$(echo "$label" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        [ -z "$label" ] && continue
        printf "${TAG_BG}▏${GREY}%s${RESET}  " "$label"
      done
    fi
    printf '\n\n'
  done

  # Footer
  printf "  ${DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
  local mtime
  if stat -f '%Sm' -t '%H:%M:%S' "$THEMES_FILE" &>/dev/null; then
    mtime=$(stat -f '%Sm' -t '%H:%M:%S' "$THEMES_FILE")
  else
    mtime=$(date -r "$THEMES_FILE" +%H:%M:%S 2>/dev/null || echo "?")
  fi
  printf "  ${DIM}Updated %s · click theme key to open in Linear${RESET}\n" "$mtime"
  printf "  ${DIM}Ask Claude: \"refresh themes\"${RESET}\n"
}

# ── Main run loop ────────────────────────────────────────────────────────
run() {
  render

  if command -v fswatch &>/dev/null; then
    fswatch -o "$THEMES_FILE" 2>/dev/null | while read -r _; do
      sleep 0.2
      render
    done
  else
    local last_mtime=""
    while true; do
      sleep 2
      local current_mtime
      if [ -f "$THEMES_FILE" ]; then
        current_mtime=$(stat -f '%m' "$THEMES_FILE" 2>/dev/null || stat -c '%Y' "$THEMES_FILE" 2>/dev/null || echo "0")
      else
        current_mtime="0"
      fi
      if [ "$current_mtime" != "$last_mtime" ]; then
        last_mtime="$current_mtime"
        render
      fi
    done
  fi
}

while true; do
  run 2>/dev/null || true
  sleep 2
done

#!/usr/bin/env bash
#
# discoveries-pane — live founder discovery feed
#
# Watches .discoveries.jsonl and renders a live, colorized feed.
# Newest entries appear at top. Disqualified founders shown crossed-out at bottom.
#
# JSONL entry format:
#   {"status":"evaluating","name":"Dr. Sarah Chen","detail":"MIT CSAIL — quantum error correction"}
#   {"status":"found","name":"Dr. Sarah Chen","detail":"MIT — PhD defense","strength":"STRONG","time":"14:23"}
#   {"status":"disqualified","name":"Dr. Jane Doe","detail":"Stanford — NLP","reason":"no venture intent","time":"14:25"}
#   {"status":"watching","name":"Wei Liu","detail":"ex-Google — new CV repo","time":"14:30"}
#
# Statuses:
#   evaluating   — currently being assessed (animated spinner)
#   found        — qualified, signal confirmed
#   watching     — interesting but needs more data
#   disqualified — ruled out (shown crossed-out at bottom)
#

set -uo pipefail

TC_HOME="${TC_HOME:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
TC_DISCOVERIES="${TC_DISCOVERIES:-$TC_HOME/.discoveries.jsonl}"

# Colors
ORANGE='\033[38;5;208m'
AMBER='\033[38;5;214m'
GREEN='\033[38;5;112m'
YELLOW='\033[38;5;220m'
RED='\033[38;5;167m'
DIM='\033[2m'
STRIKETHROUGH='\033[9m'
BOLD='\033[1m'
WHITE='\033[1;37m'
GREY='\033[38;5;240m'
RESET='\033[0m'

# Ensure the file exists
touch "$TC_DISCOVERIES"

SKIPPED_LINES=0

render() {
  clear
  SKIPPED_LINES=0

  # Header
  local total=0 found=0 watching=0 disqualified=0 evaluating=0
  if [ -s "$TC_DISCOVERIES" ]; then
    total=$(wc -l < "$TC_DISCOVERIES" | tr -d ' ')
    found=$(grep -c '"found"' "$TC_DISCOVERIES" 2>/dev/null || true)
    watching=$(grep -c '"watching"' "$TC_DISCOVERIES" 2>/dev/null || true)
    disqualified=$(grep -c '"disqualified"' "$TC_DISCOVERIES" 2>/dev/null || true)
    evaluating=$(grep -c '"evaluating"' "$TC_DISCOVERIES" 2>/dev/null || true)
  fi

  printf '\n'
  printf "  ${ORANGE}${BOLD}Founder Leads${RESET}  "
  if [ "$total" -gt 0 ]; then
    printf "${DIM}%s found${RESET}" "$found"
    [ "$watching" -gt 0 ] && printf "${DIM} · %s watching${RESET}" "$watching"
    [ "$evaluating" -gt 0 ] && printf "${YELLOW} · %s evaluating${RESET}" "$evaluating"
    [ "$disqualified" -gt 0 ] && printf "${DIM} · %s passed${RESET}" "$disqualified"
  fi
  printf '\n'
  printf "  ${GREY}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"

  if [ ! -s "$TC_DISCOVERIES" ]; then
    printf '\n'
    printf "  ${DIM}Waiting for founder signals...${RESET}\n"
    printf "  ${DIM}Claude will log discoveries as they're found.${RESET}\n"
    return
  fi

  # Collect active entries (non-disqualified) — newest first
  local active_lines=()
  local disqualified_lines=()

  while IFS= read -r line; do
    if echo "$line" | grep -q '"disqualified"'; then
      disqualified_lines+=("$line")
    else
      active_lines+=("$line")
    fi
  done < "$TC_DISCOVERIES"

  # Print active entries (newest first = reverse order)
  for (( i=${#active_lines[@]}-1; i>=0; i-- )); do
    render_entry "${active_lines[$i]}"
  done

  # Separator before disqualified, if any
  if [ ${#disqualified_lines[@]} -gt 0 ]; then
    printf '\n'
    printf "  ${GREY}── passed ──────────────────────────────────────${RESET}\n"
    for (( i=${#disqualified_lines[@]}-1; i>=0; i-- )); do
      render_entry "${disqualified_lines[$i]}"
    done
  fi

  # Show skipped count if any malformed lines were found
  if [ "$SKIPPED_LINES" -gt 0 ]; then
    printf '\n'
    printf "  ${RED}%d malformed line(s) skipped${RESET}\n" "$SKIPPED_LINES"
  fi
}

validate_json_line() {
  # Basic validation: must start with { and end with }, and contain "status" and "name"
  local line="$1"
  [[ "$line" =~ ^\{ ]] || return 1
  [[ "$line" =~ \}$ ]] || return 1
  echo "$line" | grep -q '"status"' || return 1
  echo "$line" | grep -q '"name"' || return 1
  return 0
}

render_entry() {
  local line="$1"

  # Validate before parsing — skip malformed lines silently
  if ! validate_json_line "$line"; then
    SKIPPED_LINES=$((SKIPPED_LINES + 1))
    return
  fi

  # Parse JSON fields with lightweight extraction (no jq dependency in pane)
  local status name detail strength reason time_str
  status=$(echo "$line" | sed -n 's/.*"status" *: *"\([^"]*\)".*/\1/p')
  name=$(echo "$line" | sed -n 's/.*"name" *: *"\([^"]*\)".*/\1/p')
  detail=$(echo "$line" | sed -n 's/.*"detail" *: *"\([^"]*\)".*/\1/p')
  strength=$(echo "$line" | sed -n 's/.*"strength" *: *"\([^"]*\)".*/\1/p')
  reason=$(echo "$line" | sed -n 's/.*"reason" *: *"\([^"]*\)".*/\1/p')
  time_str=$(echo "$line" | sed -n 's/.*"time" *: *"\([^"]*\)".*/\1/p')

  [ -z "$name" ] && return

  local time_prefix=""
  [ -n "$time_str" ] && time_prefix="${GREY}${time_str}${RESET} "

  case "$status" in
    evaluating)
      printf "  ${time_prefix}${YELLOW}◌${RESET} ${DIM}evaluating${RESET} ${WHITE}%s${RESET}" "$name"
      [ -n "$detail" ] && printf " ${DIM}— %s${RESET}" "$detail"
      printf '\n'
      ;;
    found)
      local strength_color="$AMBER"
      local strength_label=""
      case "$strength" in
        STRONG|strong) strength_color="$GREEN"; strength_label=" ${GREEN}▲ STRONG${RESET}" ;;
        MEDIUM|medium) strength_label=" ${AMBER}● MEDIUM${RESET}" ;;
        WEAK|weak)     strength_label=" ${GREY}○ WEAK${RESET}" ;;
      esac
      printf "  ${time_prefix}${GREEN}●${RESET} ${WHITE}${BOLD}%s${RESET}%s" "$name" "$strength_label"
      [ -n "$detail" ] && printf "\n    ${DIM}%s${RESET}" "$detail"
      printf '\n'
      ;;
    watching)
      printf "  ${time_prefix}${AMBER}◐${RESET} ${WHITE}%s${RESET} ${DIM}(watching)${RESET}" "$name"
      [ -n "$detail" ] && printf "\n    ${DIM}%s${RESET}" "$detail"
      printf '\n'
      ;;
    disqualified)
      printf "  ${time_prefix}${RED}✕${RESET} ${STRIKETHROUGH}${GREY}%s${RESET}" "$name"
      [ -n "$reason" ] && printf " ${DIM}— %s${RESET}" "$reason"
      printf '\n'
      ;;
    *)
      printf "  ${time_prefix}${DIM}%s — %s${RESET}\n" "$name" "$detail"
      ;;
  esac
}

# ── Main run loop ────────────────────────────────────────────────────────
run() {
  # Initial render
  render

  # Watch for file changes
  if command -v fswatch &>/dev/null; then
    fswatch -o "$TC_DISCOVERIES" 2>/dev/null | while read -r _; do
      sleep 0.15
      render
    done
  else
    local last_mtime=""
    while true; do
      sleep 2
      if [ -f "$TC_DISCOVERIES" ]; then
        local current_mtime
        current_mtime=$(stat -f '%m' "$TC_DISCOVERIES" 2>/dev/null || stat -c '%Y' "$TC_DISCOVERIES" 2>/dev/null || echo "0")
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

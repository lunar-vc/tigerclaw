#!/usr/bin/env bash
# Welcome popup — logo, pipeline stats, and latest changelog entries.

set -uo pipefail

TC_HOME="${TC_HOME:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
PIPELINE_INDEX="$TC_HOME/.pipeline-index.json"
CHANGELOG="$TC_HOME/CHANGELOG.md"

# ── Colors ────────────────────────────────────────────────────────────────
ORANGE='\033[38;5;208m'
AMBER='\033[38;5;214m'
YELLOW='\033[38;5;220m'
WHITE='\033[1;37m'
BOLD='\033[1m'
DIM='\033[2m'
GREY='\033[38;5;240m'
GREEN='\033[38;5;112m'
RESET='\033[0m'

VERSION="v1.0"

# ── Helper: truncate string to width ──────────────────────────────────────
trunc() {
  local str="$1" max="${2:-50}"
  if [ "${#str}" -gt "$max" ]; then
    printf '%s…' "${str:0:$((max-1))}"
  else
    printf '%s' "$str"
  fi
}

# ── Gather pipeline stats ─────────────────────────────────────────────────
people=0 companies=0 themes=0 reach_out=0 watch=0
if [ -f "$PIPELINE_INDEX" ] && [ -s "$PIPELINE_INDEX" ] && command -v jq &>/dev/null; then
  people=$(jq '.people | length' "$PIPELINE_INDEX" 2>/dev/null || echo 0)
  companies=$(jq '.companies | length' "$PIPELINE_INDEX" 2>/dev/null || echo 0)
  themes=$(jq '[.people[].theme, .companies[].theme] | map(select(type == "string")) | unique | length' "$PIPELINE_INDEX" 2>/dev/null || echo 0)
  reach_out=$(jq '[.people[] | select(.action == "REACH_OUT")] | length' "$PIPELINE_INDEX" 2>/dev/null || echo 0)
  watch=$(jq '[.people[] | select(.action == "WATCH")] | length' "$PIPELINE_INDEX" 2>/dev/null || echo 0)
fi

# ── Parse changelog ───────────────────────────────────────────────────────
changelog_date=""
changelog_entries=()
changelog_prev_date=""
changelog_prev_entries=()

if [ -f "$CHANGELOG" ]; then
  current_section=""
  while IFS= read -r line; do
    # Match date headers: ## YYYY-MM-DD
    if [[ "$line" =~ ^##\ ([0-9]{4}-[0-9]{2}-[0-9]{2}) ]]; then
      date="${BASH_REMATCH[1]}"
      if [ -z "$changelog_date" ]; then
        changelog_date="$date"
        current_section="latest"
      elif [ -z "$changelog_prev_date" ]; then
        changelog_prev_date="$date"
        current_section="prev"
      else
        break
      fi
      continue
    fi
    # Match entries: - Some text
    if [[ "$line" =~ ^-\ (.+) ]]; then
      entry="${BASH_REMATCH[1]}"
      case "$current_section" in
        latest) changelog_entries+=("$entry") ;;
        prev)   changelog_prev_entries+=("$entry") ;;
      esac
    fi
  done < "$CHANGELOG"
fi

# ── Render ────────────────────────────────────────────────────────────────
clear
printf '\n'

# Logo — shared with Flox env
RST="$RESET"
source "$TC_HOME/scripts/logo.sh"
printf '\n'

# Pipeline stats
if [ "$people" -gt 0 ] || [ "$companies" -gt 0 ]; then
  printf "  ${WHITE}${BOLD}Pipeline${RESET}  "
  printf "${DIM}%s people${RESET}" "$people"
  [ "$companies" -gt 0 ] && printf "${DIM} · %s companies${RESET}" "$companies"
  [ "$themes" -gt 0 ] && printf "${DIM} · %s themes${RESET}" "$themes"
  printf '\n'

  if [ "$reach_out" -gt 0 ] || [ "$watch" -gt 0 ]; then
    printf "           "
    [ "$reach_out" -gt 0 ] && printf "${GREEN}%s reach out${RESET}  " "$reach_out"
    [ "$watch" -gt 0 ] && printf "${AMBER}%s watching${RESET}" "$watch"
    printf '\n'
  fi

  printf '\n'
else
  printf "  ${DIM}No pipeline data yet. Run a scan to get started.${RESET}\n"
  printf '\n'
fi

# Latest updates from changelog
if [ -n "$changelog_date" ]; then
  printf "  ${WHITE}${BOLD}Latest updates${RESET}  ${DIM}%s${RESET}\n" "$changelog_date"

  # Show up to 5 entries from latest date
  local_count=0
  for entry in "${changelog_entries[@]+"${changelog_entries[@]}"}"; do
    [ -z "$entry" ] && continue
    printf "  ${GREEN}·${RESET} %s\n" "$(trunc "$entry" 46)"
    local_count=$((local_count + 1))
    [ "$local_count" -ge 5 ] && break
  done

  # If fewer than 5 from latest, show some from previous date
  if [ "$local_count" -lt 5 ] && [ -n "$changelog_prev_date" ]; then
    remaining=$((5 - local_count))
    printf '\n'
    printf "  ${DIM}%s${RESET}\n" "$changelog_prev_date"
    prev_count=0
    for entry in "${changelog_prev_entries[@]+"${changelog_prev_entries[@]}"}"; do
      [ -z "$entry" ] && continue
      printf "  ${DIM}· %s${RESET}\n" "$(trunc "$entry" 46)"
      prev_count=$((prev_count + 1))
      [ "$prev_count" -ge "$remaining" ] && break
    done
  fi

  printf '\n'
fi

# Footer
printf "  ${GREY}© Morris Clay 2026${RESET}\n"
printf '\n'
printf "  ${DIM}press Enter or ESC${RESET}\n"
printf '\n'

# Wait for ESC or Enter
while true; do
  IFS= read -rsn1 key
  case "$key" in
    $'\x1b')
      read -rsn2 -t 0.15 _ || true
      break
      ;;
    '')
      break
      ;;
  esac
done

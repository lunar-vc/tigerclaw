#!/usr/bin/env bash
# Welcome popup — logo, pipeline stats, and last session context.

set -uo pipefail

TC_HOME="${TC_HOME:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
PIPELINE_INDEX="$TC_HOME/.pipeline-index.json"
PROJECT_SLUG="$(echo "$TC_HOME" | tr '/' '-')"
SESSIONS_DIR="$HOME/.claude/projects/$PROJECT_SLUG/memory/sessions"

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

# ── Find latest session handoff ───────────────────────────────────────────
handoff_date=""
handoff_items=()
handoff_findings=()
handoff_next=()
handoff_open=()

if [ -d "$SESSIONS_DIR" ]; then
  latest=$(ls -1 "$SESSIONS_DIR"/*.md 2>/dev/null | sort -r | head -1)
  if [ -n "$latest" ]; then
    # Extract the date from filename
    # Strip multi-session suffix (-2, -3) but keep the full YYYY-MM-DD date
    handoff_date=$(basename "$latest" .md | sed 's/-[0-9]\{1,\}$//' | grep -oE '^[0-9]{4}-[0-9]{2}-[0-9]{2}' || basename "$latest" .md)

    # Parse sections from the markdown
    local_section=""
    while IFS= read -r line; do
      case "$line" in
        "## What was done")   local_section="done" ;;
        "## Key findings")    local_section="findings" ;;
        "## Open questions")  local_section="open" ;;
        "## Next steps")      local_section="next" ;;
        "## "*)               local_section="" ;;
        "- "*)
          item="${line#- }"
          case "$local_section" in
            done)     handoff_items+=("$item") ;;
            findings) handoff_findings+=("$item") ;;
            open)     handoff_open+=("$item") ;;
            next)     handoff_next+=("$item") ;;
          esac
          ;;
      esac
    done < "$latest"
  fi
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

# Last session handoff
if [ -n "$handoff_date" ]; then
  printf "  ${WHITE}${BOLD}Last session${RESET}  ${DIM}%s${RESET}\n" "$handoff_date"

  # What was done (max 2 items)
  local_count=0
  for item in "${handoff_items[@]+"${handoff_items[@]}"}"; do
    [ -z "$item" ] && continue
    printf "  ${DIM}·${RESET} %s\n" "$(trunc "$item" 46)"
    local_count=$((local_count + 1))
    [ "$local_count" -ge 2 ] && break
  done

  # Key findings (max 2 items)
  local_count=0
  for item in "${handoff_findings[@]+"${handoff_findings[@]}"}"; do
    [ -z "$item" ] && continue
    printf "  ${GREEN}▸${RESET} %s\n" "$(trunc "$item" 46)"
    local_count=$((local_count + 1))
    [ "$local_count" -ge 2 ] && break
  done

  # Open questions (max 1 item)
  for item in "${handoff_open[@]+"${handoff_open[@]}"}"; do
    [ -z "$item" ] && continue
    printf "  ${YELLOW}?${RESET} %s\n" "$(trunc "$item" 46)"
    break
  done

  # Next steps (max 2 items)
  if [ "${#handoff_next[@]}" -gt 0 ] 2>/dev/null; then
    printf '\n'
    printf "  ${WHITE}Next up${RESET}\n"
    local_count=0
    for item in "${handoff_next[@]+"${handoff_next[@]}"}"; do
      [ -z "$item" ] && continue
      printf "  ${AMBER}→${RESET} %s\n" "$(trunc "$item" 46)"
      local_count=$((local_count + 1))
      [ "$local_count" -ge 2 ] && break
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

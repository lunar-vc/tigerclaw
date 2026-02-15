#!/usr/bin/env bash
#
# pipeline-pane — live pipeline status dashboard
#
# Reads .pipeline-index.json and renders counts by action,
# theme coverage, and last update time.
#
# Watches the file for changes and auto-refreshes.
#

set -uo pipefail

TC_HOME="${TC_HOME:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
PIPELINE_INDEX="$TC_HOME/.pipeline-index.json"

# Colors
ORANGE='\033[38;5;208m'
AMBER='\033[38;5;214m'
GREEN='\033[38;5;112m'
YELLOW='\033[38;5;220m'
RED='\033[38;5;167m'
CYAN='\033[38;5;74m'
DIM='\033[2m'
BOLD='\033[1m'
WHITE='\033[1;37m'
GREY='\033[38;5;240m'
RESET='\033[0m'

# Bar character
BAR='█'
BAR_HALF='▌'

render() {
  clear

  # Header
  printf '\n'
  printf "  ${ORANGE}${BOLD}Pipeline${RESET}  "

  if [ ! -f "$PIPELINE_INDEX" ] || [ ! -s "$PIPELINE_INDEX" ]; then
    printf "${DIM}no data${RESET}\n"
    printf "  ${GREY}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
    printf '\n'
    printf "  ${DIM}No pipeline index found.${RESET}\n"
    printf "  ${DIM}Run a founder scan to populate.${RESET}\n"
    return
  fi

  # Parse with jq
  local people_json companies_json
  people_json=$(jq -r '.people // {}' "$PIPELINE_INDEX" 2>/dev/null)
  companies_json=$(jq -r '.companies // {}' "$PIPELINE_INDEX" 2>/dev/null)

  if [ -z "$people_json" ] || [ "$people_json" = "null" ]; then
    people_json='{}'
  fi
  if [ -z "$companies_json" ] || [ "$companies_json" = "null" ]; then
    companies_json='{}'
  fi

  # Count people by action
  local reach_out watch in_progress done_count pass_people total_people
  reach_out=$(echo "$people_json" | jq '[.[] | select(.action == "REACH_OUT")] | length' 2>/dev/null || echo 0)
  watch=$(echo "$people_json" | jq '[.[] | select(.action == "WATCH")] | length' 2>/dev/null || echo 0)
  in_progress=$(echo "$people_json" | jq '[.[] | select(.action == "IN_PROGRESS")] | length' 2>/dev/null || echo 0)
  done_count=$(echo "$people_json" | jq '[.[] | select(.action == "DONE")] | length' 2>/dev/null || echo 0)
  pass_people=$(echo "$people_json" | jq '[.[] | select(.action == "PASS")] | length' 2>/dev/null || echo 0)
  total_people=$(echo "$people_json" | jq 'length' 2>/dev/null || echo 0)

  # Count companies by action
  local watch_co pass_co total_co
  watch_co=$(echo "$companies_json" | jq '[.[] | select(.action == "WATCH")] | length' 2>/dev/null || echo 0)
  pass_co=$(echo "$companies_json" | jq '[.[] | select(.action == "PASS")] | length' 2>/dev/null || echo 0)
  total_co=$(echo "$companies_json" | jq 'length' 2>/dev/null || echo 0)

  # Unique themes
  local themes_covered
  themes_covered=$(jq -r '[.people[].theme, .companies[].theme] | map(select(type == "string")) | unique | length' "$PIPELINE_INDEX" 2>/dev/null || echo 0)

  # Last update
  local updated_at
  updated_at=$(jq -r '.updated_at // "?"' "$PIPELINE_INDEX" 2>/dev/null || echo "?")

  printf "${DIM}%s people · %s companies${RESET}\n" "$total_people" "$total_co"
  printf "  ${GREY}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"

  # ── People by action ─────────────────────────────────────────────────
  printf '\n'
  printf "  ${WHITE}${BOLD}People${RESET}\n"

  # Find max for bar scaling
  local max_val=$reach_out
  [ "$watch" -gt "$max_val" ] && max_val=$watch
  [ "$in_progress" -gt "$max_val" ] && max_val=$in_progress
  [ "$done_count" -gt "$max_val" ] && max_val=$done_count
  [ "$pass_people" -gt "$max_val" ] && max_val=$pass_people
  [ "$max_val" -eq 0 ] && max_val=1

  # Max bar width (chars)
  local bar_max=16

  render_bar() {
    local label="$1" count="$2" color="$3" width
    width=$(( count * bar_max / max_val ))
    [ "$count" -gt 0 ] && [ "$width" -eq 0 ] && width=1
    local bar=""
    for ((i=0; i<width; i++)); do bar+="$BAR"; done
    printf "  ${DIM}%-11s${RESET} %2d  ${color}%s${RESET}\n" "$label" "$count" "$bar"
  }

  render_bar "REACH_OUT" "$reach_out" "$GREEN"
  render_bar "WATCH" "$watch" "$AMBER"
  render_bar "IN_PROGRESS" "$in_progress" "$CYAN"
  render_bar "DONE" "$done_count" "$WHITE"
  render_bar "PASS" "$pass_people" "$GREY"

  # ── Companies ────────────────────────────────────────────────────────
  printf '\n'
  printf "  ${WHITE}${BOLD}Companies${RESET}\n"
  printf "  ${DIM}%-11s${RESET} %2d\n" "WATCH" "$watch_co"
  printf "  ${DIM}%-11s${RESET} %2d\n" "PASS" "$pass_co"

  # ── Themes coverage ──────────────────────────────────────────────────
  printf '\n'
  printf "  ${GREY}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
  printf "  ${DIM}Themes covered:${RESET}  %s\n" "$themes_covered"
  printf "  ${DIM}Last updated:${RESET}    %s\n" "$updated_at"

  # ── Recent additions (last 7 days) ───────────────────────────────────
  local recent
  recent=$(jq -r --arg cutoff "$(date -v-7d +%Y-%m-%d 2>/dev/null || date -d '7 days ago' +%Y-%m-%d 2>/dev/null || echo '2026-02-08')" \
    '[.people | to_entries[] | select(.value.last_seen >= $cutoff)] | sort_by(.value.last_seen) | reverse | .[0:3] | .[] | "\(.value.name) (\(.value.action))"' \
    "$PIPELINE_INDEX" 2>/dev/null)

  if [ -n "$recent" ]; then
    printf '\n'
    printf "  ${DIM}Recent (7d):${RESET}\n"
    while IFS= read -r line; do
      [ -z "$line" ] && continue
      printf "  ${DIM}  · %s${RESET}\n" "$line"
    done <<< "$recent"
  fi
}

# ── Main loop with crash recovery ────────────────────────────────────────
run() {
  # Ensure file exists
  if [ ! -f "$PIPELINE_INDEX" ]; then
    touch "$PIPELINE_INDEX"
  fi

  # Initial render
  render

  # Watch for changes
  if command -v fswatch &>/dev/null; then
    fswatch -o "$PIPELINE_INDEX" 2>/dev/null | while read -r _; do
      sleep 0.2
      render
    done
  else
    local last_mtime=""
    while true; do
      sleep 3
      if [ -f "$PIPELINE_INDEX" ]; then
        local current_mtime
        current_mtime=$(stat -f '%m' "$PIPELINE_INDEX" 2>/dev/null || stat -c '%Y' "$PIPELINE_INDEX" 2>/dev/null || echo "0")
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

# Restart loop for resilience
while true; do
  run 2>/dev/null || true
  sleep 2
done

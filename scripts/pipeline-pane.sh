#!/usr/bin/env bash
#
# pipeline-pane — Linear-powered deal dashboard
#
# Reads TWO sources:
#   .pipeline           — deals grouped by status (written by refresh-pipeline.js from Linear)
#   .pipeline-index.json — aging warnings + theme depth
#
# Features:
#   - DEAL-XXXX keys are OSC 8 clickable links
#   - Shows Linear status per deal (Triage, In Progress, etc.)
#   - Excludes completed, canceled, and disqualified deals
#   - Aging warnings for WATCH/REACH_OUT with last_seen > 7 days
#   - Theme depth: signals per theme, sorted by count
#   - Watches both files via fswatch
#

set -uo pipefail

TC_HOME="${TC_HOME:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
PIPELINE_FILE="$TC_HOME/.pipeline"
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

# ── OSC 8 hyperlink helper ────────────────────────────────────────────────
osc8() {
  printf '\033]8;;%s\007%s\033]8;;\007' "$1" "$2"
}

# ── Render deals from .pipeline file ──────────────────────────────────────
render_deals() {
  if [ ! -f "$PIPELINE_FILE" ]; then
    printf '\n'
    printf "  ${DIM}Waiting for Linear sync...${RESET}\n"
    printf "  ${DIM}Ask Claude: \"refresh pipeline\"${RESET}\n"
    return
  fi

  local content
  content=$(cat "$PIPELINE_FILE" 2>/dev/null)

  if [ -z "$content" ]; then
    printf '\n'
    printf "  ${DIM}No deals loaded yet.${RESET}\n"
    printf "  ${DIM}Ask Claude: \"refresh pipeline\"${RESET}\n"
    return
  fi

  # Validate — must contain at least one DEAL- line
  if ! echo "$content" | grep -qE 'DEAL-'; then
    printf '\n'
    printf "  ${DIM}Pipeline file updating, retrying...${RESET}\n"
    return
  fi

  # ── Parse the .pipeline file ──────────────────────────────────────────
  local current_group=""
  local triage_count=0 active_count=0 watchlist_count=0

  # First pass: count deals per group
  while IFS= read -r line; do
    if [[ "$line" =~ ^\s*\[Triage\] ]]; then current_group="Triage"
    elif [[ "$line" =~ ^\s*\[Active\] ]]; then current_group="Active"
    elif [[ "$line" =~ ^\s*\[Watchlist\] ]]; then current_group="Watchlist"
    elif [[ "$line" =~ (DEAL-[0-9]+) ]]; then
      case "$current_group" in
        Triage) ((triage_count++)) ;;
        Active) ((active_count++)) ;;
        Watchlist) ((watchlist_count++)) ;;
      esac
    fi
  done <<< "$content"

  # ── Header ────────────────────────────────────────────────────────────
  printf "  ${ORANGE}${BOLD}Dealflow${RESET}  "
  local parts=()
  [ "$triage_count" -gt 0 ] && parts+=("${triage_count} triage")
  [ "$active_count" -gt 0 ] && parts+=("${active_count} active")
  [ "$watchlist_count" -gt 0 ] && parts+=("${watchlist_count} watching")
  if [ ${#parts[@]} -gt 0 ]; then
    local joined
    joined=$(IFS=' · '; echo "${parts[*]}")
    printf "${DIM}%s${RESET}" "$joined"
  fi
  printf '\n'
  printf "  ${GREY}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"

  # ── Colorize display status ─────────────────────────────────────────
  # Takes a display status string, returns it wrapped in ANSI color
  colorize_status() {
    local s="$1"
    case "$s" in
      scheduled)          printf "${GREEN}● scheduled${RESET}" ;;
      "reached out")      printf "${CYAN}◐ reached out${RESET}" ;;
      "pending outreach") printf "${YELLOW}○ pending outreach${RESET}" ;;
      "draft ready")      printf "${YELLOW}○ draft ready${RESET}" ;;
      "in progress")      printf "${CYAN}◐ in progress${RESET}" ;;
      new)                printf "${GREEN}● new${RESET}" ;;
      queued)             printf "${DIM}○ queued${RESET}" ;;
      watching)           printf "${DIM}◌ watching${RESET}" ;;
      snoozed*)           printf "${DIM}◌ ${s}${RESET}" ;;
      *)                  printf "${DIM}${s}${RESET}" ;;
    esac
  }

  # Colorize age tag
  colorize_age_tag() {
    local s="$1"
    case "$s" in
      stale)  printf "${RED}stale${RESET}" ;;
      aging)  printf "${AMBER}aging${RESET}" ;;
      *)      printf "${DIM}${s}${RESET}" ;;
    esac
  }

  # ── Second pass: render deals ─────────────────────────────────────────
  current_group=""
  local in_deal=0 deal_id="" deal_name="" deal_url="" deal_meta=""

  flush_deal() {
    if [ -n "$deal_id" ]; then
      # Render the deal
      printf "  "
      if [ -n "$deal_url" ]; then
        osc8 "$deal_url" "$(printf "${ORANGE}%s${RESET}" "$deal_id")"
      else
        printf "${ORANGE}%s${RESET}" "$deal_id"
      fi
      printf "  ${WHITE}%s${RESET}\n" "$deal_name"

      # Render meta line with colorized status
      if [ -n "$deal_meta" ]; then
        printf "    "
        # Split meta by ' · ' and colorize first token (display status)
        local IFS_OLD="$IFS"
        local first=1
        local token
        # Use read to split on ' · '
        while [ -n "$deal_meta" ]; do
          # Extract next token before ' · '
          if [[ "$deal_meta" == *" · "* ]]; then
            token="${deal_meta%% · *}"
            deal_meta="${deal_meta#* · }"
          else
            token="$deal_meta"
            deal_meta=""
          fi

          if [ "$first" -eq 1 ]; then
            first=0
            colorize_status "$token"
          else
            # Check if it's an age tag
            case "$token" in
              stale|aging) printf " ${DIM}·${RESET} " ; colorize_age_tag "$token" ;;
              *)           printf " ${DIM}· %s${RESET}" "$token" ;;
            esac
          fi
        done
        IFS="$IFS_OLD"
        printf '\n'
      fi
    fi
    deal_id="" ; deal_name="" ; deal_url="" ; deal_meta=""
  }

  while IFS= read -r line; do
    if [[ "$line" =~ ^\s*\[Triage\] ]]; then
      flush_deal
      current_group="Triage"
      printf '\n'
      printf "  ${WHITE}Triage${RESET} ${DIM}(%s)${RESET}\n" "$triage_count"

    elif [[ "$line" =~ ^\s*\[Active\] ]]; then
      flush_deal
      current_group="Active"
      printf '\n'
      printf "  ${WHITE}Active${RESET} ${DIM}(%s)${RESET}\n" "$active_count"

    elif [[ "$line" =~ ^\s*\[Watchlist\] ]]; then
      flush_deal
      current_group="Watchlist"
      printf '\n'
      printf "  ${WHITE}Watchlist${RESET} ${DIM}(%s)${RESET}\n" "$watchlist_count"

    elif [[ "$line" =~ ^\ \ (DEAL-[0-9]+)\ \ (.+) ]]; then
      flush_deal
      deal_id="${BASH_REMATCH[1]}"
      deal_name="${BASH_REMATCH[2]}"

    elif [[ "$line" =~ ^\ \ \ \ (https?://.+) ]]; then
      deal_url="${BASH_REMATCH[1]}"

    elif [[ "$line" =~ ^\ \ \ \ (.+) ]] && [ -n "$deal_id" ]; then
      local meta="${BASH_REMATCH[1]}"
      # Skip URLs already captured
      [[ "$meta" =~ ^https?:// ]] && continue
      deal_meta="$meta"
    fi
  done <<< "$content"
  flush_deal
}

# ── Render pipeline index stats (aging + theme depth) ─────────────────────
render_index_stats() {
  if [ ! -f "$PIPELINE_INDEX" ] || [ ! -s "$PIPELINE_INDEX" ]; then
    return
  fi

  local people_json
  people_json=$(jq -r '.people // {}' "$PIPELINE_INDEX" 2>/dev/null)
  if [ -z "$people_json" ] || [ "$people_json" = "null" ]; then
    return
  fi

  # Total tracked + unique themes
  local total_tracked themes_count
  total_tracked=$(echo "$people_json" | jq 'length' 2>/dev/null || echo 0)
  themes_count=$(jq -r '([.people | to_entries[] | .value.theme] + [.companies | to_entries[] | .value.theme]) | map(select(type == "string" and length > 0)) | unique | length' "$PIPELINE_INDEX" 2>/dev/null || echo 0)

  printf '\n'
  printf "  ${GREY}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
  printf "  ${WHITE}Signals${RESET}  ${DIM}%s tracked · %s themes${RESET}\n" "$total_tracked" "$themes_count"

  # ── Aging warnings: WATCH/REACH_OUT with last_seen > 7 days ───────────
  local cutoff_date
  cutoff_date=$(date -v-7d +%Y-%m-%d 2>/dev/null || date -d '7 days ago' +%Y-%m-%d 2>/dev/null || echo '2026-02-09')

  local aging_entries
  aging_entries=$(jq -r --arg cutoff "$cutoff_date" \
    '[.people | to_entries[] | select((.value.action == "WATCH" or .value.action == "REACH_OUT") and .value.last_seen != null and .value.last_seen < $cutoff)] | sort_by(.value.last_seen) | .[] | "\(.value.name)\t\(.value.theme // "—")\t\(.value.last_seen)"' \
    "$PIPELINE_INDEX" 2>/dev/null)

  if [ -n "$aging_entries" ]; then
    printf '\n'
    printf "  ${AMBER}Aging >7d${RESET}\n"
    while IFS=$'\t' read -r name theme last_seen; do
      [ -z "$name" ] && continue
      local age_days
      local now_epoch last_epoch
      now_epoch=$(date +%s)
      last_epoch=$(date -j -f '%Y-%m-%d' "$last_seen" +%s 2>/dev/null || echo 0)
      if [ "$last_epoch" -gt 0 ]; then
        age_days=$(( (now_epoch - last_epoch) / 86400 ))
      else
        age_days="?"
      fi
      # Truncate theme to short form
      local short_theme=""
      if [ "$theme" != "—" ] && [ -n "$theme" ]; then
        short_theme=" — ${theme}"
      fi
      printf "  ${AMBER}⚠${RESET} ${DIM}%s%s${RESET}  ${AMBER}%sd${RESET}\n" "$name" "$short_theme" "$age_days"
    done <<< "$aging_entries"
  fi

  # ── Theme depth: signals per theme, sorted by count ───────────────────
  local theme_depth
  theme_depth=$(jq -r '([.people | to_entries[] | .value.theme] + [.companies | to_entries[] | .value.theme]) | map(select(type == "string" and length > 0)) | group_by(.) | map({theme: .[0], count: length}) | sort_by(-.count) | .[] | "\(.theme) ×\(.count)"' \
    "$PIPELINE_INDEX" 2>/dev/null)

  if [ -n "$theme_depth" ]; then
    printf '\n'
    printf "  ${DIM}Theme depth${RESET}\n"
    printf "  "
    local first=1
    while IFS= read -r entry; do
      [ -z "$entry" ] && continue
      if [ "$first" -eq 1 ]; then
        first=0
      else
        printf "  "
      fi
      printf "${DIM}%s${RESET}" "$entry"
    done <<< "$theme_depth"
    printf '\n'
  fi
}

# ── Main render ──────────────────────────────────────────────────────────
render() {
  clear
  printf '\n'

  render_deals
  render_index_stats

  # ── Footer ────────────────────────────────────────────────────────────
  printf '\n'
  printf "  ${GREY}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"

  # Refreshed time from .pipeline file
  local refreshed="—"
  if [ -f "$PIPELINE_FILE" ]; then
    local rline
    rline=$(grep 'refreshed:' "$PIPELINE_FILE" 2>/dev/null | head -1)
    if [ -n "$rline" ]; then
      refreshed=$(echo "$rline" | sed 's/.*refreshed: *//')
    fi
  fi
  printf "  ${DIM}Refreshed %s${RESET}\n" "$refreshed"
  printf "  ${DIM}Ask Claude: \"refresh pipeline\"${RESET}\n"
}

# ── Main run loop ────────────────────────────────────────────────────────
run() {
  render

  if command -v fswatch &>/dev/null; then
    fswatch -o "$PIPELINE_FILE" "$PIPELINE_INDEX" 2>/dev/null | while read -r _; do
      sleep 0.2
      render
    done
  else
    local last_mtime_p="" last_mtime_i=""
    while true; do
      sleep 3
      local current_mtime_p="0" current_mtime_i="0"
      if [ -f "$PIPELINE_FILE" ]; then
        current_mtime_p=$(stat -f '%m' "$PIPELINE_FILE" 2>/dev/null || stat -c '%Y' "$PIPELINE_FILE" 2>/dev/null || echo "0")
      fi
      if [ -f "$PIPELINE_INDEX" ]; then
        current_mtime_i=$(stat -f '%m' "$PIPELINE_INDEX" 2>/dev/null || stat -c '%Y' "$PIPELINE_INDEX" 2>/dev/null || echo "0")
      fi
      if [ "$current_mtime_p" != "$last_mtime_p" ] || [ "$current_mtime_i" != "$last_mtime_i" ]; then
        last_mtime_p="$current_mtime_p"
        last_mtime_i="$current_mtime_i"
        render
      fi
    done
  fi
}

# Restart loop for crash recovery
while true; do
  run 2>/dev/null || true
  sleep 2
done

#!/usr/bin/env bash
# Welcome popup — dynamic session context for Tigerclaw.
# Reads pipeline index, themes, and last session handoff to show
# actionable context on launch. Scrollable, exits only on ESC or Enter.

set -uo pipefail

TC_HOME="${TC_HOME:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
PIPELINE_INDEX="$TC_HOME/.pipeline-index.json"
THEMES_FILE="$TC_HOME/.themes"
PROJECT_SLUG=$(echo "$TC_HOME" | tr '/' '-')
MEMORY_DIR="${HOME}/.claude/projects/${PROJECT_SLUG}/memory"
SESSIONS_DIR="$MEMORY_DIR/sessions"

# ── Colors ────────────────────────────────────────────────────────────────
ORANGE='\033[38;5;208m'
AMBER='\033[38;5;214m'
YELLOW='\033[38;5;220m'
GREEN='\033[38;5;112m'
CYAN='\033[38;5;74m'
BOLD='\033[1m'
DIM='\033[90m'
WHITE='\033[1;37m'
GREY='\033[38;5;240m'
RESET='\033[0m'

# ── Collect content into array ────────────────────────────────────────────
lines=()
L() { lines+=("$1"); }

# Logo
L ""
L "  ${ORANGE}╱${AMBER}╱${YELLOW}╱${RESET}        ${WHITE}Tiger Claw${RESET}"
L "   ${ORANGE}╱${AMBER}╱${YELLOW}╱${RESET}       ${DIM}Agentic VC Research${RESET}"
L "    ${ORANGE}╱${AMBER}╱${YELLOW}╱${RESET}"
L ""

# ── Pipeline summary ─────────────────────────────────────────────────────
if [ -f "$PIPELINE_INDEX" ] && [ -s "$PIPELINE_INDEX" ]; then
  people_json=$(jq -r '.people // {}' "$PIPELINE_INDEX" 2>/dev/null || echo '{}')
  co_json=$(jq -r '.companies // {}' "$PIPELINE_INDEX" 2>/dev/null || echo '{}')

  reach_out=$(echo "$people_json" | jq '[.[] | select(.action == "REACH_OUT")] | length' 2>/dev/null || echo 0)
  watch=$(echo "$people_json" | jq '[.[] | select(.action == "WATCH")] | length' 2>/dev/null || echo 0)
  in_progress=$(echo "$people_json" | jq '[.[] | select(.action == "IN_PROGRESS")] | length' 2>/dev/null || echo 0)
  done_count=$(echo "$people_json" | jq '[.[] | select(.action == "DONE")] | length' 2>/dev/null || echo 0)
  total_people=$(echo "$people_json" | jq 'length' 2>/dev/null || echo 0)
  total_co=$(echo "$co_json" | jq 'length' 2>/dev/null || echo 0)

  L "  ${BOLD}Pipeline${RESET}  ${DIM}${total_people} people · ${total_co} companies${RESET}"

  parts=()
  [ "$reach_out" -gt 0 ] && parts+=("${GREEN}${reach_out} reach-out${RESET}")
  [ "$in_progress" -gt 0 ] && parts+=("${CYAN}${in_progress} in-progress${RESET}")
  [ "$watch" -gt 0 ] && parts+=("${AMBER}${watch} watching${RESET}")
  [ "$done_count" -gt 0 ] && parts+=("${DIM}${done_count} done${RESET}")

  if [ ${#parts[@]} -gt 0 ]; then
    pline="  "
    for ((i=0; i<${#parts[@]}; i++)); do
      [ $i -gt 0 ] && pline+=" ${DIM}·${RESET} "
      pline+="${parts[$i]}"
    done
    L "$pline"
  fi
  L ""
else
  L "  ${BOLD}Pipeline${RESET}  ${DIM}no data yet${RESET}"
  L ""
fi

# ── Active themes ────────────────────────────────────────────────────────
if [ -f "$THEMES_FILE" ] && [ -s "$THEMES_FILE" ]; then
  theme_count=$(grep -c 'THE-' "$THEMES_FILE" 2>/dev/null || echo 0)
  L "  ${BOLD}Themes${RESET}  ${DIM}${theme_count} live${RESET}"

  shown=0
  while IFS= read -r tline; do
    if [[ "$tline" =~ (THE-[0-9]+) ]]; then
      key="${BASH_REMATCH[1]}"
      title=$(echo "$tline" | sed "s/.*${key}//" | sed 's/^[[:space:]]*//')
      [ -n "$title" ] && L "    ${GREY}${key}${RESET} ${DIM}${title}${RESET}"
      shown=$((shown + 1))
    fi
  done < "$THEMES_FILE"
  L ""
else
  L "  ${BOLD}Themes${RESET}  ${DIM}none loaded yet${RESET}"
  L ""
fi

# ── Last session handoff ─────────────────────────────────────────────────
if [ -d "$SESSIONS_DIR" ]; then
  last_session=$(ls -t "$SESSIONS_DIR"/*.md 2>/dev/null | head -1)

  if [ -n "${last_session:-}" ] && [ -f "$last_session" ]; then
    session_date=$(basename "$last_session" .md)
    L "  ${BOLD}Last session${RESET}  ${DIM}${session_date}${RESET}"

    shown=0
    in_section=false
    while IFS= read -r fline; do
      if [[ "$fline" =~ ^##.*[Dd]one|^##.*[Rr]esearched|^##.*[Ss]ummary ]]; then
        in_section=true
        continue
      fi
      if [[ "$fline" =~ ^## ]] && $in_section; then
        break
      fi
      if $in_section && [[ "$fline" =~ ^[[:space:]]*[-*] ]]; then
        item=$(echo "$fline" | sed 's/^[[:space:]]*[-*][[:space:]]*//')
        [ ${#item} -gt 50 ] && item="${item:0:47}..."
        L "    ${DIM}· ${item}${RESET}"
        shown=$((shown + 1))
        [ $shown -ge 4 ] && break
      fi
    done < "$last_session"

    shown=0
    in_section=false
    while IFS= read -r fline; do
      if [[ "$fline" =~ ^##.*[Oo]pen|^##.*[Qq]uestion|^##.*[Nn]ext ]]; then
        in_section=true
        continue
      fi
      if [[ "$fline" =~ ^## ]] && $in_section; then
        break
      fi
      if $in_section && [[ "$fline" =~ ^[[:space:]]*[-*] ]]; then
        item=$(echo "$fline" | sed 's/^[[:space:]]*[-*][[:space:]]*//')
        [ ${#item} -gt 50 ] && item="${item:0:47}..."
        L "    ${AMBER}→ ${item}${RESET}"
        shown=$((shown + 1))
        [ $shown -ge 4 ] && break
      fi
    done < "$last_session"

    L ""
  fi
fi

# ── Footer ────────────────────────────────────────────────────────────────
L "  ${GREY}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
L "  ${DIM}LEADS + PIPELINE (left) · THEMES + SOURCE (right)${RESET}"
L "  ${DIM}Alt+arrows to switch · C-a ? for shortcuts${RESET}"

# ── Scrollable viewer ────────────────────────────────────────────────────
total=${#lines[@]}
offset=0

rows=$(tput lines 2>/dev/null || echo 24)
visible=$((rows - 1))  # reserve last row for nav hint

# Hide cursor, restore on exit
printf '\033[?25l'
trap 'printf "\033[?25h\033[0m"' EXIT

draw() {
  printf '\033[H'  # cursor home

  local max_off=$((total - visible))
  [ $max_off -lt 0 ] && max_off=0
  [ $offset -gt $max_off ] && offset=$max_off
  [ $offset -lt 0 ] && offset=0

  local i
  for ((i=0; i<visible; i++)); do
    local idx=$((offset + i))
    if [ $idx -lt $total ]; then
      printf '\033[2K'  # clear line
      echo -e "${lines[$idx]}"
    else
      printf '\033[2K\n'
    fi
  done

  # Nav hint on last row
  printf '\033[2K'
  if [ $total -gt $visible ]; then
    local pct=0
    [ $max_off -gt 0 ] && pct=$(( (offset * 100) / max_off ))
    printf "  \033[38;5;240m↑↓ scroll · ESC or Enter to start  %d%%\033[0m" "$pct"
  else
    printf "  \033[38;5;240mESC or Enter to start\033[0m"
  fi
}

clear
while true; do
  draw

  IFS= read -rsn1 key

  case "$key" in
    $'\x1b')
      # Read possible escape sequence
      read -rsn1 -t 0.05 seq1 || true
      if [ -z "$seq1" ]; then
        break  # bare ESC — exit
      fi
      read -rsn1 -t 0.05 seq2 || true
      case "${seq1}${seq2}" in
        '[A')  # Up
          [ $offset -gt 0 ] && offset=$((offset - 1))
          ;;
        '[B')  # Down
          _max=$((total - visible))
          [ $_max -lt 0 ] && _max=0
          [ $offset -lt $_max ] && offset=$((offset + 1))
          ;;
        '[5')  # PgUp (ESC [ 5 ~)
          read -rsn1 -t 0.05 _ || true
          offset=$((offset - visible))
          [ $offset -lt 0 ] && offset=0
          ;;
        '[6')  # PgDn (ESC [ 6 ~)
          read -rsn1 -t 0.05 _ || true
          _max=$((total - visible))
          [ $_max -lt 0 ] && _max=0
          offset=$((offset + visible))
          [ $offset -gt $_max ] && offset=$_max
          ;;
      esac
      ;;
    '')  # Enter
      break
      ;;
    'k')
      [ $offset -gt 0 ] && offset=$((offset - 1))
      ;;
    'j')
      _max=$((total - visible))
      [ $_max -lt 0 ] && _max=0
      [ $offset -lt $_max ] && offset=$((offset + 1))
      ;;
  esac
done

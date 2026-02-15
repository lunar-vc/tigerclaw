#!/usr/bin/env bash
# Welcome popup — dynamic session context for Tigerclaw.
# Reads pipeline index, themes, and last session handoff to show
# actionable context on launch instead of static orientation text.

set -uo pipefail

TC_HOME="${TC_HOME:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
PIPELINE_INDEX="$TC_HOME/.pipeline-index.json"
THEMES_FILE="$TC_HOME/.themes"
# Derive Claude Code memory path from project root (matches Claude's slug convention)
PROJECT_SLUG=$(echo "$TC_HOME" | tr '/' '-')
MEMORY_DIR="${HOME}/.claude/projects/${PROJECT_SLUG}/memory"
SESSIONS_DIR="$MEMORY_DIR/sessions"

ORANGE='\033[38;5;208m'
AMBER='\033[38;5;214m'
GREEN='\033[38;5;112m'
CYAN='\033[38;5;74m'
BOLD='\033[1m'
DIM='\033[90m'
WHITE='\033[1;37m'
GREY='\033[38;5;240m'
RESET='\033[0m'

echo ""
echo -e "  ${ORANGE}╱${AMBER}╱${ORANGE}╱${RESET}  ${WHITE}Welcome to Tigerclaw${RESET}"
echo ""

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

  echo -e "  ${BOLD}Pipeline${RESET}  ${DIM}${total_people} people · ${total_co} companies${RESET}"

  # Compact status line
  parts=()
  [ "$reach_out" -gt 0 ] && parts+=("${GREEN}${reach_out} reach-out${RESET}")
  [ "$in_progress" -gt 0 ] && parts+=("${CYAN}${in_progress} in-progress${RESET}")
  [ "$watch" -gt 0 ] && parts+=("${AMBER}${watch} watching${RESET}")
  [ "$done_count" -gt 0 ] && parts+=("${DIM}${done_count} done${RESET}")

  if [ ${#parts[@]} -gt 0 ]; then
    line="  "
    for ((i=0; i<${#parts[@]}; i++)); do
      [ $i -gt 0 ] && line+=" ${DIM}·${RESET} "
      line+="${parts[$i]}"
    done
    echo -e "$line"
  fi
  echo ""
else
  echo -e "  ${BOLD}Pipeline${RESET}  ${DIM}no data yet${RESET}"
  echo ""
fi

# ── Active themes ────────────────────────────────────────────────────────
if [ -f "$THEMES_FILE" ] && [ -s "$THEMES_FILE" ]; then
  theme_count=$(grep -c 'THE-' "$THEMES_FILE" 2>/dev/null || echo 0)
  echo -e "  ${BOLD}Themes${RESET}  ${DIM}${theme_count} live${RESET}"

  # Show first 3 theme titles (extract THE-XXXX + title from each line)
  shown=0
  while IFS= read -r line; do
    # Theme lines look like: "  THE-1810  Title here"
    if [[ "$line" =~ (THE-[0-9]+) ]]; then
      key="${BASH_REMATCH[1]}"
      # Extract title (everything after the key)
      title=$(echo "$line" | sed "s/.*${key}//" | sed 's/^[[:space:]]*//')
      [ -n "$title" ] && echo -e "    ${GREY}${key}${RESET} ${DIM}${title}${RESET}"
      shown=$((shown + 1))
      [ $shown -ge 3 ] && break
    fi
  done < "$THEMES_FILE"

  [ "$theme_count" -gt 3 ] && echo -e "    ${DIM}+$((theme_count - 3)) more${RESET}"
  echo ""
else
  echo -e "  ${BOLD}Themes${RESET}  ${DIM}none loaded yet${RESET}"
  echo ""
fi

# ── Last session handoff ─────────────────────────────────────────────────
if [ -d "$SESSIONS_DIR" ]; then
  # Find most recent session file
  last_session=$(ls -t "$SESSIONS_DIR"/*.md 2>/dev/null | head -1)

  if [ -n "$last_session" ] && [ -f "$last_session" ]; then
    session_date=$(basename "$last_session" .md)
    echo -e "  ${BOLD}Last session${RESET}  ${DIM}${session_date}${RESET}"

    # Extract key sections from the handoff file
    # Show "What was done" (first 2 bullet points)
    shown=0
    in_section=false
    while IFS= read -r line; do
      if [[ "$line" =~ ^##.*[Dd]one|^##.*[Rr]esearched|^##.*[Ss]ummary ]]; then
        in_section=true
        continue
      fi
      if [[ "$line" =~ ^## ]] && $in_section; then
        break
      fi
      if $in_section && [[ "$line" =~ ^[[:space:]]*[-*] ]]; then
        # Strip leading whitespace and bullet
        item=$(echo "$line" | sed 's/^[[:space:]]*[-*][[:space:]]*//')
        # Truncate long lines
        [ ${#item} -gt 45 ] && item="${item:0:42}..."
        echo -e "    ${DIM}· ${item}${RESET}"
        shown=$((shown + 1))
        [ $shown -ge 2 ] && break
      fi
    done < "$last_session"

    # Show "Open questions" (first 2)
    shown=0
    in_section=false
    while IFS= read -r line; do
      if [[ "$line" =~ ^##.*[Oo]pen|^##.*[Qq]uestion|^##.*[Nn]ext ]]; then
        in_section=true
        continue
      fi
      if [[ "$line" =~ ^## ]] && $in_section; then
        break
      fi
      if $in_section && [[ "$line" =~ ^[[:space:]]*[-*] ]]; then
        item=$(echo "$line" | sed 's/^[[:space:]]*[-*][[:space:]]*//')
        [ ${#item} -gt 45 ] && item="${item:0:42}..."
        echo -e "    ${AMBER}→ ${item}${RESET}"
        shown=$((shown + 1))
        [ $shown -ge 2 ] && break
      fi
    done < "$last_session"

    echo ""
  fi
fi

# ── Pane layout ──────────────────────────────────────────────────────────
echo -e "  ${GREY}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "  ${DIM}LEADS + PIPELINE (left) · THEMES + SOURCE (right)${RESET}"
echo -e "  ${DIM}Alt+arrows to switch · C-a ? for shortcuts${RESET}"
echo ""
echo -e "  ${DIM}press any key to start${RESET}"

IFS= read -rsn1

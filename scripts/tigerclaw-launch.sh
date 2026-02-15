#!/usr/bin/env bash
#
# tigerclaw-launch — launch tmux session with Claude Code windows
#
# Usage:
#   tigerclaw              Launch tmux with all panes on one screen
#   tigerclaw <args>       Pass through to claude directly
#
# Layout (single window, three panes):
#   top-left   — discovered: Live founder feed
#   top-right  — themes: Live themes from Linear (auto-refresh)
#   bottom     — source: Claude Code (agentic sourcing)
#
# Isolation:
#   Runs on its own tmux socket (-L tigerclaw) so it never conflicts
#   with your personal tmux sessions or keybindings.
#
# Discovery log:
#   Founders found during this session appear in the top-left pane.
#   To log a discovery from any process:
#     echo '{"status":"found","name":"Dr. Sarah Chen","detail":"MIT — PhD defense","strength":"STRONG"}' >> .discoveries.jsonl
#

set -euo pipefail

TC_SESSION="tigerclaw"
TC_SOCKET="tigerclaw"
TC_TMUX=(tmux -L "$TC_SOCKET")

# ── Pass-through mode: any args go straight to claude ──────────────────────
if [ $# -gt 0 ]; then
  printf '\n'
  printf '  \033[38;5;208m╱\033[38;5;214m╱\033[38;5;220m╱\033[0m        \033[1;37mTiger Claw\033[0m\n'
  printf '   \033[38;5;208m╱\033[38;5;214m╱\033[38;5;220m╱\033[0m       \033[2mAgentic VC Research\033[0m\n'
  printf '    \033[38;5;208m╱\033[38;5;214m╱\033[38;5;220m╱\033[0m      \033[2m%s\033[0m\n' "$(pwd)"
  printf '\n'
  exec claude --dangerously-skip-permissions "$@"
fi

# ── Guard: don't nest inside existing tigerclaw session ──────────────────
if [ -n "${TMUX:-}" ]; then
  CURRENT_SESSION=$(tmux display-message -p '#S' 2>/dev/null || true)
  if [[ "$CURRENT_SESSION" == tigerclaw* ]]; then
    printf '  Already in tigerclaw session.\n'
    printf '  \033[2mAlt+arrows to switch panes · C-a ? for help\033[0m\n'
    exit 0
  fi
fi

# ── Reattach if session already exists ─────────────────────────────────────
if "${TC_TMUX[@]}" has-session -t "$TC_SESSION" 2>/dev/null; then
  printf '  Reattaching to existing tigerclaw session...\n'
  exec "${TC_TMUX[@]}" attach -t "$TC_SESSION"
fi

# ── Resolve project root ──────────────────────────────────────────────────
TC_HOME="${TIGERCLAW_HOME:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

# ── Discovery log — fresh per session ─────────────────────────────────────
TC_DISCOVERIES="$TC_HOME/.discoveries.jsonl"
: > "$TC_DISCOVERIES"

# ── Banner ─────────────────────────────────────────────────────────────────
printf '\n'
printf '  \033[38;5;208m╱\033[38;5;214m╱\033[38;5;220m╱\033[0m        \033[1;37mTiger Claw\033[0m\n'
printf '   \033[38;5;208m╱\033[38;5;214m╱\033[38;5;220m╱\033[0m       \033[2mAgentic VC Research\033[0m\n'
printf '    \033[38;5;208m╱\033[38;5;214m╱\033[38;5;220m╱\033[0m      \033[2mLaunching tmux session...\033[0m\n'
printf '\n'
printf '  \033[38;5;214mdiscovered\033[0m — Live founder feed (top-left)\n'
printf '  \033[38;5;214mthemes\033[0m     — Live themes from Linear (top-right)\n'
printf '  \033[38;5;214msource\033[0m     — Claude Code (bottom)\n'
printf '\n'

# ── Create tmux session — single window, three panes ─────────────────────
#
#   ┌──────────────┬──────────────┐
#   │  discovered   │   themes     │
#   │  (live feed)  │  (Linear)    │
#   ├──────────────┴──────────────┤
#   │   source — Claude Code      │
#   └─────────────────────────────┘

"${TC_TMUX[@]}" -f "$TC_HOME/scripts/tmux.conf" \
  new-session -d -s "$TC_SESSION" -n tigerclaw -c "$TC_HOME"

TC_WIN="${TC_SESSION}:tigerclaw"

# Store TC_HOME and socket name in the tmux environment so bindings can reference them
"${TC_TMUX[@]}" set-environment -t "$TC_SESSION" TC_HOME "$TC_HOME"
"${TC_TMUX[@]}" set-environment -t "$TC_SESSION" TC_SOCKET "$TC_SOCKET"

# Capture the initial pane ID (will become top-left: discovered feed)
PANE_DISCOVERED=$("${TC_TMUX[@]}" list-panes -t "${TC_WIN}" -F '#{pane_id}')

# Split vertically: top (discovered) + bottom (source: Claude Code, gets 65%)
PANE_SOURCE=$("${TC_TMUX[@]}" split-window -t "$PANE_DISCOVERED" -v -l '65%' -c "$TC_HOME" -P -F '#{pane_id}')

# Split the top pane horizontally: left (discovered) | right (themes)
PANE_THEMES=$("${TC_TMUX[@]}" split-window -t "$PANE_DISCOVERED" -h -c "$TC_HOME" -P -F '#{pane_id}' \
  "'${TC_HOME}/scripts/themes-pane.sh'")

# ── Set pane titles ────────────────────────────────────────────────────────
"${TC_TMUX[@]}" select-pane -t "$PANE_DISCOVERED" -T "DISCOVERED"
"${TC_TMUX[@]}" select-pane -t "$PANE_SOURCE" -T "SOURCE"
"${TC_TMUX[@]}" select-pane -t "$PANE_THEMES" -T "THEMES"

# Store pane IDs in tmux environment for external scripts
"${TC_TMUX[@]}" set-environment -t "$TC_SESSION" PANE_DISCOVERED "$PANE_DISCOVERED"
"${TC_TMUX[@]}" set-environment -t "$TC_SESSION" PANE_SOURCE "$PANE_SOURCE"
"${TC_TMUX[@]}" set-environment -t "$TC_SESSION" PANE_THEMES "$PANE_THEMES"

# ── Launch processes in panes ──────────────────────────────────────────────
# Give shells time to initialize before sending keystrokes
sleep 1

# Top-left: discovery feed renderer
"${TC_TMUX[@]}" send-keys -t "$PANE_DISCOVERED" "'${TC_HOME}/scripts/discoveries-pane.sh'" Enter

# Bottom: Claude Code
"${TC_TMUX[@]}" send-keys -t "$PANE_SOURCE" 'claude --dangerously-skip-permissions' Enter

# Top-right: already launched via split-window command

# Select the source pane (bottom) as active
"${TC_TMUX[@]}" select-pane -t "$PANE_SOURCE"

# ── Path-dependent keybindings ─────────────────────────────────────────────
# Help popup (C-a ?)
"${TC_TMUX[@]}" bind-key -T prefix ? display-popup -w 55 -h 24 -E \
  "bash '${TC_HOME}/scripts/help-popup.sh'"

# Scratch shell (C-a /)
"${TC_TMUX[@]}" bind-key -T prefix / display-popup -w '70%' -h '60%' -E "bash"

# Reload config (C-a r)
"${TC_TMUX[@]}" bind-key -T prefix r \
  source-file "$TC_HOME/scripts/tmux.conf" \; display "Config reloaded"

# ── Right-click context menu ───────────────────────────────────────────────
"${TC_TMUX[@]}" bind-key -n MouseDown3Pane display-menu -T "#[fg=colour214,bold] tigerclaw " -x M -y M \
  "Refresh Themes"     t "send-keys -t ${PANE_SOURCE} 'refresh themes' Enter" \
  "" \
  "Focus Source"       s "select-pane -t ${PANE_SOURCE}" \
  "Focus Discovered"   d "select-pane -t ${PANE_DISCOVERED}" \
  "Focus Themes"       h "select-pane -t ${PANE_THEMES}" \
  "" \
  "Scratch Shell"      / "display-popup -w 70% -h 60% -E 'bash'" \
  "Help"               ? "display-popup -w 55 -h 24 -E 'bash ${TC_HOME}/scripts/help-popup.sh'" \
  "" \
  "New Session"        n "run-shell '${TC_HOME}/scripts/tigerclaw-spawn.sh'" \
  "End Session"        q "confirm-before -p 'Kill tigerclaw session? (y/n)' kill-session" \
  "" \
  "Detach"             D "detach-client"

# ── Welcome popup on first attach ──────────────────────────────────────────
"${TC_TMUX[@]}" set-hook -t "$TC_SESSION" client-attached \
  "run-shell 'tmux -L ${TC_SOCKET} display-popup -w 55 -h 20 -E \"bash ${TC_HOME}/scripts/welcome-popup.sh\" ; tmux -L ${TC_SOCKET} set-hook -u -t ${TC_SESSION} client-attached'"

# ── Attach ───────────────────────────────────────────────────────────────
exec "${TC_TMUX[@]}" attach -t "$TC_SESSION"

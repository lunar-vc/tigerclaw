#!/usr/bin/env bash
#
# tigerclaw-launch — launch tmux session with Claude Code windows
#
# Usage:
#   tigerclaw              Launch tmux with all panes on one screen
#   tigerclaw --new        Spawn an additional tigerclaw session
#   tigerclaw <args>       Pass through to claude directly
#
# Layout (single window, 2×2 grid):
#   top-left     — founder leads: Live founder feed
#   top-right    — themes: Active investment themes from Linear
#   bottom-left  — pipeline: Pipeline status dashboard
#   bottom-right — source: Claude Code (agentic sourcing)
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

# ── Spawn mode: create additional session ────────────────────────────────
if [[ "${1:-}" == "--new" || "${1:-}" == "-n" ]]; then
  if ! "${TC_TMUX[@]}" has-session -t "$TC_SESSION" 2>/dev/null; then
    printf '  No existing tigerclaw session. Run \033[1mtigerclaw\033[0m first.\n'
    exit 1
  fi
  exec bash "$(dirname "${BASH_SOURCE[0]}")/tigerclaw-spawn.sh"
fi

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
    printf '  \033[2mtigerclaw --new to spawn another · Alt+arrows to switch panes\033[0m\n'
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
printf '  \033[38;5;214mfounder leads\033[0m — Live founder feed (top-left)\n'
printf '  \033[38;5;214mthemes\033[0m        — Active investment themes (top-right)\n'
printf '  \033[38;5;214mpipeline\033[0m      — Pipeline status dashboard (bottom-left)\n'
printf '  \033[38;5;214msource\033[0m        — Claude Code (bottom-right)\n'
printf '\n'

# ── Create tmux session — single window, four panes (2×2 grid) ───────────
#
#   ┌──────────────────────┬────────────────────────┐
#   │ FOUNDER LEADS        │ THEMES                 │
#   │  (discoveries feed)  │  (Linear themes)       │
#   ├──────────────────────┼────────────────────────┤
#   │ PIPELINE             │ SOURCE                 │
#   │  (status dashboard)  │  (Claude Code)         │
#   └──────────────────────┴────────────────────────┘
#
#   Left column  = Leads + Pipeline  (deal tracking)
#   Right column = Themes + Source   (research/thesis)

"${TC_TMUX[@]}" -f "$TC_HOME/scripts/tmux.conf" \
  new-session -d -s "$TC_SESSION" -n tigerclaw -c "$TC_HOME"

TC_WIN="${TC_SESSION}:tigerclaw"

# Store TC_HOME and socket name in the tmux environment so bindings can reference them
"${TC_TMUX[@]}" set-environment -t "$TC_SESSION" TC_HOME "$TC_HOME"
"${TC_TMUX[@]}" set-environment -t "$TC_SESSION" TC_SOCKET "$TC_SOCKET"

# Capture the initial pane ID (will become top-left: founder leads)
PANE_DISCOVERED=$("${TC_TMUX[@]}" list-panes -t "${TC_WIN}" -F '#{pane_id}')

# Split right: top-left (leads) | top-right (themes, gets 55% for source width)
PANE_THEMES=$("${TC_TMUX[@]}" split-window -t "$PANE_DISCOVERED" -h -l '55%' -c "$TC_HOME" -P -F '#{pane_id}' \
  "'${TC_HOME}/scripts/themes-pane.sh'")

# Split top-left down: leads (top) | pipeline (bottom, 50%)
PANE_PIPELINE=$("${TC_TMUX[@]}" split-window -t "$PANE_DISCOVERED" -v -l '50%' -c "$TC_HOME" -P -F '#{pane_id}' \
  "TC_HOME='${TC_HOME}' '${TC_HOME}/scripts/pipeline-pane.sh'")

# Split top-right down: themes (top) | source (bottom, 60% for Claude Code)
PANE_SOURCE=$("${TC_TMUX[@]}" split-window -t "$PANE_THEMES" -v -l '60%' -c "$TC_HOME" -P -F '#{pane_id}')

# ── Set pane titles ────────────────────────────────────────────────────────
"${TC_TMUX[@]}" select-pane -t "$PANE_DISCOVERED" -T "FOUNDER LEADS"
"${TC_TMUX[@]}" select-pane -t "$PANE_PIPELINE" -T "PIPELINE"
"${TC_TMUX[@]}" select-pane -t "$PANE_THEMES" -T "THEMES"
"${TC_TMUX[@]}" select-pane -t "$PANE_SOURCE" -T "SOURCE"

# Store pane IDs in tmux environment for external scripts
"${TC_TMUX[@]}" set-environment -t "$TC_SESSION" PANE_DISCOVERED "$PANE_DISCOVERED"
"${TC_TMUX[@]}" set-environment -t "$TC_SESSION" PANE_SOURCE "$PANE_SOURCE"
"${TC_TMUX[@]}" set-environment -t "$TC_SESSION" PANE_THEMES "$PANE_THEMES"
"${TC_TMUX[@]}" set-environment -t "$TC_SESSION" PANE_PIPELINE "$PANE_PIPELINE"

# ── Launch processes in panes ──────────────────────────────────────────────
# Give shells time to initialize before sending keystrokes
sleep 1

# Top-left: discovery feed renderer
"${TC_TMUX[@]}" send-keys -t "$PANE_DISCOVERED" "'${TC_HOME}/scripts/discoveries-pane.sh'" Enter

# Bottom-right: Claude Code
"${TC_TMUX[@]}" send-keys -t "$PANE_SOURCE" 'claude --dangerously-skip-permissions' Enter

# Themes + Pipeline: already launched via split-window commands

# Select the source pane (bottom-right) as active
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
# Pane indices (creation order): .1=leads, .2=themes, .3=pipeline, .4=source
"${TC_TMUX[@]}" bind-key -n MouseDown3Pane display-menu -T "#[fg=colour214,bold] tigerclaw " -x M -y M \
  "Refresh Themes"     t "send-keys -t .4 'refresh themes' Enter" \
  "" \
  "Focus Source"       s "select-pane -t .4" \
  "Focus Founder Leads" d "select-pane -t .1" \
  "Focus Themes"       h "select-pane -t .2" \
  "Focus Pipeline"     p "select-pane -t .3" \
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
  "run-shell 'tmux -L ${TC_SOCKET} display-popup -w 60 -h 32 -E \"TC_HOME=${TC_HOME} bash ${TC_HOME}/scripts/welcome-popup.sh\" ; tmux -L ${TC_SOCKET} set-hook -u -t ${TC_SESSION} client-attached'"

# ── Attach ───────────────────────────────────────────────────────────────
exec "${TC_TMUX[@]}" attach -t "$TC_SESSION"

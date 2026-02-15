#!/usr/bin/env bash
#
# tigerclaw-spawn — create an additional tigerclaw tmux session
#
# Can be called from:
#   - Right-click context menu "New Session" (inside tmux → switch-client)
#   - CLI: tigerclaw --new / tigerclaw-new (outside tmux → attach)
#
# Uses the same isolated socket (-L tigerclaw) as the main session.
#

set -euo pipefail

TC_HOME="${TC_HOME:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
TC_SOCKET="${TC_SOCKET:-tigerclaw}"
TC_TMUX=(tmux -L "$TC_SOCKET")

# Find next available session number
N=2
while "${TC_TMUX[@]}" has-session -t "tigerclaw-${N}" 2>/dev/null; do
  N=$((N + 1))
done

TC_SESSION="tigerclaw-${N}"
TC_WIN="${TC_SESSION}:tigerclaw"
TC_DISCOVERIES="$TC_HOME/.discoveries-${N}.jsonl"
: > "$TC_DISCOVERIES"

# ── Banner ─────────────────────────────────────────────────────────────────
printf '\n'
printf '  \033[38;5;208m╱\033[38;5;214m╱\033[38;5;220m╱\033[0m        \033[1;37mTiger Claw\033[0m\n'
printf '   \033[38;5;208m╱\033[38;5;214m╱\033[38;5;220m╱\033[0m       \033[2mSpawning session %s...\033[0m\n' "$TC_SESSION"
printf '\n'

# Create session with our config (on the same isolated socket)
"${TC_TMUX[@]}" new-session -d -s "$TC_SESSION" -n tigerclaw -c "$TC_HOME"

"${TC_TMUX[@]}" set-environment -t "$TC_SESSION" TC_HOME "$TC_HOME"
"${TC_TMUX[@]}" set-environment -t "$TC_SESSION" TC_SOCKET "$TC_SOCKET"

# Same 2×2 layout: leads+pipeline (left), themes+source (right)
# .1=leads (top-left), .2=themes (top-right), .3=pipeline (bottom-left), .4=source (bottom-right)
"${TC_TMUX[@]}" split-window -t "${TC_WIN}.1" -h -l '55%' -c "$TC_HOME" \
  "'${TC_HOME}/scripts/themes-pane.sh'"
"${TC_TMUX[@]}" split-window -t "${TC_WIN}.1" -v -l '50%' -c "$TC_HOME" \
  "TC_HOME='${TC_HOME}' '${TC_HOME}/scripts/pipeline-pane.sh'"
"${TC_TMUX[@]}" split-window -t "${TC_WIN}.2" -v -l '60%' -c "$TC_HOME"

"${TC_TMUX[@]}" select-pane -t "${TC_WIN}.1" -T "FOUNDER LEADS"
"${TC_TMUX[@]}" select-pane -t "${TC_WIN}.2" -T "THEMES"
"${TC_TMUX[@]}" select-pane -t "${TC_WIN}.3" -T "PIPELINE"
"${TC_TMUX[@]}" select-pane -t "${TC_WIN}.4" -T "SOURCE"

# Launch founder leads feed (pointing to this session's log)
sleep 1
"${TC_TMUX[@]}" send-keys -t "${TC_WIN}.1" "TC_DISCOVERIES='${TC_DISCOVERIES}' '${TC_HOME}/scripts/discoveries-pane.sh'" Enter

# Launch claude in bottom-right
"${TC_TMUX[@]}" send-keys -t "${TC_WIN}.4" 'claude --dangerously-skip-permissions' Enter

"${TC_TMUX[@]}" select-pane -t "${TC_WIN}.4"

# Bind keys for this session too
"${TC_TMUX[@]}" bind-key -T prefix ? display-popup -w 55 -h 24 -E \
  "bash '${TC_HOME}/scripts/help-popup.sh'"
"${TC_TMUX[@]}" bind-key -T prefix / display-popup -w '70%' -h '60%' -E "bash"
"${TC_TMUX[@]}" bind-key -T prefix r \
  source-file "$TC_HOME/scripts/tmux.conf" \; display "Config reloaded"

# Right-click context menu
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

# Welcome popup on first attach
"${TC_TMUX[@]}" set-hook -t "$TC_SESSION" client-attached \
  "run-shell 'tmux -L ${TC_SOCKET} display-popup -w 60 -h 28 -E \"bash ${TC_HOME}/scripts/welcome-popup.sh\" ; tmux -L ${TC_SOCKET} set-hook -u -t ${TC_SESSION} client-attached'"

# ── Attach or switch ─────────────────────────────────────────────────────
if [ -n "${TMUX:-}" ]; then
  # Inside tmux — switch to the new session
  "${TC_TMUX[@]}" switch-client -t "$TC_SESSION"
  "${TC_TMUX[@]}" display-message "Spawned session: ${TC_SESSION}"
else
  # Outside tmux — attach directly
  exec "${TC_TMUX[@]}" attach -t "$TC_SESSION"
fi

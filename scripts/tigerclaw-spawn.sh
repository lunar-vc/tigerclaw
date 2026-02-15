#!/usr/bin/env bash
#
# tigerclaw-spawn — create an additional tigerclaw tmux session
# Called from the right-click context menu "New Session" action.
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

# Create session with our config (on the same isolated socket)
"${TC_TMUX[@]}" new-session -d -s "$TC_SESSION" -n tigerclaw -c "$TC_HOME"

"${TC_TMUX[@]}" set-environment -t "$TC_SESSION" TC_HOME "$TC_HOME"
"${TC_TMUX[@]}" set-environment -t "$TC_SESSION" TC_SOCKET "$TC_SOCKET"

# Same layout: discovered (top-left), claude (bottom), themes (top-right)
"${TC_TMUX[@]}" split-window -t "${TC_WIN}.1" -v -l '65%' -c "$TC_HOME"
"${TC_TMUX[@]}" split-window -t "${TC_WIN}.1" -h -c "$TC_HOME" \
  "'${TC_HOME}/scripts/themes-pane.sh'"

"${TC_TMUX[@]}" select-pane -t "${TC_WIN}.1" -T "DISCOVERED"
"${TC_TMUX[@]}" select-pane -t "${TC_WIN}.2" -T "SOURCE"
"${TC_TMUX[@]}" select-pane -t "${TC_WIN}.3" -T "THEMES"

# Launch discovery feed (pointing to this session's log)
"${TC_TMUX[@]}" send-keys -t "${TC_WIN}.1" "TC_DISCOVERIES='${TC_DISCOVERIES}' '${TC_HOME}/scripts/discoveries-pane.sh'" Enter

# Launch claude
"${TC_TMUX[@]}" send-keys -t "${TC_WIN}.2" 'claude --dangerously-skip-permissions' Enter

"${TC_TMUX[@]}" select-pane -t "${TC_WIN}.2"

# Bind keys for this session too
"${TC_TMUX[@]}" bind-key -T prefix ? display-popup -w 55 -h 24 -E \
  "bash '${TC_HOME}/scripts/help-popup.sh'"
"${TC_TMUX[@]}" bind-key -T prefix / display-popup -w '70%' -h '60%' -E "bash"
"${TC_TMUX[@]}" bind-key -T prefix r \
  source-file "$TC_HOME/scripts/tmux.conf" \; display "Config reloaded"

# Switch the client to the new session
"${TC_TMUX[@]}" switch-client -t "$TC_SESSION"
"${TC_TMUX[@]}" display-message "Spawned session: ${TC_SESSION}"

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

# Switch the client to the new session
"${TC_TMUX[@]}" switch-client -t "$TC_SESSION"
"${TC_TMUX[@]}" display-message "Spawned session: ${TC_SESSION}"

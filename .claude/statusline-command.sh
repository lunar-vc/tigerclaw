#!/bin/bash

# Read JSON input from stdin
input=$(cat)

# Extract data from JSON
cwd=$(echo "$input" | jq -r '.workspace.current_dir')
model=$(echo "$input" | jq -r '.model.display_name')
percent_used=$(echo "$input" | jq -r '.context_window.used_percentage // 0')

# Get git branch
branch=$(cd "$cwd" 2>/dev/null && git rev-parse --abbrev-ref HEAD 2>/dev/null)

# Check for flox environment
flox_env=""
if [ -n "$FLOX_ENV_PROJECT" ]; then
  flox_env=$(basename "$FLOX_ENV_PROJECT")
elif [ -n "$FLOX_ENV" ]; then
  flox_env=$(basename "$FLOX_ENV")
fi

# ANSI color codes
GRAY='\033[90m'
CYAN='\033[96m'
YELLOW='\033[93m'
MAGENTA='\033[95m'
BLUE='\033[94m'
GREEN='\033[92m'
RED='\033[91m'
RESET='\033[0m'

# Build context bar
bar_width=20
filled=$(printf "%.0f" $(echo "$percent_used * $bar_width / 100" | bc -l 2>/dev/null || echo "0"))
empty=$((bar_width - filled))

# Determine bar color based on usage
if (( $(echo "$percent_used < 50" | bc -l 2>/dev/null || echo "0") )); then
  bar_color="$GREEN"
elif (( $(echo "$percent_used < 80" | bc -l 2>/dev/null || echo "0") )); then
  bar_color="$YELLOW"
else
  bar_color="$RED"
fi

# Build bar string
bar="${bar_color}"
for ((i=0; i<filled; i++)); do bar="${bar}▓"; done
bar="${bar}${GRAY}"
for ((i=0; i<empty; i++)); do bar="${bar}░"; done
bar="${bar}${RESET}"

# Format percentage
percent_display=$(printf "%.0f%%" "$percent_used")

# Build status line
output=""
output="${output}${CYAN}$(basename "$cwd")${RESET}"

if [ -n "$branch" ]; then
  output="${output}  ${YELLOW}${branch}${RESET}"
fi

if [ -n "$flox_env" ]; then
  output="${output}  ${MAGENTA}flox:${flox_env}${RESET}"
fi

output="${output}  ${BLUE}${model}${RESET}"
output="${output}  ${bar} ${bar_color}${percent_display}${RESET}"

echo -e "$output"

#!/usr/bin/env bash
# Shared Tigerclaw logo — sourced by Flox on-activate and tmux welcome popup.
# Prints the claw-mark logo block. Caller must define color vars first.
#
# Required vars: ORANGE, AMBER, YELLOW, WHITE, BOLD, DIM, GREY, RST (or RESET)
# Optional:      LOGO_TAGLINE — replaces third-line text (default: empty)

_R="${RST:-${RESET:-\033[0m}}"
_TAG="${LOGO_TAGLINE:-}"

printf "  ${ORANGE}╱${AMBER}╱${YELLOW}╱${_R}        ${WHITE}${BOLD}Tiger Claw${_R}\n"
printf "   ${ORANGE}╱${AMBER}╱${YELLOW}╱${_R}       ${DIM}Agentic VC Research${_R}\n"
if [ -n "$_TAG" ]; then
  printf "    ${ORANGE}╱${AMBER}╱${YELLOW}╱${_R}      ${DIM}${_TAG}${_R}\n"
else
  printf "    ${ORANGE}╱${AMBER}╱${YELLOW}╱${_R}\n"
fi

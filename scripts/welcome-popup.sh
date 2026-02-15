#!/usr/bin/env bash
# Welcome popup — shows logo, version, and author.

set -uo pipefail

# ── Colors ────────────────────────────────────────────────────────────────
ORANGE='\033[38;5;208m'
AMBER='\033[38;5;214m'
YELLOW='\033[38;5;220m'
WHITE='\033[1;37m'
BOLD='\033[1m'
DIM='\033[90m'
GREY='\033[38;5;240m'
RESET='\033[0m'

VERSION="v1.0"

clear
echo ""
echo -e "      ${ORANGE}╱${RESET}   ${AMBER}╱${RESET}   ${YELLOW}╱${RESET}"
echo -e "     ${ORANGE}╱${RESET}   ${AMBER}╱${RESET}   ${YELLOW}╱${RESET}"
echo -e "    ${ORANGE}╱${RESET}   ${AMBER}╱${RESET}   ${YELLOW}╱${RESET}"
echo -e "   ${ORANGE}╱${RESET}   ${AMBER}╱${RESET}   ${YELLOW}╱${RESET}        ${WHITE}${BOLD}TIGERCLAW${RESET}"
echo -e "  ${ORANGE}╱${RESET}   ${AMBER}╱${RESET}   ${YELLOW}╱${RESET}         ${DIM}${VERSION}${RESET}"
echo -e " ${ORANGE}╱${RESET}   ${AMBER}╱${RESET}   ${YELLOW}╱${RESET}"
echo ""
echo -e "  ${GREY}(c) Morris Clay 2026${RESET}"
echo ""
echo -e "  ${GREY}ESC or Enter to start${RESET}"

# Wait for ESC or Enter
while true; do
  IFS= read -rsn1 key
  case "$key" in
    $'\x1b')
      read -rsn2 -t 0.15 _ || true
      break
      ;;
    '')
      break
      ;;
  esac
done

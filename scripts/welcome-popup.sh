#!/usr/bin/env bash
# Welcome popup — first-launch orientation for Tigerclaw.

ORANGE='\033[38;5;208m'
AMBER='\033[38;5;214m'
BOLD='\033[1m'
DIM='\033[90m'
WHITE='\033[1;37m'
RESET='\033[0m'

echo ""
echo -e "  ${ORANGE}╱${AMBER}╱${ORANGE}╱${RESET}  ${WHITE}Welcome to Tigerclaw${RESET}"
echo ""
echo -e "  ${BOLD}Your workspace has 3 panes:${RESET}"
echo ""
echo -e "  ${AMBER}DISCOVERED${RESET}   ${DIM}top-left${RESET}     Live founder feed"
echo -e "  ${AMBER}THEMES${RESET}       ${DIM}top-right${RESET}    Active investment themes"
echo -e "  ${AMBER}SOURCE${RESET}       ${DIM}bottom${RESET}       Claude Code — start here"
echo ""
echo -e "  ${BOLD}Quick tips:${RESET}"
echo ""
echo -e "  ${DIM}1.${RESET} ${AMBER}Right-click${RESET} any pane for a context menu"
echo -e "  ${DIM}2.${RESET} ${AMBER}C-a ?${RESET}       opens the full shortcut reference"
echo -e "  ${DIM}3.${RESET} ${AMBER}Alt+arrows${RESET}  switch panes without a prefix"
echo ""
echo -e "  ${DIM}press any key to start${RESET}"

IFS= read -rsn1

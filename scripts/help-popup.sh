#!/usr/bin/env bash
# Help popup — shows all Tigerclaw keybindings in a formatted overlay.

ORANGE='\033[38;5;208m'
AMBER='\033[38;5;214m'
BOLD='\033[1m'
DIM='\033[90m'
RESET='\033[0m'

echo ""
echo -e "  ${ORANGE}╱${AMBER}╱${ORANGE}╱${RESET}  ${BOLD}Tigerclaw Shortcuts${RESET}"
echo -e "  ${DIM}prefix = C-a${RESET}"
echo ""
echo -e "  ${BOLD}Panes${RESET}"
echo -e "  ${AMBER}Alt+arrows${RESET}        switch pane ${DIM}(no prefix)${RESET}"
echo -e "  ${AMBER}C-a d${RESET}             split right"
echo -e "  ${AMBER}C-a D${RESET}             split down"
echo -e "  ${AMBER}C-a w${RESET}             close pane"
echo -e "  ${AMBER}C-a z${RESET}             zoom ${DIM}(fullscreen toggle)${RESET}"
echo -e "  ${AMBER}C-a Shift+arrows${RESET}  resize pane"
echo ""
echo -e "  ${BOLD}Tabs${RESET}"
echo -e "  ${AMBER}C-a t${RESET}             new tab"
echo -e "  ${AMBER}C-a [${RESET}             previous tab"
echo -e "  ${AMBER}C-a ]${RESET}             next tab"
echo -e "  ${AMBER}C-a 1-9${RESET}           jump to tab"
echo ""
echo -e "  ${BOLD}Popups${RESET}"
echo -e "  ${AMBER}C-a ?${RESET}             this help"
echo -e "  ${AMBER}C-a /${RESET}             scratch shell"
echo -e "  ${AMBER}right-click${RESET}       context menu"
echo ""
echo -e "  ${BOLD}Other${RESET}"
echo -e "  ${AMBER}C-a Enter${RESET}         scroll / copy mode"
echo -e "  ${AMBER}C-a r${RESET}             reload config"
echo -e "  ${AMBER}mouse select${RESET}      copies to clipboard"
echo ""
echo -e "  ${DIM}press q to close${RESET}"

# Wait for q or Escape
while true; do
  IFS= read -rsn1 key
  case "$key" in
    q|Q) break ;;
    $'\x1b') break ;;
  esac
done

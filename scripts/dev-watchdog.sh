#!/bin/bash
# Mantiene il Mac svegliate e rilancia "expo start" da solo se cade/crasha.
# Uso: ./scripts/dev-watchdog.sh [lan|tunnel|localhost]
cd "$(dirname "$0")/.."

MODE="${1:-tunnel}"

caffeinate -dimsu &
CAFFEINATE_PID=$!
trap 'kill $CAFFEINATE_PID 2>/dev/null' EXIT

echo "Modalità: --$MODE | il Mac non andrà in sleep finché questo script è attivo."

while true; do
  echo "[$(date '+%H:%M:%S')] avvio expo start --$MODE"
  npx expo start "--$MODE"
  echo "[$(date '+%H:%M:%S')] expo si è fermato, riparto in 2s... (Ctrl+C per uscire davvero)"
  sleep 2
done

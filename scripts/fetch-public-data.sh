#!/usr/bin/env bash
set -euo pipefail

# Single source of truth for upstream data URLs (also referenced in README).
TRANSPORT_STOPS_URL="https://opendata.transport.vic.gov.au/dataset/6d36dfd9-8693-4552-8a03-05eb29a391fd/resource/a2cba0b0-bddc-4b87-b495-2b6b7013af6e/download/public_transport_stops.geojson"
PARKRUN_EVENTS_URL="https://images.parkrun.com/events.json"
USER_AGENT="parkrun-by-public-transport"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="${ROOT}/public/data"
mkdir -p "${DATA_DIR}"

curl -fsSL "${PARKRUN_EVENTS_URL}" \
  -H "User-Agent: ${USER_AGENT}" \
  -o "${DATA_DIR}/events.json"
echo "✓ Downloaded parkrun events"

curl -fsSL "${TRANSPORT_STOPS_URL}" \
  -H "User-Agent: ${USER_AGENT}" \
  -o "${DATA_DIR}/public_transport_stops.geojson"
echo "✓ Downloaded Transport Victoria stops"

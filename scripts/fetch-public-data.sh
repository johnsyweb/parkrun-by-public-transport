#!/usr/bin/env bash
set -euo pipefail

# Resolve Transport Victoria stops via CKAN package API so resource UUID rotations
# do not break scheduled fetches (hardcoded download URLs go 404 when republished).
CKAN_PACKAGE_API="https://opendata.transport.vic.gov.au/api/3/action/package_show?id=public-transport-lines-and-stops"
PARKRUN_EVENTS_URL="https://images.parkrun.com/events.json"
USER_AGENT="parkrun-by-public-transport"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="${ROOT}/public/data"
mkdir -p "${DATA_DIR}"

curl -fsSL "${PARKRUN_EVENTS_URL}" \
  -H "User-Agent: ${USER_AGENT}" \
  -o "${DATA_DIR}/events.json"
echo "✓ Downloaded parkrun events"

TRANSPORT_STOPS_URL="$(
  curl -fsSL "${CKAN_PACKAGE_API}" -H "User-Agent: ${USER_AGENT}" |
    node --input-type=module -e '
      const chunks = [];
      for await (const chunk of process.stdin) chunks.push(chunk);
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (!body.success) {
        console.error("CKAN package_show failed:", body.error ?? body);
        process.exit(1);
      }
      const resource = (body.result?.resources ?? []).find(
        (r) =>
          r.format?.toUpperCase() === "GEOJSON" &&
          /public transport stops/i.test(r.name ?? ""),
      );
      if (!resource?.url) {
        console.error(
          "No GeoJSON resource named Public Transport Stops in CKAN package",
        );
        process.exit(1);
      }
      process.stdout.write(resource.url);
    '
)"

curl -fsSL "${TRANSPORT_STOPS_URL}" \
  -H "User-Agent: ${USER_AGENT}" \
  -o "${DATA_DIR}/public_transport_stops.geojson"
echo "✓ Downloaded Transport Victoria stops from ${TRANSPORT_STOPS_URL}"

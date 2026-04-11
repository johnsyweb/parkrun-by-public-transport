import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { assertParkrunEventsData } from "../src/utils/assertParkrunEventsData";
import { assertTransportStopsData } from "../src/utils/assertTransportStopsData";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseJsonFile(path: string, label: string): unknown {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    throw new Error(`${label}: could not read file`);
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new Error(`${label}: empty file`);
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const wrapped = new Error(`${label}: invalid JSON (${detail})`);
    (wrapped as Error & { cause?: unknown }).cause = error;
    throw wrapped;
  }
}

function validatePublicData(): void {
  const stopsPath = resolve(
    rootDir,
    "public/data/public_transport_stops.geojson",
  );
  const eventsPath = resolve(rootDir, "public/data/events.json");

  const stops = parseJsonFile(stopsPath, "public_transport_stops.geojson");
  assertTransportStopsData(stops, "public_transport_stops.geojson");

  const events = parseJsonFile(eventsPath, "events.json");
  assertParkrunEventsData(events, "events.json");

  console.log("✓ public/data files are valid GeoJSON and events structure");
}

validatePublicData();

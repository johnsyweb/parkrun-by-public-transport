import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { transportStopsDownloadUrlFromPackageShow } from "../src/utils/ckanTransportStopsUrl";

const CKAN_PACKAGE_API =
  "https://opendata.transport.vic.gov.au/api/3/action/package_show?id=public-transport-lines-and-stops";
const PARKRUN_EVENTS_URL = "https://images.parkrun.com/events.json";
const USER_AGENT = "parkrun-by-public-transport";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = resolve(rootDir, "public/data");

async function downloadToFile(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!response.ok) {
    throw new Error(
      `Failed to download ${url}: ${response.status} ${response.statusText}`,
    );
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(outputPath, buffer);
}

async function resolveTransportStopsUrl(): Promise<string> {
  const response = await fetch(CKAN_PACKAGE_API, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!response.ok) {
    throw new Error(
      `Failed to query CKAN package_show: ${response.status} ${response.statusText}`,
    );
  }
  return transportStopsDownloadUrlFromPackageShow(await response.json());
}

async function fetchPublicData(): Promise<void> {
  await mkdir(dataDir, { recursive: true });

  await downloadToFile(PARKRUN_EVENTS_URL, resolve(dataDir, "events.json"));
  console.log("✓ Downloaded parkrun events");

  const transportStopsUrl = await resolveTransportStopsUrl();
  await downloadToFile(
    transportStopsUrl,
    resolve(dataDir, "public_transport_stops.geojson"),
  );
  console.log(
    `✓ Downloaded Transport Victoria stops from ${transportStopsUrl}`,
  );
}

await fetchPublicData();

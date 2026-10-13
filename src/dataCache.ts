/// <reference types="vite/client" />

import type {
  ParkrunEventsData,
  TransportStop,
  TransportStopsByModeResult,
  TransportStopsData,
} from "./types";
import { assertParkrunEventsData } from "./utils/assertParkrunEventsData";
import { assertTransportStopsData } from "./utils/assertTransportStopsData";
import { isValidBuiltAt, readBuiltAt } from "./utils/builtAt";
import { parseJsonFromResponse } from "./utils/parseFetchJson";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface CachedData<T> {
  data: T;
  timestamp: number;
  builtAt?: string;
}

function isFreshTimestamp(timestamp: number): boolean {
  return Date.now() - timestamp < ONE_WEEK_MS;
}

function cacheAgeDays(timestamp: number): number {
  return Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000));
}

export class DataCache {
  private static async fetchWithCache<T>(
    url: string,
    cacheKey: string,
    assertData: (data: unknown, context: string) => asserts data is T,
  ): Promise<T> {
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      try {
        const cachedData: CachedData<T> = JSON.parse(cached);
        const ageOk = isFreshTimestamp(cachedData.timestamp);
        const builtAt = readBuiltAt(cachedData.data);

        if (ageOk && builtAt !== null) {
          console.log(
            `✓ Using cached ${cacheKey} (${cacheAgeDays(cachedData.timestamp)} days old)`,
          );
          return cachedData.data;
        }

        if (ageOk && builtAt === null) {
          console.log(
            `⏰ Cached ${cacheKey} is missing builtAt, fetching fresh data...`,
          );
        } else {
          console.log(
            `⏰ Cache expired for ${cacheKey}, fetching fresh data...`,
          );
        }
      } catch (error) {
        console.warn(`Failed to parse cached ${cacheKey}:`, error);
      }
    }

    console.log(`📥 Downloading ${cacheKey} from ${url}...`);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${cacheKey}: ${response.status} ${response.statusText}`,
      );
    }

    const raw = await parseJsonFromResponse<unknown>(
      response,
      `${cacheKey} (${url})`,
    );
    assertData(raw, `${cacheKey} (${url})`);
    const data = raw;

    try {
      const cachedData: CachedData<T> = {
        data,
        timestamp: Date.now(),
      };
      const serialized = JSON.stringify(cachedData);
      const sizeInMB = new Blob([serialized]).size / (1024 * 1024);

      if (sizeInMB > 5) {
        console.log(
          `⚠️ Skipping cache for ${cacheKey} (${sizeInMB.toFixed(1)}MB is too large)`,
        );
      } else {
        localStorage.setItem(cacheKey, serialized);
        console.log(
          `✓ Cached ${cacheKey} for 1 week (${sizeInMB.toFixed(1)}MB)`,
        );
      }
    } catch (error) {
      console.warn(`Failed to cache ${cacheKey}:`, error);
    }

    return data;
  }

  static async getParkrunEvents(): Promise<ParkrunEventsData> {
    return this.fetchWithCache(
      `${import.meta.env.BASE_URL}data/events.json`,
      "parkrun-events",
      assertParkrunEventsData,
    );
  }

  static async getTransportStops(): Promise<TransportStopsData> {
    return this.fetchWithCache(
      `${import.meta.env.BASE_URL}data/public_transport_stops.geojson`,
      "transport-stops",
      assertTransportStopsData,
    );
  }

  static async getTransportStopsByMode(
    modes: string[],
  ): Promise<TransportStopsByModeResult> {
    const result: TransportStop[] = [];
    const modesToFetch: string[] = [];
    let cachedBuiltAt: string | null = null;

    for (const mode of modes) {
      const cached = localStorage.getItem(`transport-stops-${mode}`);
      if (cached) {
        try {
          const cachedEntry: CachedData<TransportStop[]> = JSON.parse(cached);
          const ageOk = isFreshTimestamp(cachedEntry.timestamp);
          const builtAt = isValidBuiltAt(cachedEntry.builtAt)
            ? cachedEntry.builtAt
            : null;

          if (ageOk && builtAt !== null) {
            console.log(
              `✓ Using cached ${mode} stops (${cacheAgeDays(cachedEntry.timestamp)} days old)`,
            );
            result.push(...cachedEntry.data);
            cachedBuiltAt = cachedBuiltAt ?? builtAt;
            continue;
          }

          if (ageOk && builtAt === null) {
            console.log(
              `⏰ Cached ${mode} stops are missing builtAt, will refetch...`,
            );
          }
        } catch (error) {
          console.warn(`Failed to parse cached ${mode}:`, error);
        }
      }
      modesToFetch.push(mode);
    }

    if (modesToFetch.length === 0) {
      return { stops: result, builtAt: cachedBuiltAt };
    }

    console.log(`📥 Fetching transport stops (will cache all modes)...`);
    const response = await fetch(
      `${import.meta.env.BASE_URL}data/public_transport_stops.geojson`,
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch transport stops: ${response.status}`);
    }

    const raw = await parseJsonFromResponse<unknown>(
      response,
      "public_transport_stops.geojson",
    );
    assertTransportStopsData(raw, "public_transport_stops.geojson");
    const data = raw;
    const builtAt = data.builtAt;

    const modeGroups: Record<string, TransportStop[]> = {};

    for (const feature of data.features) {
      const mode = feature.properties.MODE;
      if (!modeGroups[mode]) {
        modeGroups[mode] = [];
      }
      modeGroups[mode].push(feature);
    }

    for (const [mode, features] of Object.entries(modeGroups)) {
      try {
        const cachedData: CachedData<TransportStop[]> = {
          data: features,
          timestamp: Date.now(),
          builtAt,
        };
        const serialized = JSON.stringify(cachedData);
        const sizeInKB = new Blob([serialized]).size / 1024;

        localStorage.setItem(`transport-stops-${mode}`, serialized);
        console.log(
          `✓ Cached ${mode} stops for 1 week (${features.length} stops, ${sizeInKB.toFixed(0)}KB)`,
        );
      } catch (error) {
        console.warn(`Failed to cache ${mode}:`, error);
      }
    }

    const stops: TransportStop[] = [];
    for (const mode of modes) {
      if (modeGroups[mode]) {
        stops.push(...modeGroups[mode]);
      }
    }

    return { stops, builtAt };
  }

  static getCachedModes(): string[] {
    const modes: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("transport-stops-") && key !== "transport-stops") {
        modes.push(key.replace("transport-stops-", ""));
      }
    }
    return modes;
  }

  static clearCache() {
    localStorage.removeItem("parkrun-events");
    localStorage.removeItem("transport-stops");
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("transport-stops-")) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
    console.log("Cache cleared");
  }

  static getCacheInfo() {
    const events = localStorage.getItem("parkrun-events");
    const stops = localStorage.getItem("transport-stops");

    const info: Record<string, { age: number; size: number } | null> = {
      "parkrun-events": null,
      "transport-stops": null,
    };

    if (events) {
      try {
        const cached = JSON.parse(events);
        info["parkrun-events"] = {
          age: Date.now() - cached.timestamp,
          size: new Blob([events]).size,
        };
      } catch (_) {
        // ignore
      }
    }

    if (stops) {
      try {
        const cached = JSON.parse(stops);
        info["transport-stops"] = {
          age: Date.now() - cached.timestamp,
          size: new Blob([stops]).size,
        };
      } catch (_) {
        // ignore
      }
    }

    return info;
  }
}

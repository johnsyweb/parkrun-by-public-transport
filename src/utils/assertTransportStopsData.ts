import type { TransportStopsData } from "../types";

export function assertTransportStopsData(
  data: unknown,
  context: string,
): asserts data is TransportStopsData {
  if (
    typeof data !== "object" ||
    data === null ||
    !Array.isArray((data as { features?: unknown }).features)
  ) {
    throw new Error(
      `${context}: expected GeoJSON with a features array (parsed JSON was not usable)`,
    );
  }
}

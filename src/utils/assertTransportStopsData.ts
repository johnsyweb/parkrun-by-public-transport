import type { TransportStopsData } from "../types";
import { readBuiltAt } from "./builtAt";

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
  if (readBuiltAt(data) === null) {
    throw new Error(`${context}: expected builtAt ISO timestamp`);
  }
}

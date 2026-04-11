import type { ParkrunEventsData } from "../types";

export function assertParkrunEventsData(
  data: unknown,
  context: string,
): asserts data is ParkrunEventsData {
  if (typeof data !== "object" || data === null || !("events" in data)) {
    throw new Error(`${context}: expected top-level events object`);
  }
  const events = (data as { events: unknown }).events;
  if (
    typeof events !== "object" ||
    events === null ||
    !Array.isArray((events as { features?: unknown }).features)
  ) {
    throw new Error(`${context}: expected events.features array`);
  }
}

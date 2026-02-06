import { describe, expect, it } from "vitest";
import type { ParkrunEvent, TransportStop } from "../types";
import {
  attachNearestStops,
  calculateDistance,
  countEventsNearTransport,
  getUserDistance,
  sortEvents,
} from "../eventUtils";

const baseEvent = (id: number, lat: number, lon: number): ParkrunEvent => ({
  id,
  type: "Feature",
  geometry: {
    type: "Point",
    coordinates: [lon, lat],
  },
  properties: {
    eventname: `event-${id}`,
    EventLongName: `Event ${id}`,
    EventShortName: `E${id}`,
    LocalisedEventLongName: null,
    countrycode: 36,
    seriesid: 1,
    EventLocation: "Somewhere",
  },
});

const baseStop = (id: string, lat: number, lon: number): TransportStop => ({
  type: "Feature",
  geometry: {
    type: "Point",
    coordinates: [lon, lat],
  },
  properties: {
    STOP_ID: id,
    STOP_NAME: `Stop ${id}`,
    MODE: "METRO TRAIN",
  },
});

describe("calculateDistance", () => {
  it("returns 0 for identical coordinates", () => {
    expect(calculateDistance(-37.81, 144.96, -37.81, 144.96)).toBe(0);
  });

  it("estimates about 111 km for 1 degree latitude", () => {
    const distance = calculateDistance(0, 0, 1, 0) / 1000;
    expect(distance).toBeGreaterThan(110);
    expect(distance).toBeLessThan(112);
  });
});

describe("attachNearestStops", () => {
  it("attaches the nearest stop within the max distance", () => {
    const events = [baseEvent(1, -37.81, 144.96)];
    const stops = [baseStop("1", -37.81, 144.96)];

    const result = attachNearestStops(events, stops, 1000);

    expect(result[0].nearestStop).toBeDefined();
    expect(result[0].nearestStop?.distance).toBe(0);
  });

  it("omits nearest stop when beyond the max distance", () => {
    const events = [baseEvent(1, -37.81, 144.96)];
    const stops = [baseStop("1", -38.5, 145.5)];

    const result = attachNearestStops(events, stops, 1000);

    expect(result[0].nearestStop).toBeUndefined();
  });
});

describe("sortEvents", () => {
  it("sorts by nearest stop distance", () => {
    const events = [baseEvent(1, 0, 0), baseEvent(2, 0, 0)];
    const stops = [baseStop("1", 0, 0), baseStop("2", 0.01, 0)];
    const withStops = attachNearestStops(events, stops, 200000);

    const sorted = sortEvents(withStops, "nearest-stop", "asc", null);

    expect(sorted[0].id).toBe(1);
  });

  it("sorts by user location distance", () => {
    const events = [baseEvent(1, 0, 0), baseEvent(2, 0.5, 0)];
    const stops = [baseStop("1", 0, 0)];
    const withStops = attachNearestStops(events, stops, 200000);

    const sorted = sortEvents(withStops, "my-location", "asc", {
      lat: 0,
      lon: 0,
    });

    expect(sorted[0].id).toBe(1);
  });
});

describe("countEventsNearTransport", () => {
  it("counts events with a nearest stop", () => {
    const events = [baseEvent(1, 0, 0), baseEvent(2, 0.5, 0)];
    const stops = [baseStop("1", 0, 0)];
    const withStops = attachNearestStops(events, stops, 200000);

    expect(countEventsNearTransport(withStops)).toBe(2);
  });
});

describe("getUserDistance", () => {
  it("returns null when user location is missing", () => {
    const event = baseEvent(1, 0, 0);
    expect(getUserDistance(event, null)).toBeNull();
  });

  it("returns distance when user location is available", () => {
    const event = baseEvent(1, 0, 0);
    const distance = getUserDistance(event, { lat: 0, lon: 1 });
    expect(distance).not.toBeNull();
  });
});

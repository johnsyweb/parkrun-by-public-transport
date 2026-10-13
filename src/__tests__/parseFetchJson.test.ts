import { describe, expect, it } from "vitest";
import { assertParkrunEventsData } from "../utils/assertParkrunEventsData";
import { assertTransportStopsData } from "../utils/assertTransportStopsData";
import { dataLoadErrorMessage } from "../utils/dataLoadErrorMessage";
import { parseJsonFromResponse } from "../utils/parseFetchJson";

describe("parseJsonFromResponse", () => {
  it("parses valid JSON", async () => {
    const response = new Response('{"x":1}');
    await expect(
      parseJsonFromResponse<{ x: number }>(response, "test"),
    ).resolves.toEqual({ x: 1 });
  });

  it("throws a descriptive error for invalid JSON", async () => {
    const response = new Response("<!DOCTYPE html>");
    await expect(
      parseJsonFromResponse(response, "stops.geojson"),
    ).rejects.toThrow(/stops\.geojson: invalid JSON/);
  });

  it("throws for an empty body", async () => {
    const response = new Response("");
    await expect(parseJsonFromResponse(response, "empty")).rejects.toThrow(
      /empty response body/,
    );
  });
});

describe("assertParkrunEventsData", () => {
  it("accepts nested events.features array with builtAt", () => {
    const data = {
      builtAt: "2026-07-16T08:20:00.000Z",
      events: { type: "FeatureCollection", features: [] },
    };
    expect(() => assertParkrunEventsData(data, "test")).not.toThrow();
  });

  it("rejects missing events, features array, or builtAt", () => {
    expect(() => assertParkrunEventsData({}, "t")).toThrow(/events object/);
    expect(() => assertParkrunEventsData({ events: {} }, "t")).toThrow(
      /events\.features/,
    );
    expect(() =>
      assertParkrunEventsData(
        { events: { type: "FeatureCollection", features: [] } },
        "t",
      ),
    ).toThrow(/builtAt/);
  });
});

describe("assertTransportStopsData", () => {
  it("accepts a minimal FeatureCollection shape with builtAt", () => {
    const data = {
      builtAt: "2026-07-16T08:20:00.000Z",
      type: "FeatureCollection",
      name: "x",
      features: [],
    };
    expect(() => assertTransportStopsData(data, "test")).not.toThrow();
  });

  it("rejects non-objects, missing features, or builtAt", () => {
    expect(() => assertTransportStopsData(null, "t")).toThrow(
      /expected GeoJSON/,
    );
    expect(() => assertTransportStopsData({ features: "no" }, "t")).toThrow(
      /expected GeoJSON/,
    );
    expect(() =>
      assertTransportStopsData(
        { type: "FeatureCollection", name: "x", features: [] },
        "t",
      ),
    ).toThrow(/builtAt/);
  });
});

describe("dataLoadErrorMessage", () => {
  it("maps invalid JSON and GeoJSON assertion errors", () => {
    expect(
      dataLoadErrorMessage(new Error("x: invalid JSON (bad). Response")),
    ).toContain("Clear cache");
    expect(
      dataLoadErrorMessage(
        new Error("file: expected GeoJSON with a features array"),
      ),
    ).toContain("Clear cache");
  });

  it("maps fetch failures for known keys", () => {
    expect(
      dataLoadErrorMessage(
        new Error("Failed to fetch parkrun-events: 404 Not Found"),
      ),
    ).toContain("Clear cache");
    expect(
      dataLoadErrorMessage(new Error("Failed to fetch transport stops: 500")),
    ).toContain("Clear cache");
  });

  it("falls back for unknown errors", () => {
    expect(dataLoadErrorMessage(new Error("something else"))).toContain(
      "internet connection",
    );
    expect(dataLoadErrorMessage(null)).toContain("internet connection");
  });
});

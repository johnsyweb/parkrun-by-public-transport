import { describe, expect, it } from "vitest";
import { transportStopsDownloadUrlFromPackageShow } from "../utils/ckanTransportStopsUrl";

describe("transportStopsDownloadUrlFromPackageShow", () => {
  it("returns the Public Transport Stops GeoJSON URL", () => {
    expect(
      transportStopsDownloadUrlFromPackageShow({
        success: true,
        result: {
          resources: [
            {
              name: "Public Transport Lines",
              format: "GeoJSON",
              url: "https://example.test/lines.geojson",
            },
            {
              name: "Public Transport Stops",
              format: "GeoJSON",
              url: "https://example.test/stops.geojson",
            },
          ],
        },
      }),
    ).toBe("https://example.test/stops.geojson");
  });

  it("throws when package_show is unsuccessful", () => {
    expect(() =>
      transportStopsDownloadUrlFromPackageShow({
        success: false,
        error: { message: "Not found" },
      }),
    ).toThrow(/package_show failed/);
  });

  it("throws when the stops GeoJSON resource is missing", () => {
    expect(() =>
      transportStopsDownloadUrlFromPackageShow({
        success: true,
        result: {
          resources: [
            {
              name: "Public Transport Lines",
              format: "GeoJSON",
              url: "https://example.test/lines.geojson",
            },
          ],
        },
      }),
    ).toThrow(/No GeoJSON resource/);
  });
});

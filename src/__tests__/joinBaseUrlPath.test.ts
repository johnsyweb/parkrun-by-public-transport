import { describe, expect, it } from "vitest";
import { joinBaseUrlPath } from "../utils/joinBaseUrlPath";

describe("joinBaseUrlPath", () => {
  it("joins base with trailing slash and root path without a double slash", () => {
    expect(
      joinBaseUrlPath(
        "https://www.johnsy.com/parkrun-by-public-transport/",
        "/",
      ),
    ).toBe("https://www.johnsy.com/parkrun-by-public-transport/");
  });

  it("normalises base without trailing slash for root", () => {
    expect(
      joinBaseUrlPath(
        "https://www.johnsy.com/parkrun-by-public-transport",
        "/",
      ),
    ).toBe("https://www.johnsy.com/parkrun-by-public-transport/");
  });

  it("joins a non-root path", () => {
    expect(
      joinBaseUrlPath(
        "https://www.johnsy.com/parkrun-by-public-transport/",
        "/about",
      ),
    ).toBe("https://www.johnsy.com/parkrun-by-public-transport/about");
  });
});

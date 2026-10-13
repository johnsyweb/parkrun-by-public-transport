import { describe, expect, it } from "vitest";
import {
  assignBuiltAt,
  formatBuiltAt,
  isValidBuiltAt,
  readBuiltAt,
  toUtcIsoTimestamp,
} from "../utils/builtAt";

const localFormat = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZoneName: "short",
});

const utcFormat = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "UTC",
  timeZoneName: "short",
});

describe("toUtcIsoTimestamp", () => {
  it("normalises dates to UTC ISO strings", () => {
    expect(toUtcIsoTimestamp("2026-07-16T08:20:00.000Z")).toBe(
      "2026-07-16T08:20:00.000Z",
    );
  });

  it("rejects unparseable values", () => {
    expect(() => toUtcIsoTimestamp("not-a-date")).toThrow(
      /builtAt must be a valid UTC timestamp/,
    );
  });
});

describe("isValidBuiltAt / readBuiltAt", () => {
  it("accepts parseable ISO strings", () => {
    expect(isValidBuiltAt("2026-07-16T08:20:00.000Z")).toBe(true);
    expect(readBuiltAt({ builtAt: "2026-07-16T08:20:00.000Z" })).toBe(
      "2026-07-16T08:20:00.000Z",
    );
  });

  it("rejects missing or unparseable builtAt", () => {
    expect(isValidBuiltAt(undefined)).toBe(false);
    expect(isValidBuiltAt("not-a-date")).toBe(false);
    expect(readBuiltAt({})).toBeNull();
    expect(readBuiltAt({ builtAt: "nope" })).toBeNull();
    expect(readBuiltAt(null)).toBeNull();
  });
});

describe("assignBuiltAt", () => {
  it("writes a UTC ISO builtAt onto the object", () => {
    const data: Record<string, unknown> = { features: [] };
    const iso = assignBuiltAt(data, "2026-07-16T08:20:00.000Z");
    expect(iso).toBe("2026-07-16T08:20:00.000Z");
    expect(data.builtAt).toBe("2026-07-16T08:20:00.000Z");
  });
});

describe("formatBuiltAt", () => {
  it("formats in the local timezone with a timezone label", () => {
    const iso = "2026-07-16T08:20:00.000Z";
    expect(formatBuiltAt(iso)).toBe(localFormat.format(new Date(iso)));
    expect(formatBuiltAt(iso)).toMatch(
      /\b(AEST|AEDT|ACST|ACDT|AWST|GMT[+-]\d+|UTC|[A-Z]{2,5})\b/,
    );
  });

  it("differs from a forced UTC rendering when the local offset is not zero", () => {
    const iso = "2026-07-15T22:30:00.000Z";
    const date = new Date(iso);
    if (date.getTimezoneOffset() === 0) {
      return;
    }
    expect(formatBuiltAt(iso)).not.toBe(utcFormat.format(date));
  });
});

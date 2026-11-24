import { afterEach, describe, expect, it } from "vitest";

import { formatCoords, formatDate, mapsUrl } from "./utils";

describe("formatCoords", () => {
  it("keeps five decimal places", () => {
    expect(formatCoords(-33.92491, 18.42406)).toBe("-33.92491, 18.42406");
  });

  it("pads short values", () => {
    expect(formatCoords(1, 2)).toBe("1.00000, 2.00000");
  });
});

describe("mapsUrl", () => {
  it("points at OpenStreetMap instead of a tracking tile provider", () => {
    const url = new URL(mapsUrl(-33.9249, 18.4241));
    expect(url.hostname).toBe("www.openstreetmap.org");
    expect(url.searchParams.get("mlat")).toBe("-33.9249");
    expect(url.searchParams.get("mlon")).toBe("18.4241");
  });
});

describe("formatDate", () => {
  const originalTimezone = process.env.TZ;

  afterEach(() => {
    process.env.TZ = originalTimezone;
  });

  it("renders a readable date for a valid timestamp", () => {
    const value = formatDate("2026-11-23T09:00:00Z", "en");
    expect(value).not.toBe("—");
    expect(value).toMatch(/2026/);
  });

  it("falls back to an em dash for missing or invalid values", () => {
    expect(formatDate(null, "en")).toBe("—");
    expect(formatDate(undefined, "en")).toBe("—");
    expect(formatDate("not-a-date", "en")).toBe("—");
  });

  it("localises the output", () => {
    const spanish = formatDate("2026-11-23T09:00:00Z", "es");
    const english = formatDate("2026-11-23T09:00:00Z", "en");
    expect(spanish).not.toBe(english);
  });
});

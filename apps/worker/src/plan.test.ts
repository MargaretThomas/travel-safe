import { describe, expect, it } from "vitest";

import { deadlineFor, emergencyUrl, evaluateDeadman, humanDuration, iso, parse } from "./plan";
import type { UserRow } from "./types";

const NOW = new Date("2026-11-23T12:00:00Z");

function user(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: "usr_1",
    name: "Thandi Mokoena",
    email: "thandi@example.com",
    phone: null,
    check_in_interval_minutes: 1440,
    grace_minutes: 60,
    last_check_in_at: "2026-11-23T09:00:00Z",
    warning_sent_for: null,
    triggered_at: null,
    trigger_reason: null,
    emergency_token: "tok",
    ...overrides,
  };
}

describe("iso", () => {
  it("drops milliseconds to match the Go API", () => {
    expect(iso(new Date("2026-11-23T12:00:00.987Z"))).toBe("2026-11-23T12:00:00Z");
  });
});

describe("parse", () => {
  it("returns null for an invalid timestamp", () => {
    expect(parse("not-a-date")).toBeNull();
  });
});

describe("evaluateDeadman", () => {
  it("does nothing when the switch is disabled", () => {
    expect(evaluateDeadman(user({ check_in_interval_minutes: 0 }), NOW)).toBeNull();
    expect(evaluateDeadman(user({ check_in_interval_minutes: null }), NOW)).toBeNull();
  });

  it("does nothing while a check-in is still inside its window", () => {
    expect(evaluateDeadman(user({ last_check_in_at: "2026-11-23T11:30:00Z" }), NOW)).toBeNull();
  });

  it("warns after the deadline but before the grace period ends", () => {
    // 1440 min interval means the deadline is tomorrow; use a 60 min interval.
    const value = user({
      check_in_interval_minutes: 60,
      last_check_in_at: "2026-11-23T10:30:00Z",
    });
    expect(evaluateDeadman(value, NOW)).toBe("warn");
  });

  it("does not warn twice for the same check-in cycle", () => {
    const value = user({
      check_in_interval_minutes: 60,
      last_check_in_at: "2026-11-23T10:30:00Z",
      warning_sent_for: "2026-11-23T10:30:00Z",
    });
    expect(evaluateDeadman(value, NOW)).toBeNull();
  });

  it("warns again after a new check-in", () => {
    const value = user({
      check_in_interval_minutes: 60,
      last_check_in_at: "2026-11-23T10:30:00Z",
      warning_sent_for: "2026-11-23T09:30:00Z",
    });
    expect(evaluateDeadman(value, NOW)).toBe("warn");
  });

  it("triggers after the deadline plus grace", () => {
    const value = user({
      check_in_interval_minutes: 60,
      grace_minutes: 30,
      last_check_in_at: "2026-11-23T10:00:00Z",
    });
    expect(evaluateDeadman(value, NOW)).toBe("trigger");
  });

  it("triggers immediately after the deadline when grace is zero", () => {
    const value = user({
      check_in_interval_minutes: 60,
      grace_minutes: 0,
      last_check_in_at: "2026-11-23T10:30:00Z",
    });
    expect(evaluateDeadman(value, NOW)).toBe("trigger");
  });

  it("never triggers an account that is already triggered", () => {
    expect(evaluateDeadman(user({ triggered_at: "2026-11-23T11:00:00Z" }), NOW)).toBeNull();
  });

  it("ignores a user without a last check-in timestamp", () => {
    expect(evaluateDeadman(user({ last_check_in_at: "" }), NOW)).toBeNull();
  });
});

describe("deadlineFor", () => {
  it("adds the interval to the last check-in", () => {
    const deadline = deadlineFor(
      user({ check_in_interval_minutes: 90, last_check_in_at: "2026-11-23T10:00:00Z" }),
    );
    expect(deadline?.toISOString()).toBe("2026-11-23T11:30:00.000Z");
  });

  it("returns null when the switch is disabled", () => {
    expect(deadlineFor(user({ check_in_interval_minutes: 0 }))).toBeNull();
  });
});

describe("humanDuration", () => {
  it.each([
    [1, "1 minute"],
    [45, "45 minutes"],
    [60, "1 hour"],
    [90, "1.5 hours"],
    [1440, "1 day"],
    [2880, "2 days"],
  ])("renders %i minutes as %s", (minutes, expected) => {
    expect(humanDuration(minutes)).toBe(expected);
  });
});

describe("emergencyUrl", () => {
  it("builds a stable page link and trims trailing slashes", () => {
    expect(emergencyUrl("https://travel-safe.example/", "abc 123")).toBe(
      "https://travel-safe.example/emergency/abc%20123",
    );
  });
});

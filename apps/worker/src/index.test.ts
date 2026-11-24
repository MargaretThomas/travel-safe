import { beforeEach, describe, expect, it, vi } from "vitest";

import worker, { run, sendEmail } from "./index";
import type { ContactRow, EmailBinding, Env, EventRow, UserRow } from "./types";

const NOW = new Date("2026-11-23T12:00:00Z");

interface NotificationRow {
  id: string;
  user_id: string;
  contact_id: string;
  kind: string;
  cycle_key: string;
  recipient: string | null;
  status: string;
  error: string | null;
  created_at: string;
}

interface FakeState {
  users: UserRow[];
  contacts: ContactRow[];
  events: EventRow[];
  notifications: NotificationRow[];
  deletedLocations: number;
}

function baseUser(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: "usr_1",
    name: "Thandi Mokoena",
    email: "thandi@example.com",
    phone: null,
    check_in_interval_minutes: 60,
    grace_minutes: 60,
    last_check_in_at: "2026-11-23T09:00:00Z",
    warning_sent_for: null,
    triggered_at: null,
    trigger_reason: null,
    emergency_token: "owner_token",
    ...overrides,
  };
}

/**
 * A tiny D1 stand-in that understands only the statements the scheduler uses.
 * It keeps the test honest about the orchestration without pulling in Miniflare.
 */
function fakeDb(state: FakeState): D1Database {
  return {
    prepare(sql: string) {
      let args: unknown[] = [];
      const statement = {
        bind(...values: unknown[]) {
          args = values;
          return statement;
        },
        async first<T>() {
          return first(sql, args, state) as T | null;
        },
        async all<T>() {
          return { results: all(sql, args, state) as T[], success: true, meta: {} };
        },
        async run() {
          return { success: true, meta: { changes: change(sql, args, state) } };
        },
      };
      return statement;
    },
  } as unknown as D1Database;
}

function first(sql: string, args: unknown[], state: FakeState): unknown {
  const [a, b, c, d] = args as string[];
  if (sql.includes("FROM users WHERE id = ?")) {
    return state.users.find((user) => user.id === a) ?? null;
  }
  if (sql.includes("FROM emergency_events") && sql.includes("user_id = ? AND resolved_at IS NULL")) {
    return state.events.find((event) => event.user_id === a && !event.resolved_at) ?? null;
  }
  if (sql.includes("FROM notifications")) {
    return (
      state.notifications.find(
        (row) =>
          row.user_id === a &&
          row.contact_id === b &&
          row.kind === c &&
          row.cycle_key === d &&
          (row.status === "sent" || row.status === "skipped"),
      ) ?? null
    );
  }
  throw new Error(`Unhandled first: ${sql}`);
}

function all(sql: string, _args: unknown[], state: FakeState): unknown[] {
  if (sql.includes("FROM users") && sql.includes("last_check_in_at <= ?")) {
    return state.users.filter(
      (user) =>
        user.check_in_interval_minutes != null &&
        user.check_in_interval_minutes > 0 &&
        !user.triggered_at,
    );
  }
  if (sql.includes("FROM emergency_events") && sql.includes("first_notified_at IS NULL")) {
    return state.events.filter((event) => !event.resolved_at && !event.first_notified_at);
  }
  if (sql.includes("FROM contacts")) {
    return state.contacts.filter((contact) => !contact.revoked_at && contact.access_token);
  }
  throw new Error(`Unhandled all: ${sql}`);
}

function change(sql: string, args: unknown[], state: FakeState): number {
  if (sql.includes("DELETE FROM locations")) {
    return state.deletedLocations;
  }
  if (
    sql.includes("DELETE FROM check_ins") ||
    sql.includes("DELETE FROM notifications WHERE created_at") ||
    sql.includes("DELETE FROM emergency_events WHERE resolved_at IS NOT NULL")
  ) {
    return 0;
  }
  if (sql.includes("UPDATE users SET triggered_at")) {
    const [nowIso, reason, , id] = args as string[];
    const user = state.users.find((item) => item.id === id);
    if (user) {
      user.triggered_at ??= nowIso;
      user.trigger_reason = reason;
      user.warning_sent_for = null;
    }
    return 1;
  }
  if (sql.includes("INSERT INTO emergency_events")) {
    const [id, user_id, reason, created_at] = args as string[];
    state.events.push({
      id,
      user_id,
      reason: reason as "deadman" | "sos",
      created_at,
      resolved_at: null,
      first_notified_at: null,
    });
    return 1;
  }
  if (sql.includes("UPDATE users SET warning_sent_for")) {
    const [cycle, , id] = args as string[];
    const user = state.users.find((item) => item.id === id);
    if (user && user.last_check_in_at === cycle) user.warning_sent_for = cycle;
    return 1;
  }
  if (sql.includes("INSERT OR IGNORE INTO notifications")) {
    const [id, user_id, contact_id, kind, cycle_key, recipient, status, error, created_at] =
      args as string[];
    const duplicate = state.notifications.some(
      (row) =>
        row.user_id === user_id &&
        row.contact_id === contact_id &&
        row.kind === kind &&
        row.cycle_key === cycle_key,
    );
    if (duplicate) return 0;
    state.notifications.push({
      id,
      user_id,
      contact_id,
      kind,
      cycle_key,
      recipient,
      status,
      error,
      created_at,
    });
    return 1;
  }
  if (sql.includes("UPDATE emergency_events SET first_notified_at")) {
    const [nowIso, id] = args as string[];
    const event = state.events.find((item) => item.id === id);
    if (event) event.first_notified_at ??= nowIso;
    return 1;
  }
  if (sql.includes("UPDATE emergency_events SET resolved_at")) {
    const [nowIso, , id] = args as string[];
    const event = state.events.find((item) => item.id === id);
    if (event) {
      event.resolved_at = nowIso;
      event.first_notified_at ??= nowIso;
    }
    return 1;
  }
  throw new Error(`Unhandled run: ${sql}`);
}

function baseState(overrides: Partial<FakeState> = {}): FakeState {
  return {
    users: [baseUser()],
    contacts: [],
    events: [],
    notifications: [],
    deletedLocations: 2,
    ...overrides,
  };
}

function emailBinding(): EmailBinding & { sent: Array<{ to: string; subject: string }> } {
  const sent: Array<{ to: string; subject: string }> = [];
  return {
    sent,
    async send(message) {
      sent.push({ to: String(message.to), subject: message.subject });
      return { messageId: `msg_${sent.length}` };
    },
  };
}

function makeEnv(state: FakeState, overrides: Partial<Env> = {}) {
  const email = emailBinding();
  const env: Env = {
    DB: fakeDb(state),
    ENVIRONMENT: "test",
    WEB_BASE_URL: "https://travel-safe-web.workers.dev",
    EMAIL_FROM: "Travel Safe <alerts@travel-safe.test>",
    EMAIL: email,
    ...overrides,
  };
  return { env, email };
}

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("run", () => {
  it("triggers the switch and emails the owner and contact exactly once", async () => {
    const state = baseState({
      contacts: [
        {
          id: "ctc_1",
          name: "Sipho Dlamini",
          email: "sipho@example.com",
          phone: null,
          access_token: "contact_token",
          revoked_at: null,
        },
      ],
    });
    const { env, email } = makeEnv(state);

    const summary = await run(env, NOW);

    expect(summary).toMatchObject({
      ok: true,
      triggered: 1,
      eventsNotified: 1,
      failures: 0,
      cleanedLocations: 2,
    });
    expect(state.events).toHaveLength(1);
    expect(state.events[0]?.reason).toBe("deadman");
    expect(state.events[0]?.first_notified_at).toBe("2026-11-23T12:00:00Z");
    expect(state.users[0]?.triggered_at).toBe("2026-11-23T12:00:00Z");
    expect(email.sent.map((item) => item.to)).toEqual(["thandi@example.com", "sipho@example.com"]);
    expect(state.notifications.filter((row) => row.status === "sent")).toHaveLength(2);

    // A second run must not double-send.
    const second = await run(env, new Date("2026-11-23T13:00:00Z"));
    expect(second.eventsNotified).toBe(0);
    expect(email.sent).toHaveLength(2);
  });

  it("sends one warning per check-in cycle", async () => {
    const state = baseState({
      users: [baseUser({ last_check_in_at: "2026-11-23T10:30:00Z", grace_minutes: 60 })],
    });
    const { env, email } = makeEnv(state);

    const summary = await run(env, NOW);
    expect(summary).toMatchObject({ warned: 1, triggered: 0, failures: 0 });
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0]?.subject).toContain("check in");
    expect(state.users[0]?.warning_sent_for).toBe("2026-11-23T10:30:00Z");

    const second = await run(env, new Date("2026-11-23T12:10:00Z"));
    expect(second.warned).toBe(0);
    expect(email.sent).toHaveLength(1);
  });

  it("counts a provider failure without marking the event notified", async () => {
    const failing: EmailBinding = {
      async send() {
        throw new Error("smtp unavailable");
      },
    };
    const { env } = makeEnv(baseState(), { EMAIL: failing });

    const summary = await run(env, NOW);
    expect(summary.triggered).toBe(1);
    expect(summary.failures).toBe(1);
    expect(summary.ok).toBe(false);
  });

  it("still marks an event notified when nobody has an email address", async () => {
    const state = baseState({ users: [baseUser({ email: null })] });
    const { env, email } = makeEnv(state);

    const summary = await run(env, NOW);
    expect(email.sent).toHaveLength(0);
    expect(summary.eventsNotified).toBe(1);
    expect(state.events[0]?.first_notified_at).not.toBeNull();
  });
});

describe("worker fetch routes", () => {

  it("exposes health and schedule information", async () => {
    const { env } = makeEnv(baseState());
    const response = await worker.fetch(new Request("https://worker.test/health"), env);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      service: "travel-safe-worker",
      schedule: "0 * * * *",
    });
  });

  it("guards the manual trigger with CRON_SECRET", async () => {
    const { env } = makeEnv(baseState(), { CRON_SECRET: "secret" });

    const denied = await worker.fetch(new Request("https://worker.test/run", { method: "POST" }), env);
    expect(denied.status).toBe(401);

    const allowed = await worker.fetch(
      new Request("https://worker.test/run", {
        method: "POST",
        headers: { Authorization: "Bearer secret" },
      }),
      env,
    );
    expect(allowed.status).toBe(200);
  });

  it("returns 404 for unknown routes", async () => {
    const { env } = makeEnv(baseState());
    const response = await worker.fetch(new Request("https://worker.test/nope"), env);
    expect(response.status).toBe(404);
  });
});

describe("sendEmail", () => {
  it("fails clearly when no from address is configured", async () => {
    const { env } = makeEnv(baseState(), { EMAIL_FROM: undefined });
    await expect(sendEmail(env, "a@example.com", { subject: "s", html: "h", text: "t" })).resolves.toEqual({
      ok: false,
      error: "email_from_missing",
    });
  });

  it("sends through Resend when an API key is set", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: "resend_1" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { env } = makeEnv(baseState(), { RESEND_API_KEY: "re_test", EMAIL: undefined });

    const result = await sendEmail(env, "a@example.com", { subject: "s", html: "h", text: "t" });
    expect(result).toEqual({ ok: true, id: "resend_1" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" }),
    );
    vi.unstubAllGlobals();
  });

  it("reports a Resend HTTP error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 422, text: async () => "bad domain" }),
    );
    const { env } = makeEnv(baseState(), { RESEND_API_KEY: "re_test", EMAIL: undefined });

    const result = await sendEmail(env, "a@example.com", { subject: "s", html: "h", text: "t" });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("resend_422");
    vi.unstubAllGlobals();
  });

  it("reports a missing provider instead of pretending to send", async () => {
    const { env } = makeEnv(baseState(), { EMAIL: undefined });
    const result = await sendEmail(env, "a@example.com", { subject: "s", html: "h", text: "t" });
    expect(result).toEqual({ ok: false, error: "email_provider_not_configured" });
  });
});

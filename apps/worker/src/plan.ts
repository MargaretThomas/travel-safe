import type { UserRow } from "./types";

export type DeadmanAction = "warn" | "trigger" | null;

/** Storage timestamps are UTC with whole seconds, matching the Go API. */
export function iso(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function parse(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Decide what the hourly switch should do for one user. The warning fires at
 * the check-in deadline; the emergency fires after the grace period. A warning
 * is sent once per check-in cycle.
 */
export function evaluateDeadman(user: UserRow, now: Date): DeadmanAction {
  if (!user.check_in_interval_minutes || user.check_in_interval_minutes <= 0) return null;
  if (user.triggered_at) return null;
  const last = parse(user.last_check_in_at);
  if (!last) return null;
  const deadline = new Date(last.getTime() + user.check_in_interval_minutes * 60_000);
  const triggerAt = new Date(deadline.getTime() + Math.max(0, user.grace_minutes ?? 60) * 60_000);
  if (now.getTime() >= triggerAt.getTime()) return "trigger";
  if (now.getTime() >= deadline.getTime() && user.warning_sent_for !== user.last_check_in_at) {
    return "warn";
  }
  return null;
}

export function deadlineFor(user: UserRow): Date | null {
  if (!user.check_in_interval_minutes) return null;
  const last = parse(user.last_check_in_at);
  if (!last) return null;
  return new Date(last.getTime() + user.check_in_interval_minutes * 60_000);
}

/** Minimal, locale-independent duration copy for emails. */
export function humanDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  if (minutes % 1440 === 0) {
    const days = minutes / 1440;
    return `${days} day${days === 1 ? "" : "s"}`;
  }
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

export function emergencyUrl(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/emergency/${encodeURIComponent(token)}`;
}

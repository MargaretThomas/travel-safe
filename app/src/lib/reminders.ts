import { getReminderOffsetsMs } from '@/lib/config';
import { HOUR_MS, intervalDurationMs, normalizeIntervalMinutes } from '@/lib/intervals';

export type ReminderKind = 'reminder' | 'final' | 'expired';

export type ReminderRule = {
  kind: ReminderKind;
  /** How long before the deadline to fire. */
  offsetMs: number;
  /** Cap as a fraction of the interval, so a 1-day interval doesn't remind at check-in time. */
  maxFractionOfInterval: number;
};

export type ScheduledReminder = { kind: ReminderKind; fireAt: Date };

export function buildReminderRules(
  offsets: { reminder: number; final: number } | null = getReminderOffsetsMs(),
): ReminderRule[] {
  return [
    { kind: 'reminder', offsetMs: offsets?.reminder ?? 24 * HOUR_MS, maxFractionOfInterval: 0.25 },
    { kind: 'final', offsetMs: offsets?.final ?? 2 * HOUR_MS, maxFractionOfInterval: 0.1 },
    { kind: 'expired', offsetMs: 0, maxFractionOfInterval: 0 },
  ];
}

export function computeReminderSchedule(
  deadline: Date,
  intervalMinutes: number,
  now: Date,
  rules: ReminderRule[] = buildReminderRules(),
): ScheduledReminder[] {
  const span = intervalDurationMs(normalizeIntervalMinutes(intervalMinutes));
  const nowMs = now.getTime();
  const seen = new Set<number>();
  const reminders: ScheduledReminder[] = [];
  for (const rule of rules) {
    const offset = Math.min(rule.offsetMs, span * rule.maxFractionOfInterval);
    const fireAt = deadline.getTime() - offset;
    // A non-finite fire time is never schedulable, and `NaN <= nowMs` is false, so the
    // past check alone would happily hand an Invalid Date to the native scheduler.
    if (!Number.isFinite(fireAt) || fireAt <= nowMs || seen.has(fireAt)) continue;
    seen.add(fireAt);
    reminders.push({ kind: rule.kind, fireAt: new Date(fireAt) });
  }
  return reminders.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
}

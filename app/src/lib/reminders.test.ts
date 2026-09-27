import { DAY_MINUTES, DAY_MS, HOUR_MINUTES, HOUR_MS } from './intervals';
import { buildReminderRules, computeReminderSchedule } from './reminders';

const now = new Date('2026-01-10T09:00:00Z');

function offsets(deadline: Date, schedule: { fireAt: Date }[]): number[] {
  return schedule.map((item) => (deadline.getTime() - item.fireAt.getTime()) / HOUR_MS);
}

describe('computeReminderSchedule', () => {
  it('schedules a reminder 24h and a final warning 2h before a weekly deadline', () => {
    const deadline = new Date(now.getTime() + 7 * DAY_MS);
    const schedule = computeReminderSchedule(deadline, 7 * DAY_MINUTES, now);
    expect(schedule.map((item) => item.kind)).toEqual(['reminder', 'final', 'expired']);
    expect(offsets(deadline, schedule)).toEqual([24, 2, 0]);
  });

  it('caps offsets for a 1-day interval so reminders stay useful', () => {
    const deadline = new Date(now.getTime() + DAY_MS);
    const schedule = computeReminderSchedule(deadline, 1 * DAY_MINUTES, now);
    expect(offsets(deadline, schedule)).toEqual([6, 2, 0]);
  });

  it('skips reminders that are already in the past', () => {
    const deadline = new Date(now.getTime() + HOUR_MS);
    const schedule = computeReminderSchedule(deadline, 7 * DAY_MINUTES, now);
    expect(schedule.map((item) => item.kind)).toEqual(['expired']);
  });

  it('caps offsets for an hourly interval', () => {
    const deadline = new Date(now.getTime() + HOUR_MS);
    const schedule = computeReminderSchedule(deadline, HOUR_MINUTES, now);
    expect(offsets(deadline, schedule)).toEqual([0.25, 0.1, 0]);
  });

  it('returns nothing once the deadline has passed', () => {
    expect(computeReminderSchedule(new Date(now.getTime() - 1), 7 * DAY_MINUTES, now)).toEqual([]);
  });

  it('honours configured offsets', () => {
    const deadline = new Date(now.getTime() + 30 * DAY_MS);
    const rules = buildReminderRules({ reminder: 48 * HOUR_MS, final: 4 * HOUR_MS });
    expect(offsets(deadline, computeReminderSchedule(deadline, 30 * DAY_MINUTES, now, rules))).toEqual([48, 4, 0]);
  });

  it('never schedules two notifications at the same instant', () => {
    const deadline = new Date(now.getTime() + DAY_MS);
    const rules = buildReminderRules({ reminder: 2 * HOUR_MS, final: HOUR_MS });
    rules[1] = { ...rules[1], offsetMs: 2 * HOUR_MS, maxFractionOfInterval: 1 };
    const schedule = computeReminderSchedule(deadline, DAY_MINUTES, now, rules);
    const times = schedule.map((item) => item.fireAt.getTime());
    expect(new Set(times).size).toBe(times.length);
  });
});

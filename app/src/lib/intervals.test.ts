import { computeDeadline, DAY_MINUTES, DAY_MS, DEFAULT_INTERVAL_MINUTES, formatDuration, formatInterval, HOUR_MINUTES, HOUR_MS, INTERVAL_PRESETS, INTERVAL_PRESET_MINUTES, intervalPreset, isExpired, isValidInterval, MAX_INTERVAL_MINUTES, MIN_INTERVAL_MINUTES, MINUTE_MS, nearestIntervalPreset, normalizeIntervalMinutes } from './intervals';

const start = new Date('2026-01-10T09:00:00Z');

describe('intervals', () => {
  it('accepts every preset from 1 hour to 1 year', () => {
    expect(INTERVAL_PRESETS[0]).toEqual({ minutes: HOUR_MINUTES, key: '1h' });
    expect(INTERVAL_PRESETS[INTERVAL_PRESETS.length - 1]).toEqual({
      minutes: MAX_INTERVAL_MINUTES,
      key: '1y',
    });
    INTERVAL_PRESETS.forEach(({ minutes }) => expect(isValidInterval(minutes)).toBe(true));
  });

  it('rejects out-of-range and fractional intervals', () => {
    expect(isValidInterval(0)).toBe(false);
    expect(isValidInterval(MIN_INTERVAL_MINUTES - 1)).toBe(false);
    expect(isValidInterval(MAX_INTERVAL_MINUTES + 1)).toBe(false);
    expect(isValidInterval(1.5)).toBe(false);
  });

  it('replaces an interval that is not usable, so nothing downstream becomes NaN', () => {
    expect(normalizeIntervalMinutes(7 * DAY_MINUTES)).toBe(7 * DAY_MINUTES);
    [undefined, null, NaN, Infinity, '10080', '', 0, -5, 1.5, MAX_INTERVAL_MINUTES + 1, {}].forEach((value) => {
      expect(normalizeIntervalMinutes(value)).toBe(DEFAULT_INTERVAL_MINUTES);
    });
    expect(normalizeIntervalMinutes(undefined, HOUR_MINUTES)).toBe(HOUR_MINUTES);
  });

  it('computes the deadline from the last check-in', () => {
    expect(computeDeadline(start, 7 * DAY_MINUTES).toISOString()).toBe('2026-01-17T09:00:00.000Z');
    expect(() => computeDeadline(start, 0)).toThrow(RangeError);
  });

  it('puts an hourly deadline an hour out', () => {
    expect(computeDeadline(start, HOUR_MINUTES).toISOString()).toBe('2026-01-10T10:00:00.000Z');
  });

  it('treats a check-in before the deadline as on time', () => {
    const deadline = computeDeadline(start, DAY_MINUTES);
    expect(isExpired(deadline, new Date(deadline.getTime() - 1))).toBe(false);
  });

  it('treats a check-in exactly at the deadline as on time', () => {
    const deadline = computeDeadline(start, DAY_MINUTES);
    expect(isExpired(deadline, new Date(deadline.getTime()))).toBe(false);
  });

  it('expires after the deadline', () => {
    const deadline = computeDeadline(start, DAY_MINUTES);
    expect(isExpired(deadline, new Date(deadline.getTime() + 1))).toBe(true);
    expect(isExpired(null, start)).toBe(false);
  });

  it('finds the preset for an interval, by minutes', () => {
    expect(intervalPreset(HOUR_MINUTES)?.key).toBe('1h');
    expect(intervalPreset(7 * DAY_MINUTES)?.key).toBe('1w');
    expect(intervalPreset(90)).toBeUndefined();
  });

  it('lists the preset intervals in the order the ruler shows them', () => {
    expect(INTERVAL_PRESET_MINUTES).toEqual([
      HOUR_MINUTES,
      DAY_MINUTES,
      2 * DAY_MINUTES,
      3 * DAY_MINUTES,
      7 * DAY_MINUTES,
      14 * DAY_MINUTES,
      30 * DAY_MINUTES,
      60 * DAY_MINUTES,
      90 * DAY_MINUTES,
      180 * DAY_MINUTES,
      MAX_INTERVAL_MINUTES,
    ]);
  });

  it('finds the preset nearest to an interval', () => {
    expect(nearestIntervalPreset(HOUR_MINUTES).key).toBe('1h');
    expect(nearestIntervalPreset(7 * DAY_MINUTES).key).toBe('1w');
    expect(nearestIntervalPreset(MAX_INTERVAL_MINUTES).key).toBe('1y');
  });

  it('snaps an interval that is not a preset to the nearest preset', () => {
    expect(nearestIntervalPreset(90).key).toBe('1h');
    expect(nearestIntervalPreset(5 * DAY_MINUTES).key).toBe('3d');
    expect(nearestIntervalPreset(21 * DAY_MINUTES).key).toBe('2w');
    expect(nearestIntervalPreset(100 * DAY_MINUTES).key).toBe('90d');
  });

  it('formats intervals with friendly labels', () => {
    expect(formatInterval(HOUR_MINUTES)).toBe('1 hour');
    expect(formatInterval(DAY_MINUTES)).toBe('1 day');
    expect(formatInterval(7 * DAY_MINUTES)).toBe('1 week');
    expect(formatInterval(14 * DAY_MINUTES)).toBe('2 weeks');
    expect(formatInterval(30 * DAY_MINUTES)).toBe('30 days');
    expect(formatInterval(60 * DAY_MINUTES)).toBe('2 months');
    expect(formatInterval(90 * DAY_MINUTES)).toBe('3 months');
    expect(formatInterval(180 * DAY_MINUTES)).toBe('6 months');
    expect(formatInterval(MAX_INTERVAL_MINUTES)).toBe('1 year');
  });

  it('formats intervals that are not presets', () => {
    expect(formatInterval(21 * DAY_MINUTES)).toBe('3 weeks');
    expect(formatInterval(5 * DAY_MINUTES)).toBe('5 days');
    expect(formatInterval(2 * HOUR_MINUTES)).toBe('2 hours');
    expect(formatInterval(90)).toBe('90 minutes');
  });

  it('formats durations with the two largest units', () => {
    expect(formatDuration(2 * DAY_MS + 3 * HOUR_MS + 5 * MINUTE_MS)).toBe('2 days 3 hours');
    expect(formatDuration(HOUR_MS + 30 * MINUTE_MS)).toBe('1 hour 30 minutes');
    expect(formatDuration(DAY_MS)).toBe('1 day');
    expect(formatDuration(30_000)).toBe('less than a minute');
    expect(formatDuration(-5)).toBe('less than a minute');
  });
});

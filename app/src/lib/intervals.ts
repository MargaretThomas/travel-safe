import { plural } from '@/i18n/format';
import { strings } from '@/i18n/strings';

export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

export const HOUR_MINUTES = 60;
export const DAY_MINUTES = 24 * HOUR_MINUTES;

export const MIN_INTERVAL_MINUTES = HOUR_MINUTES;
export const MAX_INTERVAL_MINUTES = 365 * DAY_MINUTES;
export const DEFAULT_INTERVAL_MINUTES = 7 * DAY_MINUTES;

/** `key` is the i18n preset id and the e2e testID suffix; `minutes` is the value it means. */
export type IntervalPresetKey =
  | '1h'
  | '1d'
  | '2d'
  | '3d'
  | '1w'
  | '2w'
  | '30d'
  | '60d'
  | '90d'
  | '180d'
  | '1y';

export type IntervalPreset = { minutes: number; key: IntervalPresetKey };

export const INTERVAL_PRESETS: readonly IntervalPreset[] = [
  { minutes: HOUR_MINUTES, key: '1h' },
  { minutes: DAY_MINUTES, key: '1d' },
  { minutes: 2 * DAY_MINUTES, key: '2d' },
  { minutes: 3 * DAY_MINUTES, key: '3d' },
  { minutes: 7 * DAY_MINUTES, key: '1w' },
  { minutes: 14 * DAY_MINUTES, key: '2w' },
  { minutes: 30 * DAY_MINUTES, key: '30d' },
  { minutes: 60 * DAY_MINUTES, key: '60d' },
  { minutes: 90 * DAY_MINUTES, key: '90d' },
  { minutes: 180 * DAY_MINUTES, key: '180d' },
  { minutes: MAX_INTERVAL_MINUTES, key: '1y' },
];

export function isValidInterval(minutes: number): boolean {
  return Number.isInteger(minutes) && minutes >= MIN_INTERVAL_MINUTES && minutes <= MAX_INTERVAL_MINUTES;
}

/**
 * Server payloads are cast, not parsed, so `check_in_interval_minutes` can arrive missing,
 * as a string, or outside the supported range. Everything downstream multiplies it, so a
 * value like `undefined` silently becomes NaN and NaN survives every comparison that
 * would otherwise catch it. Normalise at the boundary instead.
 */
export function normalizeIntervalMinutes(value: unknown, fallback = DEFAULT_INTERVAL_MINUTES): number {
  return isValidInterval(value as number) ? (value as number) : fallback;
}

export function intervalDurationMs(minutes: number): number {
  return minutes * MINUTE_MS;
}

export function intervalPreset(minutes: number): IntervalPreset | undefined {
  return INTERVAL_PRESETS.find((preset) => preset.minutes === minutes);
}

export function computeDeadline(lastCheckIn: Date, intervalMinutes: number): Date {
  if (!isValidInterval(intervalMinutes)) throw new RangeError(`Invalid interval: ${intervalMinutes}`);
  return new Date(lastCheckIn.getTime() + intervalDurationMs(intervalMinutes));
}

/** Mirrors the backend rule: a check-in exactly at the deadline is on time. */
export function isExpired(deadline: Date | null, now: Date): boolean {
  return deadline !== null && now.getTime() > deadline.getTime();
}

export function formatInterval(minutes: number): string {
  const preset = intervalPreset(minutes);
  if (preset) return strings.intervals.presets[preset.key];
  if (minutes >= DAY_MINUTES) {
    if (minutes % MAX_INTERVAL_MINUTES === 0) return plural(strings.units.year, minutes / MAX_INTERVAL_MINUTES);
    if (minutes % (7 * DAY_MINUTES) === 0) return plural(strings.units.week, minutes / (7 * DAY_MINUTES));
    return plural(strings.units.day, Math.round(minutes / DAY_MINUTES));
  }
  if (minutes % HOUR_MINUTES === 0) return plural(strings.units.hour, minutes / HOUR_MINUTES);
  return plural(strings.units.minute, minutes);
}

/** Human duration using the two largest units, e.g. "2 days 3 hours". */
export function formatDuration(ms: number): string {
  const safe = Math.max(0, ms);
  if (safe < MINUTE_MS) return strings.units.lessThanMinute;
  const days = Math.floor(safe / DAY_MS);
  const hours = Math.floor((safe % DAY_MS) / HOUR_MS);
  const minutes = Math.floor((safe % HOUR_MS) / MINUTE_MS);
  const parts: string[] = [];
  if (days > 0) parts.push(plural(strings.units.day, days));
  if (hours > 0) parts.push(plural(strings.units.hour, hours));
  if (days === 0 && minutes > 0) parts.push(plural(strings.units.minute, minutes));
  return parts.slice(0, 2).join(' ');
}

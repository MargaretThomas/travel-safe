import type { LocalSnapshot } from '@/db/repository';
import { DAY_MINUTES } from '@/lib/intervals';

/** The Keychain key the app's state used to live under, kept for the one-shot SQLite import. */
export const APP_STATE_KEY = 'app-state';

/** Persisted state written before sub-day intervals existed kept the interval in days. */
export type StoredState = Partial<LocalSnapshot> & { intervalDays?: number };

/**
 * Reading a stale `intervalDays` as minutes would be catastrophic, and leaving it out
 * would show the default interval until the next successful sync, which reads as
 * "safer than it is" while offline.
 */
export function migratePersistedState(saved: StoredState | null): Partial<LocalSnapshot> {
  if (!saved) return {};
  if (saved.intervalMinutes !== undefined || saved.intervalDays === undefined) return saved;
  const { intervalDays, ...rest } = saved;
  return { ...rest, intervalMinutes: intervalDays * DAY_MINUTES };
}

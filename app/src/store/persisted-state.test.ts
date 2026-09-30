import { DAY_MINUTES } from '@/lib/intervals';

import { migratePersistedState } from './persisted-state';

describe('migratePersistedState', () => {
  it('converts a legacy day interval to minutes', () => {
    expect(migratePersistedState({ name: 'Thandi', intervalDays: 30 })).toEqual({
      name: 'Thandi',
      intervalMinutes: 30 * DAY_MINUTES,
    });
  });

  it('leaves current state alone, even when a stale day value is also present', () => {
    expect(migratePersistedState({ intervalMinutes: 60, intervalDays: 30 })).toEqual({
      intervalMinutes: 60,
      intervalDays: 30,
    });
  });

  it('handles missing state and state with no interval at all', () => {
    expect(migratePersistedState(null)).toEqual({});
    expect(migratePersistedState({ name: 'Thandi' })).toEqual({ name: 'Thandi' });
  });
});

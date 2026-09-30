import { createFakeRepository } from '@/db/fake-repository';
import { LOCAL_USER_ID } from '@/db/repository';
import { createJsonStore, createMemoryBackend, type JsonStore } from '@/lib/secure-storage';
import { DEFAULT_INTERVAL_MINUTES } from '@/lib/intervals';

import { APP_STATE_KEY } from '@/store/persisted-state';

import { importKeychainAppState, KEYCHAIN_IMPORT, snapshotFromStored } from './keychain-import';

const NOW = new Date('2026-02-03T08:00:00Z');
const NOW_ISO = NOW.toISOString();

const contact = {
  id: 'k1',
  name: 'Sipho',
  email: 'sipho@example.com',
  phone: null,
  whatsapp: false,
  created_at: NOW_ISO,
  updated_at: NOW_ISO,
};

async function setup(stored: unknown = null) {
  const backend = createMemoryBackend();
  const keychain = createJsonStore(backend);
  if (stored !== null) await keychain.set(APP_STATE_KEY, stored);
  const repository = createFakeRepository();
  return {
    keychain,
    backend,
    repository,
    run: () => importKeychainAppState({ repository, keychain, now: () => NOW }),
  };
}

describe('snapshotFromStored', () => {
  it('converts a legacy day interval to minutes', () => {
    expect(snapshotFromStored({ name: 'Thandi', intervalDays: 30 }).intervalMinutes).toBe(30 * 1440);
  });

  it('keeps a current minute interval even when a stale day value is also present', () => {
    expect(snapshotFromStored({ intervalMinutes: 60, intervalDays: 30 }).intervalMinutes).toBe(60);
  });

  it('falls back to the default interval when the stored state has none', () => {
    expect(snapshotFromStored({ name: 'Thandi' }).intervalMinutes).toBe(DEFAULT_INTERVAL_MINUTES);
  });

  it('returns a complete snapshot for a missing blob', () => {
    const snapshot = snapshotFromStored(null);
    expect(snapshot.contacts).toEqual([]);
    expect(snapshot.pending).toEqual([]);
    expect(snapshot.status).toBeNull();
    expect(snapshot.security).toEqual({ protectSettings: true, protectCheckIn: false });
  });
});

describe('importKeychainAppState', () => {
  it('writes a blob into rows, then removes the keychain copy', async () => {
    const { keychain, repository, run } = await setup({
      name: 'Thandi',
      onboardingComplete: true,
      intervalDays: 30,
      contacts: [contact],
    });
    await expect(run()).resolves.toEqual({ imported: true });

    expect(repository.state.name).toBe('Thandi');
    expect(repository.state.onboardingComplete).toBe(true);
    expect(repository.state.intervalMinutes).toBe(30 * 1440);
    expect(repository.state.contacts).toEqual([contact]);
    // The blob is only dropped after the rows are committed.
    expect(await keychain.get(APP_STATE_KEY)).toBeNull();
  });

  it('records the migration so it never runs twice', async () => {
    const { repository, run } = await setup({ name: 'Thandi', contacts: [contact] });
    await run();
    expect(repository.state.migrations).toContain(KEYCHAIN_IMPORT);

    // A second launch must not resurrect the old values over newer ones.
    repository.state.name = 'Renamed';
    await expect(run()).resolves.toEqual({ imported: false });
    expect(repository.state.name).toBe('Renamed');
  });

  it('still records the migration when there is nothing to import', async () => {
    const { repository, run } = await setup();
    await expect(run()).resolves.toEqual({ imported: false });
    expect(repository.state.migrations).toContain(KEYCHAIN_IMPORT);
  });

  it('survives an unreadable keychain entry', async () => {
    const keychain: JsonStore = {
      get: async () => {
        throw new Error('keychain locked');
      },
      set: async () => undefined,
      remove: async () => undefined,
    };
    const repository = createFakeRepository();
    await expect(importKeychainAppState({ repository, keychain, now: () => NOW })).resolves.toEqual({
      imported: false,
    });
  });

  it('attaches contacts and pending check-ins to the placeholder user before registration', async () => {
    const { repository, run } = await setup({
      name: 'Thandi',
      contacts: [contact],
      pending: [
        {
          clientId: 'c1',
          occurredAt: NOW_ISO,
          createdAt: NOW_ISO,
          attempts: 0,
          payload: { latitude: 1, longitude: 2, accuracyM: 5, recordedAt: NOW_ISO },
        },
      ],
    });
    await run();
    expect(await repository.currentUserId()).toBe(LOCAL_USER_ID);
    expect(repository.state.pending).toHaveLength(1);
  });

  it('does not create a placeholder user when there is nothing account-scoped to store', async () => {
    const { repository, run } = await setup({ name: 'Thandi', onboardingComplete: true });
    await run();
    expect(await repository.currentUserId()).toBe(LOCAL_USER_ID);
    expect(repository.state.users).toEqual([]);
  });
});

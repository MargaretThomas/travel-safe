import { createFakeRepository } from '@/db/fake-repository';
import { INITIAL_SNAPSHOT, type LocalSnapshot } from '@/db/repository';
import { AuthFailedError } from '@/lib/api/auth-session';
import { ApiError, NetworkError } from '@/lib/api/client';
import type { CheckInResponse, DeadmanApi, FullStatus, SwitchStatus } from '@/lib/api/deadman-api';
import type { EmergencyContact } from '@/lib/contacts';

import { createAppStore, type AppStoreDeps } from './app-store';

const NOW = new Date('2026-01-10T09:00:00Z');

const armed: SwitchStatus = {
  state: 'armed',
  check_in_interval_minutes: 7 * 1440,
  last_check_in_at: '2026-01-10T09:00:00.000000Z',
  next_deadline_at: '2026-01-17T09:00:00.000000Z',
  seconds_remaining: 7 * 86400,
  deadline_passed: false,
  contact_count: 0,
  server_time: '2026-01-10T09:00:00.000000Z',
};
const fullStatus: FullStatus = { ...armed, latest_event: null };

const profile = {
  id: 'u',
  name: 'Thandi',
  timezone: null,
  check_in_interval_minutes: 7 * 1440,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

function checkInResponse(resolved: string[] = []): CheckInResponse {
  return {
    check_in: { id: 'c', client_id: 'x', received_at: armed.server_time, deadline_at: armed.next_deadline_at! },
    created: true,
    resolved_event_ids: resolved,
    status: armed,
  };
}

const contact: EmergencyContact = {
  id: 'k1',
  name: 'Sipho',
  email: 'sipho@example.com',
  phone: null,
  whatsapp: false,
  created_at: armed.server_time,
  updated_at: armed.server_time,
};

function setup(
  apiOverrides: Partial<Record<keyof DeadmanApi, jest.Mock>> = {},
  registered = true,
  snapshot: Partial<LocalSnapshot> = {},
) {
  const repository = createFakeRepository({ snapshot });
  const api = {
    register: jest.fn(async () => ({})),
    getProfile: jest.fn(async () => profile),
    updateProfile: jest.fn(async (patch: { name?: string }) => ({ ...profile, name: patch.name ?? 'Thandi' })),
    deleteProfile: jest.fn(async () => ({ archived: true, purge_after: '' })),
    logout: jest.fn(),
    checkIn: jest.fn(async () => checkInResponse()),
    getStatus: jest.fn(async () => fullStatus),
    listContacts: jest.fn(async () => [contact]),
    addContact: jest.fn(async () => contact),
    updateContact: jest.fn(async () => ({ ...contact, name: 'Sipho D' })),
    deleteContact: jest.fn(async () => undefined),
    uploadLocations: jest.fn(),
    ...apiOverrides,
  };
  const reminders = {
    schedule: jest.fn(async () => 3),
    cancel: jest.fn(async () => undefined),
    notifySynced: jest.fn(async () => undefined),
  };
  const session = { hasCredentials: jest.fn(async () => registered), clear: jest.fn(async () => undefined) };
  const deps: AppStoreDeps = {
    repository: async () => repository,
    api: api as unknown as DeadmanApi,
    session,
    reminders,
    captureLocation: async () => ({ latitude: 1, longitude: 2, accuracyM: 5, recordedAt: NOW.toISOString() }),
    readDevice: async () => ({ batteryLevel: 0.5, lowPowerMode: false }),
    now: () => NOW,
    timezone: () => 'Africa/Johannesburg',
  };
  const store = createAppStore(deps);
  return { store, api, reminders, session, repository };
}

describe('app store', () => {
  it('hydrates from the database and the keychain credentials', async () => {
    const { store, repository } = setup({}, true, { name: 'Thandi', onboardingComplete: true });
    expect(repository.state.name).toBe('Thandi');
    await store.getState().hydrate();
    expect(store.getState()).toMatchObject({ hydrated: true, registered: true, name: 'Thandi', onboardingComplete: true });
  });

  it('registers with the chosen interval and timezone', async () => {
    const { store, api, repository } = setup({}, false);
    await store.getState().hydrate();
    await store.getState().register('  Thandi ');
    expect(api.register).toHaveBeenCalledWith({ name: 'Thandi', intervalMinutes: 7 * 1440, timezone: 'Africa/Johannesburg' });
    expect(store.getState()).toMatchObject({ registered: true, name: 'Thandi' });
    // The server id is adopted so later rows are keyed on the real account, not the placeholder.
    expect(repository.state.users.map((u) => u.id)).toEqual(['u']);
  });

  it('records a synced check-in and reschedules reminders', async () => {
    const { store, reminders, repository } = setup();
    await store.getState().hydrate();
    const outcome = await store.getState().checkIn();
    expect(outcome.kind).toBe('synced');
    expect(store.getState().pending).toEqual([]);
    expect(store.getState().status?.next_deadline_at).toBe(armed.next_deadline_at);
    expect(reminders.schedule).toHaveBeenCalledWith(new Date('2026-01-17T09:00:00Z'), 7 * 1440, NOW);
    expect(JSON.parse(repository.state.statusJson ?? 'null')).toBeTruthy();
  });

  it('keeps a check-in locally when the network is unavailable', async () => {
    const { store, reminders } = setup({ checkIn: jest.fn().mockRejectedValue(new NetworkError()) });
    await store.getState().hydrate();
    const outcome = await store.getState().checkIn();
    expect(outcome).toEqual({ kind: 'local', reason: 'offline' });
    expect(store.getState().pending).toHaveLength(1);
    expect(store.getState().status).toBeNull();
    expect(reminders.schedule).not.toHaveBeenCalled();
  });

  it('syncs queued check-ins after connectivity returns and confirms to the user', async () => {
    const checkIn = jest.fn().mockRejectedValueOnce(new NetworkError()).mockResolvedValue(checkInResponse());
    const { store, reminders } = setup({ checkIn });
    await store.getState().hydrate();
    await store.getState().checkIn();
    const error = await store.getState().sync({ notifyConfirmed: true });
    expect(error).toBeNull();
    expect(store.getState().pending).toEqual([]);
    expect(reminders.notifySynced).toHaveBeenCalled();
  });

  it('restores pending check-ins after the app is reopened', async () => {
    const offline = setup({ checkIn: jest.fn().mockRejectedValue(new NetworkError()) });
    await offline.store.getState().hydrate();
    await offline.store.getState().checkIn();

    // A fresh store over the same repository stands in for the next cold start.
    const reopened = createAppStore({
      repository: async () => offline.repository,
      api: { ...offline.api, checkIn: jest.fn(async () => checkInResponse()) } as unknown as DeadmanApi,
      session: offline.session,
      reminders: offline.reminders,
      captureLocation: async () => null,
      readDevice: async () => null,
      now: () => NOW,
    });
    await reopened.getState().hydrate();
    expect(reopened.getState().pending).toHaveLength(1);
    await reopened.getState().sync();
    expect(reopened.getState().pending).toEqual([]);
  });

  it('cancels reminders when the switch is triggered', async () => {
    const { store, reminders } = setup({ getStatus: jest.fn(async () => ({ ...fullStatus, state: 'triggered' })) });
    await store.getState().hydrate();
    await store.getState().sync();
    expect(reminders.cancel).toHaveBeenCalled();
    expect(store.getState().status?.state).toBe('triggered');
  });

  it('changes the interval on the server, then refreshes status', async () => {
    const { store, api, repository } = setup({
      getStatus: jest.fn(async () => ({ ...fullStatus, check_in_interval_minutes: 30 * 1440 })),
    });
    await store.getState().hydrate();
    await store.getState().setIntervalMinutes(30 * 1440);
    expect(api.updateProfile).toHaveBeenCalledWith({ check_in_interval_minutes: 30 * 1440 });
    expect(store.getState().intervalMinutes).toBe(30 * 1440);
    expect(repository.state.intervalMinutes).toBe(30 * 1440);
  });

  it('saves an hourly interval', async () => {
    const { store, api } = setup({ getStatus: jest.fn(async () => ({ ...fullStatus, check_in_interval_minutes: 60 })) });
    await store.getState().hydrate();
    await store.getState().setIntervalMinutes(60);
    expect(api.updateProfile).toHaveBeenCalledWith({ check_in_interval_minutes: 60 });
    expect(store.getState().intervalMinutes).toBe(60);
  });

  it('propagates interval conflicts to the screen', async () => {
    const { store } = setup({
      updateProfile: jest.fn().mockRejectedValue(new ApiError('x', 409, 'interval_would_expire')),
    });
    await store.getState().hydrate();
    await expect(store.getState().setIntervalMinutes(60)).rejects.toMatchObject({ code: 'interval_would_expire' });
    expect(store.getState().intervalMinutes).toBe(7 * 1440);
  });

  it('manages contacts', async () => {
    const { store, repository } = setup();
    await store.getState().hydrate();
    await store.getState().loadContacts();
    expect(store.getState().contacts).toEqual([contact]);
    await store.getState().updateContact('k1', { name: 'Sipho D', email: 'sipho@example.com', phone: null, whatsapp: false });
    expect(store.getState().contacts[0].name).toBe('Sipho D');
    await store.getState().removeContact('k1');
    expect(store.getState().contacts).toEqual([]);
    expect(repository.state.contacts).toEqual([]);
  });

  it('keeps cached contacts when offline', async () => {
    const { store } = setup(
      { listContacts: jest.fn().mockRejectedValue(new NetworkError()) },
      true,
      { contacts: [contact] },
    );
    await store.getState().hydrate();
    await store.getState().loadContacts();
    expect(store.getState().contacts).toEqual([contact]);
    expect(store.getState().contactsError).toBe('offline');
  });

  it('falls back to onboarding when the server no longer knows the account', async () => {
    const { store, session, reminders, repository } = setup(
      { getProfile: jest.fn().mockRejectedValue(new AuthFailedError()) },
      true,
      { name: 'Thandi', onboardingComplete: true, contacts: [contact] },
    );
    await store.getState().hydrate();
    expect(store.getState().registered).toBe(false);
    expect(store.getState().onboardingComplete).toBe(false);
    expect(store.getState().name).toBeNull();
    expect(store.getState().contacts).toEqual([]);
    expect(session.clear).toHaveBeenCalled();
    expect(reminders.cancel).toHaveBeenCalled();
    expect(repository.state.contacts).toEqual([]);
  });

  it('keeps local state when the account check fails for a non-auth reason', async () => {
    const { store, session, repository } = setup(
      { getProfile: jest.fn().mockRejectedValue(new NetworkError()) },
      true,
      { name: 'Thandi', onboardingComplete: true, contacts: [contact] },
    );
    await store.getState().hydrate();
    expect(store.getState().registered).toBe(true);
    expect(store.getState().name).toBe('Thandi');
    expect(store.getState().contacts).toEqual([contact]);
    expect(session.clear).not.toHaveBeenCalled();
    expect(repository.state.contacts).toEqual([contact]);
  });

  it('sends a test alert to a phone number before it is saved', async () => {
    const testContactMessage = jest.fn(async () => ({ sent: true }));
    const { store } = setup({ testContactMessage });
    await store.getState().hydrate();
    const contact = { name: 'Sipho', email: null, phone: '+27821234567', whatsapp: false };
    await store.getState().verifyContactPhone(contact);
    expect(testContactMessage).toHaveBeenCalledWith(contact);
  });

  it('surfaces test alert failures to the form', async () => {
    const testContactMessage = jest.fn().mockRejectedValue(new ApiError('x', 503, 'whatsapp_not_connected'));
    const { store } = setup({ testContactMessage });
    await store.getState().hydrate();
    await expect(
      store.getState().verifyContactPhone({ name: 'Sipho', email: null, phone: '+27821234567', whatsapp: true }),
    ).rejects.toMatchObject({ code: 'whatsapp_not_connected' });
  });

  it('deletes the account and wipes local data', async () => {
    const { store, session, reminders, repository } = setup();
    await store.getState().hydrate();
    await store.getState().checkIn();
    await store.getState().deleteAccount();
    expect(session.clear).toHaveBeenCalled();
    expect(reminders.cancel).toHaveBeenCalled();
    expect(await repository.loadSnapshot()).toEqual(INITIAL_SNAPSHOT);
    expect(store.getState()).toMatchObject({ registered: false, onboardingComplete: false, status: null });
  });
});

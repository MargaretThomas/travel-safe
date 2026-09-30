import { createStore, type StoreApi } from 'zustand/vanilla';

import { AuthFailedError, type AuthSession } from '@/lib/api/auth-session';
import type { DeadmanApi, DeviceState, FullStatus, LocationSample } from '@/lib/api/deadman-api';
import { performCheckIn, type CheckInOutcome } from '@/lib/check-in-service';
import type { EmergencyContact, NormalizedContact } from '@/lib/contacts';
import { normalizeIntervalMinutes } from '@/lib/intervals';
import { classifySyncError, reminderTarget, syncWithServer, type SyncError } from '@/lib/sync';
import { INITIAL_SNAPSHOT, type LocalSnapshot, type Repository } from '@/db/repository';

export type SecuritySettings = LocalSnapshot['security'];

/** Re-exported so feature code and tests keep importing from the store. */
export type PersistedState = LocalSnapshot;
export const INITIAL_PERSISTED = INITIAL_SNAPSHOT;

export type ReminderPort = {
  schedule: (deadline: Date, intervalMinutes: number, now: Date) => Promise<unknown>;
  cancel: () => Promise<unknown>;
  notifySynced: (deadline: Date, now: Date) => Promise<unknown>;
};

export type AppStoreDeps = {
  /**
   * Resolved lazily rather than injected. A headless background task can reach the store
   * before the UI has opened the database, so requiring a ready repository at construction
   * time would mean ordering the two by hand at every call site.
   */
  repository: () => Promise<Repository>;
  api: DeadmanApi;
  session: Pick<AuthSession, 'hasCredentials' | 'clear'>;
  reminders: ReminderPort;
  captureLocation: () => Promise<LocationSample | null>;
  readDevice: () => Promise<DeviceState | null>;
  now?: () => Date;
  timezone?: () => string | undefined;
};

export type AppState = PersistedState & {
  hydrated: boolean;
  registered: boolean;
  syncing: boolean;
  checkingIn: boolean;
  syncError: SyncError | null;
  contactsError: SyncError | null;

  hydrate: () => Promise<void>;
  verifyAccount: () => Promise<void>;
  register: (name: string) => Promise<void>;
  updateName: (name: string) => Promise<void>;
  setIntervalMinutes: (minutes: number) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  checkIn: () => Promise<CheckInOutcome>;
  sync: (options?: { notifyConfirmed?: boolean }) => Promise<SyncError | null>;
  loadContacts: () => Promise<void>;
  addContact: (contact: NormalizedContact) => Promise<EmergencyContact>;
  updateContact: (id: string, contact: NormalizedContact) => Promise<EmergencyContact>;
  removeContact: (id: string) => Promise<void>;
  verifyContactPhone: (contact: NormalizedContact) => Promise<void>;
  updateSecurity: (patch: Partial<SecuritySettings>) => Promise<void>;
  setJourneySharing: (enabled: boolean) => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const PERSISTED_KEYS = Object.keys(INITIAL_SNAPSHOT) as (keyof LocalSnapshot)[];

function defaultTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

export function createAppStore(deps: AppStoreDeps): StoreApi<AppState> {
  const now = deps.now ?? (() => new Date());
  const timezone = deps.timezone ?? defaultTimezone;
  // Serialises writes so two rapid mutations cannot interleave their repository calls.
  let writes: Promise<void> = Promise.resolve();

  return createStore<AppState>()((set, get) => {
    function enqueueWrite(work: () => Promise<void>): Promise<void> {
      writes = writes.then(work).catch(() => undefined);
      return writes;
    }

    /**
     * Each persisted key maps to its own repository call rather than one blob write, so
     * contacts and the check-in queue become real rows instead of a JSON string that has to
     * be chunked around the Keychain's 2 KB limit.
     */
    async function persist(patch: Partial<AppState>): Promise<void> {
      const keys = PERSISTED_KEYS.filter((key) => key in patch) as (keyof LocalSnapshot)[];
      if (keys.length === 0) return;
      const next = { ...INITIAL_SNAPSHOT, ...get(), ...patch };

      await enqueueWrite(async () => {
        const repository = await deps.repository();
        if (keys.includes('name') || keys.includes('intervalMinutes') || keys.includes('profileCreatedAt')) {
          await repository.saveProfile({
            name: next.name ?? '',
            intervalMinutes: next.intervalMinutes,
            profileCreatedAt: next.profileCreatedAt,
          });
        }
        // `saveStatus` owns `lastSyncAt` too, so all three move together and cannot drift.
        if (keys.includes('status') || keys.includes('statusFetchedAt') || keys.includes('lastSyncAt')) {
          await repository.saveStatus(next.status, next.statusFetchedAt);
        }
        if (keys.includes('contacts')) {
          await repository.replaceContacts(await repository.currentUserId(), next.contacts);
        }
        if (keys.includes('pending')) {
          await repository.replacePendingCheckIns(await repository.currentUserId(), next.pending);
        }
        if (
          keys.includes('onboardingComplete') ||
          keys.includes('security') ||
          keys.includes('journeySharing')
        ) {
          await repository.saveSettings({
            onboardingComplete: next.onboardingComplete,
            protectSettings: next.security.protectSettings,
            protectCheckIn: next.security.protectCheckIn,
            journeySharing: next.journeySharing,
          });
        }
      });
    }

    async function update(patch: Partial<AppState>): Promise<void> {
      set(patch);
      await persist(patch);
    }

    async function applyReminders(status: FullStatus | null): Promise<void> {
      const target = reminderTarget(status);
      try {
        if (target) await deps.reminders.schedule(target.deadline, target.intervalMinutes, now());
        else await deps.reminders.cancel();
      } catch {
        // Notification delivery can fail (e.g. permission revoked); home shows the health warning.
      }
    }

    async function refreshContactCount(status: FullStatus | null): Promise<void> {
      if (!status) return;
      await update({ status: { ...status, contact_count: get().contacts.length } });
    }

    return {
      ...INITIAL_PERSISTED,
      hydrated: false,
      registered: false,
      syncing: false,
      checkingIn: false,
      syncError: null,
      contactsError: null,

      async hydrate() {
        const [snapshot, registered] = await Promise.all([
          deps.repository().then((r) => r.loadSnapshot()).catch(() => INITIAL_SNAPSHOT),
          deps.session.hasCredentials().catch(() => false),
        ]);
        set({ ...INITIAL_SNAPSHOT, ...snapshot, registered, hydrated: true });
        if (registered) await get().verifyAccount();
      },

      /**
       * `hasCredentials` only checks the keychain, so credentials the server no longer
       * recognises look healthy forever: every request 401s, the retry cascade in
       * AuthSession ends in AuthFailedError, and nothing ever resets. That is a dead
       * end for the user, because `register` also short-circuits on `registered`. So
       * confirm the account once per launch and fall back to onboarding when it is gone.
       *
       * Only an auth failure resets. A network or server error leaves local state alone,
       * so being offline can never cost the user their contacts or pending check-ins.
       */
      async verifyAccount() {
        const repository = await deps.repository();
        try {
          const profile = await deps.api.getProfile();
          await repository.adoptServerProfile(profile);
        } catch (error) {
          if (!(error instanceof AuthFailedError)) return;
          await deps.reminders.cancel().catch(() => undefined);
          await deps.session.clear();
          await repository.resetAll();
          set({ ...INITIAL_SNAPSHOT, registered: false, syncError: null, contactsError: null });
        }
      },

      async register(name) {
        const trimmed = name.trim();
        if (get().registered) {
          await get().updateName(trimmed);
          return;
        }
        await deps.api.register({ name: trimmed, intervalMinutes: get().intervalMinutes, timezone: timezone() });
        // Registration returns the id that every account-scoped row is keyed on, so any
        // contacts carried over from a Keychain-only install move across here.
        const profile = await deps.api.getProfile();
        await deps.repository().then((r) => r.adoptServerProfile(profile));
        await update({ name: trimmed, registered: true, profileCreatedAt: now().toISOString() });
      },

      async updateName(name) {
        const profile = await deps.api.updateProfile({ name: name.trim() });
        await update({ name: profile.name, profileCreatedAt: profile.created_at });
      },

      async setIntervalMinutes(minutes) {
        if (get().registered) {
          await deps.api.updateProfile({ check_in_interval_minutes: minutes });
          await update({ intervalMinutes: minutes });
          await get().sync();
        } else {
          await update({ intervalMinutes: minutes });
        }
      },

      async completeOnboarding() {
        await update({ onboardingComplete: true });
      },

      async checkIn() {
        set({ checkingIn: true });
        try {
          const { outcome, queue } = await performCheckIn(get().pending, {
            now,
            captureLocation: deps.captureLocation,
            readDevice: deps.readDevice,
            send: deps.api.checkIn,
          });
          if (outcome.kind === 'synced') {
            const status: FullStatus = { ...outcome.response.status, latest_event: get().status?.latest_event ?? null };
            const at = now().toISOString();
            await update({ pending: queue, status, statusFetchedAt: at, lastSyncAt: at, syncError: null });
            await applyReminders(status);
            // Pick up the resolved alert, if this check-in ended one.
            if (outcome.response.resolved_event_ids.length > 0) void get().sync();
          } else {
            await update({
              pending: queue,
              syncError: outcome.kind === 'local' ? outcome.reason : get().syncError,
            });
          }
          return outcome;
        } finally {
          set({ checkingIn: false });
        }
      },

      async sync(options = {}) {
        if (!get().registered) return null;
        set({ syncing: true });
        try {
          const result = await syncWithServer(get().pending, {
            send: deps.api.checkIn,
            getStatus: deps.api.getStatus,
            now,
          });
          const patch: Partial<AppState> = { pending: result.queue, syncError: result.error };
          if (result.status) {
            patch.status = result.status;
            patch.statusFetchedAt = result.fetchedAt?.toISOString() ?? null;
            patch.lastSyncAt = patch.statusFetchedAt;
            patch.intervalMinutes = normalizeIntervalMinutes(result.status.check_in_interval_minutes);
          }
          await update(patch);
          if (result.status) {
            await applyReminders(result.status);
            const target = reminderTarget(result.status);
            if (options.notifyConfirmed && result.confirmedCount > 0 && target) {
              await deps.reminders.notifySynced(target.deadline, now()).catch(() => undefined);
            }
          }
          return result.error;
        } finally {
          set({ syncing: false });
        }
      },

      async loadContacts() {
        if (!get().registered) return;
        try {
          const contacts = await deps.api.listContacts();
          await update({ contacts, contactsError: null });
          await refreshContactCount(get().status);
        } catch (error) {
          set({ contactsError: classifySyncError(error) });
        }
      },

      async addContact(contact) {
        const created = await deps.api.addContact(contact);
        await update({ contacts: [...get().contacts, created] });
        await refreshContactCount(get().status);
        return created;
      },

      async updateContact(id, contact) {
        const updated = await deps.api.updateContact(id, contact);
        await update({ contacts: get().contacts.map((item) => (item.id === id ? updated : item)) });
        return updated;
      },

      async verifyContactPhone(contact) {
        await deps.api.testContactMessage(contact);
      },

      async removeContact(id) {
        await deps.api.deleteContact(id);
        await update({ contacts: get().contacts.filter((item) => item.id !== id) });
        await refreshContactCount(get().status);
      },

      async updateSecurity(patch) {
        await update({ security: { ...get().security, ...patch } });
      },

      async setJourneySharing(enabled) {
        await update({ journeySharing: enabled });
      },

      async deleteAccount() {
        await deps.api.deleteProfile();
        await deps.reminders.cancel().catch(() => undefined);
        await deps.session.clear();
        await deps.repository().then((r) => r.resetAll());
        set({ ...INITIAL_SNAPSHOT, registered: false, syncError: null, contactsError: null });
      },
    };
  });
}

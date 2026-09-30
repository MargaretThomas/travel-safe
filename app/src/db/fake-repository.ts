import {
  INITIAL_SNAPSHOT,
  LOCAL_USER_ID,
  parseStatus,
  type LocalSnapshot,
  type Repository,
} from '@/db/repository';
import type { FullStatus, Profile } from '@/lib/api/deadman-api';
import type { PendingCheckIn } from '@/lib/check-in-queue';
import type { EmergencyContact } from '@/lib/contacts';
import { DEFAULT_INTERVAL_MINUTES } from '@/lib/intervals';

/**
 * Test-only in-memory stand-in for the SQLite repository.
 *
 * The real repository is a thin layer over Drizzle and the `expo-sqlite` native module, neither
 * of which exists in a Jest environment. This reproduces the behaviour the app actually
 * depends on — the settings singleton, the replace-whole semantics of the contacts and queue
 * tables, and the single-account id adoption — so store and migration logic can be tested
 * without a device. Anything that genuinely needs a SQL engine is covered by the Maestro
 * flows instead.
 */

export type FakeRepository = Repository & {
  /** Raw state, for assertions that would otherwise need to reach into SQL. */
  readonly state: FakeState;
  /** Every cache write, in order, so cache-only tables can be asserted without a database. */
  readonly calls: FakeCall[];
};

export type FakeState = {
  name: string | null;
  intervalMinutes: number;
  profileCreatedAt: string | null;
  onboardingComplete: boolean;
  protectSettings: boolean;
  protectCheckIn: boolean;
  journeySharing: boolean;
  statusJson: string | null;
  statusFetchedAt: string | null;
  lastSyncAt: string | null;
  contacts: EmergencyContact[];
  pending: PendingCheckIn[];
  users: Profile[];
  migrations: string[];
};

export type FakeCall =
  | { method: 'cacheDeadmanEvent'; value: unknown }
  | { method: 'cacheLocation'; value: unknown }
  | { method: 'cacheLastKnownLocation'; value: unknown }
  | { method: 'cacheNotification'; value: unknown }
  | { method: 'cacheEmergencyLink'; value: unknown }
  | { method: 'cacheArchivedProfile'; value: unknown };

export type FakeRepositoryOptions = { snapshot?: Partial<LocalSnapshot> };

export function createFakeRepository(options: FakeRepositoryOptions = {}): FakeRepository {
  const snapshot = { ...INITIAL_SNAPSHOT, ...options.snapshot };
  const state: FakeState = {
    name: snapshot.name,
    intervalMinutes: snapshot.intervalMinutes ?? DEFAULT_INTERVAL_MINUTES,
    profileCreatedAt: snapshot.profileCreatedAt,
    onboardingComplete: snapshot.onboardingComplete ?? false,
    protectSettings: snapshot.security?.protectSettings ?? true,
    protectCheckIn: snapshot.security?.protectCheckIn ?? false,
    journeySharing: snapshot.journeySharing ?? false,
    statusJson: snapshot.status ? JSON.stringify(snapshot.status) : null,
    statusFetchedAt: snapshot.statusFetchedAt,
    lastSyncAt: snapshot.lastSyncAt,
    contacts: [...(snapshot.contacts ?? [])],
    pending: [...(snapshot.pending ?? [])],
    users: [],
    migrations: [],
  };
  const calls: FakeCall[] = [];

  function readUser(): Profile | undefined {
    return state.users[0];
  }

  function toSnapshot(): LocalSnapshot {
    return {
      name: state.name,
      onboardingComplete: state.onboardingComplete,
      intervalMinutes: state.intervalMinutes,
      profileCreatedAt: state.profileCreatedAt,
      status: parseStatus(state.statusJson),
      statusFetchedAt: state.statusFetchedAt,
      lastSyncAt: state.lastSyncAt,
      pending: [...state.pending],
      contacts: [...state.contacts],
      security: { protectSettings: state.protectSettings, protectCheckIn: state.protectCheckIn },
      journeySharing: state.journeySharing,
    };
  }

  const repository = {
    async currentUserId(): Promise<string> {
      return readUser()?.id ?? LOCAL_USER_ID;
    },

    async ensureLocalUser(input: { name: string; intervalMinutes: number; createdAt: string }): Promise<void> {
      if (readUser()) return;
      state.users.push({
        id: LOCAL_USER_ID,
        name: input.name,
        timezone: null,
        check_in_interval_minutes: input.intervalMinutes,
        created_at: input.createdAt,
        updated_at: input.createdAt,
      });
    },

    async adoptServerProfile(profile: Profile): Promise<void> {
      const existing = readUser()?.id;
      if (existing === profile.id) {
        state.users[0] = profile;
        return;
      }
      state.users = [profile];
    },

    async loadSnapshot(): Promise<LocalSnapshot> {
      return toSnapshot();
    },

    async saveProfile(input: {
      name: string;
      intervalMinutes: number;
      profileCreatedAt?: string | null;
      profile?: Profile | null;
    }): Promise<void> {
      state.name = input.name;
      state.intervalMinutes = input.intervalMinutes;
      if (input.profileCreatedAt !== undefined) state.profileCreatedAt = input.profileCreatedAt;
      if (input.profile) {
        const index = state.users.findIndex((u) => u.id === input.profile!.id);
        if (index === -1) state.users.push(input.profile);
        else state.users[index] = input.profile;
      }
    },

    async saveSettings(patch: {
      onboardingComplete?: boolean;
      protectSettings?: boolean;
      protectCheckIn?: boolean;
      journeySharing?: boolean;
    }): Promise<void> {
      if (patch.onboardingComplete !== undefined) state.onboardingComplete = patch.onboardingComplete;
      if (patch.protectSettings !== undefined) state.protectSettings = patch.protectSettings;
      if (patch.protectCheckIn !== undefined) state.protectCheckIn = patch.protectCheckIn;
      if (patch.journeySharing !== undefined) state.journeySharing = patch.journeySharing;
    },

    async saveStatus(status: FullStatus | null, fetchedAt: string | null): Promise<void> {
      state.statusJson = status ? JSON.stringify(status) : null;
      state.statusFetchedAt = status ? fetchedAt : null;
      if (status && fetchedAt) state.lastSyncAt = fetchedAt;
    },

    async saveSyncState(lastSyncAt: string | null): Promise<void> {
      state.lastSyncAt = lastSyncAt;
    },

    async listContacts(): Promise<EmergencyContact[]> {
      return [...state.contacts];
    },

    async replaceContacts(_userId: string, contacts: readonly EmergencyContact[]): Promise<void> {
      state.contacts = [...contacts];
    },

    async upsertContact(_userId: string, contact: EmergencyContact): Promise<void> {
      const index = state.contacts.findIndex((c) => c.id === contact.id);
      if (index === -1) state.contacts.push(contact);
      else state.contacts[index] = contact;
    },

    async deleteContact(_userId: string, id: string): Promise<void> {
      state.contacts = state.contacts.filter((c) => c.id !== id);
    },

    async listPendingCheckIns(): Promise<PendingCheckIn[]> {
      return [...state.pending];
    },

    async replacePendingCheckIns(_userId: string, queue: readonly PendingCheckIn[]): Promise<void> {
      state.pending = [...queue];
    },

    async cacheDeadmanEvent(value: unknown): Promise<void> {
      calls.push({ method: 'cacheDeadmanEvent', value });
    },
    async cacheLocation(value: unknown): Promise<void> {
      calls.push({ method: 'cacheLocation', value });
    },
    async cacheLastKnownLocation(value: unknown): Promise<void> {
      calls.push({ method: 'cacheLastKnownLocation', value });
    },
    async cacheNotification(value: unknown): Promise<void> {
      calls.push({ method: 'cacheNotification', value });
    },
    async cacheEmergencyLink(value: unknown): Promise<void> {
      calls.push({ method: 'cacheEmergencyLink', value });
    },
    async cacheArchivedProfile(_userId: string, _archivedAt: string, _purgeAfter: string): Promise<void> {
      calls.push({ method: 'cacheArchivedProfile', value: { userId: _userId } });
    },

    async hasLocalMigration(id: string): Promise<boolean> {
      return state.migrations.includes(id);
    },

    async recordLocalMigration(id: string): Promise<void> {
      if (!state.migrations.includes(id)) state.migrations.push(id);
    },

    async resetAll(): Promise<void> {
      const fresh = createFakeRepository();
      Object.assign(state, fresh.state);
      calls.length = 0;
    },
  } satisfies Repository;

  return Object.assign(repository, { state, calls }) as FakeRepository;
}

import { LOCAL_USER_ID, type LocalSnapshot, type Repository } from '@/db/repository';
import { APP_STATE_KEY, migratePersistedState, type StoredState } from '@/store/persisted-state';
import type { JsonStore } from '@/lib/secure-storage';
import { DEFAULT_INTERVAL_MINUTES } from '@/lib/intervals';

/**
 * One-shot import of the app state that used to live as a single JSON blob in the Keychain.
 *
 * The order is deliberate: SQLite commits first, the migration is recorded, and only then is
 * the Keychain copy removed. If the app dies mid-import the source data is still there and
 * the next launch retries. Clearing first would make a crash unrecoverable — the user would
 * silently lose the emergency contacts who are supposed to be alerted if they miss a check-in.
 */
export const KEYCHAIN_IMPORT = 'keychain-app-state-v1';

export type KeychainImportDeps = {
  repository: Repository;
  keychain: JsonStore;
  /** Overridable so the recorded timestamps are deterministic in tests. */
  now?: () => Date;
};

export type KeychainImportResult = {
  /** Whether anything was written. False once the migration has already run. */
  imported: boolean;
};

export async function importKeychainAppState(deps: KeychainImportDeps): Promise<KeychainImportResult> {
  if (await deps.repository.hasLocalMigration(KEYCHAIN_IMPORT)) return { imported: false };

  const raw = await deps.keychain.get<StoredState>(APP_STATE_KEY).catch(() => null);
  const now = (deps.now ?? (() => new Date()))().toISOString();

  // Recorded even for an absent blob so a fresh install does not re-check on every launch.
  if (raw === null) {
    await deps.repository.recordLocalMigration(KEYCHAIN_IMPORT, now);
    return { imported: false };
  }

  const snapshot = snapshotFromStored(raw);
  await writeSnapshot(deps.repository, snapshot, now);
  await deps.repository.recordLocalMigration(KEYCHAIN_IMPORT, now);

  // Only now is it safe to drop the source.
  await deps.keychain.remove(APP_STATE_KEY).catch(() => undefined);
  return { imported: true };
}

/**
 * Reuses the pre-SQLite migration for a stale `intervalDays` value, so a Keychain blob written
 * by an older build cannot resurrect a wrong deadline.
 */
export function snapshotFromStored(saved: StoredState | null): LocalSnapshot {
  const state = migratePersistedState(saved);
  return {
    name: state.name ?? null,
    onboardingComplete: state.onboardingComplete ?? false,
    intervalMinutes: state.intervalMinutes ?? DEFAULT_INTERVAL_MINUTES,
    profileCreatedAt: state.profileCreatedAt ?? null,
    status: state.status ?? null,
    statusFetchedAt: state.statusFetchedAt ?? null,
    lastSyncAt: state.lastSyncAt ?? null,
    pending: state.pending ?? [],
    contacts: state.contacts ?? [],
    security: state.security ?? { protectSettings: true, protectCheckIn: false },
    journeySharing: state.journeySharing ?? false,
  };
}

async function writeSnapshot(repository: Repository, snapshot: LocalSnapshot, now: string): Promise<void> {
  await repository.saveSettings({
    onboardingComplete: snapshot.onboardingComplete,
    protectSettings: snapshot.security.protectSettings,
    protectCheckIn: snapshot.security.protectCheckIn,
    journeySharing: snapshot.journeySharing,
  });
  await repository.saveProfile({
    name: snapshot.name ?? '',
    intervalMinutes: snapshot.intervalMinutes,
    profileCreatedAt: snapshot.profileCreatedAt,
  });
  await repository.saveStatus(snapshot.status, snapshot.statusFetchedAt);

  // Nothing was ever associated with an account, so these attach to the placeholder user.
  if (snapshot.contacts.length > 0 || snapshot.pending.length > 0) {
    await repository.ensureLocalUser({
      name: snapshot.name ?? '',
      intervalMinutes: snapshot.intervalMinutes,
      createdAt: snapshot.profileCreatedAt ?? now,
    });
    if (snapshot.contacts.length > 0) await repository.replaceContacts(LOCAL_USER_ID, snapshot.contacts);
    if (snapshot.pending.length > 0) {
      await repository.replacePendingCheckIns(LOCAL_USER_ID, snapshot.pending);
    }
  }
}

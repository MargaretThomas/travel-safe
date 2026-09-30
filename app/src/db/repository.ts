import { and, eq, sql } from 'drizzle-orm';

import type { Database } from '@/db/client';
import {
  appState,
  archivedProfiles,
  checkIns,
  deadmanEvents,
  emergencyContacts,
  emergencyLinks,
  lastKnownLocations,
  localMigrations,
  locations,
  notificationEvents,
  users,
} from '@/db/schema';
import type { DeviceState, FullStatus, LocationSample, Profile } from '@/lib/api/deadman-api';
import type { PendingCheckIn } from '@/lib/check-in-queue';
import type { EmergencyContact, NormalizedContact } from '@/lib/contacts';
import { DEFAULT_INTERVAL_MINUTES } from '@/lib/intervals';

/**
 * All database reads and writes. Screens and the store never touch Drizzle directly, so the
 * SQL shape can change without touching feature code, and every function here is unit
 * testable against an injected `Database`.
 *
 * Timestamps cross this boundary as ISO-8601 strings because that is what the schema and the
 * API both use. Nothing here parses them into `Date`: the app treats the server clock as
 * authoritative (`lib/status.ts`), so a local `Date` conversion would only invite drift.
 */

export type SyncErrorCode = 'offline' | 'auth' | 'server';

/**
 * Contacts and check-ins are foreign-keyed to a user row, but an install that only ever used
 * the Keychain never had one: the blob stored a name and an interval long before registration
 * returned a server id. This placeholder keeps those rows referentially valid until the first
 * server profile arrives, at which point `adoptServerProfile` moves them to the real id.
 */
export const LOCAL_USER_ID = 'local';

export type SecuritySettings = { protectSettings: boolean; protectCheckIn: boolean };

/** Everything the app needs to rebuild its store after a cold start. */
export type LocalSnapshot = {
  name: string | null;
  onboardingComplete: boolean;
  intervalMinutes: number;
  profileCreatedAt: string | null;
  status: FullStatus | null;
  statusFetchedAt: string | null;
  lastSyncAt: string | null;
  pending: PendingCheckIn[];
  contacts: EmergencyContact[];
  security: SecuritySettings;
  journeySharing: boolean;
};

export const INITIAL_SNAPSHOT: LocalSnapshot = {
  name: null,
  onboardingComplete: false,
  intervalMinutes: DEFAULT_INTERVAL_MINUTES,
  profileCreatedAt: null,
  status: null,
  statusFetchedAt: null,
  lastSyncAt: null,
  pending: [],
  contacts: [],
  security: { protectSettings: true, protectCheckIn: false },
  journeySharing: false,
};

const SINGLETON_ID = 1;

// ---------------------------------------------------------------------------------------------
// Row mappers. Pure, so the snake_case <-> camelCase boundary is testable without a database.
// ---------------------------------------------------------------------------------------------

export function contactToRow(userId: string, contact: EmergencyContact) {
  return {
    id: contact.id,
    userId,
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    whatsapp: contact.whatsapp,
    created_at: contact.created_at,
    updated_at: contact.updated_at,
  };
}

export function contactFromRow(row: typeof emergencyContacts.$inferSelect): EmergencyContact {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    whatsapp: row.whatsapp,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * `flushQueue` is pure and hands back the whole remaining queue, so the queue is rewritten
 * wholesale rather than diffed. At `MAX_PENDING` (10) that costs nothing and removes a whole
 * class of "was it deleted or was it never inserted" bugs.
 */
export function checkInToRow(userId: string, item: PendingCheckIn, createdAt: string) {
  return {
    clientId: item.clientId,
    userId,
    occurredAt: item.occurredAt,
    source: 'check_in',
    attempts: item.attempts,
    lastError: null,
    latitude: item.location?.latitude ?? null,
    longitude: item.location?.longitude ?? null,
    accuracyM: item.location?.accuracyM ?? null,
    // A location without a timestamp would be undatable; the check-in time is the honest floor.
    locationRecordedAt: item.location?.recordedAt ?? null,
    batteryLevel: item.device?.batteryLevel ?? null,
    lowPowerMode: item.device?.lowPowerMode ?? null,
    createdAt,
  };
}

export function checkInFromRow(row: typeof checkIns.$inferSelect): PendingCheckIn {
  const hasLocation = row.latitude !== null && row.longitude !== null;
  const location: LocationSample | null = hasLocation
    ? {
        latitude: row.latitude as number,
        longitude: row.longitude as number,
        accuracyM: row.accuracyM,
        recordedAt: row.locationRecordedAt ?? row.occurredAt,
      }
    : null;

  const hasDevice = row.batteryLevel !== null || row.lowPowerMode !== null;
  const device: DeviceState | null = hasDevice
    ? { batteryLevel: row.batteryLevel, lowPowerMode: row.lowPowerMode }
    : null;

  return { clientId: row.clientId, occurredAt: row.occurredAt, location, device, attempts: row.attempts };
}

export function profileToRow(profile: Profile) {
  return {
    id: profile.id,
    name: profile.name,
    timezone: profile.timezone,
    check_in_interval_minutes: profile.check_in_interval_minutes,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
  };
}

/**
 * `lib/contacts.ts` still types 'sms' as a possible `Channel` even though the server dropped
 * it, so a cached row could carry it. Collapsing it to 'email' keeps the write inside the
 * schema's CHECK constraint; the display layer maps the stored channel back for rendering.
 */
export function storedChannel(channel: string): 'email' | 'whatsapp' {
  return channel === 'whatsapp' ? 'whatsapp' : 'email';
}

// ---------------------------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------------------------

/**
 * Explicit BEGIN/COMMIT rather than `db.transaction()`, which on this driver demands a
 * synchronous callback: given an async one it would commit before the returned promise
 * settled. `IMMEDIATE` takes the write lock up front, matching the backend's convention
 * (`db.py:297`), so the UI and a background task cannot interleave writes and deadlock.
 */
export async function withTransaction<T>(db: Database, work: () => Promise<T>): Promise<T> {
  await db.run(sql.raw('BEGIN IMMEDIATE'));
  try {
    const result = await work();
    await db.run(sql.raw('COMMIT'));
    return result;
  } catch (error) {
    // A failed rollback would mask the original error, which is the one worth surfacing.
    try {
      await db.run(sql.raw('ROLLBACK'));
    } catch {
      /* the transaction is already unwound */
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------------------------

export function createRepository(db: Database) {
  async function readSettings() {
    return db.select().from(appState).where(eq(appState.id, SINGLETON_ID)).get();
  }

  /** The single-row settings table is written on nearly every mutation, so it is upserted. */
  async function writeSettings(patch: Partial<typeof appState.$inferInsert>) {
    await db
      .insert(appState)
      .values({ id: SINGLETON_ID, ...patch })
      .onConflictDoUpdate({ target: appState.id, set: patch });
  }

  async function readUser() {
    return db.select().from(users).limit(1).get();
  }

  return {
    /**
     * The id that account-scoped rows hang off.
     *
     * The app is single-account, so this is whichever row exists. An install that imported
     * contacts out of the Keychain before registering has no server id yet and uses the
     * `local` placeholder; `adoptServerProfile` moves those rows across once the server
     * issues a real id.
     */
    async currentUserId(): Promise<string> {
      const user = await readUser();
      return user?.id ?? LOCAL_USER_ID;
    },

    /**
     * Creates the placeholder user row that account-scoped rows need before the first server
     * profile exists. Idempotent, so a retried import is harmless.
     */
    async ensureLocalUser(input: {
      name: string;
      intervalMinutes: number;
      createdAt: string;
    }): Promise<void> {
      await db
        .insert(users)
        .values({
          id: LOCAL_USER_ID,
          name: input.name,
          timezone: null,
          check_in_interval_minutes: input.intervalMinutes,
          created_at: input.createdAt,
          updated_at: input.createdAt,
        })
        .onConflictDoNothing();
    },

    /**
     * Takes on the server's identity for the local user row and re-points every account-scoped
     * row at it, so the placeholder id cannot linger beside a real one and split the account
     * in two. The placeholder row is removed last, so no cascade deletes what was just moved.
     */
    async adoptServerProfile(profile: Profile): Promise<void> {
      const existing = (await readUser())?.id;
      const row = profileToRow(profile);

      await withTransaction(db, async () => {
        await db
          .insert(users)
          .values(row)
          .onConflictDoUpdate({ target: users.id, set: row });

        if (existing !== undefined && existing !== profile.id) {
          await db
            .update(emergencyContacts)
            .set({ userId: profile.id })
            .where(eq(emergencyContacts.userId, existing));
          await db.update(checkIns).set({ userId: profile.id }).where(eq(checkIns.userId, existing));
          await db.update(locations).set({ userId: profile.id }).where(eq(locations.userId, existing));
          await db
            .update(lastKnownLocations)
            .set({ userId: profile.id })
            .where(eq(lastKnownLocations.userId, existing));
          await db
            .update(deadmanEvents)
            .set({ userId: profile.id })
            .where(eq(deadmanEvents.userId, existing));
          await db.delete(archivedProfiles).where(eq(archivedProfiles.userId, existing));
          await db.delete(users).where(eq(users.id, existing));
        }
      });
    },

    /** Cold-start read. Everything the store needs, in one pass. */
    async loadSnapshot(): Promise<LocalSnapshot> {
      const [settings, user, contactRows, pendingRows] = await Promise.all([
        readSettings(),
        readUser(),
        db.select().from(emergencyContacts).all(),
        db.select().from(checkIns).orderBy(checkIns.occurredAt).all(),
      ]);

      const status = parseStatus(settings?.statusJson ?? null);
      return {
        name: settings?.name ?? null,
        onboardingComplete: settings?.onboardingComplete ?? false,
        // `users` is the server-shaped replica; the settings row is the always-present local
        // mirror. Both are written together by `saveProfile`, so they cannot drift.
        intervalMinutes: settings?.intervalMinutes ?? user?.check_in_interval_minutes ?? DEFAULT_INTERVAL_MINUTES,
        profileCreatedAt: settings?.profileCreatedAt ?? null,
        status,
        statusFetchedAt: settings?.statusFetchedAt ?? null,
        lastSyncAt: settings?.lastSyncAt ?? null,
        pending: pendingRows.map(checkInFromRow),
        contacts: contactRows.map(contactFromRow),
        security: {
          protectSettings: settings?.protectSettings ?? true,
          protectCheckIn: settings?.protectCheckIn ?? false,
        },
        journeySharing: settings?.journeySharing ?? false,
      };
    },

    /** Name, interval and the server's profile row move together or not at all. */
    async saveProfile(input: {
      name: string;
      intervalMinutes: number;
      profileCreatedAt?: string | null;
      profile?: Profile | null;
    }): Promise<void> {
      await withTransaction(db, async () => {
        await writeSettings({
          name: input.name,
          intervalMinutes: input.intervalMinutes,
          ...(input.profileCreatedAt !== undefined ? { profileCreatedAt: input.profileCreatedAt } : {}),
        });
        if (input.profile) {
          await db
            .insert(users)
            .values(profileToRow(input.profile))
            .onConflictDoUpdate({ target: users.id, set: profileToRow(input.profile) });
        }
      });
    },

    async saveSettings(patch: {
      onboardingComplete?: boolean;
      protectSettings?: boolean;
      protectCheckIn?: boolean;
      journeySharing?: boolean;
    }): Promise<void> {
      await writeSettings(patch);
    },

    /** Caches the server projection. Never persisted as rows: `FullStatus` is replaced whole. */
    async saveStatus(status: FullStatus | null, fetchedAt: string | null): Promise<void> {
      await writeSettings({
        statusJson: status ? JSON.stringify(status) : null,
        statusFetchedAt: status ? fetchedAt : null,
        ...(status && fetchedAt ? { lastSyncAt: fetchedAt } : {}),
      });
    },

    async saveSyncState(lastSyncAt: string | null): Promise<void> {
      await writeSettings({ lastSyncAt });
    },

    // ---------------------------------------------------------------------------------------
    // Emergency contacts
    // ---------------------------------------------------------------------------------------

    async listContacts(): Promise<EmergencyContact[]> {
      const rows = await db.select().from(emergencyContacts).all();
      return rows.map(contactFromRow);
    },

    /**
     * Mirrors a server-authoritative contact list. The delete-then-insert runs in one
     * transaction so a failure mid-list can never leave a partial set of a user's emergency
     * contacts, which would silently stop alerts going to someone.
     */
    async replaceContacts(userId: string, contacts: readonly EmergencyContact[]): Promise<void> {
      await withTransaction(db, async () => {
        await db.delete(emergencyContacts).where(eq(emergencyContacts.userId, userId));
        if (contacts.length > 0) {
          await db.insert(emergencyContacts).values(contacts.map((c) => contactToRow(userId, c)));
        }
      });
    },

    async upsertContact(userId: string, contact: EmergencyContact): Promise<void> {
      const row = contactToRow(userId, contact);
      await db
        .insert(emergencyContacts)
        .values(row)
        .onConflictDoUpdate({ target: emergencyContacts.id, set: row });
    },

    async deleteContact(userId: string, id: string): Promise<void> {
      await db.delete(emergencyContacts).where(and(eq(emergencyContacts.userId, userId), eq(emergencyContacts.id, id)));
    },

    // ---------------------------------------------------------------------------------------
    // Offline check-in queue
    // ---------------------------------------------------------------------------------------

    async listPendingCheckIns(): Promise<PendingCheckIn[]> {
      const rows = await db.select().from(checkIns).orderBy(checkIns.occurredAt).all();
      return rows.map(checkInFromRow);
    },

    /**
     * Rewrites the whole queue. A row exists only while unsent, so a confirmed or
     * permanently-rejected check-in leaves the table entirely.
     */
    async replacePendingCheckIns(userId: string, queue: readonly PendingCheckIn[]): Promise<void> {
      await withTransaction(db, async () => {
        await db.delete(checkIns).where(eq(checkIns.userId, userId));
        if (queue.length > 0) {
          const newest = queue[queue.length - 1];
          await db.insert(checkIns).values(queue.map((item) => checkInToRow(userId, item, newest.occurredAt)));
        }
      });
    },

    // ---------------------------------------------------------------------------------------
    // Read-only server caches. Written only from API responses, never from local edits.
    // ---------------------------------------------------------------------------------------

    async cacheDeadmanEvent(event: {
      id: string;
      userId: string;
      deadlineAt: string;
      triggeredAt: string;
      status: string;
      resolvedAt: string | null;
      lastCheckInAt?: string | null;
      locationPurgeAfter?: string | null;
    }): Promise<void> {
      await db
        .insert(deadmanEvents)
        .values({
          id: event.id,
          userId: event.userId,
          deadlineAt: event.deadlineAt,
          triggeredAt: event.triggeredAt,
          status: event.status,
          resolvedAt: event.resolvedAt,
          lastCheckInAt: event.lastCheckInAt ?? null,
          locationPurgeAfter: event.locationPurgeAfter ?? event.triggeredAt,
        })
        .onConflictDoUpdate({
          target: deadmanEvents.id,
          set: { status: event.status, resolvedAt: event.resolvedAt },
        });
    },

    async cacheLocation(point: {
      id: string;
      userId: string;
      latitude: number;
      longitude: number;
      accuracyM?: number | null;
      recordedAt: string;
      receivedAt: string;
      source: string;
      deadmanEventId?: string | null;
    }): Promise<void> {
      await db.insert(locations).values(point).onConflictDoNothing();
    },

    async cacheLastKnownLocation(userId: string, point: {
      latitude: number;
      longitude: number;
      accuracyM?: number | null;
      recordedAt: string;
      receivedAt: string;
    }): Promise<void> {
      await db.insert(lastKnownLocations).values({ userId, ...point }).onConflictDoUpdate({
        target: lastKnownLocations.userId,
        set: point,
      });
    },

    async cacheNotification(input: {
      id: string;
      deadmanEventId: string;
      contactId?: string | null;
      channel: string;
      recipient: string;
      recipientName: string;
      status: string;
      failureReason?: string | null;
      sentAt?: string | null;
      createdAt: string;
      updatedAt: string;
    }): Promise<void> {
      const row = {
        id: input.id,
        deadmanEventId: input.deadmanEventId,
        contactId: input.contactId ?? null,
        channel: storedChannel(input.channel),
        recipient: input.recipient,
        recipientName: input.recipientName,
        status: input.status,
        failureReason: input.failureReason ?? null,
        sentAt: input.sentAt ?? null,
        createdAt: input.createdAt,
        updatedAt: input.updatedAt,
      };
      await db
        .insert(notificationEvents)
        .values(row)
        .onConflictDoUpdate({ target: notificationEvents.id, set: row });
    },

    async cacheEmergencyLink(link: {
      id: string;
      deadmanEventId: string;
      notificationEventId?: string | null;
      tokenHash: string;
      createdAt: string;
      expiresAt: string;
      revokedAt?: string | null;
      lastAccessedAt?: string | null;
    }): Promise<void> {
      await db.insert(emergencyLinks).values(link).onConflictDoNothing();
    },

    async cacheArchivedProfile(userId: string, archivedAt: string, purgeAfter: string): Promise<void> {
      await db
        .insert(archivedProfiles)
        .values({ userId, archivedAt, purgeAfter })
        .onConflictDoUpdate({ target: archivedProfiles.userId, set: { archivedAt, purgeAfter } });
    },

    // ---------------------------------------------------------------------------------------
    // Local bookkeeping
    // ---------------------------------------------------------------------------------------

    async hasLocalMigration(id: string): Promise<boolean> {
      const row = await db.select().from(localMigrations).where(eq(localMigrations.id, id)).get();
      return row !== undefined;
    },

    async recordLocalMigration(id: string, appliedAt: string): Promise<void> {
      await db.insert(localMigrations).values({ id, appliedAt }).onConflictDoNothing();
    },

    /**
     * Wipes every table, including the settings singleton and the local migration log. Used
     * when the account is gone or deleted: the app must not keep serving stale contacts, a
     * stale check-in deadline or a stale profile that the server no longer recognises.
     */
    async resetAll(): Promise<void> {
      await withTransaction(db, async () => {
        for (const table of [
          checkIns,
          emergencyContacts,
          emergencyLinks,
          notificationEvents,
          locations,
          lastKnownLocations,
          deadmanEvents,
          archivedProfiles,
          users,
        ]) {
          await db.delete(table);
        }
        await db.delete(appState);
        await db.delete(localMigrations);
      });
    },
  };
}

export type Repository = ReturnType<typeof createRepository>;

/** `FullStatus` is cached as text, so a corrupt or hand-edited row must not crash startup. */
export function parseStatus(raw: string | null): FullStatus | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FullStatus;
  } catch {
    return null;
  }
}

export type { NormalizedContact };

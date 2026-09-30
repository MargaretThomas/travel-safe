import { relations, sql } from 'drizzle-orm';
import { check, index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * Local SQLite schema. Mirrors `backend/code/deadman/db.py` so the phone holds a faithful
 * replica of the server's relational model, with two deliberate omissions:
 *
 * - `auth_sessions` — tokens never leave the Keychain (`lib/api/auth-session.ts`).
 * - `users.account_key_hash` — a server secret the app must never hold.
 *
 * Timestamps are ISO-8601 UTC `TEXT`, matching the wire format and the backend's portability
 * rule (`db.py:8-9`). They are deliberately not epoch integers: this app refuses to trust the
 * device clock for safety decisions (`lib/status.ts`), so storing anything the phone would have
 * to re-interpret invites the same bug.
 *
 * Columns the app owns but the server does not have are marked CLIENT-ONLY.
 *
 * TypeScript key casing follows the table's role. `users` and `emergency_contacts` mirror an
 * existing wire type (`Profile`, `EmergencyContact`), so they keep that type's snake_case and
 * `contactFromRow` stays a field-for-field copy. Tables with no wire type of their own use
 * camelCase to match `LocationSample` and `DeviceState`. Only the SQL column name is ever
 * snake_case, in both cases.
 */

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    timezone: text('timezone'),
    // Bounds mirror lib/intervals.ts:11-12 rather than being invented here.
    check_in_interval_minutes: integer('check_in_interval_minutes')
      .notNull()
      .default(7 * 1440),
    switch_state: text('switch_state').notNull().default('inactive'),
    last_check_in_at: text('last_check_in_at'),
    next_deadline_at: text('next_deadline_at'),
    battery_level: real('battery_level'),
    low_power_mode: integer('low_power_mode', { mode: 'boolean' }),
    device_reported_at: text('device_reported_at'),
    archived_at: text('archived_at'),
    created_at: text('created_at').notNull(),
    updated_at: text('updated_at').notNull(),
  },
  (t) => [
    check('users_interval_range', sql`${t.check_in_interval_minutes} BETWEEN 60 AND 525600`),
    check('users_switch_state', sql`${t.switch_state} IN ('inactive', 'armed', 'triggered', 'archived')`),
    check('users_battery_range', sql`${t.battery_level} IS NULL OR ${t.battery_level} BETWEEN 0 AND 1`),
    // The server keeps one users row per account; so does this replica.
    index('idx_users_state_deadline').on(t.switch_state, t.next_deadline_at),
  ],
);

export const emergencyContacts = sqliteTable(
  'emergency_contacts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    email: text('email'),
    phone: text('phone'),
    whatsapp: integer('whatsapp', { mode: 'boolean' }).notNull().default(false),
    created_at: text('created_at').notNull(),
    updated_at: text('updated_at').notNull(),
  },
  (t) => [
    // Both mirror lib/contacts.ts:61-62 so an invalid contact cannot be written locally.
    check('contacts_has_channel', sql`${t.email} IS NOT NULL OR ${t.phone} IS NOT NULL`),
    check('contacts_whatsapp_needs_phone', sql`${t.whatsapp} = 0 OR ${t.phone} IS NOT NULL`),
    index('idx_contacts_user').on(t.userId),
  ],
);

export const deadmanEvents = sqliteTable(
  'deadman_events',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    deadlineAt: text('deadline_at').notNull(),
    triggeredAt: text('triggered_at').notNull(),
    status: text('status').notNull(),
    resolvedAt: text('resolved_at'),
    lastCheckInAt: text('last_check_in_at'),
    latitude: real('latitude'),
    longitude: real('longitude'),
    accuracyM: real('accuracy_m'),
    locationRecordedAt: text('location_recorded_at'),
    address: text('address'),
    batteryLevel: real('battery_level'),
    locationPurgeAfter: text('location_purge_after').notNull(),
    locationScrubbedAt: text('location_scrubbed_at'),
  },
  (t) => [
    check('events_status', sql`${t.status} IN ('triggered', 'resolved')`),
    // One event per missed deadline per account; the server relies on this too.
    index('idx_events_user').on(t.userId, t.triggeredAt),
    uniqueIndex('idx_events_deadline').on(t.userId, t.deadlineAt),
    index('idx_events_purge').on(t.locationPurgeAfter),
  ],
);

/**
 * The offline outbox.
 *
 * A row exists only while the server has not confirmed its check-in; a confirmed or
 * permanently-rejected one is deleted, exactly as `lib/check-in-queue.ts` drops items from
 * its array. Nothing is retained for history — `users.last_check_in_at` already answers
 * "when did I last check in".
 *
 * `client_id` is the primary key because it is the idempotency key the server dedupes on
 * (`db.py:67`) and the key `lib/check-in-queue.ts` already tracks. Location and device are
 * held inline rather than in `locations` because they belong to this one payload and must
 * survive to the network intact; `locations` is the separate server-confirmed history.
 */
export const checkIns = sqliteTable(
  'check_ins',
  {
    clientId: text('client_id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    occurredAt: text('occurred_at').notNull(),
    source: text('source').notNull().default('check_in'),
    /** CLIENT-ONLY */
    attempts: integer('attempts').notNull().default(0),
    /** CLIENT-ONLY — why the last flush stopped, from `lib/sync.ts`'s SyncError. */
    lastError: text('last_error'),
    /** CLIENT-ONLY — the unsent payload from `CheckInPayload.location`. */
    latitude: real('latitude'),
    longitude: real('longitude'),
    accuracyM: real('accuracy_m'),
    locationRecordedAt: text('location_recorded_at'),
    /** CLIENT-ONLY — the unsent payload from `CheckInPayload.device`. */
    batteryLevel: real('battery_level'),
    lowPowerMode: integer('low_power_mode', { mode: 'boolean' }),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    check('check_ins_source', sql`${t.source} IN ('check_in', 'foreground', 'background')`),
    check('check_ins_error', sql`${t.lastError} IS NULL OR ${t.lastError} IN ('offline', 'auth', 'server')`),
    check('check_ins_attempts', sql`${t.attempts} >= 0`),
    check(
      'check_ins_location_complete',
      sql`(${t.latitude} IS NULL AND ${t.longitude} IS NULL) OR (${t.latitude} IS NOT NULL AND ${t.longitude} IS NOT NULL)`,
    ),
    // Oldest first is the flush order in lib/check-in-queue.ts.
    index('idx_check_ins_queue').on(t.userId, t.occurredAt),
  ],
);

export const locations = sqliteTable(
  'locations',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),
    accuracyM: real('accuracy_m'),
    recordedAt: text('recorded_at').notNull(),
    receivedAt: text('received_at').notNull(),
    source: text('source').notNull(),
    deadmanEventId: text('deadman_event_id').references(() => deadmanEvents.id, {
      onDelete: 'set null',
    }),
  },
  (t) => [
    check('locations_source', sql`${t.source} IN ('check_in', 'foreground', 'background')`),
    check('locations_lat_range', sql`${t.latitude} BETWEEN -90 AND 90`),
    check('locations_lng_range', sql`${t.longitude} BETWEEN -180 AND 180`),
    index('idx_locations_user_recorded').on(t.userId, t.recordedAt),
    index('idx_locations_recorded').on(t.recordedAt),
    index('idx_locations_event').on(t.deadmanEventId),
  ],
);

export const lastKnownLocations = sqliteTable('last_known_locations', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  accuracyM: real('accuracy_m'),
  recordedAt: text('recorded_at').notNull(),
  receivedAt: text('received_at').notNull(),
});

/**
 * `channel` intentionally excludes 'sms': the server dropped it (`db.py:159-162`) even though
 * `lib/contacts.ts` still types it as a possible `Channel`. The mapper coerces a legacy value
 * to 'sms' for display only, so an unexpected row can never violate this constraint.
 */
export const notificationEvents = sqliteTable(
  'notification_events',
  {
    id: text('id').primaryKey(),
    deadmanEventId: text('deadman_event_id')
      .notNull()
      .references(() => deadmanEvents.id, { onDelete: 'cascade' }),
    contactId: text('contact_id').references(() => emergencyContacts.id, { onDelete: 'set null' }),
    notificationType: text('notification_type').notNull().default('emergency_alert'),
    channel: text('channel').notNull(),
    recipient: text('recipient').notNull(),
    recipientName: text('recipient_name').notNull(),
    status: text('status').notNull().default('pending'),
    retryable: integer('retryable', { mode: 'boolean' }).notNull().default(true),
    attempts: integer('attempts').notNull().default(0),
    providerMessageId: text('provider_message_id'),
    failureReason: text('failure_reason'),
    createdAt: text('created_at').notNull(),
    sentAt: text('sent_at'),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    check('notification_channel', sql`${t.channel} IN ('email', 'whatsapp')`),
    check(
      'notification_status',
      sql`${t.status} IN ('pending', 'sending', 'sent', 'delivered', 'failed', 'cancelled')`,
    ),
    index('idx_notifications_status').on(t.status),
    index('idx_notifications_provider').on(t.providerMessageId),
    uniqueIndex('idx_notifications_event_contact').on(t.deadmanEventId, t.contactId, t.channel),
  ],
);

export const emergencyLinks = sqliteTable(
  'emergency_links',
  {
    id: text('id').primaryKey(),
    deadmanEventId: text('deadman_event_id')
      .notNull()
      .references(() => deadmanEvents.id, { onDelete: 'cascade' }),
    notificationEventId: text('notification_event_id').references(() => notificationEvents.id, {
      onDelete: 'set null',
    }),
    tokenHash: text('token_hash').notNull(),
    createdAt: text('created_at').notNull(),
    expiresAt: text('expires_at').notNull(),
    revokedAt: text('revoked_at'),
    lastAccessedAt: text('last_accessed_at'),
  },
  (t) => [
    uniqueIndex('idx_links_token_hash').on(t.tokenHash),
    index('idx_links_expiry').on(t.expiresAt),
    index('idx_links_event').on(t.deadmanEventId),
  ],
);

export const archivedProfiles = sqliteTable(
  'archived_profiles',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    archivedAt: text('archived_at').notNull(),
    purgeAfter: text('purge_after').notNull(),
  },
  (t) => [index('idx_archived_purge').on(t.purgeAfter)],
);

/**
 * The scalar half of what used to be one JSON blob in the Keychain, as a single row so Drizzle
 * types every value instead of parsing strings. `status_json` stays denormalised because
 * `FullStatus` is a server projection replaced wholesale on every sync — normalising it would
 * be work with nothing to read it.
 *
 * The `id = 1` CHECK is what makes it single-row rather than merely single-row-by-convention.
 */
export const appState = sqliteTable(
  'app_state',
  {
    id: integer('id').primaryKey(),
    name: text('name'),
    onboardingComplete: integer('onboarding_complete', { mode: 'boolean' }).notNull().default(false),
    intervalMinutes: integer('interval_minutes').notNull().default(7 * 1440),
    protectSettings: integer('protect_settings', { mode: 'boolean' }).notNull().default(true),
    protectCheckIn: integer('protect_check_in', { mode: 'boolean' }).notNull().default(false),
    journeySharing: integer('journey_sharing', { mode: 'boolean' }).notNull().default(false),
    statusJson: text('status_json'),
    statusFetchedAt: text('status_fetched_at'),
    lastSyncAt: text('last_sync_at'),
    profileCreatedAt: text('profile_created_at'),
  },
  (t) => [
    check('app_state_single_row', sql`${t.id} = 1`),
    check('app_state_interval_range', sql`${t.intervalMinutes} BETWEEN 60 AND 525600`),
  ],
);

/**
 * Records one-shot data migrations. The Keychain import clears the old blob, so it has to be
 * retryable: a crash midway must leave the source data intact and let the next launch redo it.
 */
export const localMigrations = sqliteTable('local_migrations', {
  id: text('id').primaryKey(),
  appliedAt: text('applied_at').notNull(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  emergencyContacts: many(emergencyContacts),
  checkIns: many(checkIns),
  events: many(deadmanEvents),
  locations: many(locations),
  lastKnownLocation: one(lastKnownLocations),
  archivedProfile: one(archivedProfiles),
}));

export const emergencyContactsRelations = relations(emergencyContacts, ({ one, many }) => ({
  user: one(users, { fields: [emergencyContacts.userId], references: [users.id] }),
  notifications: many(notificationEvents),
}));

export const deadmanEventsRelations = relations(deadmanEvents, ({ one, many }) => ({
  user: one(users, { fields: [deadmanEvents.userId], references: [users.id] }),
  locations: many(locations),
  notifications: many(notificationEvents),
  links: many(emergencyLinks),
}));

export const checkInsRelations = relations(checkIns, ({ one }) => ({
  user: one(users, { fields: [checkIns.userId], references: [users.id] }),
}));

export const locationsRelations = relations(locations, ({ one }) => ({
  user: one(users, { fields: [locations.userId], references: [users.id] }),
  event: one(deadmanEvents, { fields: [locations.deadmanEventId], references: [deadmanEvents.id] }),
}));

export const lastKnownLocationsRelations = relations(lastKnownLocations, ({ one }) => ({
  user: one(users, { fields: [lastKnownLocations.userId], references: [users.id] }),
}));

export const notificationEventsRelations = relations(notificationEvents, ({ one, many }) => ({
  event: one(deadmanEvents, {
    fields: [notificationEvents.deadmanEventId],
    references: [deadmanEvents.id],
  }),
  contact: one(emergencyContacts, {
    fields: [notificationEvents.contactId],
    references: [emergencyContacts.id],
  }),
  links: many(emergencyLinks),
}));

export const emergencyLinksRelations = relations(emergencyLinks, ({ one }) => ({
  event: one(deadmanEvents, { fields: [emergencyLinks.deadmanEventId], references: [deadmanEvents.id] }),
  notification: one(notificationEvents, {
    fields: [emergencyLinks.notificationEventId],
    references: [notificationEvents.id],
  }),
}));

export const archivedProfilesRelations = relations(archivedProfiles, ({ one }) => ({
  user: one(users, { fields: [archivedProfiles.userId], references: [users.id] }),
}));

export type UserRow = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;
export type EmergencyContactRow = typeof emergencyContacts.$inferSelect;
export type EmergencyContactInsert = typeof emergencyContacts.$inferInsert;
export type CheckInRow = typeof checkIns.$inferSelect;
export type CheckInInsert = typeof checkIns.$inferInsert;
export type DeadmanEventRow = typeof deadmanEvents.$inferSelect;
export type LocationRow = typeof locations.$inferSelect;
export type NotificationEventRow = typeof notificationEvents.$inferSelect;
export type EmergencyLinkRow = typeof emergencyLinks.$inferSelect;
export type ArchivedProfileRow = typeof archivedProfiles.$inferSelect;
export type LastKnownLocationRow = typeof lastKnownLocations.$inferSelect;
export type AppStateRow = typeof appState.$inferSelect;
export type AppStateInsert = typeof appState.$inferInsert;

import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';

import { getOrCreatePassphrase, keyPragma } from '@/db/passphrase';
import * as schema from '@/db/schema';

export const DATABASE_NAME = 'safe.db';

export type Database = ExpoSQLiteDatabase<typeof schema> & { $client: SQLiteDatabase };

let instance: Database | null = null;
let opening: Promise<Database> | null = null;

/**
 * Opened lazily and cached, so background tasks and headless launches get the same connection
 * the UI uses. The previous two-connection setup (a module-level `openDatabaseSync` plus a
 * `SQLiteProvider`) cannot work with SQLCipher: every connection would need its own
 * `PRAGMA key`, and nothing guaranteed it ran before the first query.
 *
 * Concurrency is handled by sharing one in-flight promise, because the store, a background
 * task and a screen can all reach for the database on the same launch.
 */
export function getDatabase(): Promise<Database> {
  if (instance) return Promise.resolve(instance);
  if (!opening) {
    opening = openDatabase().then(
      (db) => {
        instance = db;
        return db;
      },
      (error) => {
        // A failed open must not poison the cache, or the app is unrecoverable until restart.
        opening = null;
        throw error;
      },
    );
  }
  return opening;
}

async function openDatabase(): Promise<Database> {
  const sqlite = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });

  // Must precede every other statement on this connection or SQLCipher cannot read the header.
  const key = await getOrCreatePassphrase();
  sqlite.execSync(keyPragma(key));
  sqlite.execSync('PRAGMA foreign_keys = ON;');

  return drizzle(sqlite, { schema });
}

/** Test seam. Production code never closes the database. */
export function resetDatabaseForTesting(): void {
  instance = null;
  opening = null;
}

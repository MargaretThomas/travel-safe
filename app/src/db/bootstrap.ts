import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from '@/drizzle/migrations';

import { getDatabase, type Database } from '@/db/client';
import { createRepository, type Repository } from '@/db/repository';

/**
 * Opens the database, applies migrations, and makes the repository available.
 *
 * This runs before `store.hydrate()` on purpose. The previous setup called
 * `useMigrations(db, migrations)`, which starts migrating in an effect and returns
 * immediately, so the first render could query tables that did not exist yet — and its
 * `success` flag was never read, so nothing waited for it. Awaiting here means either the
 * schema is current or the app shows an error instead of rendering against a stale one.
 */
export async function bootstrapDatabase(): Promise<{ db: Database; repository: Repository }> {
  const db = await getDatabase();
  await migrate(db, migrations);
  return { db, repository: createRepository(db) };
}

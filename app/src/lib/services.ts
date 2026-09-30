import { bootstrapDatabase } from '@/db/bootstrap';
import { importKeychainAppState } from '@/db/keychain-import';
import type { Repository } from '@/db/repository';
import { AuthSession } from '@/lib/api/auth-session';
import { createDeadmanApi, type DeadmanApi } from '@/lib/api/deadman-api';
import { createJsonStore, type JsonStore } from '@/lib/secure-storage';

/**
 * Auth and API wiring. None of this touches the database, so it is built synchronously and
 * stays usable before migrations have run.
 */
export type AuthServices = {
  session: AuthSession;
  api: DeadmanApi;
  /** Keychain access, retained for auth tokens and the one-shot legacy state import. */
  keychain: JsonStore;
};

export type Services = AuthServices & { repository: Repository };

let authServices: AuthServices | null = null;
let services: Services | null = null;
let starting: Promise<Services> | null = null;

export function getAuthServices(): AuthServices {
  if (!authServices) {
    const keychain = createJsonStore();
    const session = new AuthSession(keychain);
    authServices = { session, api: createDeadmanApi(session), keychain };
  }
  return authServices;
}

/**
 * Opens the database, migrates it, and builds the repository. Async because migrations must
 * finish before anything reads a table, and a headless background task has to be able to do
 * this itself without the UI's `_layout` ever running.
 */
export function startServices(): Promise<Services> {
  if (services) return Promise.resolve(services);
  if (!starting) {
    starting = bootstrap().then(
      (next) => {
        services = next;
        return next;
      },
      (error) => {
        // A failed start must not poison the cache or the app could never recover.
        starting = null;
        throw error;
      },
    );
  }
  return starting;
}

async function bootstrap(): Promise<Services> {
  const { repository } = await bootstrapDatabase();
  const auth = getAuthServices();
  // One-shot, idempotent, and crash-safe: older installs kept the whole app state as a single
  // Keychain string, so it has to be read before anything considers SQLite authoritative.
  await importKeychainAppState({ repository, keychain: auth.keychain });
  return { ...auth, repository };
}

export function setServicesForTesting(next: Services | null): void {
  services = next;
  starting = null;
  if (next) authServices = { session: next.session, api: next.api, keychain: next.keychain };
}

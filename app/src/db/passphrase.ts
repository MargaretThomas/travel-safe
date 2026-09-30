import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/**
 * The SQLCipher passphrase.
 *
 * Contact names, phone numbers and coordinates are as sensitive as the tokens in
 * `lib/api/auth-session.ts`, so the database is encrypted with SQLCipher (enabled by the
 * `expo-sqlite` plugin in `app.json`). The passphrase is itself held in the Keychain /
 * Android Keystore, which is the same trust boundary the app already relies on for tokens.
 */

export const KEY_BYTES = 32;
export const PASSPHRASE_KEY = 'db-passphrase';

/** AFTER_FIRST_UNLOCK, matching `lib/secure-storage.ts`, so background tasks can decrypt while locked. */
const ACCESSIBLE = SecureStore.AFTER_FIRST_UNLOCK;

export type PassphraseStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

export const securePassphraseStore: PassphraseStore = {
  getItem: (key) => SecureStore.getItemAsync(key, { keychainAccessible: ACCESSIBLE }),
  setItem: (key, value) => SecureStore.setItemAsync(key, value, { keychainAccessible: ACCESSIBLE }),
};

export function toHex(bytes: Uint8Array): string {
  let hex = '';
  for (const byte of bytes) hex += byte.toString(16).padStart(2, '0');
  return hex;
}

/**
 * SQLCipher accepts a raw key as a hex literal, which sidesteps the fact that `PRAGMA key`
 * takes no bind parameters. A passphrase interpolated into SQL would be an injection
 * vector; a 64-character hex literal cannot be, so the key never touches string building.
 */
export function keyPragma(hexKey: string): string {
  return `PRAGMA key = "x'${hexKey}'";`;
}

/** 64 hex characters, or nothing — anything else is corrupt and must not be used as a key. */
export function isValidHexKey(value: string | null): value is string {
  return value !== null && /^[0-9a-f]{64}$/.test(value);
}

/**
 * Reads the existing passphrase, generating and storing one on first run.
 *
 * A generated key is random rather than derived, so losing it makes the database permanently
 * unreadable. That is deliberate: this app must fail closed rather than quietly serve stale
 * contacts and a stale check-in deadline while reporting a healthy status.
 */
export async function getOrCreatePassphrase(
  store: PassphraseStore = securePassphraseStore,
  randomBytes: (count: number) => Uint8Array = Crypto.getRandomBytes,
): Promise<string> {
  const existing = await store.getItem(PASSPHRASE_KEY);
  if (isValidHexKey(existing)) return existing;

  const generated = toHex(randomBytes(KEY_BYTES));
  if (!isValidHexKey(generated)) throw new Error('Generated an invalid database key');
  await store.setItem(PASSPHRASE_KEY, generated);
  return generated;
}

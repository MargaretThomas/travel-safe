import {
  getOrCreatePassphrase,
  isValidHexKey,
  KEY_BYTES,
  keyPragma,
  PASSPHRASE_KEY,
  toHex,
  type PassphraseStore,
} from './passphrase';

function memoryStore(initial: string | null = null) {
  const values = new Map<string, string>();
  if (initial !== null) values.set(PASSPHRASE_KEY, initial);
  const store: PassphraseStore & { values: Map<string, string> } = {
    values,
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => {
      values.set(key, value);
    },
  };
  return store;
}

const bytes = (fill: number) => new Uint8Array(KEY_BYTES).fill(fill);

describe('toHex', () => {
  it('pads single-digit bytes so every byte is two characters', () => {
    expect(toHex(new Uint8Array([0, 1, 15, 16, 255]))).toBe('00010f10ff');
  });

  it('produces 64 characters for a 32-byte key', () => {
    expect(toHex(bytes(0xab))).toHaveLength(KEY_BYTES * 2);
  });
});

describe('keyPragma', () => {
  it('passes the key as a hex literal rather than interpolated text', () => {
    expect(keyPragma('ab'.repeat(32))).toBe(`PRAGMA key = "x'${'ab'.repeat(32)}'";`);
  });
});

describe('isValidHexKey', () => {
  it('accepts exactly 64 lowercase hex characters', () => {
    expect(isValidHexKey('f0'.repeat(32))).toBe(true);
  });

  it('rejects anything else, including uppercase and wrong lengths', () => {
    expect(isValidHexKey(null)).toBe(false);
    expect(isValidHexKey('')).toBe(false);
    expect(isValidHexKey('AB'.repeat(32))).toBe(false);
    expect(isValidHexKey('f0'.repeat(31))).toBe(false);
    expect(isValidHexKey(`${'f0'.repeat(32)}'`)).toBe(false);
  });
});

describe('getOrCreatePassphrase', () => {
  it('generates and stores a key on first run', async () => {
    const store = memoryStore();
    const randomBytes = jest.fn(() => bytes(0x11));
    const key = await getOrCreatePassphrase(store, randomBytes);
    expect(randomBytes).toHaveBeenCalledWith(KEY_BYTES);
    expect(key).toBe('11'.repeat(32));
    expect(store.values.get(PASSPHRASE_KEY)).toBe(key);
  });

  it('reuses the stored key so the existing database stays readable', async () => {
    const store = memoryStore('22'.repeat(32));
    const randomBytes = jest.fn(() => bytes(0x11));
    expect(await getOrCreatePassphrase(store, randomBytes)).toBe('22'.repeat(32));
    expect(randomBytes).not.toHaveBeenCalled();
  });

  it('replaces a corrupt stored value rather than using it as a key', async () => {
    const store = memoryStore('not-a-key');
    expect(await getOrCreatePassphrase(store, () => bytes(0x33))).toBe('33'.repeat(32));
  });

  it('refuses to proceed when the random source returns the wrong length', async () => {
    const store = memoryStore();
    await expect(getOrCreatePassphrase(store, () => new Uint8Array(8))).rejects.toThrow(
      'Generated an invalid database key',
    );
    // Nothing is stored, so the next launch starts clean rather than with a short key.
    expect(store.values.has(PASSPHRASE_KEY)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/**
 * Flattens a translation tree into dotted paths. Array entries keep their index
 * so that a missing item in a stats or FAQ list is caught, not just a missing key.
 */
function flatten(value: Json, prefix = ""): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => flatten(item, `${prefix}[${index}]`));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) =>
      flatten(child as Json, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [prefix];
}

function diff(reference: string[], candidate: string[]): { missing: string[]; extra: string[] } {
  const referenceSet = new Set(reference);
  const candidateSet = new Set(candidate);
  return {
    missing: reference.filter((key) => !candidateSet.has(key)),
    extra: candidate.filter((key) => !referenceSet.has(key)),
  };
}

describe("translation catalogs", () => {
  const english = flatten(en as Json);

  it("has no duplicate keys in English", () => {
    expect(new Set(english).size).toBe(english.length);
  });

  it("Spanish has exactly the same keys as English", () => {
    const { missing, extra } = diff(english, flatten(es as Json));
    expect(missing, `Missing Spanish keys: ${missing.join(", ")}`).toEqual([]);
    expect(extra, `Unexpected Spanish keys: ${extra.join(", ")}`).toEqual([]);
  });

  it("French has exactly the same keys as English", () => {
    const { missing, extra } = diff(english, flatten(fr as Json));
    expect(missing, `Missing French keys: ${missing.join(", ")}`).toEqual([]);
    expect(extra, `Unexpected French keys: ${extra.join(", ")}`).toEqual([]);
  });

  it("has no empty translations", () => {
    for (const [name, catalog] of Object.entries({ en, es, fr })) {
      const flattenEntries = (value: Json, prefix = ""): Array<[string, Json]> => {
        if (Array.isArray(value)) {
          return value.flatMap((item, index) => flattenEntries(item, `${prefix}[${index}]`));
        }
        if (value && typeof value === "object") {
          return Object.entries(value).flatMap(([key, child]) =>
            flattenEntries(child as Json, prefix ? `${prefix}.${key}` : key),
          );
        }
        return [[prefix, value]];
      };

      for (const [key, value] of flattenEntries(catalog as Json)) {
        if (typeof value === "number") continue;
        expect(typeof value, `${name}.${key} should be text or a number`).toBe("string");
        if (key.endsWith(".suffix")) continue;
        expect((value as string).trim().length, `${name}.${key} is empty`).toBeGreaterThan(0);
      }
    }
  });
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  SOUND_STORAGE_KEY,
  readSoundPreference,
  writeSoundPreference,
} from "./sound-settings";

function createMockStorage(initial?: Record<string, string>): Storage {
  const store = new Map<string, string>(Object.entries(initial ?? {}));
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
}

test("readSoundPreference defaults to true when storage is empty or inaccessible", () => {
  assert.equal(readSoundPreference(null), true);
  assert.equal(readSoundPreference(createMockStorage()), true);
  const throwingStorage = {
    getItem: () => {
      throw new Error("SecurityError: blocked storage");
    },
  } as unknown as Storage;
  assert.equal(readSoundPreference(throwingStorage), true);
});

test("readSoundPreference parses stored sound states correctly", () => {
  assert.equal(
    readSoundPreference(createMockStorage({ [SOUND_STORAGE_KEY]: "off" })),
    false,
  );
  assert.equal(
    readSoundPreference(createMockStorage({ [SOUND_STORAGE_KEY]: "false" })),
    false,
  );
  assert.equal(
    readSoundPreference(createMockStorage({ [SOUND_STORAGE_KEY]: "on" })),
    true,
  );
  assert.equal(
    readSoundPreference(createMockStorage({ [SOUND_STORAGE_KEY]: "true" })),
    true,
  );
  assert.equal(
    readSoundPreference(createMockStorage({ [SOUND_STORAGE_KEY]: "custom" })),
    true,
  );
});

test("writeSoundPreference persists sound state and survives throwing storage", () => {
  const storage = createMockStorage();
  writeSoundPreference(false, storage);
  assert.equal(storage.getItem(SOUND_STORAGE_KEY), "off");
  assert.equal(readSoundPreference(storage), false);

  writeSoundPreference(true, storage);
  assert.equal(storage.getItem(SOUND_STORAGE_KEY), "on");
  assert.equal(readSoundPreference(storage), true);

  const throwingStorage = {
    setItem: () => {
      throw new Error("QuotaExceededError");
    },
  } as unknown as Storage;
  assert.doesNotThrow(() => writeSoundPreference(false, throwingStorage));
});

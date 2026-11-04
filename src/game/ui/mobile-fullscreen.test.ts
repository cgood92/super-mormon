import assert from "node:assert/strict";
import test from "node:test";
import {
  FULLSCREEN_STORAGE_KEY,
  readFullscreenPreference,
  writeFullscreenPreference,
  isMobileScreen,
  shouldPromptFullscreenResume,
} from "./mobile-fullscreen";

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

test("readFullscreenPreference defaults to false when storage is empty or inaccessible", () => {
  assert.equal(readFullscreenPreference(null), false);
  assert.equal(readFullscreenPreference(createMockStorage()), false);
  const throwingStorage = {
    getItem: () => {
      throw new Error("SecurityError: storage disabled");
    },
  } as unknown as Storage;
  assert.equal(readFullscreenPreference(throwingStorage), false);
});

test("writeFullscreenPreference persists session state and clear operates cleanly", () => {
  const storage = createMockStorage();
  writeFullscreenPreference(true, storage);
  assert.equal(storage.getItem(FULLSCREEN_STORAGE_KEY), "on");
  assert.equal(readFullscreenPreference(storage), true);

  writeFullscreenPreference(false, storage);
  assert.equal(storage.getItem(FULLSCREEN_STORAGE_KEY), null);
  assert.equal(readFullscreenPreference(storage), false);
});

test("isMobileScreen identifies mobile via touch device or media queries", () => {
  assert.equal(isMobileScreen(undefined, "touch"), true);
  assert.equal(
    isMobileScreen(() => ({ matches: true }), "keyboard"),
    true,
  );
  assert.equal(
    isMobileScreen(() => ({ matches: false }), "keyboard"),
    false,
  );
  assert.equal(isMobileScreen(undefined, "keyboard"), false);
});

test("shouldPromptFullscreenResume only triggers when all mobile resumption criteria match", () => {
  const base = {
    started: true,
    transition: false,
    cinematic: false,
    promptOpen: false,
    wantsFullscreen: true,
    isFullscreen: false,
    isMobile: true,
  };

  assert.equal(shouldPromptFullscreenResume(base), true);

  // If game hasn't started (e.g. splash screen)
  assert.equal(
    shouldPromptFullscreenResume({ ...base, started: false }),
    false,
  );

  // If currently in world/scene transition
  assert.equal(
    shouldPromptFullscreenResume({ ...base, transition: true }),
    false,
  );

  // If currently displaying cutscene dialogue
  assert.equal(
    shouldPromptFullscreenResume({ ...base, cinematic: true }),
    false,
  );

  // If resume prompt is already open
  assert.equal(
    shouldPromptFullscreenResume({ ...base, promptOpen: true }),
    false,
  );

  // If player did not want or opt into fullscreen
  assert.equal(
    shouldPromptFullscreenResume({ ...base, wantsFullscreen: false }),
    false,
  );

  // If player is already in fullscreen
  assert.equal(
    shouldPromptFullscreenResume({ ...base, isFullscreen: true }),
    false,
  );

  // If not on mobile
  assert.equal(
    shouldPromptFullscreenResume({ ...base, isMobile: false }),
    false,
  );
});

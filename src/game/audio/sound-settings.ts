export const SOUND_STORAGE_KEY = "super-mormon-sound";

/** Reads the user's sound preference from storage, defaulting to sound enabled. */
export function readSoundPreference(storage?: Storage | null): boolean {
  try {
    const s =
      storage ?? (typeof localStorage !== "undefined" ? localStorage : null);
    const raw = s?.getItem(SOUND_STORAGE_KEY);
    if (raw === "off" || raw === "false") return false;
    return true;
  } catch {
    return true;
  }
}

/** Persists the user's sound preference to browser storage. */
export function writeSoundPreference(
  on: boolean,
  storage?: Storage | null,
): void {
  try {
    const s =
      storage ?? (typeof localStorage !== "undefined" ? localStorage : null);
    s?.setItem(SOUND_STORAGE_KEY, on ? "on" : "off");
  } catch {
    /* storage is optional */
  }
}

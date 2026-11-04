export const FULLSCREEN_STORAGE_KEY = "super-mormon-fullscreen";

/** Reads whether the user preferred fullscreen during this session. */
export function readFullscreenPreference(storage?: Storage | null): boolean {
  try {
    const s =
      storage ??
      (typeof sessionStorage !== "undefined" ? sessionStorage : null);
    return s?.getItem(FULLSCREEN_STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

/** Persists the user's session preference for playing fullscreen. */
export function writeFullscreenPreference(
  wants: boolean,
  storage?: Storage | null,
): void {
  try {
    const s =
      storage ??
      (typeof sessionStorage !== "undefined" ? sessionStorage : null);
    if (wants) {
      s?.setItem(FULLSCREEN_STORAGE_KEY, "on");
    } else {
      s?.removeItem(FULLSCREEN_STORAGE_KEY);
    }
  } catch {
    /* storage is optional */
  }
}

/**
 * Checks whether the display or input indicates a mobile device
 * using the standard Super Mormon breakpoint criteria or active touch input.
 */
export function isMobileScreen(
  matcher?: (query: string) => { matches: boolean },
  device?: string,
): boolean {
  if (device === "touch") return true;
  const match =
    matcher ??
    (typeof matchMedia === "function" ? (q: string) => matchMedia(q) : null);
  if (!match) return false;
  return match("(max-width: 800px), (pointer: coarse) and (max-height: 600px)")
    .matches;
}

export interface FullscreenResumeState {
  started: boolean;
  transition: boolean;
  cinematic: boolean;
  wantsFullscreen: boolean;
  isFullscreen: boolean;
  isMobile: boolean;
  promptOpen?: boolean;
}

/**
 * Determines whether the user should be prompted to return to fullscreen mode,
 * e.g. after switching apps on mobile.
 */
export function shouldPromptFullscreenResume(
  state: FullscreenResumeState,
): boolean {
  return (
    state.started &&
    !state.transition &&
    !state.cinematic &&
    !state.promptOpen &&
    state.wantsFullscreen &&
    !state.isFullscreen &&
    state.isMobile
  );
}

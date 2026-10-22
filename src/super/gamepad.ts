export type N64Action =
  "a" | "b" | "z" | "start" | "r" | "cLeft" | "cRight" | "cUp" | "cDown";

export type GamepadBinding =
  | { type: "button"; index: number }
  | { type: "axis"; index: number; rest: number; active: number };

export type N64Profile = {
  version: 1;
  id: string;
  bindings: Record<N64Action, GamepadBinding>;
};

type ProfileStorage = Pick<Storage, "getItem" | "setItem">;
const ACTIONS: N64Action[] = [
  "a",
  "b",
  "z",
  "start",
  "r",
  "cLeft",
  "cRight",
  "cUp",
  "cDown",
];

function validBinding(value: unknown): value is GamepadBinding {
  if (!value || typeof value !== "object") return false;
  const binding = value as Record<string, unknown>;
  if (!Number.isSafeInteger(binding.index)) return false;
  if (binding.type === "button")
    return (binding.index as number) >= 0 && (binding.index as number) < 64;
  if (
    binding.type !== "axis" ||
    (binding.index as number) < 0 ||
    (binding.index as number) >= 16
  )
    return false;
  return (
    typeof binding.rest === "number" &&
    Number.isFinite(binding.rest) &&
    Math.abs(binding.rest) <= 1 &&
    typeof binding.active === "number" &&
    Number.isFinite(binding.active) &&
    Math.abs(binding.active) <= 1 &&
    Math.abs(binding.active - binding.rest) >= 0.2
  );
}

function validProfile(value: unknown): value is N64Profile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Record<string, unknown>;
  if (
    profile.version !== 1 ||
    typeof profile.id !== "string" ||
    !profile.id ||
    profile.id.length > 512 ||
    !profile.bindings ||
    typeof profile.bindings !== "object"
  )
    return false;
  const bindings = profile.bindings as Record<string, unknown>;
  return ACTIONS.every(
    (action) =>
      Object.prototype.hasOwnProperty.call(bindings, action) &&
      validBinding(bindings[action]),
  );
}

export function isBindingPressed(
  pad: Gamepad,
  binding: GamepadBinding,
): boolean {
  if (!validBinding(binding)) return false;
  if (binding.type === "button")
    return pad.buttons[binding.index]?.pressed === true;
  const value = pad.axes[binding.index];
  if (!Number.isFinite(value)) return false;
  const halfway = (binding.rest + binding.active) / 2;
  return binding.active > binding.rest ? value >= halfway : value <= halfway;
}

function storageOrDefault(storage?: ProfileStorage): ProfileStorage | null {
  if (storage) return storage;
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

function profileKey(id: string): string {
  return `super-mormon:n64-profile:${encodeURIComponent(id)}`;
}

export function readProfile(
  id: string,
  storage?: ProfileStorage,
): N64Profile | null {
  try {
    const raw = storageOrDefault(storage)?.getItem(profileKey(id));
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    return validProfile(value) && value.id === id ? value : null;
  } catch {
    return null;
  }
}

export function saveProfile(
  profile: N64Profile,
  storage?: ProfileStorage,
): void {
  if (!validProfile(profile)) throw new Error("Invalid N64 controller profile");
  storageOrDefault(storage)?.setItem(
    profileKey(profile.id),
    JSON.stringify(profile),
  );
}

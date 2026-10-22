import type { PlayerState } from "./physics";

export type AdventureInput = {
  interact: boolean;
  interactHeld: boolean;
  x: number;
  y: number;
};
export type AdventureHooks = {
  dialog: (
    kicker: string,
    title: string,
    body: string,
    next: () => void,
  ) => void;
  toast: (text: string) => void;
  complete: () => void;
  setAvatar: (role: "nephi" | "child") => void;
};
export type AdventureRuntime = {
  update: (
    dt: number,
    player: PlayerState,
    input: AdventureInput,
  ) => {
    objective: string;
    prompt: string;
    carrying?: boolean;
  };
  movementLocked?: () => boolean;
  snapshot: () => unknown;
  dispose: () => void;
};

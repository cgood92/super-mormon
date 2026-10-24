import type { CharacterRole } from "./character-types";
import type { StoryShot } from "./cinematic";
import type { PlayerState } from "./physics";

export type AdventureInput = {
  interact: boolean;
  interactHeld: boolean;
  x: number;
  y: number;
  jump?: boolean;
  crouch?: boolean;
};
export type AdventureHooks = {
  dialog: (
    kicker: string,
    title: string,
    body: string,
    next: () => void,
    shot?: StoryShot,
  ) => void;
  toast: (text: string) => void;
  complete: () => void;
  setAvatar: (role: CharacterRole) => void;
  caught?: (reset: () => void) => void;
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
    aiming?: boolean;
    draw?: number;
  };
  movementLocked?: () => boolean;
  camera?: () =>
    | {
        position: { x: number; y: number; z: number };
        focus: { x: number; y: number; z: number };
      }
    | undefined;
  snapshot: () => unknown;
  dispose: () => void;
};

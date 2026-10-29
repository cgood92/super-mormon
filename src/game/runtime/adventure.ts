import type { CharacterRole } from "../characters/character-types";
import type { StoryShot } from "../camera/cinematic";
import type { PlayerState } from "../physics/physics";
import type * as T from "three";

export type AdventureInput = {
  interact: boolean;
  interactHeld: boolean;
  x: number;
  y: number;
  jump?: boolean;
  crouch?: boolean;
};
export type AdventureHooks = {
  /** Current rendered camera aspect; authored shots can fit portrait screens. */
  viewAspect?: () => number;
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
  attachEquipment?: (
    slot: "leftHand" | "rightHand" | "back",
    object: T.Object3D,
  ) => void;
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
    holdingBanner?: boolean;
    wave?: boolean;
    aiming?: boolean;
    draw?: number;
    holdingBow?: boolean;
  };
  movementLocked?: () => boolean;
  camera?: () =>
    | {
        cut?: boolean;
        position: { x: number; y: number; z: number };
        focus: { x: number; y: number; z: number };
      }
    | undefined;
  snapshot: () => unknown;
  dispose: () => void;
};

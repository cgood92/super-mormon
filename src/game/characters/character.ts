import { createSculptedCharacterRig } from "./playable-lehi";
import type { CharacterRole } from "./character-types";
export type {
  CharacterRole,
  CharacterMove,
  CharacterState,
} from "./character-types";
export type CharacterOptions = { quality?: "hero" | "npc" | "crowd" };
/** One cast-wide factory keeps every story on the accepted sculpted style. */
export function createCharacter(
  role: CharacterRole,
  options: CharacterOptions = {},
) {
  return createSculptedCharacterRig(role, options);
}

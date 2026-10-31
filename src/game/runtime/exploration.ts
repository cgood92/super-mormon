import type { Scene } from "three";
import type { CharacterRole } from "../characters/character-types";
import { keepsExploringAfterCompletion } from "./scene-entry";
import { isStoryId, type StoryId } from "./progression";
import type { WorldData, WorldId } from "./worlds";

export const EXPLORATION_NOTICE =
  "Explore.  This level has not been built out yet.  Come back later.";

const explorationRoles: Partial<Record<WorldId, CharacterRole>> = {
  "peace-city": "peace-builder",
  "mormon-records": "mormon",
  "jared-expedition": "jared",
  "jared-barges": "jared-brother",
  "shelem-stones": "jared-brother",
  "jared-crossing": "jared",
  "ether-refuge": "ether",
  "moroni-farewell": "moroni-keeper",
};

/** Temporary runtime policy: keep authored adventures intact for the redesign. */
export function explorationWorld(
  id: WorldId,
  scene: Scene,
  world: WorldData,
): WorldData {
  if (!keepsExploringAfterCompletion(id)) return world;
  const beacon = scene.getObjectByName("Next route landmark");
  if (beacon) beacon.visible = false;
  // The crossing's task-gated exit must remain reachable without its adventure.
  if (id === "jared-crossing") {
    const hatch = scene.getObjectByName("Closed shore hatch");
    if (hatch) {
      hatch.visible = false;
      const shapes = hatch.userData.scenery.solids;
      world.solids = world.solids.filter((shape) => !shapes.includes(shape));
    }
  }
  return {
    ...world,
    initialObjective: EXPLORATION_NOTICE,
    tokens: [],
    treasures: [],
    carryables: [],
    delivery: undefined,
    tutorials: [],
    pursuers: [],
    update: undefined,
    // Keep a passive runtime so the generic goal/proximity gameplay never runs.
    adventure(hooks) {
      const role = explorationRoles[id];
      if (role) hooks.setAvatar(role);
      return {
        update: () => ({ objective: EXPLORATION_NOTICE, prompt: "" }),
        snapshot: () => ({ exploration: true }),
        dispose() {},
      };
    },
  };
}

/** Entry counts as passing, but never fabricates completion of other chapters. */
export function recordExplorationEntry(
  id: WorldId,
  completed: Set<StoryId>,
): boolean {
  if (!keepsExploringAfterCompletion(id) || !isStoryId(id) || completed.has(id))
    return false;
  completed.add(id);
  return true;
}

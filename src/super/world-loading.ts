import type * as T from "three";
import type { WorldId, WorldData } from "./worlds";
import type { createStoryScene } from "./story-scenes";
import type { createTreeOfLifeScene } from "./tree-of-life";

type PreparedWorld = {
  buildWorld: (id: WorldId, scene: T.Scene) => WorldData;
  createStoryScene?: typeof createStoryScene;
  createTreeOfLifeScene?: typeof createTreeOfLifeScene;
};

// Load code first, then let the caller atomically replace the active scene.
export async function prepareWorld(id: WorldId): Promise<PreparedWorld> {
  if (id === "hub" || id === "house") {
    const module = await import("./gallery-worlds");
    return {
      buildWorld: (_, scene) =>
        id === "hub" ? module.gallery(scene) : module.house(scene),
    };
  }
  if (id === "tree") {
    const module = await import("./tree-of-life");
    return {
      buildWorld: (_, scene) => module.buildTreeOfLife(scene),
      createTreeOfLifeScene: module.createTreeOfLifeScene,
    };
  }
  const module = await import("./jerusalem");
  const story =
    id === "trade" || id === "night"
      ? await import("./story-scenes")
      : undefined;
  return {
    buildWorld: (_, scene) => module.buildJerusalem(id, scene),
    createStoryScene: story?.createStoryScene,
  };
}

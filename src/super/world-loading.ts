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
  if (id === "hub") {
    const module = await import("./conference-center");
    return { buildWorld: (_, scene) => module.gallery(scene) };
  }
  if (id === "house") {
    const module = await import("./gallery-worlds");
    return { buildWorld: (_, scene) => module.house(scene) };
  }
  if (id === "tree") {
    const module = await import("./tree-of-life");
    return {
      buildWorld: (_, scene) => module.buildTreeOfLife(scene),
      createTreeOfLifeScene: module.createTreeOfLifeScene,
    };
  }
  if (id === "bountiful") {
    const module = await import("./bountiful");
    return { buildWorld: (_, scene) => module.buildBountiful(scene) };
  }
  if (id === "voyage") {
    const module = await import("./voyage");
    return { buildWorld: (_, scene) => module.buildVoyage(scene) };
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

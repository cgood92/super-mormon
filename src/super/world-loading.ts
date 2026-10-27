import { deployedScene } from "./scene-import";
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
  if (id === "samuel") {
    const module = await deployedScene(
      "src/super/samuel-wall.ts",
      () => import("./samuel-wall"),
    );
    return { buildWorld: (_, scene) => module.buildSamuelWall(scene) };
  }
  if (id === "title-liberty") {
    const module = await deployedScene(
      "src/super/title-of-liberty.ts",
      () => import("./title-of-liberty"),
    );
    return { buildWorld: (_, scene) => module.buildTitleOfLiberty(scene) };
  }
  if (id === "lehonti") {
    const module = await deployedScene(
      "src/super/lehonti-mountain.ts",
      () => import("./lehonti-mountain"),
    );
    return { buildWorld: (_, scene) => module.buildLehontiMountain(scene) };
  }
  if (id === "morianton") {
    const module = await deployedScene(
      "src/super/morianton-flight.ts",
      () => import("./morianton-flight"),
    );
    return { buildWorld: (_, scene) => module.buildMoriantonFlight(scene) };
  }
  if (id === "teancum") {
    const module = await deployedScene(
      "src/super/teancum-night.ts",
      () => import("./teancum-night"),
    );
    return { buildWorld: (_, scene) => module.buildTeancumNight(scene) };
  }
  if (id === "gid") {
    const module = await deployedScene(
      "src/super/gid-rescue.ts",
      () => import("./gid-rescue"),
    );
    return { buildWorld: (_, scene) => module.buildGidRescue(scene) };
  }
  if (id === "nephihah") {
    const module = await deployedScene(
      "src/super/nephihah.ts",
      () => import("./nephihah"),
    );
    return { buildWorld: (_, scene) => module.buildNephihah(scene) };
  }
  if (id === "hub") {
    const module = await deployedScene(
      "src/super/conference-center.ts",
      () => import("./conference-center"),
    );
    return { buildWorld: (_, scene) => module.gallery(scene) };
  }
  if (id === "house") {
    const module = await deployedScene(
      "src/super/gallery-worlds.ts",
      () => import("./gallery-worlds"),
    );
    return { buildWorld: (_, scene) => module.house(scene) };
  }
  if (id === "tree") {
    const module = await deployedScene(
      "src/super/tree-of-life.ts",
      () => import("./tree-of-life"),
    );
    return {
      buildWorld: (_, scene) => module.buildTreeOfLife(scene),
      createTreeOfLifeScene: module.createTreeOfLifeScene,
    };
  }
  if (id === "broken-bow") {
    const module = await deployedScene(
      "src/super/broken-bow.ts",
      () => import("./broken-bow"),
    );
    return { buildWorld: (_, scene) => module.buildBrokenBow(scene) };
  }
  if (id === "bountiful") {
    const module = await deployedScene(
      "src/super/bountiful.ts",
      () => import("./bountiful"),
    );
    return { buildWorld: (_, scene) => module.buildBountiful(scene) };
  }
  if (id === "voyage") {
    const module = await deployedScene(
      "src/super/voyage.ts",
      () => import("./voyage"),
    );
    return { buildWorld: (_, scene) => module.buildVoyage(scene) };
  }
  if (id === "promised") {
    const module = await deployedScene(
      "src/super/promised-land.ts",
      () => import("./promised-land"),
    );
    return { buildWorld: (_, scene) => module.buildPromisedLand(scene) };
  }
  if (id === "vineyard") {
    const module = await deployedScene(
      "src/super/olive-vineyard.ts",
      () => import("./olive-vineyard"),
    );
    return { buildWorld: (_, scene) => module.buildOliveVineyard(scene) };
  }
  if (id === "jacob") {
    const module = await deployedScene(
      "src/super/jacob-sherem.ts",
      () => import("./jacob-sherem"),
    );
    return { buildWorld: (_, scene) => module.buildJacobSherem(scene) };
  }
  if (id === "waters") {
    const module = await deployedScene(
      "src/super/waters-of-mormon.ts",
      () => import("./waters-of-mormon"),
    );
    return { buildWorld: (_, scene) => module.buildWatersOfMormon(scene) };
  }
  if (id === "ammon") {
    const module = await deployedScene(
      "src/super/ammon-flocks.ts",
      () => import("./ammon-flocks"),
    );
    return { buildWorld: (_, scene) => module.buildAmmonFlocks(scene) };
  }
  const module = await deployedScene(
    "src/super/jerusalem.ts",
    () => import("./jerusalem"),
  );
  const story =
    id === "trade" || id === "night"
      ? await deployedScene(
          "src/super/story-scenes.ts",
          () => import("./story-scenes"),
        )
      : undefined;
  return {
    buildWorld: (_, scene) => module.buildJerusalem(id, scene),
    createStoryScene: story?.createStoryScene,
  };
}

import { explorationWorld } from "./exploration";
import { deployedScene } from "./scene-import";
import type * as T from "three";
import type { WorldId, WorldData } from "./worlds";
import type { createStoryScene } from "../worlds/jerusalem/story-scenes";
import type { createTreeOfLifeScene } from "../worlds/nephi/tree-of-life";

type PreparedWorld = {
  buildWorld: (id: WorldId, scene: T.Scene) => WorldData;
  createStoryScene?: typeof createStoryScene;
  createTreeOfLifeScene?: typeof createTreeOfLifeScene;
};

// Load code first, then let the caller atomically replace the active scene.
export async function prepareWorld(id: WorldId): Promise<PreparedWorld> {
  const prepared = await prepareAuthoredWorld(id);
  return {
    ...prepared,
    buildWorld: (worldId, scene) =>
      explorationWorld(worldId, scene, prepared.buildWorld(worldId, scene)),
  };
}

async function prepareAuthoredWorld(id: WorldId): Promise<PreparedWorld> {
  if (id === "jared-expedition") {
    const module = await deployedScene(
      "src/game/worlds/final/jared-expedition.ts",
      () => import("../worlds/final/jared-expedition"),
    );
    return { buildWorld: (_, scene) => module.buildJaredExpedition(scene) };
  }
  if (id === "jared-barges") {
    const module = await deployedScene(
      "src/game/worlds/final/jared-barges.ts",
      () => import("../worlds/final/jared-barges"),
    );
    return { buildWorld: (_, scene) => module.buildJaredBarges(scene) };
  }
  if (id === "shelem-stones") {
    const module = await deployedScene(
      "src/game/worlds/final/shelem-stones.ts",
      () => import("../worlds/final/shelem-stones"),
    );
    return { buildWorld: (_, scene) => module.buildShelemStones(scene) };
  }
  if (id === "jared-crossing") {
    const module = await deployedScene(
      "src/game/worlds/final/jared-crossing.ts",
      () => import("../worlds/final/jared-crossing"),
    );
    return { buildWorld: (_, scene) => module.buildJaredCrossing(scene) };
  }
  if (id === "ether-refuge") {
    const module = await deployedScene(
      "src/game/worlds/final/ether-refuge.ts",
      () => import("../worlds/final/ether-refuge"),
    );
    return { buildWorld: (_, scene) => module.buildEtherRefuge(scene) };
  }
  if (id === "moroni-farewell") {
    const module = await deployedScene(
      "src/game/worlds/final/moroni-farewell.ts",
      () => import("../worlds/final/moroni-farewell"),
    );
    return { buildWorld: (_, scene) => module.buildMoroniFarewell(scene) };
  }
  if (id === "peace-city") {
    const module = await deployedScene(
      "src/game/worlds/final/peace-city.ts",
      () => import("../worlds/final/peace-city"),
    );
    return { buildWorld: (_, scene) => module.buildPeaceCity(scene) };
  }
  if (id === "mormon-records") {
    const module = await deployedScene(
      "src/game/worlds/final/mormon-records.ts",
      () => import("../worlds/final/mormon-records"),
    );
    return { buildWorld: (_, scene) => module.buildMormonRecords(scene) };
  }
  if (id === "missionary") {
    const module = await deployedScene(
      "src/game/worlds/missions/missionary-neighborhood.ts",
      () => import("../worlds/missions/missionary-neighborhood"),
    );
    return {
      buildWorld: (_, scene) => module.buildMissionaryNeighborhood(scene),
    };
  }
  if (id === "signs") {
    const module = await deployedScene(
      "src/game/worlds/third-nephi/signs-night.ts",
      () => import("../worlds/third-nephi/signs-night"),
    );
    return { buildWorld: (_, scene) => module.buildSignsNight(scene) };
  }
  if (id === "gathering") {
    const module = await deployedScene(
      "src/game/worlds/third-nephi/lachoneus-gathering.ts",
      () => import("../worlds/third-nephi/lachoneus-gathering"),
    );
    return { buildWorld: (_, scene) => module.buildLachoneusGathering(scene) };
  }
  if (id === "christ-bountiful") {
    const module = await deployedScene(
      "src/game/worlds/third-nephi/christ-bountiful.ts",
      () => import("../worlds/third-nephi/christ-bountiful"),
    );
    return { buildWorld: (_, scene) => module.buildChristBountiful(scene) };
  }
  if (id === "samuel") {
    const module = await deployedScene(
      "src/game/worlds/third-nephi/samuel-wall.ts",
      () => import("../worlds/third-nephi/samuel-wall"),
    );
    return { buildWorld: (_, scene) => module.buildSamuelWall(scene) };
  }
  if (id === "title-liberty") {
    const module = await deployedScene(
      "src/game/worlds/war/title-of-liberty.ts",
      () => import("../worlds/war/title-of-liberty"),
    );
    return { buildWorld: (_, scene) => module.buildTitleOfLiberty(scene) };
  }
  if (id === "lehonti") {
    const module = await deployedScene(
      "src/game/worlds/war/lehonti-mountain.ts",
      () => import("../worlds/war/lehonti-mountain"),
    );
    return { buildWorld: (_, scene) => module.buildLehontiMountain(scene) };
  }
  if (id === "morianton") {
    const module = await deployedScene(
      "src/game/worlds/war/morianton-flight.ts",
      () => import("../worlds/war/morianton-flight"),
    );
    return { buildWorld: (_, scene) => module.buildMoriantonFlight(scene) };
  }
  if (id === "teancum") {
    const module = await deployedScene(
      "src/game/worlds/war/teancum-night.ts",
      () => import("../worlds/war/teancum-night"),
    );
    return { buildWorld: (_, scene) => module.buildTeancumNight(scene) };
  }
  if (id === "gid") {
    const module = await deployedScene(
      "src/game/worlds/war/gid-rescue.ts",
      () => import("../worlds/war/gid-rescue"),
    );
    return { buildWorld: (_, scene) => module.buildGidRescue(scene) };
  }
  if (id === "nephihah") {
    const module = await deployedScene(
      "src/game/worlds/war/nephihah.ts",
      () => import("../worlds/war/nephihah"),
    );
    return { buildWorld: (_, scene) => module.buildNephihah(scene) };
  }
  if (id === "hub") {
    const module = await deployedScene(
      "src/game/worlds/conference/conference-center.ts",
      () => import("../worlds/conference/conference-center"),
    );
    return { buildWorld: (_, scene) => module.gallery(scene) };
  }
  if (id === "house") {
    const module = await deployedScene(
      "src/game/worlds/jerusalem/gallery-worlds.ts",
      () => import("../worlds/jerusalem/gallery-worlds"),
    );
    return { buildWorld: (_, scene) => module.house(scene) };
  }
  if (id === "tree") {
    const module = await deployedScene(
      "src/game/worlds/nephi/tree-of-life.ts",
      () => import("../worlds/nephi/tree-of-life"),
    );
    return {
      buildWorld: (_, scene) => module.buildTreeOfLife(scene),
      createTreeOfLifeScene: module.createTreeOfLifeScene,
    };
  }
  if (id === "broken-bow") {
    const module = await deployedScene(
      "src/game/worlds/nephi/broken-bow.ts",
      () => import("../worlds/nephi/broken-bow"),
    );
    return { buildWorld: (_, scene) => module.buildBrokenBow(scene) };
  }
  if (id === "bountiful") {
    const module = await deployedScene(
      "src/game/worlds/nephi/bountiful.ts",
      () => import("../worlds/nephi/bountiful"),
    );
    return { buildWorld: (_, scene) => module.buildBountiful(scene) };
  }
  if (id === "voyage") {
    const module = await deployedScene(
      "src/game/worlds/nephi/voyage.ts",
      () => import("../worlds/nephi/voyage"),
    );
    return { buildWorld: (_, scene) => module.buildVoyage(scene) };
  }
  if (id === "promised") {
    const module = await deployedScene(
      "src/game/worlds/nephi/promised-land.ts",
      () => import("../worlds/nephi/promised-land"),
    );
    return { buildWorld: (_, scene) => module.buildPromisedLand(scene) };
  }
  if (id === "vineyard") {
    const module = await deployedScene(
      "src/game/worlds/missions/olive-vineyard.ts",
      () => import("../worlds/missions/olive-vineyard"),
    );
    return { buildWorld: (_, scene) => module.buildOliveVineyard(scene) };
  }
  if (id === "jacob") {
    const module = await deployedScene(
      "src/game/worlds/missions/jacob-sherem.ts",
      () => import("../worlds/missions/jacob-sherem"),
    );
    return { buildWorld: (_, scene) => module.buildJacobSherem(scene) };
  }
  if (id === "waters") {
    const module = await deployedScene(
      "src/game/worlds/missions/waters-of-mormon.ts",
      () => import("../worlds/missions/waters-of-mormon"),
    );
    return { buildWorld: (_, scene) => module.buildWatersOfMormon(scene) };
  }
  if (id === "ammon") {
    const module = await deployedScene(
      "src/game/worlds/missions/ammon-flocks.ts",
      () => import("../worlds/missions/ammon-flocks"),
    );
    return { buildWorld: (_, scene) => module.buildAmmonFlocks(scene) };
  }
  if (id === "streets" || id === "palace" || id === "trade" || id === "night") {
    const module = await deployedScene(
      "src/game/worlds/jerusalem/jerusalem.ts",
      () => import("../worlds/jerusalem/jerusalem"),
    );
    const story =
      id === "trade" || id === "night"
        ? await deployedScene(
            "src/game/worlds/jerusalem/story-scenes.ts",
            () => import("../worlds/jerusalem/story-scenes"),
          )
        : undefined;
    return {
      buildWorld: (_, scene) => module.buildJerusalem(id, scene),
      createStoryScene: story?.createStoryScene,
    };
  }
  const unhandled: never = id;
  throw new Error(`Unhandled world: ${unhandled}`);
}

import { buildMissionaryNeighborhood } from "../worlds/missions/missionary-neighborhood";
import { buildSamuelWall } from "../worlds/third-nephi/samuel-wall";
import { buildSignsNight } from "../worlds/third-nephi/signs-night";
import { buildLachoneusGathering } from "../worlds/third-nephi/lachoneus-gathering";
import { buildChristBountiful } from "../worlds/third-nephi/christ-bountiful";
import { buildTitleOfLiberty } from "../worlds/war/title-of-liberty";
import { buildLehontiMountain } from "../worlds/war/lehonti-mountain";
import { buildMoriantonFlight } from "../worlds/war/morianton-flight";
import { buildTeancumNight } from "../worlds/war/teancum-night";
import { buildGidRescue } from "../worlds/war/gid-rescue";
import { buildNephihah } from "../worlds/war/nephihah";
import * as THREE from "three";
import { buildAmmonFlocks } from "../worlds/missions/ammon-flocks";
import { buildBrokenBow } from "../worlds/nephi/broken-bow";
import { buildJacobSherem } from "../worlds/missions/jacob-sherem";
import { buildWatersOfMormon } from "../worlds/missions/waters-of-mormon";
import { buildBountiful } from "../worlds/nephi/bountiful";
import { buildPromisedLand } from "../worlds/nephi/promised-land";
import { buildOliveVineyard } from "../worlds/missions/olive-vineyard";
import { buildVoyage } from "../worlds/nephi/voyage";
import { buildJerusalem } from "../worlds/jerusalem/jerusalem";
import { buildTreeOfLife } from "../worlds/nephi/tree-of-life";
import { house } from "../worlds/jerusalem/gallery-worlds";
import { gallery } from "../worlds/conference/conference-center";
import type { Climbable, PlayerState } from "../physics/physics";
import type { AdventureHooks, AdventureRuntime } from "./adventure";
export type WorldId =
  | "missionary"
  | "signs"
  | "gathering"
  | "christ-bountiful"
  | "samuel"
  | "title-liberty"
  | "lehonti"
  | "morianton"
  | "teancum"
  | "gid"
  | "nephihah"
  | "hub"
  | "streets"
  | "house"
  | "palace"
  | "trade"
  | "night"
  | "tree"
  | "broken-bow"
  | "bountiful"
  | "voyage"
  | "promised"
  | "vineyard"
  | "jacob"
  | "waters"
  | "ammon";
export type Solid = {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
};
export type Point = { x: number; y: number; z: number; yaw?: number };
export type WorldData = {
  swimRegions?: import("../physics/physics").SwimRegion[];
  name: string;
  subtitle: string;
  initialObjective?: string;
  spawn: Point;
  solids: Solid[];
  adventure?: (hooks: AdventureHooks) => AdventureRuntime;
  actorParent?: THREE.Group;
  secretEntrance?: { x: number; y: number; z: number };
  organ?: ReturnType<
    typeof import("../worlds/conference/conference-organ").buildConferenceOrgan
  >;
  landmarks?: { name: string; x: number; y: number; z: number }[];
  portals?: {
    id: WorldId;
    x: number;
    y: number;
    z: number;
    title: string;
    facing?: "north" | "east" | "west";
  }[];
  treasures?: { id: string; name: string; x: number; y: number; z: number }[];
  climbables?: Climbable[];
  tokens?: { id: string; x: number; y: number; z: number }[];
  carryables?: { id: string; name: string; x: number; y: number; z: number }[];
  delivery?: { x: number; y: number; z: number; radius: number };
  tutorials?: {
    id: string;
    title: string;
    instruction: string;
    x: number;
    y: number;
    z: number;
    radius: number;
  }[];
  practiceBounds?: { minX: number; maxX: number; minZ: number; maxZ: number };
  story?: {
    laban: Point;
    treasury?: Point;
    plates?: Point;
    gate: Point;
    cave?: Point;
    brothers: Point;
  };
  goal: { x: number; y: number; z: number; radius?: number };
  escapeGoal?: { x: number; y: number; z: number; radius?: number };
  pursuers?: { x: number; y: number; z: number }[];
  bounds?: { minX: number; maxX: number; minZ: number; maxZ: number };
  dispose?: () => void;
  update?: (dt: number, player: PlayerState) => void;
};

export function buildWorld(id: WorldId, scene: THREE.Scene): WorldData {
  switch (id) {
    case "missionary":
      return buildMissionaryNeighborhood(scene);
    case "signs":
      return buildSignsNight(scene);
    case "gathering":
      return buildLachoneusGathering(scene);
    case "christ-bountiful":
      return buildChristBountiful(scene);
    case "samuel":
      return buildSamuelWall(scene);
    case "title-liberty":
      return buildTitleOfLiberty(scene);
    case "lehonti":
      return buildLehontiMountain(scene);
    case "morianton":
      return buildMoriantonFlight(scene);
    case "teancum":
      return buildTeancumNight(scene);
    case "gid":
      return buildGidRescue(scene);
    case "nephihah":
      return buildNephihah(scene);

    case "hub":
      return gallery(scene);
    case "streets":
      return buildJerusalem("streets", scene);
    case "house":
      return house(scene);
    case "palace":
      return buildJerusalem("palace", scene);
    case "trade":
      return buildJerusalem("trade", scene);
    case "night":
      return buildJerusalem("night", scene);
    case "broken-bow":
      return buildBrokenBow(scene);
    case "bountiful":
      return buildBountiful(scene);
    case "promised":
      return buildPromisedLand(scene);
    case "jacob":
      return buildJacobSherem(scene);
    case "ammon":
      return buildAmmonFlocks(scene);
    case "waters":
      return buildWatersOfMormon(scene);
    case "vineyard":
      return buildOliveVineyard(scene);
    case "voyage":
      return buildVoyage(scene);
    case "tree":
      return buildTreeOfLife(scene);
  }
}

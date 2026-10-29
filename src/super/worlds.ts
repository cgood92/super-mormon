import { buildMissionaryNeighborhood } from "./missionary-neighborhood";
import { buildSamuelWall } from "./samuel-wall";
import { buildSignsNight } from "./signs-night";
import { buildLachoneusGathering } from "./lachoneus-gathering";
import { buildChristBountiful } from "./christ-bountiful";
import { buildTitleOfLiberty } from "./title-of-liberty";
import { buildLehontiMountain } from "./lehonti-mountain";
import { buildMoriantonFlight } from "./morianton-flight";
import { buildTeancumNight } from "./teancum-night";
import { buildGidRescue } from "./gid-rescue";
import { buildNephihah } from "./nephihah";
import * as THREE from "three";
import { buildAmmonFlocks } from "./ammon-flocks";
import { buildBrokenBow } from "./broken-bow";
import { buildJacobSherem } from "./jacob-sherem";
import { buildWatersOfMormon } from "./waters-of-mormon";
import { buildBountiful } from "./bountiful";
import { buildPromisedLand } from "./promised-land";
import { buildOliveVineyard } from "./olive-vineyard";
import { buildVoyage } from "./voyage";
import { buildJerusalem } from "./jerusalem";
import { buildTreeOfLife } from "./tree-of-life";
import { house } from "./gallery-worlds";
import { gallery } from "./conference-center";
import type { Climbable, PlayerState } from "./physics";
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
  swimRegions?: import("./physics").SwimRegion[];
  name: string;
  subtitle: string;
  initialObjective?: string;
  spawn: Point;
  solids: Solid[];
  adventure?: (hooks: AdventureHooks) => AdventureRuntime;
  actorParent?: THREE.Group;
  secretEntrance?: { x: number; y: number; z: number };
  organ?: ReturnType<typeof import("./conference-organ").buildConferenceOrgan>;
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

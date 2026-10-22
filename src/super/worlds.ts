import * as THREE from "three";
import { buildJerusalem } from "./jerusalem";
import { buildTreeOfLife } from "./tree-of-life";
import { house } from "./gallery-worlds";
import { gallery } from "./conference-center";
import type { Climbable, PlayerState } from "./physics";
export type WorldId =
  "hub" | "streets" | "house" | "palace" | "trade" | "night" | "tree";
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
  name: string;
  subtitle: string;
  spawn: Point;
  solids: Solid[];
  landmarks?: { name: string; x: number; y: number; z: number }[];
  portals?: {
    id: WorldId;
    x: number;
    y: number;
    z: number;
    title: string;
    facing?: "north" | "east";
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
    case "tree":
      return buildTreeOfLife(scene);
  }
}

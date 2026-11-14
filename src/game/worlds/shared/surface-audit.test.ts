import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import {
  auditWalkSurfaceAlignment,
  auditCoplanarMaterialBleed,
} from "./surface-audit";
import { buildShip } from "../nephi/ship";
import { prepareWorld } from "../../runtime/world-loading";
import type { WorldId } from "../../runtime/worlds";

const ALL_DISTINCT_WORLDS: readonly WorldId[] = [
  "hub",
  "missionary",
  "streets",
  "palace",
  "house",
  "tree",
  "broken-bow",
  "bountiful",
  "voyage",
  "promised",
  "vineyard",
  "jacob",
  "waters",
  "ammon",
  "title-liberty",
  "lehonti",
  "morianton",
  "teancum",
  "gid",
  "nephihah",
  "samuel",
  "signs",
  "gathering",
  "christ-bountiful",
  "peace-city",
  "mormon-records",
  "moroni-farewell",
  "jared-expedition",
  "jared-barges",
  "shelem-stones",
  "jared-crossing",
  "ether-refuge",
];

test("ship beds, bunks, and furniture have no coplanar bleed, micro-gap Z-fighting, or overhanging bedding", () => {
  const root = new T.Group();
  const ship = buildShip(root, { x: 0, y: 0, z: 0 });
  const bleedIssues = auditCoplanarMaterialBleed(ship.group, ship.solids);
  assert.deepEqual(
    bleedIssues.map((i) => `${i.kind}: ${i.message}`),
    [],
  );
});

test("ship decks, stairs, and cabin floors align with physical walk support without sinking", () => {
  const root = new T.Group();
  const ship = buildShip(root, { x: 0, y: 0, z: 0 });
  const points = Object.entries(ship.points).map(([label, pt]) => ({
    ...pt,
    label,
  }));
  // Add grid points across upper deck and lower cabin passage
  for (let z = -16; z <= 16; z += 4) {
    points.push({ x: 0, y: 0, z, label: `lower-aisle-${z}` });
    points.push({ x: 0, y: 4.2, z, label: `upper-deck-${z}` });
  }
  const sinkIssues = auditWalkSurfaceAlignment(ship.group, ship.solids, points);
  assert.deepEqual(sinkIssues, []);
});

test("all 32 distinct worlds align walk surfaces and roofs with physical support and have no coplanar Z-fighting", async () => {
  const allSinkFailures: string[] = [];
  const allBleedFailures: string[] = [];

  for (const id of ALL_DISTINCT_WORLDS) {
    const scene = new T.Scene();
    const prep = await prepareWorld(id);
    const world = prep.buildWorld(id, scene);
    try {
      const points = [
        { ...world.spawn, label: `${id}:spawn` },
        { ...world.goal, label: `${id}:goal` },
        ...(world.landmarks ?? []).map((l) => ({
          ...l,
          label: `${id}:${l.name}`,
        })),
      ];
      // Sample 3x3 grid across top surfaces of walkable solids (roofs, terraces, platforms, beds, tables)
      for (const s of world.solids) {
        const top = s.y + s.h;
        const isTallColumn = s.h > 4.5 && Math.max(s.w, s.d) <= 2.2;
        if (
          !isTallColumn &&
          s.w >= 1.2 &&
          s.d >= 1.2 &&
          s.h >= 0.12 &&
          top <= 24
        ) {
          const offsets = s.w >= 2.6 && s.d >= 2.6 ? [-0.3, 0, 0.3] : [0];
          for (const ox of offsets) {
            for (const oz of offsets) {
              const px = s.x + ox * s.w;
              const pz = s.z + oz * s.d;
              const buriedUnderTaller = world.solids.some(
                (other) =>
                  other !== s &&
                  px >= other.x - other.w / 2 - 0.1 &&
                  px <= other.x + other.w / 2 + 0.1 &&
                  pz >= other.z - other.d / 2 - 0.1 &&
                  pz <= other.z + other.d / 2 + 0.1 &&
                  other.y <= top + 0.05 &&
                  other.y + other.h > top + 0.05,
              );
              if (!buriedUnderTaller) {
                points.push({
                  x: px,
                  y: top,
                  z: pz,
                  label: `${id}:solid(${px.toFixed(1)},${top.toFixed(1)},${pz.toFixed(1)})`,
                });
              }
            }
          }
        }
      }
      const sinkIssues = auditWalkSurfaceAlignment(
        scene,
        world.solids,
        points,
        0.08,
      );
      for (const i of sinkIssues) {
        allSinkFailures.push(
          `${id} (${i.x.toFixed(1)}, ${i.z.toFixed(1)}) support=${i.supportY.toFixed(2)} visual=${i.visualY.toFixed(2)} (${i.meshName})`,
        );
      }

      const bleedIssues = auditCoplanarMaterialBleed(scene, world.solids);
      for (const b of bleedIssues) {
        allBleedFailures.push(`${id} [${b.kind}]: ${b.message}`);
      }
    } finally {
      world.dispose?.();
    }
  }

  assert.deepEqual(allSinkFailures, []);
  assert.deepEqual(allBleedFailures, []);
});

import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import {
  auditWalkSurfaceAlignment,
  auditCoplanarMaterialBleed,
} from "./surface-audit";
import { buildShip } from "../nephi/ship";
import { buildTeancumNight } from "../war/teancum-night";
import { buildJerusalem } from "../jerusalem/jerusalem";
import { buildBountiful } from "../nephi/bountiful";
import { gallery } from "../conference/conference-center";

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

test("world walk surfaces and roofs align with physical support across Jerusalem, Conference, Bountiful, and Teancum", () => {
  const worlds = [
    () => {
      const scene = new T.Scene();
      const w = buildJerusalem("streets", scene);
      return { name: "jerusalem-streets", scene, world: w };
    },
    () => {
      const scene = new T.Scene();
      const w = buildTeancumNight(scene);
      return { name: "teancum-night", scene, world: w };
    },
    () => {
      const scene = new T.Scene();
      const w = buildBountiful(scene);
      return { name: "bountiful", scene, world: w };
    },
    () => {
      const scene = new T.Scene();
      const w = gallery(scene);
      return { name: "conference", scene, world: w };
    },
  ];

  for (const create of worlds) {
    const { name, scene, world } = create();
    try {
      const points = [
        { ...world.spawn, label: `${name}:spawn` },
        { ...world.goal, label: `${name}:goal` },
        ...(world.landmarks ?? []).map((l) => ({
          ...l,
          label: `${name}:${l.name}`,
        })),
      ];
      // Also sample top surfaces of walkable elevated solids (roofs, terraces, platforms)
      for (const s of world.solids) {
        const top = s.y + s.h;
        if (s.w >= 3 && s.d >= 3 && s.h >= 0.2 && top <= 18) {
          const buriedUnderTaller = world.solids.some(
            (other) =>
              other !== s &&
              Math.abs(s.x - other.x) <= other.w / 2 &&
              Math.abs(s.z - other.z) <= other.d / 2 &&
              other.y <= top + 0.05 &&
              other.y + other.h > top + 0.05,
          );
          if (!buriedUnderTaller) {
            points.push({
              x: s.x,
              y: top,
              z: s.z,
              label: `${name}:solid(${s.x.toFixed(1)},${top.toFixed(1)},${s.z.toFixed(1)})`,
            });
          }
        }
      }
      const sinkIssues = auditWalkSurfaceAlignment(
        scene,
        world.solids,
        points,
        0.08,
      );
      assert.deepEqual(
        sinkIssues.map(
          (i) =>
            `${name} (${i.x.toFixed(1)}, ${i.z.toFixed(1)}) support=${i.supportY.toFixed(2)} visual=${i.visualY.toFixed(2)} (${i.meshName})`,
        ),
        [],
      );
    } finally {
      world.dispose?.();
    }
  }
});

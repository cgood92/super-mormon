import * as T from "three";
import { terracedRock, markScenery } from "../shared/scenery";
import { warWorld, nearWarPoint } from "../shared/war-world-kit";
import { createPlayer } from "../../physics/physics";
import type { WorldData } from "../../runtime/worlds";
import type { AdventureRuntime } from "../../runtime/adventure";
export const ETHER_ROUTE = Object.freeze({
  west: [
    { x: -18, z: 47 },
    { x: -18, z: 24 },
    { x: -29, z: 24 },
    { x: -29, z: -18 },
    { x: -18, z: -17.4 },
    { x: -18, z: -29 },
    { x: -18, z: -17.4 },
    { x: -29, z: -18 },
    { x: -29, z: 24 },
    { x: -18, z: 24 },
    { x: -18, z: 47 },
    { x: 0, z: 47 },
  ],
  east: [
    { x: 18, z: 47 },
    { x: 18, z: 24 },
    { x: 29, z: 24 },
    { x: 29, z: -18 },
    { x: 18, z: -17.4 },
    { x: 18, z: -29 },
    { x: 18, z: -17.4 },
    { x: 29, z: -18 },
    { x: 29, z: 24 },
    { x: 18, z: 24 },
    { x: 18, z: 47 },
    { x: 0, z: 47 },
  ],
  discoveries: [
    { x: -18, z: 47 },
    { x: -35, z: 47 },
    { x: -35, z: 36 },
    { x: -35, z: 47 },
    { x: 0, z: 47 },
    { x: 0, z: 60 },
    { x: 18, z: 60 },
    { x: 35, z: 47 },
    { x: 35, z: 34 },
    { x: 35, z: 47 },
    { x: 0, z: 47 },
  ],
} as const);
for (const route of Object.values(ETHER_ROUTE)) {
  for (const point of route) Object.freeze(point);
  Object.freeze(route);
}

export function buildEtherRefuge(scene: T.Scene): WorldData {
  const land = warWorld(scene, "Ether · moonlit refuge", true),
    { root, solid, decor, tree, actor } = land;
  const ground = root.getObjectByName("Single earth walk surface") as T.Mesh;
  (ground.material as T.MeshStandardMaterial).color.setHex(0x34474b);
  // Cave walls have three real openings: west/east mouths and the southern skylight court.
  for (const x of [-11, 11])
    for (const z of [42, 53])
      solid({ x, y: 0, z, w: 1.4, h: 5, d: 5 }, 0x414953, "Refuge side wall");
  solid(
    { x: 0, y: 4.8, z: 49, w: 23, h: 1, d: 14 },
    0x4f5961,
    "Refuge stone ceiling",
  );
  solid(
    { x: 0, y: 0, z: 40, w: 13, h: 4, d: 2 },
    0x424b57,
    "Cave mouth divider",
  );
  for (const x of [-23, 23]) {
    solid(
      { x, y: 0, z: 0, w: 7, h: 2.8, d: 34 },
      0x59616b,
      "Ruined wall cover",
    );
    solid(
      { x: x > 0 ? 11 : -11, y: 0, z: -14, w: 4, h: 3.5, d: 13 },
      0x69717b,
      "Standing ruined tower",
    );
    for (let i = 0; i < 10; i++)
      solid(
        {
          x: x > 0 ? 18 : -18,
          y: 0,
          z: -18 - i * 0.9,
          w: 6,
          h: (i + 1) * 0.2,
          d: 0.9,
        },
        0x7a8184,
        "Lookout stair",
      );
    solid(
      { x: x > 0 ? 18 : -18, y: 0, z: -30, w: 6, h: 2, d: 7 },
      0x666f78,
      "Lookout terrace",
    );
    solid(
      { x: x > 0 ? 18 : -18, y: 2, z: -33.5, w: 6, h: 0.7, d: 0.4 },
      0x899293,
      "Lookout parapet",
    );
  }
  for (const x of [-39, 39]) for (const z of [-40, -16, 10, 32, 55]) tree(x, z);
  for (const [x, z] of [
    [-35, 36],
    [35, 34],
  ] as const) {
    solid(
      { x: x - 3, y: 0, z, w: 0.5, h: 1.1, d: 8 },
      0x747c77,
      "Abandoned garden wall",
    );
    decor(
      { x, y: 0.03, z, w: 4, h: 0.06, d: 6 },
      0x426263,
      "Quiet water and garden beds",
      "Ankle shallow cavern water and soft garden earth share ground support.",
    );
  }
  const rockMaterial = new T.MeshStandardMaterial({
    color: 0x505f6b,
    roughness: 1,
  });
  for (const [x, z, w, h, d] of [
    [-44, -48, 10, 9, 12],
    [43, -48, 11, 8, 13],
    [-24, 56, 11, 7, 8],
    [25, 56, 12, 8, 8],
  ] as const)
    terracedRock(
      root,
      land.solids,
      rockMaterial,
      { x, y: 0, z, w, h, d },
      "Moonlit refuge crag",
    );
  rockMaterial.dispose();
  solid(
    { x: -35, y: 4, z: 36, w: 9, h: 0.7, d: 9 },
    0x55616a,
    "Water cavern overhang",
  );
  for (const side of [-1, 1])
    for (const i of [0, 1, 2])
      solid(
        { x: side * 23, y: 2.8, z: -12 + i * 12, w: 7.4, h: 0.18, d: 1.2 },
        0x8a9296,
        "Weathered ruin masonry cap",
      );
  const moon = new T.Mesh(
    new T.SphereGeometry(3.2, 20, 12),
    new T.MeshBasicMaterial({ color: 0xdce8e4 }),
  );
  moon.position.set(-35, 43, -76);
  moon.name = "Distant moon";
  markScenery(moon, {
    kind: "backdrop",
    reason: "Moon beyond the playable valley, never a physical surface.",
  });
  root.add(moon);
  const patrol = actor("guard", { x: 0, y: 0, z: -6 }, "Distant watch patrol");
  const cue = decor(
    { x: 0, y: 4, z: -6, w: 0.5, h: 0.5, d: 0.5 },
    0x9db9cb,
    "Patrol awareness lantern",
    "Awareness cue above the distant patrol; not physical scenery.",
  );
  solid(
    { x: -4, y: 0, z: 49, w: 2, h: 1.1, d: 1 },
    0x8f7959,
    "Ether writing shelf",
  );
  for (let i = 0; i < 18; i++)
    decor(
      { x: -65 + i * 8, y: 0, z: -65, w: 9, h: 12 + (i % 4) * 4, d: 7 },
      0x263446,
      "Distant broken skyline",
      "Backdrop outside playable bounds.",
    );
  let disposed = false;
  const runtimes = new Set<AdventureRuntime>();
  return {
    name: "Ether’s Refuge",
    subtitle: "Centuries after Jared · Ether 13; 15 · imagined night routes",
    initialObjective: "Use the west and east ruins to reach the two lookouts.",
    spawn: { x: 0, y: 0, z: 47 },
    bounds: { minX: -48, maxX: 48, minZ: -53, maxZ: 65 },
    goal: { x: 0, y: 0, z: 47, radius: 3 },
    solids: land.solids,
    actorParent: root,
    landmarks: [
      { name: "West lookout", x: -18, y: 2, z: -29 },
      { name: "East lookout", x: 18, y: 2, z: -29 },
      { name: "Refuge", x: 0, y: 0, z: 47 },
    ],
    adventure(hooks) {
      let stopped = false,
        elapsed = 0,
        awareness = 0,
        recoveries = 0,
        completed = false,
        started = false;
      const observed = new Set<string>(),
        discoveries = new Set<string>();
      hooks.setAvatar("ether");
      const runtime: AdventureRuntime = {
        update(dt, p, input) {
          let prompt = "";
          if (!disposed && !stopped) {
            elapsed += Number.isFinite(dt)
              ? Math.min(0.05, Math.max(0, dt))
              : 0;
            if (!started) {
              started = true;
              hooks.toast(
                "Centuries after Jared and his brother: Ether shelters by day and observes by night. These routes are imagined; the destruction cannot be changed.",
              );
            }
            const px = Math.sin(elapsed * 0.22) * 6;
            patrol.update(0.02, { ...createPlayer(px, 0, -6), yaw: Math.PI });
            cue.position.x = px;
            const origin = new T.Vector3(px, 1.2, -6);
            const eye = new T.Vector3(
              p.x,
              p.y + (input.crouch ? 0.65 : 1.35),
              p.z,
            );
            const distance = origin.distanceTo(eye);
            const ray = new T.Ray(origin, eye.clone().sub(origin).normalize());
            const hit = new T.Vector3();
            const occluded = land.solids.some(
              (s) =>
                s.h > 1 &&
                ray.intersectBox(
                  new T.Box3(
                    new T.Vector3(s.x - s.w / 2, s.y, s.z - s.d / 2),
                    new T.Vector3(s.x + s.w / 2, s.y + s.h, s.z + s.d / 2),
                  ),
                  hit,
                ) !== null &&
                origin.distanceTo(hit) < distance - 0.3,
            );
            const exposed = distance < 34 && p.z < 24 && p.z > -24 && !occluded;
            awareness = Math.max(
              0,
              Math.min(
                1,
                awareness +
                  (exposed ? (input.crouch ? 0.09 : 0.65) : -0.9) *
                    Math.min(0.05, Math.max(0, Number.isFinite(dt) ? dt : 0)),
              ),
            );
            (cue.material as T.MeshStandardMaterial).color.setHex(
              awareness > 0.5 ? 0xe8a65d : 0x9db9cb,
            );
            if (exposed)
              prompt = input.crouch
                ? "Stay low; ruined walls screen the side paths."
                : "Patrol watches the open court. Crouch or take cover.";
            if (awareness >= 1 || p.y < -3) {
              Object.assign(p, createPlayer(0, 0, 47));
              awareness = 0;
              recoveries++;
              hooks.toast(
                "Safely back in the refuge. Your observations remain. Choose the covered side routes.",
              );
            }
            for (const x of [-18, 18])
              if (
                nearWarPoint(p, { x, y: 2, z: -29 }, 3) &&
                !observed.has(String(x))
              ) {
                observed.add(String(x));
                hooks.toast(
                  "From the distant lookout Ether observes sorrowful events. Return by the moonlit ruins to preserve the account.",
                );
              }
            for (const [id, x, z, text] of [
              [
                "water",
                -35,
                36,
                "Water cavern: a quiet source beneath the stone.",
              ],
              [
                "skylight",
                0,
                60,
                "Skylight court: stars above a sheltered place.",
              ],
              [
                "garden",
                35,
                34,
                "Abandoned garden: traces of ordinary lives, remembered with compassion.",
              ],
            ] as const)
              if (nearWarPoint(p, { x, y: 0, z }) && !discoveries.has(id)) {
                discoveries.add(id);
                hooks.toast(text);
              }
            if (
              observed.size === 2 &&
              !completed &&
              nearWarPoint(p, { x: 0, y: 0, z: 47 }, 3)
            ) {
              prompt = "Preserve the account in the refuge";
              if (input.interact) {
                completed = true;
                hooks.complete();
                hooks.dialog(
                  "Ether 15:33–34",
                  "An account preserved",
                  "Ether preserved the account for later readers. The loss cannot be undone. This refuge and its location are imagined.",
                  () => {},
                );
              }
            }
          }
          return {
            objective: completed
              ? "The account is preserved. Explore the quiet night."
              : observed.size === 2
                ? "Return through the night to write in the refuge."
                : "Reach both lookouts. Ruined walls provide cover.",
            prompt,
          };
        },
        snapshot: () => ({
          elapsed,
          awareness,
          recoveries,
          completed,
          observed: [...observed],
          discoveries: [...discoveries],
          route: ETHER_ROUTE,
        }),
        dispose() {
          stopped = true;
          runtimes.delete(runtime);
        },
      };
      runtimes.add(runtime);
      return runtime;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const r of runtimes) r.dispose();
      land.dispose();
    },
  };
}

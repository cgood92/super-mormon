import * as T from "three";
import { markScenery, terracedRock } from "../shared/scenery";
import { warWorld, nearWarPoint } from "../shared/war-world-kit";
import { createPlayer } from "../../physics/physics";
import type { WorldData } from "../../runtime/worlds";
import type { AdventureRuntime } from "../../runtime/adventure";
export const MORONI_ROUTE = Object.freeze({
  toLever: [
    { x: 18, z: 49 },
    { x: 18, z: 35 },
    { x: 18, z: 17 },
    { x: 29, z: 17 },
    { x: 29, z: 12 },
  ],
  toShelter: [
    { x: 29, z: 17 },
    { x: 18, z: 17 },
    { x: 18, z: 12 },
    { x: 18, z: 0 },
    { x: 18, z: -13 },
    { x: 0, z: -13 },
    { x: 0, z: -24 },
  ],
  toDawn: [
    { x: 0, z: -13 },
    { x: -18, z: -13 },
    { x: -18, z: -37 },
    { x: 0, z: -37 },
    { x: 0, z: -45 },
  ],
  discoveries: [
    { x: 0, z: -37 },
    { x: -18, z: -37 },
    { x: -18, z: -13 },
    { x: 0, z: -13 },
    { x: 18, z: -13 },
    { x: 18, z: 12 },
    { x: 18, z: 35 },
    { x: -32, z: 35 },
    { x: -32, z: 25 },
    { x: -32, z: 35 },
    { x: -42, z: 35 },
    { x: -42, z: -4 },
    { x: -42, z: 35 },
  ],
} as const);
for (const route of Object.values(MORONI_ROUTE)) {
  for (const point of route) Object.freeze(point);
  Object.freeze(route);
}

export function buildMoroniFarewell(scene: T.Scene): WorldData {
  const land = warWorld(scene, "Moroni · autumn refuge valley"),
    { root, solid, decor, tree } = land;
  (
    root.getObjectByName("Single earth walk surface") as T.Mesh<
      T.BoxGeometry,
      T.MeshStandardMaterial
    >
  ).material.color.setHex(0x958563);
  scene.background = new T.Color(0xc5c9c0);
  scene.fog = new T.Fog(0xc5c9c0, 85, 180);
  // Separated upper banks own their surfaces; ravine has only the lower valley floor.
  solid(
    { x: 14, y: 0, z: 16, w: 40, h: 3, d: 20 },
    0x8a8776,
    "Southern ravine bank",
  );
  solid(
    { x: 0, y: 0, z: -30, w: 47, h: 3, d: 48 },
    0x9a927b,
    "Northern refuge ridge",
  );
  for (let i = 0; i < 15; i++)
    solid(
      { x: 18, y: 0, z: 35 - i * 0.6, w: 6, h: (i + 1) * 0.2, d: 0.6 },
      0xa8a083,
      "Approach stair",
    );
  const bridgeShape = { x: 40, y: 2.65, z: 0, w: 5, h: 0.35, d: 12 };
  const bridge = solid(
    bridgeShape,
    0x817052,
    "Pivoting fallen timber crossing",
  );
  for (const x of [15.2, 20.8])
    solid(
      { x, y: 3, z: 12, w: 0.3, h: 1.1, d: 3 },
      0x85714d,
      "Bridge approach post",
    );
  solid(
    { x: 29, y: 3, z: 10, w: 1, h: 1.2, d: 1 },
    0x827451,
    "Timber pivot lever",
  );
  for (const x of [-7, 7])
    solid(
      { x, y: 3, z: -25, w: 0.7, h: 3.5, d: 13 },
      0xb8ac8e,
      "Refuge room wall",
    );
  solid(
    { x: 0, y: 3, z: -31, w: 14, h: 3.5, d: 0.7 },
    0xb8ac8e,
    "Refuge rear wall",
  );
  solid(
    { x: 0, y: 6.5, z: -25, w: 15, h: 0.5, d: 14 },
    0x6f6954,
    "Sheltered writing roof",
  );
  for (const x of [-18, 18])
    solid(
      { x, y: 3, z: -49, w: 8, h: 0.8, d: 0.5 },
      0xb0a78a,
      "Dawn overlook parapet",
    );
  for (const [x, z] of [
    [-32, 25],
    [-42, -4],
    [-18, -37],
  ] as const)
    decor(
      { x, y: x === -18 ? 3.04 : 0.04, z, w: 4, h: 0.08, d: 5 },
      0xb9a06c,
      "Autumn discovery carpet",
      "Soft leaf carpet shares the existing bank or ground support.",
    );
  for (const x of [-47, -34, 37, 46])
    for (const z of [-45, -25, 3, 24, 48]) tree(x, z);
  root.traverse((o) => {
    if (o.name === "High olive canopy" && o instanceof T.Mesh)
      (o.material as T.MeshStandardMaterial).color.setHex(
        [0xa96936, 0xc69c45, 0xa78043][Math.abs(Math.floor(o.position.z)) % 3],
      );
  });
  // Repeated windblown leaves are batched, and warWorld disposes their instance buffers.
  const leaves = new T.InstancedMesh(
    new T.BoxGeometry(0.25, 0.03, 0.4),
    new T.MeshStandardMaterial({ color: 0xc5a05d }),
    100,
  );
  const matrix = new T.Matrix4();
  for (let i = 0; i < 100; i++) {
    matrix.makeTranslation(
      (i % 10) * 8 - 40,
      0.07,
      Math.floor(i / 10) * 11 - 50,
    );
    leaves.setMatrixAt(i, matrix);
  }
  importMark(leaves);
  root.add(leaves);
  for (let i = 0; i < 16; i++)
    decor(
      { x: -66 + i * 9, y: 0, z: -65, w: 10, h: 12 + (i % 5) * 3, d: 8 },
      0x8a958c,
      "Distant dawn mountains",
      "Backdrop outside playable bounds; invented geography.",
    );
  const cragMaterial = new T.MeshStandardMaterial({
    color: 0x8d8a74,
    roughness: 1,
  });
  for (const [x, z, w, h, d] of [
    [-43, -49, 10, 9, 13],
    [42, -48, 12, 11, 14],
    [-48, 14, 5, 7, 12],
    [45, 15, 7, 8, 12],
  ] as const)
    terracedRock(
      root,
      land.solids,
      cragMaterial,
      { x, y: 0, z, w, h, d },
      "Autumn valley buttress",
    );
  for (const x of [-7, 7])
    for (let i = 0; i < 4; i++)
      solid(
        { x, y: 3 + i * 0.8, z: -25, w: 0.85, h: 0.14, d: 13 },
        0xc2b699,
        "Shelter stone courses",
      );
  cragMaterial.dispose();
  solid(
    { x: 0, y: 3, z: -26, w: 2, h: 0.6, d: 1 },
    0x827052,
    "Refuge writing table",
  );
  const plates = decor(
    { x: 0, y: 1, z: 49, w: 1.1, h: 0.65, d: 0.65 },
    0x8c6c3f,
    "Inherited plates carrier",
    "Secured carried records follow actor position and yaw.",
  );
  let disposed = false;
  const runtimes = new Set<AdventureRuntime>();
  return {
    name: "Moroni’s Farewell",
    subtitle: "Mormon’s son · Mormon 8; Moroni 1; 10 · imagined refuge",
    initialObjective:
      "Carry the plates up the east steps to the ravine crossing.",
    spawn: { x: 0, y: 0, z: 49 },
    bounds: { minX: -50, maxX: 50, minZ: -53, maxZ: 62 },
    solids: land.solids,
    actorParent: root,
    goal: { x: 0, y: 3, z: -45, radius: 3 },
    landmarks: [
      { name: "Timber pivot", x: 29, y: 3, z: 12 },
      { name: "Writing shelter", x: 0, y: 3, z: -24 },
      { name: "Dawn vista", x: 0, y: 3, z: -45 },
    ],
    adventure(hooks) {
      let stopped = false,
        elapsed = 0,
        carrying = true,
        opened = false,
        crossed = false,
        written = false,
        completed = false,
        recoveries = 0,
        started = false,
        checkpoint = { x: 0, y: 0, z: 49 };
      const discoveries = new Set<string>();
      hooks.setAvatar("moroni-keeper");
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
                "Moroni, Mormon’s son, is alone. He carries the inherited records while seeking safety. This autumn valley and timber crossing are imagined.",
              );
            }
            if (nearWarPoint(p, { x: 18, y: 3, z: 17 }, 4))
              checkpoint = { x: 18, y: 3, z: 17 };
            if (!opened && nearWarPoint(p, { x: 29, y: 3, z: 12 }, 3)) {
              prompt = "Turn the timber pivot to span the ravine";
              if (input.interact) {
                opened = true;
                bridge.position.x = 18;
                bridgeShape.x = 18;
                hooks.toast(
                  "The timber rests across both banks. Carry the plates over its broad surface.",
                );
              }
            }
            if (
              opened &&
              p.z < -7 &&
              p.z > -15 &&
              p.y > 2.8 &&
              Math.abs(p.x - 18) < 3
            )
              crossed = true;
            if (crossed && nearWarPoint(p, { x: 0, y: 3, z: -13 }, 5))
              checkpoint = { x: 0, y: 3, z: -13 };
            if (
              p.y < -3 ||
              (carrying &&
                checkpoint.y === 3 &&
                p.y < 0.5 &&
                p.z < 20 &&
                p.z > -7)
            ) {
              Object.assign(
                p,
                createPlayer(checkpoint.x, checkpoint.y, checkpoint.z),
              );
              recoveries++;
              hooks.toast(
                "Restored to the last sheltered landing; the plates remain secured.",
              );
            }
            if (carrying) {
              plates.position.set(
                p.x - Math.sin(p.yaw) * 0.5,
                p.y + 1,
                p.z - Math.cos(p.yaw) * 0.5,
              );
              plates.rotation.y = p.yaw;
            }
            if (
              crossed &&
              !written &&
              nearWarPoint(p, { x: 0, y: 3, z: -24 }, 3)
            ) {
              prompt = "Rest the plates and reflect in the shelter";
              if (input.interact) {
                written = true;
                carrying = false;
                plates.position.set(0, 3.925, -26);
                plates.rotation.set(0, 0, 0);
                hooks.dialog(
                  "Moroni 1; 10",
                  "Words for those who come after",
                  "Alone, Moroni abridged the earlier Jaredite account and wrote more. He invites readers to remember mercy and come unto Christ. This shelter is imagined.",
                  () => {},
                );
              }
            }
            if (
              written &&
              !completed &&
              nearWarPoint(p, { x: 0, y: 3, z: -45 }, 3)
            ) {
              completed = true;
              scene.background = new T.Color(0xf2d9aa);
              scene.fog = new T.Fog(0xf2d9aa, 85, 180);
              hooks.complete();
              hooks.toast(
                "A new dawn. Remember mercy; come unto Christ. Explore freely, return to the gallery, or replay any story.",
              );
            }
            for (const [id, x, y, z, text] of [
              [
                "leaves",
                -32,
                0,
                25,
                "Autumn grove: the quiet turning of a season.",
              ],
              [
                "spring",
                -42,
                0,
                -4,
                "Ravine spring: a sheltered route beneath the high banks.",
              ],
              [
                "vista",
                -18,
                3,
                -37,
                "Western vista: a wide horizon beyond the refuge.",
              ],
            ] as const)
              if (nearWarPoint(p, { x, y, z }) && !discoveries.has(id)) {
                discoveries.add(id);
                hooks.toast(text);
              }
          }
          return {
            objective: completed
              ? "A hopeful dawn. Explore freely or return to the gallery."
              : written
                ? "Walk the west ridge to the dawn overlook."
                : crossed
                  ? "Find rest and a writing place in the northern shelter."
                  : opened
                    ? "Carry the inherited plates across the timber crossing."
                    : "Climb east steps; turn the timber pivot above the ravine.",
            prompt,
            carrying,
          };
        },
        snapshot: () => ({
          elapsed,
          carrying,
          bridge: opened,
          crossed,
          written,
          completed,
          recoveries,
          checkpoint: { ...checkpoint },
          discoveries: [...discoveries],
          route: MORONI_ROUTE,
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
function importMark(mesh: T.Object3D) {
  markScenery(mesh, {
    kind: "decoration",
    reason: "Soft scattered leaves share the sole ground support.",
  });
}

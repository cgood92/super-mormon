import * as T from "three";
import { warWorld, nearWarPoint as near } from "../shared/war-world-kit";
import { terracedRock, markScenery } from "../shared/scenery";
import { createPlayer } from "../../physics/physics";
import type { WorldData, Point } from "../../runtime/worlds";
import type { AdventureRuntime } from "../../runtime/adventure";
export const SHELEM_ROUTE = Object.freeze({
  ascent: Object.freeze([
    { x: -16, z: 38 },
    { x: -16, z: 5 },
    { x: 16, z: 5 },
    { x: 16, z: -28 },
    { x: -16, z: -28 },
    { x: -16, z: -60 },
    { x: 0, z: -60 },
  ]),
  return: Object.freeze([
    { x: 36, z: -60 },
    { x: 36, z: 16 },
    { x: 36, z: 44 },
    { x: 0, z: 49 },
  ]),
  discoveries: Object.freeze([
    { x: -25, y: 4, z: 5 },
    { x: 25, y: 8, z: -28 },
    { x: 10, y: 12, z: -60 },
  ]),
});
for (const route of Object.values(SHELEM_ROUTE))
  for (const point of route) Object.freeze(point);

export function buildShelemStones(scene: T.Scene): WorldData {
  const land = warWorld(scene, "Shelem · terraces above the sea"),
    { root, solid, decor, solids } = land;
  scene.background = new T.Color(0xcbd6df);
  scene.fog = new T.Fog(0xcbd6df, 100, 210);
  const floor = root.getObjectByName("Single earth walk surface") as T.Mesh;
  (floor.material as T.MeshStandardMaterial).color.setHex(0x879681);
  // Fit each flight exactly between shelf edges. The last tread ends at
  // its terrace boundary, so the two tops never overlap coplanarly.
  for (const [x, south, north, y] of [
    [-16, 34, 9, 0],
    [16, 1, -24, 4],
    [-16, -32, -56, 8],
  ] as const) {
    const depth = (south - north) / 17;
    for (let i = 0; i < 17; i++)
      solid(
        {
          x,
          y,
          z: south - (i + 0.5) * depth,
          w: 7,
          h: ((i + 1) * 4) / 17,
          d: depth,
        },
        i % 3 ? 0xa6a493 : 0xc1baa1,
        "Fitted mountain stair",
      );
  }
  for (const [z, y] of [
    [5, 4],
    [-28, 8],
    [-60, 12],
  ] as const)
    solid(
      { x: 0, y: 0, z, w: z === -60 ? 80 : 58, h: y, d: 8 },
      0x8d9487,
      "Broad sheltered mountain terrace",
    );
  // Each descending tread owns its top; no slab overlaps the return walk.
  for (let i = 0; i < 47; i++)
    solid(
      {
        x: 36,
        y: 0,
        z: -55.25 + i * 1.5,
        w: 6,
        h: 12 - (i + 1) * 0.25,
        d: 1.5,
      },
      i % 3 ? 0x969f91 : 0xb0b7a0,
      "East return stair",
    );
  const rockmat = new T.MeshStandardMaterial({ color: 0x74867b, roughness: 1 });
  for (const [x, z, w, h, d] of [
    [-36, 22, 11, 7, 13],
    [31, 23, 7, 6, 12],
    [-35, -13, 12, 12, 18],
    [30, -40, 5, 11, 10],
    [-37, -47, 8, 17, 13],
    [0, -68, 24, 20, 7],
  ] as const)
    terracedRock(
      root,
      solids,
      rockmat,
      { x, y: 0, z, w, h, d },
      "Fitted mountain buttress",
    );
  for (const [z, y] of [
    [5, 4],
    [-28, 8],
  ] as const) {
    solid(
      { x: 0, y, z: z - 3, w: 14, h: 3.5, d: 0.7 },
      0x6c7b73,
      "Wind shelter wall",
    );
    solid(
      { x: 0, y: y + 3.5, z: z - 1, w: 15, h: 0.35, d: 4 },
      0x8c9384,
      "Rock shelter canopy",
    );
  }
  for (const x of [-44, -34])
    solid({ x, y: 0, z: -8, w: 3, h: 8, d: 5 }, 0x7d908b, "Sea arch pillar");
  solid({ x: -39, y: 8, z: -8, w: 13, h: 2, d: 5 }, 0x8c9b91, "Sea arch crown");
  const plants = new T.InstancedMesh(
    new T.ConeGeometry(0.45, 1.1, 5),
    new T.MeshStandardMaterial({ color: 0x587b65, roughness: 1 }),
    80,
  );
  const matrix = new T.Matrix4();
  for (let i = 0; i < 80; i++) {
    matrix.makeTranslation(
      (i % 2 ? -1 : 1) * (42 + (i % 4) * 1.4),
      0.5,
      48 - Math.floor(i / 2) * 2.8,
    );
    plants.setMatrixAt(i, matrix);
  }
  plants.name = "Batched coastal shrubs";
  markScenery(plants, {
    kind: "decoration",
    reason: "Low soft vegetation beyond the clear mountain routes.",
  });
  root.add(plants);
  land.tree(-29, 42);
  land.tree(26, 46);
  land.actor("jared", { x: -4, y: 0, z: 49 }, "Jared awaiting his brother");
  const tray = decor(
    { x: 0, y: 0.8, z: 49, w: 1.6, h: 0.12, d: 1.1 },
    0x796044,
    "Secure sixteen-stone tray",
    "Invented secured carrier; all sixteen stones are already prepared.",
  );
  const stoneMat = new T.MeshStandardMaterial({
    color: 0xe2e8dc,
    roughness: 0.25,
    emissive: 0x000000,
  });
  for (let i = 0; i < 16; i++) {
    const s = new T.Mesh(new T.IcosahedronGeometry(0.13, 1), stoneMat);
    s.position.set(
      -0.57 + (i % 4) * 0.38,
      0.18,
      -0.36 + Math.floor(i / 4) * 0.24,
    );
    tray.add(s);
  }
  const glow = new T.PointLight(0xffecc2, 0, 7);
  tray.add(glow);
  for (let i = 0; i < 9; i++)
    decor(
      { x: -48 + i * 11, y: 0, z: -83, w: 12, h: 24 + (i % 3) * 8, d: 9 },
      0x647b82,
      "Distant mountain skyline",
      "Backdrop beyond playable bounds.",
    );
  decor(
    { x: -48, y: 0.02, z: 0, w: 10, h: 0.04, d: 130 },
    0x6aa8b4,
    "Sea below the western cliffs",
    "Distant shallow visual on earth support outside the main route.",
  );
  // Narrow exposed shortcut skips the long middle switchback; gusts warn first.
  solid(
    { x: -27.3, y: 0, z: -11.5, w: 2.6, h: 4, d: 25 },
    0xa8a991,
    "Exposed shortcut ledge",
  );
  const wind = decor(
    { x: -27.3, y: 4.04, z: -14, w: 2.5, h: 0.07, d: 6 },
    0x89a9b1,
    "Wind warning strip",
    "Readable optional gust warning above the physical shortcut.",
  );
  decor(
    { x: 25, y: 8.03, z: -28, w: 2, h: 0.05, d: 2 },
    0x7ab9b5,
    "Sheltered spring",
    "Shallow spring on the mountain terrace support.",
  );
  // Optional climb offers a short link between the lower terraces.
  for (const x of [-28, -26.6])
    solid(
      { x, y: 4, z: -23.5, w: 0.12, h: 8, d: 0.12 },
      0x7d6c4d,
      "Mountain ladder rail",
    );
  for (let i = 0; i < 19; i++)
    solid(
      { x: -27.3, y: 4.3 + i * 0.4, z: -23.5, w: 1.4, h: 0.1, d: 0.15 },
      0x9e8964,
      "Mountain ladder rung",
    );
  solid(
    { x: -24, y: 0, z: -23, w: 4, h: 8, d: 2 },
    0x8d9487,
    "Ladder side landing",
  );
  const climbables = [
    { id: "shelem-ladder", x: -27.3, z: -23.5, y: 4, height: 8, radius: 0.6 },
  ];
  let disposed = false;
  const runtimes = new Set<AdventureRuntime>();
  return {
    name: "The Sixteen Stones of Shelem",
    subtitle: "Ether 3 · imagined mountain paths",
    initialObjective:
      "Lift the prepared tray. Follow the broad mountain stairs.",
    spawn: { x: 0, y: 0, z: 49 },
    solids,
    climbables,
    actorParent: root,
    bounds: { minX: -53, maxX: 51, minZ: -70, maxZ: 62 },
    goal: { x: 0, y: 0, z: 49, radius: 3 },
    landmarks: [
      { name: "Summit", x: 0, y: 12, z: -60 },
      { name: "East return stair", x: 36, y: 12, z: -60 },
      { name: "Sheltered spring", x: 25, y: 8, z: -28 },
    ],
    adventure(hooks) {
      let carrying = false,
        illuminated = false,
        completed = false,
        elapsed = 0,
        witness = 0,
        recoveries = 0,
        stopped = false,
        checkpoint: Point = { x: 0, y: 0, z: 49 };
      const discoveries = new Set<number>();
      hooks.setAvatar("jared-brother");
      const runtime: AdventureRuntime = {
        update(dt, p, input) {
          let prompt = "";
          if (!disposed && !stopped) {
            elapsed += Number.isFinite(dt)
              ? Math.max(0, Math.min(dt, 0.05))
              : 0;
            if (!carrying && !completed && near(p, { x: 0, y: 0, z: 49 })) {
              prompt = "Lift the secured tray of sixteen prepared stones";
              if (input.interact) {
                carrying = true;
                hooks.toast(
                  "Sixteen stones, already molten from rock. The tray and all mountain paths are imagined.",
                );
              }
            }
            if (carrying) {
              for (const [z, y] of [
                [5, 4],
                [-28, 8],
                [-60, 12],
              ] as const)
                if (Math.abs(p.z - z) < 2 && Math.abs(p.y - y) < 0.5)
                  checkpoint = { x: p.x, y, z };
              const gust = elapsed % 12;
              (wind.material as T.MeshStandardMaterial).color.setHex(
                gust >= 7 && gust < 9
                  ? 0xe2f2ef
                  : gust >= 5 && gust < 7
                    ? 0xe4b764
                    : 0x89a9b1,
              );
              const exposed =
                Math.abs(p.x + 27.3) < 1.4 &&
                p.z < -11 &&
                p.z > -17 &&
                p.y > 3.5 &&
                p.y < 5;
              if (exposed && gust >= 5 && gust < 7)
                prompt =
                  "Amber wind: shelter at either end of the narrow ledge";
              if (p.y < -2 || (exposed && gust >= 7 && gust < 9)) {
                Object.assign(
                  p,
                  createPlayer(checkpoint.x, checkpoint.y, checkpoint.z),
                );
                recoveries++;
                hooks.toast(
                  "Safe on the last sheltered ledge. Every stone remains secured.",
                );
              }
              tray.position.set(
                p.x - Math.sin(p.yaw) * 0.6,
                p.y + 1,
                p.z - Math.cos(p.yaw) * 0.6,
              );
              tray.rotation.y = p.yaw;
              if (!illuminated && near(p, { x: 0, y: 12, z: -60 }, 3)) {
                witness += Math.max(
                  0,
                  Math.min(Number.isFinite(dt) ? dt : 0, 0.05),
                );
                prompt = "A quiet moment on the summit";
                if (witness >= 2) {
                  illuminated = true;
                  stoneMat.emissive.setHex(0xffd48a);
                  stoneMat.emissiveIntensity = 1.7;
                  glow.intensity = 2;
                  hooks.dialog(
                    "Ether 3:1–6",
                    "Light for the journey",
                    "The brother of Jared prayed, and the Lord touched the stones. Their light was a gift, not a reward for the climb. This scene witnesses the light without depicting the divine appearance.",
                    () => {},
                  );
                }
              }
              if (illuminated && near(p, { x: 0, y: 0, z: 49 }, 3)) {
                carrying = false;
                completed = true;
                tray.position.set(1, 0.9, 49);
                hooks.complete();
                hooks.toast(
                  "The shining stones will light eight vessels, one stone in each end. Explore freely.",
                );
              }
            }
            SHELEM_ROUTE.discoveries.forEach((q, i) => {
              if (near(p, q, 2.6) && !discoveries.has(i)) {
                discoveries.add(i);
                hooks.toast(
                  [
                    "Sea arch vista: the shore lies far below.",
                    "Sheltered spring: a quiet pause above the wind.",
                    "High saddle: a broad horizon beyond the summit.",
                  ][i],
                );
              }
            });
          }
          return {
            objective: completed
              ? "Explore the mountain and its sheltered overlooks."
              : illuminated
                ? "Carry the shining tray down the east return stairs."
                : carrying
                  ? "Carry the tray up the broad zigzag mountain stairs."
                  : "Lift the prepared tray at the mountain foot.",
            prompt,
            carrying,
          };
        },
        snapshot: () => ({
          carrying,
          illuminated,
          completed,
          elapsed,
          witness,
          recoveries,
          checkpoint: { ...checkpoint },
          discoveries: [...discoveries],
          stones: 16,
          route: SHELEM_ROUTE,
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

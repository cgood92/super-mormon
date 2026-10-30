import * as T from "three";
import type { Point, WorldData } from "../../runtime/worlds";
import type { AdventureRuntime } from "../../runtime/adventure";
import { createPlayer, stepPlayer } from "../../physics/physics";
import { warWorld, nearWarPoint } from "../shared/war-world-kit";
import { markScenery } from "../shared/scenery";
const p = (x: number, z: number, y = 0): Point => Object.freeze({ x, y, z });
export const jaredExpeditionRoute = Object.freeze({
  animals: Object.freeze([p(-28, -2), p(-28, 2)]),
  fish: p(-32, 12),
  seeds: p(-32, -12),
  camp: p(32, 0),
  gate: p(0, 0),
  discoveries: Object.freeze([p(-18, 24), p(12, -24), p(35, 22)]),
});
export function buildJaredExpedition(scene: T.Scene): WorldData {
  const land = warWorld(scene, "Jared · green wilderness"),
    { root, solids, solid, decor, tree, actor } = land;
  const floor = root.children.find(
    (o) => o.name === "Single earth walk surface",
  ) as T.Mesh;
  (floor.material as T.MeshStandardMaterial).color.setHex(0x77985c);
  // Canyon walls leave a wide central crossing and a longer southern bypass.
  for (const z of [-13, 13]) {
    solid({ x: 0, y: 0, z, w: 7, h: 3, d: 16 }, 0x82917a, "Canyon shoulder");
    solid(
      { x: 0, y: 3, z, w: 5, h: 1.5, d: 12 },
      0xa3ad8e,
      "Fitted upper rock terrace",
    );
  }
  for (const x of [-6, 6])
    for (const z of [-5, 5])
      solid(
        { x, y: 0, z, w: 0.4, h: 1.3, d: 0.4 },
        0xa67e4d,
        "Herd crossing guide post",
      );
  for (const z of [-5, 5])
    decor(
      { x: 0, y: 0.02, z, w: 13, h: 0.03, d: 0.4 },
      0xcbb783,
      "Crossing edge stones",
      "Thin route finish; earth owns support.",
    );
  for (const [x, z] of [
    [-42, -22],
    [-38, 25],
    [-19, -18],
    [-17, 17],
    [13, 14],
    [20, -17],
    [40, -20],
    [40, 27],
  ] as const)
    tree(x, z);
  for (let i = 0; i < 10; i++)
    solid(
      { x: 16 + i * 0.75, y: 0, z: -24, w: 0.75, h: (i + 1) * 0.28, d: 3 },
      0xa2aa84,
      "Ridge walking stair",
    );
  solid(
    { x: 23.3125, y: 0, z: -24, w: 0.375, h: 2.8, d: 3 },
    0x9aa47d,
    "Ridge stair landing",
  );
  solid(
    { x: 26, y: 0, z: -24, w: 5, h: 2.8, d: 6 },
    0x9aa47d,
    "Ridge lookout terrace",
  );
  for (const x of [27, 36]) {
    solid(
      { x, y: 0, z: 8, w: 0.25, h: 2.8, d: 0.25 },
      0xa07b4e,
      "Camp shelter upright",
    );
  }
  solid(
    { x: 31.5, y: 2.8, z: 8, w: 10, h: 0.25, d: 6 },
    0xceb78a,
    "Camp shade roof",
  );
  actor("jared-brother", p(34, 6), "Brother of Jared");
  actor("wife", p(-34, 16), "Family provision keeper");
  actor("sam", p(28, 10), "Traveling companion");
  const cargo = [jaredExpeditionRoute.fish, jaredExpeditionRoute.seeds].map(
    (at, i) =>
      decor(
        {
          x: at.x,
          y: 0,
          z: at.z,
          w: i ? 1 : 0.85,
          h: i ? 0.55 : 0.9,
          d: i ? 0.7 : 0.85,
        },
        i ? 0xb68b48 : 0x598c9e,
        i ? "Seed basket" : "Protected fish vessel",
        "Portable protected provision; follows its carrier.",
      ),
  );
  // Simple animal silhouettes use one body and four legs; their movement uses player collision.
  const animals = jaredExpeditionRoute.animals.map((at, i) => {
    const body = new T.Group();
    body.name = i ? "Traveling ewe" : "Traveling ram";
    root.add(body);
    const part = (
      name: string,
      color: number,
      x: number,
      y: number,
      z: number,
      sx: number,
      sy: number,
      sz: number,
    ) => {
      const mesh = new T.Mesh(
        new T.SphereGeometry(1, 10, 7),
        new T.MeshStandardMaterial({ color, roughness: 1 }),
      );
      mesh.name = name;
      mesh.position.set(x, y, z);
      mesh.scale.set(sx, sy, sz);
      markScenery(mesh, {
        kind: "decoration",
        reason:
          "Moving flock animal part; collision-aware locomotion owns its movement.",
      });
      body.add(mesh);
    };
    part(
      "Woolly flock body",
      i ? 0xe0d4b6 : 0xc6b99b,
      0,
      0.8,
      0,
      0.48,
      0.45,
      0.7,
    );
    part("Animal head", 0x78684d, 0, 1.04, 0.7, 0.25, 0.3, 0.33);
    part("Soft muzzle", 0x5a5144, 0, 0.94, 0.94, 0.21, 0.17, 0.18);
    for (const x of [-0.3, 0.3]) {
      part("Animal ear", 0xa19377, x, 1.2, 0.68, 0.2, 0.07, 0.12);
      for (const z of [-0.4, 0.4])
        part("Animal leg", 0x76674c, x, 0.3, z, 0.09, 0.3, 0.09);
      part("Animal eye", 0x252923, x * 0.65, 1.15, 0.94, 0.035, 0.04, 0.035);
    }
    if (!i)
      for (const x of [-0.22, 0.22])
        part("Curled ram horn", 0xaaa18a, x, 1.28, 0.63, 0.16, 0.15, 0.13);
    body.position.set(at.x, 0, at.z);
    const state = createPlayer(at.x, 0, at.z);
    return { body, state, settled: false };
  });
  for (const [x, z, label] of [
    [-18, 24, "Covered hive camp"],
    [12, -24, "Bird shelter"],
    [35, 22, "Shore tide basin"],
  ] as const) {
    solid({ x, y: 0, z: z + 2, w: 3, h: 0.5, d: 2 }, 0xb1ab7d, label);
    decor(
      { x, y: 0.5, z: z + 2, w: 1.2, h: 0.8, d: 1 },
      0xc5a35c,
      label + " supplies",
      "Small contextual provisions, not objectives.",
    );
  }
  const plants = new T.InstancedMesh(
    new T.IcosahedronGeometry(0.5, 0),
    new T.MeshStandardMaterial({ color: 0x4f854e }),
    120,
  );
  const matrix = new T.Matrix4();
  for (let i = 0; i < 120; i++) {
    matrix.makeTranslation(
      -42 + (i % 20) * 4.4,
      0.2,
      (i < 60 ? -1 : 1) * (8 + Math.floor((i % 60) / 20) * 9),
    );
    plants.setMatrixAt(i, matrix);
  }
  markScenery(plants, {
    kind: "decoration",
    reason: "Soft meadow foliage outside primary walking lanes.",
  });
  root.add(plants);
  for (const x of [-36, -24, -10, 12, 24, 38])
    for (const z of [-29, 29]) tree(x, z);
  decor(
    { x: -23, y: 0.015, z: 19, w: 25, h: 0.025, d: 6 },
    0x789f8a,
    "Shallow marsh water",
    "Shallow wetland finish; underlying earth supports wading.",
  );
  for (let i = 0; i < 7; i++)
    solid(
      {
        x: -35 + i * 4,
        y: 0,
        z: 19 + (i % 2 ? 0.7 : -0.7),
        w: 2.2,
        h: 0.2 + (i % 2) * 0.1,
        d: 2,
      },
      0xb3bba1,
      "Marsh stepping stone",
    );
  for (let i = 0; i < 3; i++) {
    const hive = new T.Mesh(
      new T.CylinderGeometry(0.3, 0.55, 0.75, 10),
      new T.MeshStandardMaterial({ color: 0xb39a51 }),
    );
    hive.position.set(-19 + i * 0.8, 0.9, 26);
    hive.name = "Covered traveling hive";
    markScenery(hive, {
      kind: "decoration",
      reason: "Small protected hive rests on the solid supply bench.",
    });
    root.add(hive);
    const bird = new T.Group();
    bird.position.set(11 + i * 0.7, 0.9, -22);
    bird.name = "Sheltered traveling bird";
    for (const [x, y, z, sx, sy, sz] of [
      [0, 0, 0, 0.23, 0.2, 0.35],
      [0, 0.22, 0.25, 0.15, 0.15, 0.15],
      [-0.22, 0, 0, 0.12, 0.08, 0.25],
      [0.22, 0, 0, 0.12, 0.08, 0.25],
    ]) {
      const mesh = new T.Mesh(
        new T.SphereGeometry(1, 8, 5),
        new T.MeshStandardMaterial({ color: i ? 0x8b7960 : 0xd2c6a2 }),
      );
      mesh.position.set(x, y, z);
      mesh.scale.set(sx, sy, sz);
      markScenery(mesh, {
        kind: "decoration",
        reason: "Small bird shelter occupant above a solid bench.",
      });
      bird.add(mesh);
    }
    root.add(bird);
  }
  decor(
    { x: 47, y: -0.2, z: 0, w: 12, h: 0.1, d: 85 },
    0x72aeb8,
    "Sea beyond the shore",
    "Water beyond playable east boundary.",
  );
  let disposed = false,
    runtime: AdventureRuntime | undefined;
  return {
    name: "Jared's Wilderness Journey",
    subtitle: "Ether 1–2 · A much earlier people, told by Moroni",
    spawn: p(-38, 0),
    solids,
    actorParent: root,
    bounds: { minX: -45, maxX: 43, minZ: -32, maxZ: 32 },
    goal: { ...jaredExpeditionRoute.camp, radius: 3 },
    initialObjective: "Guide the animal pair through the broad canyon crossing",
    landmarks: [
      { name: "Traveling camp", ...jaredExpeditionRoute.camp },
      { name: "Fish vessel", ...jaredExpeditionRoute.fish },
      { name: "Seeds", ...jaredExpeditionRoute.seeds },
      { name: "Broad crossing", ...jaredExpeditionRoute.gate },
    ],
    dispose() {
      if (disposed) return;
      disposed = true;
      runtime?.dispose();
      land.dispose();
    },
    adventure(hooks) {
      hooks.setAvatar("jared");
      let ended = false,
        carrying: number | undefined,
        completed = false;
      const delivered = [false, false],
        found = new Set<number>();
      const reset = () => {
        if (carrying !== undefined) {
          const at = [jaredExpeditionRoute.fish, jaredExpeditionRoute.seeds][
            carrying
          ];
          cargo[carrying].position.set(at.x, carrying ? 0.55 : 0.45, at.z);
        }
        carrying = undefined;
      };
      runtime = {
        snapshot: () =>
          Object.freeze({
            carrying,
            completed,
            delivered: Object.freeze([...delivered]),
            animals: Object.freeze(
              animals.map((a) =>
                Object.freeze({
                  x: a.state.x,
                  z: a.state.z,
                  settled: a.settled,
                }),
              ),
            ),
            discoveries: Object.freeze([...found]),
          }),
        dispose() {
          ended = true;
          reset();
        },
        update(dt, player, input) {
          const objective = completed
            ? "Explore the shore, bird shelter and covered hives"
            : animals.some((a) => !a.settled)
              ? "Walk ahead of the pair; guide them to the shore camp"
              : delivered.every(Boolean)
                ? "Join your family at the shore camp"
                : "Carry the fish vessel and seeds along a safe route";
          if (ended || disposed) return { objective, prompt: "" };
          const delta = Math.min(
            0.05,
            Math.max(0, Number.isFinite(dt) ? dt : 0),
          );
          if (
            player.y < -3 ||
            !Number.isFinite(player.x + player.y + player.z)
          ) {
            reset();
            Object.assign(player, { x: -38, y: 0, z: 0, vx: 0, vy: 0, vz: 0 });
          }
          for (const [animalIndex, a] of animals.entries()) {
            const dx = player.x - a.state.x,
              dz = player.z + (animalIndex ? 0.8 : -0.8) - a.state.z,
              d = Math.hypot(dx, dz);
            if (!a.settled && d < 9 && d > 2) {
              stepPlayer(
                a.state,
                {
                  x: (-dx / d) * 0.52,
                  y: (dz / d) * 0.52,
                  jump: false,
                  jumpHeld: false,
                },
                delta,
                0,
                solids,
              );
              a.body.position.set(a.state.x, a.state.y, a.state.z);
              a.body.rotation.y = Math.atan2(dx, dz);
            }
            if (nearWarPoint(a.state, jaredExpeditionRoute.camp, 5))
              a.settled = true;
          }
          for (let i = 0; i < 3; i++)
            if (
              !found.has(i) &&
              nearWarPoint(player, jaredExpeditionRoute.discoveries[i], 3)
            ) {
              found.add(i);
              hooks.toast(
                [
                  "Covered hives: Ether names deseret, interpreted as honey bee.",
                  "Bird shelter: the travelers also prepared birds for their journey.",
                  "Shore camp: the record describes tents beside the great sea. This landscape is imagined.",
                ][i],
              );
            }
          let prompt = "";
          if (carrying !== undefined) {
            cargo[carrying].position.set(
              player.x + Math.sin(player.yaw) * 0.55,
              player.y + 1,
              player.z + Math.cos(player.yaw) * 0.55,
            );
            if (nearWarPoint(player, jaredExpeditionRoute.camp, 3)) {
              prompt = "Set the protected provision in camp";
              if (input.interact) {
                delivered[carrying] = true;
                cargo[carrying].position.set(30 + carrying * 2, 0.45, 3);
                carrying = undefined;
              }
            }
          } else
            for (let i = 0; i < 2; i++)
              if (
                !delivered[i] &&
                nearWarPoint(
                  player,
                  [jaredExpeditionRoute.fish, jaredExpeditionRoute.seeds][i],
                  2,
                )
              ) {
                prompt = i
                  ? "Carry seed basket"
                  : "Carry protected fish vessel";
                if (input.interact) carrying = i;
              }
          if (
            !completed &&
            delivered.every(Boolean) &&
            animals.every((a) => a.settled) &&
            nearWarPoint(player, jaredExpeditionRoute.camp, 5)
          ) {
            completed = true;
            hooks.toast(
              "Moroni tells of an earlier people led through the wilderness. The journey here is condensed; prayer and divine guidance are not player powers.",
            );
            hooks.complete();
          }
          return { objective, prompt, carrying: carrying !== undefined };
        },
      };
      return runtime;
    },
  };
}

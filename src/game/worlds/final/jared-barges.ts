import * as T from "three";
import type { Point, WorldData } from "../../runtime/worlds";
import type { AdventureRuntime } from "../../runtime/adventure";
import { markScenery } from "../shared/scenery";
import { warWorld, nearWarPoint } from "../shared/war-world-kit";
const p = (x: number, z: number, y = 0): Point => Object.freeze({ x, y, z });
export const jaredBargesRoute = Object.freeze({
  pieces: Object.freeze([p(-24, -10), p(-24, 0), p(-24, 10)]),
  sockets: Object.freeze([p(14, -4, 1.2), p(14, 0, 1.2), p(14, 4, 1.2)]),
  stairs: p(7, 0),
  vent: p(20, 0, 1.2),
  air: p(20, 4, 1.2),
  discoveries: Object.freeze([p(-30, 20, 1.8), p(32, 16), p(-8, -20, 1.8)]),
});
export function buildJaredBarges(scene: T.Scene): WorldData {
  const land = warWorld(scene, "Jared · sheltered boatyard"),
    { root, solids, solid, decor, actor, tree } = land;
  const floor = root.children.find(
    (o) => o.name === "Single earth walk surface",
  ) as T.Mesh;
  (floor.material as T.MeshStandardMaterial).color.setHex(0xb7bb8b);
  // Seven closed representations plus the eighth accessible construction bay.
  for (const [x, z] of [
    [-32, -25],
    [-16, -25],
    [0, -25],
    [16, -25],
    [32, -25],
    [-16, 25],
    [4, 25],
  ] as const) {
    solid(
      { x, y: 0, z, w: 6, h: 1, d: 13 },
      0x86613f,
      "Closed barge lower hull",
    );
    solid(
      { x, y: 1, z, w: 7, h: 2, d: 15 },
      0xad8453,
      "Closed barge timber enclosure",
    );
    solid(
      { x, y: 3, z, w: 5.8, h: 0.8, d: 13 },
      0x987143,
      "Closed barge rounded crown",
    );
    for (const dz of [-7, 7])
      solid(
        { x, y: 1, z: z + dz, w: 4.5, h: 2, d: 2 },
        0x987143,
        "Closed barge end",
      );
  }
  solid(
    { x: 19, y: 0, z: 0, w: 12, h: 1.2, d: 14 },
    0x9c784d,
    "Eighth vessel construction work deck",
  );
  solid(
    { x: 24.75, y: 1.2, z: 0, w: 0.5, h: 3, d: 14 },
    0x957047,
    "Eighth vessel far enclosure",
  );
  for (const z of [-6.75, 6.75])
    solid(
      { x: 19, y: 1.2, z, w: 12, h: 3, d: 0.5 },
      0x957047,
      "Eighth vessel end enclosure",
    );
  // Open west face is a deliberate construction cutaway, with raised framework.
  for (const x of [14, 24])
    for (const z of [-6, 6])
      solid(
        { x, y: 1.2, z, w: 0.3, h: 3.4, d: 0.3 },
        0x765739,
        "Work bay frame post",
      );
  for (const z of [-6, 6])
    solid(
      { x: 19, y: 4.3, z, w: 10, h: 0.25, d: 0.3 },
      0xa67e4e,
      "Work bay overhead rib",
    );
  for (let i = 0; i < 4; i++)
    solid(
      { x: 7 + i * 1.5, y: 0, z: 0, w: 1.5, h: (i + 1) * 0.3, d: 3 },
      0xb79b6a,
      "Wide work platform stair",
    );
  solid(
    { x: 12.625, y: 0, z: 0, w: 0.75, h: 1.2, d: 3 },
    0xb79b6a,
    "Work stair landing",
  );
  const dimensions = [
    { w: 0.65, h: 0.65, d: 2.6 },
    { w: 2.6, h: 0.25, d: 0.7 },
    { w: 0.8, h: 1.6, d: 0.8 },
  ];
  const colors = [0x96633c, 0xd1b37a, 0x5e827f];
  const pieces = jaredBargesRoute.pieces.map((at, i) =>
    decor(
      { x: at.x, y: 0.4, z: at.z, ...dimensions[i] },
      colors[i],
      ["Square keel timber", "Flat hull plank", "Tall sealed air collar"][i],
      "Portable shaped construction piece; collision begins when installed.",
    ),
  );
  const installed = jaredBargesRoute.sockets.map((at, i) => {
    const mesh = solid(
      { x: at.x + 2, y: 1.2, z: at.z, ...dimensions[i] },
      colors[i],
      "Fitted " + ["keel support", "hull plank", "sealed air collar"][i],
    );
    const shape = solids.pop()!;
    mesh.visible = false;
    return { mesh, shape };
  });
  for (let i = 0; i < 3; i++) {
    const at = jaredBargesRoute.sockets[i];
    decor(
      { x: at.x, y: 1.205, z: at.z, ...dimensions[i], h: 0.03 },
      colors[i],
      "Matching shape and grain fitting guide",
      "Thin colored shape guide on the work deck; deck owns support.",
    );
    const origin = jaredBargesRoute.pieces[i];
    solid(
      { x: origin.x, y: 0, z: origin.z - 2, w: 4, h: 0.5, d: 1.3 },
      0x8f704b,
      "Material sorting bench",
    );
  }
  const vent = decor(
    { x: 20, y: 1.23, z: 0, w: 1.1, h: 0.12, d: 1.1 },
    0x476f73,
    "Removable air opening cover",
    "Small moving hatch cover; construction deck owns support.",
  );
  const stream = decor(
    { x: 20, y: 1.5, z: 0, w: 0.15, h: 2, d: 0.15 },
    0xb6dad0,
    "Airflow test ribbon",
    "Soft hanging ribbon demonstrates open ventilation.",
  );
  stream.visible = false;
  actor("peace-builder", p(26, 9), "Shipwright");
  actor("jared", p(-20, 15), "Jared");
  actor("sam", p(-29, -5), "Timber worker");
  actor("wife", p(-26, 19), "Provision keeper");
  for (const [x, z] of [
    [-40, -14],
    [-40, 16],
    [33, -14],
    [37, 27],
  ] as const)
    tree(x, z);
  // Walkable loft, tide basin and bluff are separate optional places.
  for (let i = 0; i < 6; i++)
    solid(
      { x: -34, y: 0, z: 10 + i * 0.7, w: 2, h: (i + 1) * 0.3, d: 0.7 },
      0xa89a73,
      "Timber loft steps",
    );
  solid(
    { x: -34, y: 1.5, z: 14.85, w: 2, h: 0.3, d: 2 },
    0xab8758,
    "Timber loft stair landing",
  );
  solid(
    { x: -29.5, y: 1.5, z: 17, w: 7, h: 0.3, d: 7 },
    0xab8758,
    "Timber loft floor",
  );
  solid(
    { x: 34, y: 0, z: 17, w: 4, h: 0.45, d: 4 },
    0x8f9f8c,
    "Tidepool rock rim",
  );
  decor(
    { x: 34, y: 0.46, z: 17, w: 3, h: 0.025, d: 3 },
    0x7eb5b4,
    "Tidepool water",
    "Water within solid basin.",
  );
  for (let i = 0; i < 6; i++)
    solid(
      { x: -8, y: 0, z: -12 - i * 0.8, w: 3, h: (i + 1) * 0.3, d: 0.8 },
      0x9fa27c,
      "Bluff stair",
    );
  solid(
    { x: -8, y: 1.5, z: -16.95, w: 3, h: 0.3, d: 1.1 },
    0xb0b08b,
    "Bluff stair landing",
  );
  solid(
    { x: -8, y: 1.5, z: -20, w: 6, h: 0.3, d: 5 },
    0xb0b08b,
    "Bluff vista platform",
  );
  decor(
    { x: 46, y: -0.2, z: 0, w: 8, h: 0.1, d: 85 },
    0x74aeb8,
    "Sheltered sea",
    "Water outside playable shore boundary.",
  );
  const seams = new T.InstancedMesh(
    new T.BoxGeometry(0.035, 0.035, 13.8),
    new T.MeshStandardMaterial({ color: 0x745237, roughness: 1 }),
    42,
  );
  let seam = 0;
  const m = new T.Matrix4();
  for (const [x, z] of [
    [-32, -25],
    [-16, -25],
    [0, -25],
    [16, -25],
    [32, -25],
    [-16, 25],
    [4, 25],
  ])
    for (const side of [-1, 1])
      for (const y of [1.45, 2, 2.55]) {
        m.makeTranslation(x + side * 3.51, y, z);
        seams.setMatrixAt(seam++, m);
      }
  seams.name = "Batched closed vessel timber seams";
  markScenery(seams, {
    kind: "decoration",
    reason: "Fine timber joint relief on the solid closed hull enclosures.",
  });
  root.add(seams);
  for (const y of [1.8, 2.5, 3.2, 3.9])
    decor(
      { x: 24.47, y, z: 0, w: 0.035, h: 0.035, d: 13.5 },
      0x715235,
      "Work bay timber joint",
      "Fine joint relief on the solid enclosure wall.",
    );
  let disposed = false,
    runtime: AdventureRuntime | undefined;
  return {
    name: "The Barge Builders",
    subtitle: "Ether 2:16–25 · Imagined construction at the shore",
    spawn: p(-34, 0),
    solids,
    actorParent: root,
    bounds: { minX: -43, maxX: 40, minZ: -35, maxZ: 35 },
    goal: { ...jaredBargesRoute.vent, radius: 2 },
    initialObjective: "Match the three shaped pieces to the work bay guides",
    landmarks: [
      { name: "Material benches", ...p(-24, 0) },
      { name: "Work bay stairs", ...jaredBargesRoute.stairs },
      { name: "Air opening", ...jaredBargesRoute.vent },
    ],
    dispose() {
      if (disposed) return;
      disposed = true;
      runtime?.dispose();
      land.dispose();
    },
    adventure(hooks) {
      hooks.setAvatar("jared-brother");
      let ended = false,
        carrying: number | undefined,
        open = false,
        airTested = false,
        completed = false;
      const fitted = [false, false, false],
        found = new Set<number>();
      const reset = () => {
        if (carrying !== undefined) {
          const at = jaredBargesRoute.pieces[carrying];
          pieces[carrying].position.set(
            at.x,
            0.4 + dimensions[carrying].h / 2,
            at.z,
          );
        }
        carrying = undefined;
      };
      runtime = {
        snapshot: () =>
          Object.freeze({
            carrying,
            fitted: Object.freeze([...fitted]),
            open,
            airTested,
            completed,
            discoveries: Object.freeze([...found]),
          }),
        dispose() {
          ended = true;
          reset();
        },
        update(_dt, player, input) {
          const objective = completed
            ? "Explore the boatyard; the need for light remains"
            : !fitted.every(Boolean)
              ? "Match each timber shape to its guide in the raised work bay"
              : !open && !airTested
                ? "Open the air cover inside the work bay"
                : !airTested
                  ? "Walk to the rear aisle and check the airflow ribbon"
                  : "Return to the air opening and seal the cover";
          if (ended || disposed) return { objective, prompt: "" };
          if (
            player.y < -3 ||
            !Number.isFinite(player.x + player.y + player.z)
          ) {
            reset();
            Object.assign(player, { x: -34, y: 0, z: 0, vx: 0, vy: 0, vz: 0 });
          }
          for (let i = 0; i < 3; i++)
            if (
              !found.has(i) &&
              nearWarPoint(player, jaredBargesRoute.discoveries[i], 3)
            ) {
              found.add(i);
              hooks.toast(
                [
                  "Timber loft: imagined tools and joinery explain this construction puzzle.",
                  "Tidepool: the account describes vessels tight against water.",
                  "Bluff: eight vessels are represented. Their exact ancient shape is unknown.",
                ][i],
              );
            }
          let prompt = "";
          if (carrying !== undefined) {
            pieces[carrying].position.set(
              player.x + Math.sin(player.yaw) * 0.6,
              player.y + 1,
              player.z + Math.cos(player.yaw) * 0.6,
            );
            const at = jaredBargesRoute.sockets[carrying];
            if (nearWarPoint(player, at, 1.7)) {
              prompt = "Fit this shape to its matching guide";
              if (input.interact) {
                fitted[carrying] = true;
                pieces[carrying].visible = false;
                installed[carrying].mesh.visible = true;
                solids.push(installed[carrying].shape);
                carrying = undefined;
              }
            }
          } else if (!fitted.every(Boolean)) {
            for (let i = 0; i < 3; i++)
              if (
                !fitted[i] &&
                nearWarPoint(player, jaredBargesRoute.pieces[i], 2)
              ) {
                prompt =
                  "Carry " +
                  [
                    "square keel timber",
                    "flat hull plank",
                    "sealed air collar",
                  ][i];
                if (input.interact) carrying = i;
              }
          }
          if (fitted.every(Boolean)) {
            if (open && nearWarPoint(player, jaredBargesRoute.air, 1.4))
              airTested = true;
            if (nearWarPoint(player, jaredBargesRoute.vent, 1.7)) {
              prompt = open
                ? "Close air cover after testing the rear aisle"
                : "Open the air cover";
              if (input.interact && !completed) {
                open = !open;
                vent.position.x = open ? 21.5 : 20;
                stream.visible = open;
                if (!open && airTested) {
                  completed = true;
                  hooks.toast(
                    "Ether describes tight vessels and openings above and below. This joinery and test are imagined. The need for light remains; the account next turns to the mountain.",
                  );
                  hooks.complete();
                }
              }
            }
          }
          return { objective, prompt, carrying: carrying !== undefined };
        },
      };
      return runtime;
    },
  };
}

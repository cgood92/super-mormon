import * as T from "three";
import { warWorld, nearWarPoint } from "../shared/war-world-kit";
import type { WorldData, Point } from "../../runtime/worlds";
import type { AdventureRuntime } from "../../runtime/adventure";
import { markScenery, terracedRock } from "../shared/scenery";
import { createPlayer } from "../../physics/physics";

/** QA routes use continuous walking; the optional ladder is a second ascent. */
export const MORMON_ROUTE = {
  outward: [
    { x: 0, z: 40 },
    { x: -16, z: 40 },
    { x: -16, z: 14 },
    { x: -16, z: -14 },
    { x: -16, z: -19 },
    { x: 0, z: -19 },
    { x: 0, z: -24 },
  ],
  return: [
    { x: 0, z: -19 },
    { x: 18, z: -19 },
    { x: 18, z: -14 },
    { x: 18, z: 14 },
    { x: 42, z: 14 },
    { x: 42, z: 35 },
    { x: 0, z: 40 },
    { x: 0, z: 49 },
  ],
  discoveries: [
    { x: 0, z: 40 },
    { x: -32, z: 40 },
    { x: -32, z: 18 },
    { x: -38, z: 4 },
    { x: -32, z: 18 },
    { x: -16, z: 14 },
    { x: -16, z: -14 },
    { x: -16, z: -35 },
    { x: 0, z: -35 },
    { x: 18, z: -35 },
  ],
} as const;
const PLACES = {
  spawn: { x: 0, y: 0, z: 49 },
  records: { x: 0, y: 6, z: -24 },
  shelf: { x: 18, y: 6, z: -35 },
  terrace: { x: -16, y: 6, z: -35 },
  spring: { x: -38, y: 0, z: 4 },
  lower: { x: 30, y: 0, z: 14 },
} satisfies Record<string, Point>;

export function buildMormonRecords(scene: T.Scene): WorldData {
  const land = warWorld(scene, "Shim · the sheltered record valley");
  const { root, solid, decor, tree, actor, solids } = land;
  // Reuse the shared world's single floor, recolored into this verdant valley.
  const ground = root.getObjectByName("Single earth walk surface") as T.Mesh;
  (ground.material as T.MeshStandardMaterial).color.setHex(0x789365);
  scene.background = new T.Color(0xb9d8ce);
  scene.fog = new T.Fog(0xb9d8ce, 85, 180);
  const stone = 0x8f9987;
  solid(
    { x: 0, y: 0, z: -27, w: 46, h: 6, d: 28 },
    stone,
    "Supported Shim hill",
  );
  // Fitted rounded buttresses soften the hill's exposed flanks without stealing
  // the broad stair routes or the flat archive terrace's walk surface.
  const rockMaterial = new T.MeshStandardMaterial({
    color: 0x899783,
    roughness: 1,
  });
  for (const [x, z, w, h, d] of [
    [-30, -33, 10, 5.5, 16],
    [30, -33, 10, 5, 16],
    [-32, -48, 17, 8, 12],
    [15, -49, 23, 9, 13],
  ] as const)
    terracedRock(
      root,
      solids,
      rockMaterial,
      { x, y: 0, z, w, h, d },
      "Mossy hill buttress",
    );
  rockMaterial.dispose();
  const fronds = new T.InstancedMesh(
    new T.ConeGeometry(0.55, 1.1, 5),
    new T.MeshStandardMaterial({ color: 0x426d42, roughness: 1 }),
    120,
  );
  const matrix = new T.Matrix4();
  for (let i = 0; i < 120; i++) {
    const side = i % 2 ? -1 : 1,
      x = side * (35 + (i % 7) * 1.4),
      z = -48 + Math.floor(i / 2) * 1.65;
    matrix.compose(
      new T.Vector3(x, 0.45, z),
      new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), i * 1.7),
      new T.Vector3(0.65 + (i % 3) * 0.2, 0.6 + (i % 5) * 0.1, 0.65),
    );
    fronds.setMatrixAt(i, matrix);
  }
  fronds.name = "Fern banks";
  markScenery(fronds, {
    kind: "decoration",
    reason:
      "Soft knee-high foliage beside dry paths does not support or obstruct players.",
  });
  root.add(fronds);
  const springBasin = new T.Mesh(
    new T.CylinderGeometry(3.2, 3.2, 0.08, 28),
    new T.MeshStandardMaterial({
      color: 0x7fc7be,
      roughness: 0.22,
      metalness: 0.12,
    }),
  );
  springBasin.position.set(-38, 0.06, 4);
  springBasin.name = "Spring pool";
  markScenery(springBasin, {
    kind: "decoration",
    reason: "Ankle-shallow spring on the sole earth support.",
  });
  root.add(springBasin);
  // Both broad stairs meet the hill at exactly its southern edge; no duplicate tops.
  for (const x of [-16, 18])
    for (let i = 0; i < 24; i++)
      solid(
        { x, y: 0, z: 13.5 - i * 1.125, w: 6, h: (i + 1) * 0.25, d: 1.125 },
        i % 3 ? 0x9da88e : 0xaaba98,
        "Hill stair tread",
      );
  // A substantial central ridge blocks the direct approach, leaving both side stairs.
  solid({ x: 1, y: 0, z: 0, w: 18, h: 4, d: 22 }, stone, "Solid valley ridge");
  for (const [x, z] of [
    [-29, 30],
    [-29, -8],
    [31, -5],
    [37, 42],
    [-40, -33],
    [34, -42],
  ] as const)
    tree(x, z);
  // Open-front elevated archive chamber and accessible refuge share their real floors.
  for (const [x, y, z, w, d] of [
    [0, 6, -26, 12, 10],
    [0, 0, 50, 14, 12],
  ] as const) {
    for (const side of [-1, 1])
      solid(
        { x: x + (side * w) / 2, y, z, w: 0.5, h: 4, d },
        0xc6c6a6,
        "Shelter side wall",
      );
    solid(
      { x, y, z: z + (y === 0 ? d / 2 : -d / 2), w, h: 4, d: 0.5 },
      0xb0b698,
      "Shelter rear wall",
    );
    solid(
      { x, y: y + 4, z, w: w + 0.5, h: 0.35, d: d + 0.5 },
      0x86947e,
      "Shelter roof",
    );
  }
  // Raised lintel beams and stone courses catch the light above the open rooms.
  for (const [y, z, width] of [
    [6, -21, 12],
    [0, 44, 14],
  ] as const) {
    solid(
      { x: 0, y: y + 3.35, z, w: width, h: 0.35, d: 0.5 },
      0x706b4e,
      "Carved timber lintel",
    );
    for (const x of [-width / 2, width / 2])
      for (let j = 0; j < 4; j++)
        solid(
          { x, y: y + j * 0.85, z: z - 0.5, w: 0.62, h: 0.14, d: 1.7 },
          0xb7b99b,
          "Raised shelter stone course",
        );
  }
  // Eastern high shelf and western ruined terrace are open optional vistas.
  for (const x of [-16, 18])
    solid({ x, y: 6, z: -38, w: 5, h: 1, d: 0.6 }, 0xb6bea1, "Lookout parapet");
  for (const [x, z, w, d] of [
    [-44, 5, 5, 80],
    [48, -10, 3, 106],
    [-34, 58, 21, 3],
  ] as const)
    decor(
      { x, y: 0.015, z, w, h: 0.03, d },
      0x73b9bb,
      "Valley water",
      "Shallow water is visual beside the dry navigable paths; the earth owns support.",
    );
  for (let i = 0; i < 14; i++)
    decor(
      {
        x: -45 + i * 0.9,
        y: 1.2 + i * 0.4,
        z: -61,
        w: 3,
        h: 8 + i * 0.3,
        d: 4,
      },
      0x617b6c,
      "Distant valley silhouette",
      "Backdrop beyond playable bounds.",
    );
  // Solid ladder rails/rungs sit outside the hill; climbable owns upward movement.
  for (const x of [-25, -23.4])
    solid(
      { x, y: 0, z: -24, w: 0.12, h: 9, d: 0.12 },
      0x796346,
      "Archive ladder rail",
    );
  for (let i = 0; i < 21; i++)
    solid(
      { x: -24.2, y: 0.3 + i * 0.42, z: -24, w: 1.5, h: 0.1, d: 0.15 },
      0x977e52,
      "Archive ladder rung",
    );
  const climbables = [
    { id: "shim-ladder", x: -24.2, z: -24, y: 0, height: 9, radius: 0.5 },
  ];
  // The hill itself owns the ladder landing; no overhead duplicate slab.
  actor("wife", { x: -4, y: 0, z: 49 }, "Unnamed refuge keeper");
  actor("convert", { x: 5, y: 0, z: 48 }, "Unnamed traveler");
  const bundle = decor(
    { x: 0, y: 6.6, z: -24, w: 1.15, h: 0.65, d: 0.72 },
    0x886244,
    "Secured record bundle",
    "Movable tied record carrier; attached to the player while held.",
  );
  for (const x of [-0.36, 0.36]) {
    const strap = new T.Mesh(
      new T.BoxGeometry(0.09, 0.69, 0.76),
      new T.MeshStandardMaterial({ color: 0xceba88 }),
    );
    strap.position.x = x;
    bundle.add(strap);
  }
  const spray = decor(
    { x: 30, y: 0, z: 26, w: 9, h: 0.18, d: 8 },
    0xa1d8d5,
    "Seasonal spillway warning",
    "Shallow timed spillway visualization; recovery is handled by the adventure.",
  );
  let disposed = false;
  const runtimes = new Set<AdventureRuntime>();
  const near = (a: Point, b: Point, r = 2.3) => nearWarPoint(a, b, r);
  return {
    name: "Mormon and the Hidden Records",
    subtitle: "Adult Mormon at Shim · Mormon 4:23 · imagined paths",
    initialObjective:
      "Find the hill archive. Choose stairs or the west ladder.",
    spawn: PLACES.spawn,
    solids,
    climbables,
    actorParent: root,
    bounds: { minX: -50, maxX: 51, minZ: -56, maxZ: 64 },
    goal: { ...PLACES.spawn, radius: 3 },
    landmarks: Object.entries(PLACES).map(([name, p]) => ({ name, ...p })),
    adventure(hooks) {
      let stopped = false,
        elapsed = 0,
        carrying = false,
        completed = false,
        recoveries = 0,
        checkpoint = { ...PLACES.spawn },
        started = false;
      const discoveries = new Set<string>();
      hooks.setAvatar("mormon");
      const objective = () =>
        completed
          ? "Records secured. Explore the valley and high overlooks."
          : carrying
            ? "Carry records to the south refuge. Take the east stairs."
            : "Find the hill archive. Choose stairs or the west ladder.";
      const runtime: AdventureRuntime = {
        update(dt, player, input) {
          let prompt = "";
          if (!disposed && !stopped) {
            elapsed += Number.isFinite(dt)
              ? Math.max(0, Math.min(dt, 0.05))
              : 0;
            if (!started) {
              started = true;
              hooks.toast(
                "MANY YEARS LATER: Adult Mormon retrieves all the hidden records at Shim (Mormon 4:23). Ammaron’s childhood instructions are a memory; this journey and valley are imagined.",
              );
            }
            const phase = elapsed % 10,
              hazard = phase >= 5 && phase < 8;
            spray.scale.y = hazard ? 8 : phase >= 3 ? 3 : 1;
            (spray.material as T.MeshStandardMaterial).color.setHex(
              hazard ? 0xe4f8ed : phase >= 3 ? 0xe4c581 : 0x94cfc8,
            );
            if (near(player, PLACES.records, 3) && !carrying && !completed) {
              prompt = "Lift the tied record carrier";
              if (input.interact) {
                carrying = true;
                checkpoint = { x: 0, y: 6, z: -19 };
                hooks.toast(
                  "Records secured in the carrier. The carrier needs both hands: use the broad stairs rather than the ladder.",
                );
              }
            }
            if (carrying && near(player, PLACES.lower, 5))
              checkpoint = { ...PLACES.lower };
            const inSpillway =
              Math.abs(player.x - 30) < 4.5 &&
              Math.abs(player.z - 26) < 4 &&
              player.y < 2;
            if (inSpillway && phase >= 3)
              prompt = hazard
                ? "Water is surging — use the broad east bank"
                : "Amber spray: water rises soon. Wait on a dry bank or walk around east.";
            if (player.y < -2 || (inSpillway && hazard)) {
              Object.assign(player, {
                ...createPlayer(checkpoint.x, checkpoint.y, checkpoint.z),
                climbId: undefined,
                climbAway: undefined,
                ledge: undefined,
              });
              recoveries++;
              hooks.toast(
                "Back on the last dry landing. The secured records stay with you.",
              );
            }
            if (carrying && player.climbId === "shim-ladder") {
              Object.assign(player, {
                ...createPlayer(checkpoint.x, checkpoint.y, checkpoint.z),
                climbId: undefined,
                climbAway: undefined,
                ledge: undefined,
              });
              recoveries++;
              hooks.toast(
                "The carrier needs both hands. Returned to the dry landing with the records; use the broad stairs.",
              );
            }
            if (carrying) {
              bundle.position.set(
                player.x - Math.sin(player.yaw) * 0.45,
                player.y + 1,
                player.z - Math.cos(player.yaw) * 0.45,
              );
              bundle.rotation.y = player.yaw;
            }
            for (const [id, p, text] of [
              [
                "spring",
                PLACES.spring,
                "Spring grotto: fresh water threads through the green valley.",
              ],
              [
                "terrace",
                PLACES.terrace,
                "Abandoned terrace: a quiet view over the routes below.",
              ],
              [
                "shelf",
                PLACES.shelf,
                "High archive overlook: many paths lead back to shelter.",
              ],
            ] as const)
              if (near(player, p) && !discoveries.has(id)) {
                discoveries.add(id);
                hooks.toast(text);
              }
            if (carrying && near(player, PLACES.spawn, 3)) {
              carrying = false;
              completed = true;
              bundle.position.set(0, 0.75, 50);
              bundle.rotation.set(0, 0, 0);
              hooks.complete();
              hooks.dialog(
                "Mormon 6:6 · a much later time",
                "Much later · Cumorah",
                "Years later, near the end of his life, Mormon hid most of the entrusted records at Cumorah. He gave a few plates to his son Moroni. The refuge and carrier here are an imagined way to explore preservation, not a reconstruction of either hill.",
                () => {},
              );
            }
          }
          return { objective: objective(), prompt, carrying };
        },
        snapshot: () => ({
          carrying,
          completed,
          recoveries,
          elapsed,
          discoveries: [...discoveries],
          checkpoint: { ...checkpoint },
          hazard: elapsed % 10 >= 5 && elapsed % 10 < 8,
          route: MORMON_ROUTE,
        }),
        dispose() {
          if (stopped) return;
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
      for (const runtime of runtimes) runtime.dispose();
      land.dispose();
    },
  };
}

import * as T from "three";
import type { Point, WorldData } from "../../runtime/worlds";
import { warWorld, nearWarPoint } from "../shared/war-world-kit";
import { markScenery } from "../shared/scenery";
import type { AdventureRuntime } from "../../runtime/adventure";

const p = (x: number, z: number, y = 0): Point => ({ x, y, z });
/** Public immutable navigation evidence; coordinates describe imagined architecture. */
export const peaceCityRoute = Object.freeze({
  beams: Object.freeze([Object.freeze(p(-20, -14)), Object.freeze(p(-22, 14))]),
  sockets: Object.freeze([Object.freeze(p(-1.5, 0)), Object.freeze(p(1.5, 0))]),
  supply: Object.freeze(p(-12, 12)),
  storehouse: Object.freeze(p(14, 0)),
  ford: Object.freeze([Object.freeze(p(-8, 22)), Object.freeze(p(8, 22))]),
  discoveries: Object.freeze([
    Object.freeze(p(-25, -6, 3.3)),
    Object.freeze(p(-24, 22)),
    Object.freeze(p(27, -17)),
  ]),
});

/** Fourth Nephi's peaceful generations; all errands and city geometry are an adaptation. */
export function buildPeaceCity(scene: T.Scene): WorldData {
  const land = warWorld(scene, "A People of Peace · shared gardens");
  const { root, solids, solid, decor, actor, tree } = land;
  // Replace the kit's single floor: banks, sunken channel and ford have distinct owners.
  const earth = root.children.find(
    (o) => o.name === "Single earth walk surface",
  ) as T.Mesh;
  root.remove(earth);
  earth.geometry.dispose();
  (earth.material as T.Material).dispose();
  solids.splice(0, 1);
  for (const x of [-19.5, 19.5])
    solid(
      { x, y: -0.6, z: 0, w: 33, h: 0.6, d: 60 },
      0x9fb77c,
      "Garden bank walk surface",
    );
  solid(
    { x: 0, y: -1.6, z: 0, w: 6, h: 0.4, d: 60 },
    0x96ab83,
    "Shallow channel bed",
  );
  solid(
    { x: 0, y: -1.2, z: 22, w: 6, h: 1.2, d: 6 },
    0xbec8a2,
    "Broad safe stone ford",
  );
  // Gentle stair flights make the ford reachable without a jump out of the channel.
  decor(
    { x: 0, y: -0.9, z: 0, w: 5.8, h: 0.05, d: 37 },
    0x79b9bb,
    "Flowing garden water",
    "Shallow visual water above the solid channel bed; no second walk surface.",
  );
  for (const x of [-3.5, 3.5])
    for (const z of [-1.7, 1.7])
      solid(
        { x, y: -1.2, z, w: 0.7, h: 1.2, d: 0.7 },
        0xc7c4a6,
        "Bridge stone abutment",
      );
  const decks = peaceCityRoute.sockets.map((at, i) => {
    const mesh = solid(
      { x: at.x, y: -0.25, z: 0, w: 3, h: 0.25, d: 2.8 },
      i ? 0xa47a46 : 0xc29a60,
      `Bridge deck ${i + 1}`,
    );
    const shape = solids.pop()!;
    mesh.visible = false;
    return { mesh, shape };
  });
  const pickups = peaceCityRoute.beams.map((at, i) =>
    decor(
      { x: at.x, y: 0.65, z: at.z, w: 1.5, h: 0.24, d: 0.5 },
      i ? 0xa47a46 : 0xc29a60,
      `Shaped timber ${i + 1}`,
      "Portable timber; collision activates only as assembled bridge deck.",
    ),
  );
  const supply = decor(
    { x: -12, y: 0, z: 12, w: 0.8, h: 0.65, d: 0.8 },
    0xb88148,
    "Shared garden seed basket",
    "Portable supply attached visually to its carrier.",
  );
  // Open-front stone workshops have accessible interiors and a genuine stair/roof circuit.
  for (const [x, z] of [
    [-22, -14],
    [-24, 14],
    [17, 13],
    [17, -14],
  ] as const) {
    for (const dx of [-4, 4])
      solid(
        { x: x + dx, y: 0, z, w: 0.6, h: 3, d: 7 },
        0xe2d7b4,
        "Workshop side wall",
      );
    solid(
      { x, y: 0, z: z - 3.5, w: 8.6, h: 3, d: 0.6 },
      0xd4c7a2,
      "Workshop back wall",
    );
    solid(
      { x, y: 3, z, w: 8.6, h: 0.3, d: 7.6 },
      0xcbbd91,
      "Accessible workshop roof",
    );
  }
  solid(
    { x: 14, y: 0, z: -3.5, w: 8, h: 3, d: 0.6 },
    0xe2d7b4,
    "Storehouse back wall",
  );
  solid(
    { x: 18, y: 0, z: 0, w: 0.6, h: 3, d: 7 },
    0xe2d7b4,
    "Storehouse side wall",
  );
  solid(
    { x: 14, y: 3, z: 0, w: 8, h: 0.3, d: 7.6 },
    0xcbbd91,
    "Storehouse canopy",
  );
  // Northern roof has stairs on its west, clear of the timber workshop doorway.
  for (let i = 0; i < 10; i++)
    solid(
      { x: -29.6, y: 0, z: 1 - i * 0.65, w: 2, h: (i + 1) * 0.3, d: 0.65 },
      0xd4c7a2,
      "Roof garden stair",
    );
  solid(
    { x: -27.55, y: 2.7, z: -4.85, w: 2.1, h: 0.3, d: 0.65 },
    0xcbbd91,
    "Roof vista landing",
  );
  solid(
    { x: -25.5, y: 3, z: -7.3625, w: 2, h: 0.3, d: 5.675 },
    0xcbbd91,
    "Supported roof garden connection",
  );
  for (const [x, z] of [
    [-10, -22],
    [-31, 22],
    [25, -22],
    [26, 20],
    [12, -23],
  ] as const)
    tree(x, z);
  // Garden beds have real raised borders and stay clear of the main routes.
  for (const x of [12, 20])
    for (const z of [-8, 8]) {
      solid(
        { x, y: 0, z, w: 5, h: 0.35, d: 2.6 },
        0x6e8751,
        "Raised shared herb bed",
      );
      decor(
        { x, y: 0.35, z, w: 4.5, h: 0.28, d: 2 },
        0x7d9c58,
        "Herb leaves",
        "Soft plants within a solid garden bed, not a separate floor.",
      );
    }
  for (const [role, at, label] of [
    ["peace-builder", p(-18, -12), "Timber artisan"],
    ["sariah", p(-24, 18), "Potter"],
    ["sam", p(15, 3), "Storehouse keeper"],
    ["wife", p(22, -17), "Spring gardener"],
    ["child", p(19, 17), "Garden visitor"],
  ] as const)
    actor(role, at, label);
  // Distinct discovery furniture creates places, not empty coordinate targets.
  solid(
    { x: -24, y: 0, z: 24, w: 3, h: 0.65, d: 1 },
    0xa86c47,
    "Pottery drying bench",
  );
  for (let i = 0; i < 4; i++)
    decor(
      { x: -25 + i * 0.65, y: 0.65, z: 24, w: 0.45, h: 0.6, d: 0.45 },
      0xc58e64,
      "Clay vessel",
      "Small pottery on a solid bench.",
    );
  solid(
    { x: 24, y: 0, z: -18, w: 3, h: 0.5, d: 3 },
    0xbfcbb2,
    "Spring garden basin",
  );
  decor(
    { x: 24, y: 0.5, z: -18, w: 2.3, h: 0.04, d: 2.3 },
    0x8ccbd0,
    "Spring pool",
    "Water contained inside solid basin.",
  );
  // Narrow paving inlays sit above the single ground owner; their thin visible
  // surfaces are explicitly decoration rather than duplicate support planes.
  for (const [x, z, w, d] of [
    [-8, 0, 3, 48],
    [-16, -9, 18, 2],
    [-16, 19, 18, 2],
    [10, 0, 14, 2],
    [0, 22, 6, 3],
  ] as const)
    decor(
      { x, y: 0.012, z, w, h: 0.012, d },
      0xd8d3ad,
      "Limestone path inlay",
      "Thin paving finish; underlying bank or ford owns support.",
    );
  for (const [x, z] of [
    [-22, -14],
    [-24, 14],
    [17, 13],
    [17, -14],
  ] as const) {
    for (const dx of [-3, 3])
      solid(
        { x: x + dx, y: 0, z: z + 3.1, w: 0.32, h: 3, d: 0.32 },
        0x9b764b,
        "Workshop timber porch post",
      );
    solid(
      { x, y: 2.7, z: z + 3.1, w: 6.3, h: 0.3, d: 0.35 },
      0x9b764b,
      "Workshop porch crossbeam",
    );
    for (const dz of [-2, 0, 2])
      solid(
        { x, y: 3.3, z: z + dz, w: 8.6, h: 0.18, d: 0.22 },
        0xb18b54,
        "Exposed rooftop timber",
      );
    // Workbench and stacked goods are off the central doorway and delivery lanes.
    solid(
      { x: x + 2, y: 0, z: z - 1, w: 1.6, h: 0.8, d: 1.3 },
      0xaa8256,
      "Artisan workbench",
    );
    for (let j = 0; j < 3; j++)
      decor(
        { x: x + 1.5 + j * 0.45, y: 0.8, z: z - 1, w: 0.32, h: 0.45, d: 0.38 },
        0xc68c61,
        "Workshop earthenware",
        "Small vessels rest on the solid workbench.",
      );
  }
  // Low rails border the completed span without closing either bank approach.
  for (const z of [-1.65, 1.65]) {
    for (const x of [-2.6, 0, 2.6])
      solid(
        { x, y: 0, z, w: 0.18, h: 1, d: 0.18 },
        0xb09160,
        "Bridge handrail post",
      );
    solid(
      { x: 0, y: 0.85, z, w: 5.4, h: 0.15, d: 0.16 },
      0xb09160,
      "Bridge handrail",
    );
  }
  // Leaves are batched; their solid garden beds own physical support.
  const foliage = new T.InstancedMesh(
    new T.IcosahedronGeometry(0.34, 0),
    new T.MeshStandardMaterial({ color: 0x4f9855, roughness: 1 }),
    64,
  );
  const matrix = new T.Matrix4();
  let instance = 0;
  for (const x of [12, 20])
    for (const z of [-8, 8])
      for (let i = 0; i < 16; i++) {
        matrix.makeTranslation(
          x - 1.8 + (i % 8) * 0.5,
          0.75,
          z - 0.6 + Math.floor(i / 8) * 1.2,
        );
        foliage.setMatrixAt(instance++, matrix);
      }
  foliage.name = "Shared garden herb clusters";
  markScenery(foliage, {
    kind: "decoration",
    reason: "Soft leaves grow within solid raised beds.",
  });
  root.add(foliage);
  for (const x of [-40, -30, -20, -10, 0, 10, 20, 30, 40]) {
    const h = 7 + Math.abs(x % 13);
    const skyline = decor(
      { x, y: -1, z: -45, w: 7, h, d: 6 },
      0x9eae8c,
      "Distant rebuilt city skyline",
      "Atmospheric architecture outside playable bounds.",
    );
    skyline.userData.scenery = {
      kind: "backdrop",
      reason: "Distant city silhouette outside player bounds.",
    };
  }
  let disposed = false;
  let runtime: AdventureRuntime | undefined;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    runtime?.dispose();
    land.dispose();
  };
  return {
    name: "A People of Peace",
    subtitle: "Fourth Nephi 1:1–18 · Decades after Christ's visit",
    spawn: p(-8, 7),
    solids,
    actorParent: root,
    initialObjective: "Carry workshop timber to restore the garden bridge",
    goal: { ...peaceCityRoute.storehouse, radius: 2 },
    bounds: { minX: -34, maxX: 32, minZ: -28, maxZ: 28 },
    landmarks: [
      { name: "Timber workshop", ...peaceCityRoute.beams[0] },
      { name: "Potter workshop", ...peaceCityRoute.beams[1] },
      { name: "Bridge", ...p(-3, 0) },
      { name: "Shared seeds", ...peaceCityRoute.supply },
      { name: "Storehouse", ...peaceCityRoute.storehouse },
      { name: "Safe ford", ...p(0, 22) },
    ],
    dispose,
    adventure(hooks) {
      hooks.setAvatar("peace-builder");
      let ended = false,
        assembled = 0,
        carrying: number | "supply" | undefined,
        crossStage = 0,
        crossed = false,
        completed = false;
      const found = new Set<number>();
      const resetCarry = () => {
        if (typeof carrying === "number")
          pickups[carrying].position.set(
            peaceCityRoute.beams[carrying].x,
            0.77,
            peaceCityRoute.beams[carrying].z,
          );
        else if (carrying === "supply") supply.position.set(-12, 0.325, 12);
        carrying = undefined;
        crossStage = 0;
      };
      const snapshot = () =>
        Object.freeze({
          assembled,
          carrying,
          crossed,
          completed,
          discoveries: Object.freeze([...found]),
          route: peaceCityRoute,
        });
      runtime = {
        snapshot,
        dispose() {
          if (ended) return;
          resetCarry();
          ended = true;
        },
        update(_dt, player, input) {
          const objective = completed
            ? "Explore the roof gardens, spring and pottery court"
            : assembled < 2
              ? assembled === 0
                ? "Carry northern workshop timber to the west bridge abutment"
                : "Carry southern workshop timber to the west bridge abutment"
              : carrying === "supply"
                ? crossed
                  ? "Deliver the shared seeds to the eastern storehouse"
                  : "Carry the seeds across the completed bridge"
                : "Collect the shared seed basket west of the bridge";
          if (ended || disposed) return { objective, prompt: "" };
          if (
            player.y < -3 ||
            !Number.isFinite(player.x + player.y + player.z)
          ) {
            resetCarry();
            Object.assign(player, { x: -8, y: 0, z: 7, vx: 0, vy: 0, vz: 0 });
            hooks.toast(
              "Your load is safe at its workshop. Try either broad path.",
            );
          }
          for (let i = 0; i < peaceCityRoute.discoveries.length; i++)
            if (
              !found.has(i) &&
              nearWarPoint(player, peaceCityRoute.discoveries[i], 2.4)
            ) {
              found.add(i);
              hooks.toast(
                [
                  "Roof garden: one city, many open doors. This imagined vista celebrates rebuilding.",
                  "Potter's court: these imagined jars hold a share for every household.",
                  "Spring garden: Fourth Nephi later records pride and division over generations. Peace calls for continuing care.",
                ][i],
              );
            }
          if (carrying !== undefined) {
            const mesh = carrying === "supply" ? supply : pickups[carrying];
            mesh.position.set(
              player.x + Math.sin(player.yaw) * 0.5,
              player.y + 1,
              player.z + Math.cos(player.yaw) * 0.5,
            );
          }
          if (
            carrying === "supply" &&
            assembled === 2 &&
            Math.abs(player.z) < 1.25 &&
            player.y > -0.12 &&
            player.y < 0.6
          ) {
            if (player.x < -2.2) crossStage = 1;
            else if (crossStage === 1 && Math.abs(player.x) < 1) crossStage = 2;
            else if (crossStage === 2 && player.x > 2.2) {
              crossed = true;
              crossStage = 3;
              hooks.toast(
                "The restored span carries our shared supplies. Bring the seeds to the storehouse.",
              );
            }
          }
          let prompt = "";
          if (assembled < 2 && carrying === undefined) {
            const i = assembled;
            if (nearWarPoint(player, peaceCityRoute.beams[i], 2)) {
              prompt = `Carry shaped timber ${i + 1}`;
              if (input.interact) {
                carrying = i;
                hooks.toast("Fit the timber at the west bridge abutment.");
              }
            }
          } else if (
            typeof carrying === "number" &&
            nearWarPoint(player, p(-3, 0), 2)
          ) {
            prompt = "Fit timber into its matching bridge socket";
            if (input.interact) {
              pickups[carrying].visible = false;
              decks[carrying].mesh.visible = true;
              solids.push(decks[carrying].shape);
              assembled++;
              carrying = undefined;
              hooks.toast(
                assembled === 2
                  ? "The bridge is ready. Collect the shared seeds, then walk across it."
                  : "First deck fitted. The second shaped timber waits in the southern workshop.",
              );
            }
          } else if (
            assembled === 2 &&
            carrying === undefined &&
            !completed &&
            nearWarPoint(player, peaceCityRoute.supply, 2)
          ) {
            prompt = "Carry the shared seeds";
            if (input.interact) carrying = "supply";
          } else if (
            carrying === "supply" &&
            nearWarPoint(player, peaceCityRoute.storehouse, 2)
          ) {
            prompt = crossed
              ? "Place seeds in the shared storehouse"
              : "First carry the seeds across the restored bridge";
            if (input.interact && crossed && !completed) {
              completed = true;
              carrying = undefined;
              supply.position.set(14, 0.325, 0);
              hooks.toast(
                "Fourth Nephi describes rebuilt cities and goods shared in common. This everyday errand is imagined. Keep exploring the city.",
              );
              hooks.complete();
            }
          }
          return { objective, prompt, carrying: carrying !== undefined };
        },
      };
      return runtime;
    },
  };
}

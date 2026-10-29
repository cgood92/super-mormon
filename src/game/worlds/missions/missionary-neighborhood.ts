import * as T from "three";
import { label, material } from "../../rendering/art";
import { sceneryBox, markScenery } from "../shared/scenery";
import { missionaryActor } from "./missionary-actors";
import {
  advanceContest,
  createContest,
  HOUSE_DOORS,
  tagHouse,
} from "./missionary-contest";
import type { WorldData } from "../../runtime/worlds";

export function buildMissionaryNeighborhood(scene: T.Scene): WorldData {
  const root = new T.Group();
  root.name = "Secret neighborhood";
  scene.add(root);
  const priorBackground = scene.background,
    priorFog = scene.fog;
  scene.background = new T.Color(0xb4d9eb);
  scene.fog = new T.Fog(0xb4d9eb, 100, 200);
  root.add(new T.HemisphereLight(0xfff5df, 0x789071, 2.5));
  const sun = new T.DirectionalLight(0xffe5b8, 2.2);
  sun.position.set(-30, 55, 20);
  root.add(sun);
  const solids: WorldData["solids"] = [];
  const block = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    mat: T.Material,
    name: string,
  ) => sceneryBox(root, solids, mat, { x, y, z, w, h, d }, name);
  const grass = material(0x7caa71),
    paving = material(0xd6d2c4),
    road = material(0x606b73),
    roof = material(0x666579),
    wood = material(0x634d40);
  // Street, grass and sidewalks are adjacent ground tiles with one owner per surface.
  // A single solid floor supports the district. Thin inset road colors are decorative.
  block(0, -0.5, 0, 86, 0.5, 86, grass, "Neighborhood ground");
  const paint = (
    x: number,
    z: number,
    w: number,
    d: number,
    mat: T.Material,
    name: string,
  ) => {
    const mesh = new T.Mesh(new T.PlaneGeometry(w, d), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.012, z);
    mesh.name = name;
    root.add(mesh);
    markScenery(mesh, {
      kind: "decoration",
      reason: "Painted ground finish; continuous ground owns support.",
    });
  };
  for (const z of [-36, -18, 0, 18, 36]) {
    paint(0, z, 86, 5, road, "Residential street");
    paint(0, z + 3.8, 86, 2.5, paving, "South sidewalk");
    paint(0, z - 3.8, 86, 2.5, paving, "North sidewalk");
  }
  for (const x of [-38, 38]) {
    // Stop at horizontal streets so painted finishes do not overlap.
    for (const [z, d] of [
      [-27, 7.8],
      [-9, 7.8],
      [9, 7.8],
      [27, 7.8],
    ])
      paint(x, z, 5, d, road, "Connecting avenue");
  }
  const houses = HOUSE_DOORS.map((door, i) => {
    const wall = material(0xe3d6b4);
    const z = door.z - 4;
    block(door.x, 0, z, 7, 3.4, 6, wall, `House ${i + 1} walls`);
    block(door.x, 3.4, z, 7.4, 0.45, 6.4, roof, `House ${i + 1} roof`);
    block(
      door.x,
      0,
      door.z - 0.94,
      1.1,
      2,
      0.12,
      wood,
      `House ${i + 1} front door`,
    );
    // A solid porch is a very low step; front doors remain reachable from the sidewalk.
    block(
      door.x,
      0,
      door.z - 0.25,
      2.4,
      0.12,
      1.4,
      paving,
      `House ${i + 1} porch`,
    );
    label(root, String(i + 1), door.x, 2.45, door.z - 0.83, 1, 0.35);
    for (const dx of [-2.2, 2.2])
      block(
        door.x + dx,
        1.1,
        door.z - 0.96,
        1.05,
        1,
        0.08,
        material(0xa4d2df),
        `House ${i + 1} window`,
      );
    return wall;
  });
  // Side paths and an open central pocket park reward movement beyond the doors.
  for (const x of [-42, 42])
    block(x, 0, 0, 0.35, 1, 86, wood, "Neighborhood boundary fence");
  for (const z of [-42, 42])
    block(0, 0, z, 84, 1, 0.35, wood, "Neighborhood boundary fence");
  for (const x of [-9, 9]) {
    block(x, 0, 40, 3, 0.5, 0.65, wood, "Park bench");
    block(x, 0, 40.45, 3, 1.2, 0.15, wood, "Park bench back");
  }
  label(root, "NEIGHBORHOOD COLOR CHALLENGE", 0, 3, -40, 12, 0.8);
  label(
    root,
    "Visit every front door • Turn all 16 houses blue",
    0,
    2.1,
    -40,
    12,
    0.6,
  );
  label(
    root,
    "Fictional friendly contest • Pause: retry or return to gallery",
    0,
    1.45,
    -40,
    13,
    0.5,
  );
  const visitors = [
    missionaryActor(root, false, 0),
    missionaryActor(root, false, 1),
  ];
  let game = createContest(),
    time = 0,
    announced = false,
    disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    visitors.forEach((visitor) => visitor.dispose());
    const geometries = new Set<T.BufferGeometry>(),
      materials = new Set<T.Material>(),
      textures = new Set<T.Texture>();
    root.traverse((o) => {
      if (o instanceof T.InstancedMesh) o.dispose();
      if (o instanceof T.Mesh) {
        geometries.add(o.geometry);
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          materials.add(m);
          const map = (m as T.MeshBasicMaterial).map;
          if (map) textures.add(map);
        }
      }
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
    scene.remove(root);
    scene.background = priorBackground;
    scene.fog = priorFog;
  };
  return {
    name: "Neighborhood Color Challenge",
    subtitle: "A secret, fictional friendly contest",
    initialObjective: "Visit front doors to turn all sixteen houses blue",
    spawn: { x: 0, y: 0, z: 38, yaw: Math.PI },
    solids,
    bounds: { minX: -41, maxX: 41, minZ: -41, maxZ: 41 },
    goal: { x: 0, y: 0, z: 38 },
    dispose,
    adventure: (hooks) => {
      hooks.setAvatar("missionary");
      return {
        update(dt, player, input) {
          time += dt;
          // Tag before visitors move: the sixteenth blue door wins on this frame.
          HOUSE_DOORS.forEach((door, i) => {
            if (
              Math.abs(player.y) < 1.5 &&
              Math.hypot(player.x - door.x, player.z - door.z) < 2.1 &&
              game.houses[i] !== "blue"
            )
              tagHouse(game, i);
          });
          advanceContest(game, dt);
          houses.forEach((wall, i) =>
            wall.color.setHex(
              game.houses[i] === "blue"
                ? 0x458dd4
                : game.houses[i] === "red"
                  ? 0xc65f58
                  : 0xe3d6b4,
            ),
          );
          visitors.forEach((actor, i) => {
            const v = game.visitors[i];
            const dx = v.x - actor.group.position.x,
              dz = v.z - actor.group.position.z;
            actor.group.position.set(v.x, 0, v.z);
            if (Math.hypot(dx, dz) > 0.001)
              actor.group.rotation.y = Math.atan2(dx, dz);
            actor.update(time, game.started && !game.won && v.wait <= 0);
          });
          if (game.won && !announced) {
            announced = true;
            hooks.toast("All sixteen houses blue! Neighborhood challenge won.");
          }
          if (game.won && input.interact) {
            game = createContest();
            announced = false;
          }
          const count = game.houses.filter((c) => c === "blue").length;
          return {
            objective: game.won
              ? "You won! All 16 houses are blue. Explore, retry, or return to the gallery."
              : `${count} / 16 houses blue · Visit front doors. Jehovah’s Witness visitors turn houses red; blue lasts at least 48 seconds.`,
            prompt: game.won ? "Play the neighborhood again" : "",
          };
        },
        snapshot: () => ({ phase: game.won ? "won" : "playing", ...game }),
        dispose: () => {},
      };
    },
  };
}

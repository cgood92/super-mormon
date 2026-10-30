import * as T from "three";
import { label, material } from "../../rendering/art";
import { sceneryBox, markScenery } from "../shared/scenery";
import { missionaryActor, buildMissionaryCompanion } from "./missionary-actors";
import {
  advanceContest,
  createContest,
  HOUSE_DOORS,
  tagHouse,
} from "./missionary-contest";
import { buildStreetLife } from "./missionary-street-life";
import { createPlayer } from "../../physics/physics";
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
  const visitors = [
    missionaryActor(root, false, 0),
    missionaryActor(root, false, 1),
  ];
  const streetLife = buildStreetLife(root);
  const companion = buildMissionaryCompanion(root, solids);
  companion.update(0, { ...createPlayer(0, 0, 38), yaw: Math.PI });
  let game = createContest(),
    visitorYaw = Math.PI,
    time = 0,
    announced = false,
    disposed = false;
  const placeVisitors = () =>
    visitors.forEach((actor, i) => {
      const v = game.visitors[0],
        offset = i ? -0.65 : 0.65;
      actor.group.rotation.y = visitorYaw;
      actor.group.position.set(
        v.x + Math.cos(visitorYaw) * offset,
        0,
        v.z - Math.sin(visitorYaw) * offset,
      );
    });
  placeVisitors();
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    visitors.forEach((visitor) => visitor.dispose());
    companion.dispose();
    streetLife.dispose();
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
      let introduced = false;
      return {
        update(dt, player, input) {
          if (!introduced) {
            introduced = true;
            hooks.dialog(
              "A fictional friendly contest",
              "Neighborhood Color Challenge",
              "Move with your companion to visit front doors and turn all 16 houses blue at once. The Jehovah’s Witness pair walks quickly and turns houses red. Your blue houses are protected for 28 seconds. Plan a route and revisit red houses! Use Pause to retry or return to the gallery.",
              () => {},
            );
          }
          time += dt;
          companion.update(dt, player);
          streetLife.update(dt, player);
          // Tag before visitors move: the sixteenth blue door wins on this frame.
          HOUSE_DOORS.forEach((door, i) => {
            if (
              Math.abs(player.y) < 1.5 &&
              Math.hypot(player.x - door.x, player.z - door.z) < 2.1 &&
              game.houses[i] !== "blue"
            )
              tagHouse(game, i);
          });
          const priorX = game.visitors[0].x,
            priorZ = game.visitors[0].z;
          advanceContest(game, dt);
          const dx = game.visitors[0].x - priorX,
            dz = game.visitors[0].z - priorZ;
          if (Math.hypot(dx, dz) > 0.00001) visitorYaw = Math.atan2(dx, dz);
          placeVisitors();
          houses.forEach((wall, i) =>
            wall.color.setHex(
              game.houses[i] === "blue"
                ? 0x458dd4
                : game.houses[i] === "red"
                  ? 0xc65f58
                  : 0xe3d6b4,
            ),
          );
          visitors.forEach((actor) =>
            actor.update(
              time,
              game.started && !game.won && game.visitors[0].wait <= 0,
            ),
          );
          if (game.won && !announced) {
            announced = true;
            hooks.toast("All sixteen houses blue! Neighborhood challenge won.");
          }
          if (game.won && input.interact) {
            game = createContest();
            visitorYaw = Math.PI;
            placeVisitors();
            announced = false;
          }
          const count = game.houses.filter((c) => c === "blue").length;
          return {
            objective: game.won
              ? "You won! All 16 houses are blue. Explore, retry, or return to the gallery."
              : `${count} / 16 houses blue · Visit front doors. Jehovah’s Witness visitors turn houses red; blue lasts at least 28 seconds.`,
            prompt: game.won ? "Play the neighborhood again" : "",
          };
        },
        snapshot: () => ({
          phase: game.won ? "won" : "playing",
          ...game,
          companion: {
            x: companion.group.position.x,
            y: companion.group.position.y,
            z: companion.group.position.z,
          },
          visitorPair: visitors.map((a) => ({
            x: a.group.position.x,
            z: a.group.position.z,
          })),
        }),
        dispose: () => {},
      };
    },
  };
}

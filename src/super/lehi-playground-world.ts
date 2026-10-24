import * as T from "three";
import { label, material, palette } from "./art";
import { markScenery, sceneryBox, terracedRock } from "./scenery";
import type { WorldData } from "./worlds";

/** A small, roofless garden for trying the existing controller and movement system. */
export function buildLehiPlayground(scene: T.Scene): WorldData {
  const previousBackground = scene.background,
    previousFog = scene.fog;
  scene.background = new T.Color(0xd4e4e6);
  scene.fog = new T.Fog(0xd4e4e6, 48, 105);
  const root = new T.Group();
  root.name = "Lehi movement garden";
  scene.add(root);
  const solids: WorldData["solids"] = [];
  const stone = material(0xd9cbaa),
    pale = material(0xeadfc5),
    sand = material(0xd6bd8f),
    timber = material(0x79553b),
    leaf = material(0x71845a),
    soil = material(0xada079);
  const sky = new T.HemisphereLight(0xfff6df, 0x728b89, 2.7);
  const sun = new T.DirectionalLight(0xffeac7, 2.5);
  sun.position.set(-15, 24, 12);
  root.add(sky, sun);
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
  const sign = (words: string, x: number, z: number) => {
    block(x, 0, z, 0.12, 1.05, 0.12, timber, "Garden sign post");
    label(root, words, x, 1.25, z, 2.8, 0.5);
  };

  // One continuous surface owns the entire walking floor; no overlapping paving planes.
  block(0, -0.5, 0, 42, 0.5, 46, sand, "Courtyard floor");
  for (const x of [-20.5, 20.5])
    block(x, 0, 0, 0.7, 1.05, 45, stone, "Low garden boundary wall");
  for (const z of [-22.5, 22.5])
    block(0, 0, z, 42, 1.05, 0.7, stone, "Low garden boundary wall");

  // A clear central lane connects every exercise, with space to circle each obstacle.
  sign("WALK · RUN · TURN", 0, 13);
  sign("CRAWL", -9, 7);
  for (const x of [-11.2, -6.8])
    block(x, 0, 3.5, 0.6, 1.6, 2, pale, "Crawl arch pillar");
  block(-9, 1.08, 3.5, 5, 0.52, 2, pale, "Low crawl arch lintel");

  sign("JUMP & PULL UP", -9, -4.5);
  block(-9, 0, -9, 5.4, 2.2, 4.5, stone, "Ledge practice platform");
  // A return stair gives the ledge a walkable route as well as its jump approach.
  for (let i = 0; i < 8; i++)
    block(
      -2.7 - i * 0.48,
      0,
      -9,
      0.5,
      (i + 1) * 0.275,
      2.4,
      pale,
      "Ledge return stair",
    );

  sign("CLIMB & SPRING AWAY", -3, -18.5);
  block(-4, 0, -15.5, 0.44, 5.6, 0.44, timber, "Climbing pole trunk");
  block(-7.1, 0, -15.5, 2.3, 3.2, 2.6, stone, "Pole jump landing platform");

  sign("WALL KICK", -15.5, -4.5);
  block(-17.2, 0, -10.5, 0.6, 4.3, 7, pale, "West wall kick face");
  block(-13.7, 0, -13.5, 0.6, 4.3, 3, pale, "East wall kick face");
  block(-15.45, 0, -14.8, 4.1, 4.3, 0.6, stone, "Wall kick backstop");

  sign("STEPS & CHAINED JUMPS", 10, 5.5);
  for (let i = 0; i < 8; i++)
    block(
      10,
      0,
      2.2 - i * 0.75,
      3.4,
      (i + 1) * 0.3,
      0.78,
      i % 2 ? pale : stone,
      "Garden ascent stair",
    );
  block(10, 0, -4.9, 6, 2.4, 3.5, stone, "Raised garden platform");

  sign("LONG JUMP", 3.8, -7);
  block(6.5, 0, -12, 4.8, 1, 4, pale, "Long jump launch platform");
  block(14.5, 0, -12, 4.8, 1, 4, stone, "Long jump landing platform");
  // Accessible steps make repeated trials easy. A missed jump lands on the courtyard.
  for (let i = 0; i < 4; i++) {
    block(
      6.5,
      0,
      -7.6 - i * 0.65,
      2.6,
      (i + 1) * 0.25,
      0.68,
      pale,
      "Long jump launch stair",
    );
    block(
      14.5,
      0,
      -7.6 - i * 0.65,
      2.6,
      (i + 1) * 0.25,
      0.68,
      pale,
      "Long jump landing stair",
    );
  }

  sign("PICK UP · CARRY · THROW", 8, 13.5);
  const delivery = { x: 15, y: 0, z: 13, radius: 1.4 };
  const ring = new T.Mesh(
    new T.TorusGeometry(1.4, 0.06, 6, 40),
    material(palette.brass),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(delivery.x, 0.08, delivery.z);
  ring.name = "Bundle delivery ring";
  markScenery(ring, {
    kind: "decoration",
    reason: "Thin painted delivery marker on the courtyard",
  });
  root.add(ring);

  // Planting stays at the perimeter, away from traversal and camera sightlines.
  for (const [x, z] of [
    [-16, 17],
    [-17, 8],
    [17, 3],
    [17, 18],
    [5, 19],
  ] as const) {
    block(x, 0, z, 3.2, 0.45, 3.2, stone, "Garden planter wall");
    block(x, 0.45, z, 2.8, 0.12, 2.8, soil, "Planter soil surface");
    block(x, 0.57, z, 0.45, 3.7, 0.45, timber, "Olive tree trunk");
    const crown = new T.Mesh(new T.IcosahedronGeometry(1, 1), leaf);
    crown.scale.set(1.5, 1.25, 1.4);
    crown.position.set(x, 4.1, z);
    crown.name = "Olive foliage";
    markScenery(crown, {
      kind: "decoration",
      reason: "Flexible leaves above the solid tree trunk",
    });
    root.add(crown);
  }
  terracedRock(
    root,
    solids,
    stone,
    { x: -16, y: 0, z: 1, w: 3.5, h: 1.1, d: 3 },
    "Garden limestone",
  );
  terracedRock(
    root,
    solids,
    stone,
    { x: 16, y: 0, z: -19, w: 4, h: 1.4, d: 3.5 },
    "Garden limestone",
  );

  let disposed = false;
  return {
    name: "Lehi’s practice garden",
    subtitle: "A quiet place to try every movement",
    spawn: { x: 0, y: 0, z: 8, yaw: Math.PI },
    actorParent: root,
    solids,
    climbables: [
      {
        id: "garden-climbing-pole",
        x: -4,
        z: -15.5,
        y: 0,
        height: 5.6,
        radius: 0.22,
      },
    ],
    carryables: [
      { id: "garden-bundle", name: "Practice bundle", x: 7, y: 0.3, z: 11 },
    ],
    delivery,
    tokens: [
      { id: "garden-ledge", x: -9, y: 2.7, z: -9 },
      { id: "garden-pole", x: -4, y: 6.1, z: -15.5 },
      { id: "garden-long-jump", x: 14.5, y: 1.5, z: -12 },
    ],
    bounds: { minX: -20, maxX: 20, minZ: -22, maxZ: 22 },
    goal: { x: 0, y: 0, z: 8 },
    landmarks: [
      { name: "Crawl arch", x: -9, y: 0, z: 3.5 },
      { name: "Ledge platform", x: -9, y: 2.2, z: -9 },
      { name: "Climbing pole", x: -4, y: 0, z: -15.5 },
      { name: "Wall kick nook", x: -15.5, y: 0, z: -10.5 },
      { name: "Garden steps", x: 10, y: 2.4, z: -4.9 },
      { name: "Long jump", x: 14.5, y: 1, z: -12 },
    ],
    dispose() {
      if (disposed) return;
      disposed = true;
      const geometries = new Set<T.BufferGeometry>(),
        materials = new Set<T.Material>(),
        textures = new Set<T.Texture>();
      root.traverse((object) => {
        if (object instanceof T.InstancedMesh) object.dispose();
        if (object instanceof T.Mesh) {
          geometries.add(object.geometry);
          for (const mat of Array.isArray(object.material)
            ? object.material
            : [object.material]) {
            materials.add(mat);
            for (const value of Object.values(mat))
              if (value instanceof T.Texture) textures.add(value);
          }
        }
        if (object instanceof T.Light) object.dispose();
      });
      textures.forEach((texture) => texture.dispose());
      materials.forEach((mat) => mat.dispose());
      geometries.forEach((geometry) => geometry.dispose());
      root.removeFromParent();
      scene.background = previousBackground;
      scene.fog = previousFog;
    },
  };
}

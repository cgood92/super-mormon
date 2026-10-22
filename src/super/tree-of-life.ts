import * as T from "three";
import { box, material, ambient, palette } from "./art";
import { createCharacter, type CharacterState } from "./character";
import type { PlayerState } from "./physics";
import type { WorldData, Point } from "./worlds";

export type TreeWorldData = WorldData & {
  treeData: {
    path: Point[];
    tree: Point;
    fruit: Point;
    fountain: Point;
    overlook: Point;
    building: Point;
    family: Point;
    river: { minX: number; maxX: number };
    reflections: { point: Point; title: string; body: string }[];
    group: T.Group;
    mist: T.Group;
  };
};
export type TreeHooks = {
  dialog(
    kicker: string,
    title: string,
    body: string,
    onContinue: () => void,
  ): void;
  toast(text: string): void;
  complete(): void;
  checkpoint(point: Point): void;
  setMarker(point: Point): void;
};
const p = (x: number, z: number, y = 0): Point => ({ x, y, z });
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);

function limb(
  group: T.Group,
  a: T.Vector3,
  b: T.Vector3,
  r1: number,
  r2: number,
  color: number,
) {
  const delta = b.clone().sub(a);
  const mesh = new T.Mesh(
    new T.CylinderGeometry(r2, r1, delta.length(), 8),
    material(color),
  );
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize());
  mesh.castShadow = true;
  group.add(mesh);
  return mesh;
}
function oval(
  group: T.Group,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  color: number,
  name: string,
) {
  const mesh = new T.Mesh(new T.IcosahedronGeometry(1, 1), material(color));
  mesh.position.set(x, y, z);
  mesh.scale.set(w, h, d);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}
function nearestRoute(point: Point, path: Point[]) {
  let best = { x: path[0].x, z: path[0].z, distance: Infinity, progress: 0 };
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i],
      b = path[i + 1],
      dx = b.x - a.x,
      dz = b.z - a.z;
    const t = Math.max(
      0,
      Math.min(
        1,
        ((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz),
      ),
    );
    const x = a.x + dx * t,
      z = a.z + dz * t,
      d = Math.hypot(point.x - x, point.z - z);
    if (d < best.distance)
      best = { x, z, distance: d, progress: (i + t) / (path.length - 1) };
  }
  return best;
}

/** An original visual interpretation; symbols and narrative follow 1 Nephi 8, 11, 12 and 15. */
export function buildTreeOfLife(scene: T.Scene): TreeWorldData {
  const before = new Set(scene.children),
    background = scene.background,
    priorFog = scene.fog;
  ambient(scene, "jerusalem");
  scene.background = new T.Color(0xbdcfd5);
  scene.fog = new T.Fog(0xbdcfd5, 82, 149);
  const group = new T.Group();
  group.name = "Lehi’s vision — Tree of Life";
  scene.add(group);
  const solids: WorldData["solids"] = [];
  const climbables: NonNullable<WorldData["climbables"]> = [];
  const solid = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    c: number,
    name: string,
  ) => {
    solids.push({ x, y, z, w, h, d });
    return box(group, x, y, z, w, h, d, c, name);
  };
  const path = [
    p(-42, 80),
    p(-43, 65),
    p(-35, 50),
    p(-38, 34),
    p(-49, 18),
    p(-48, 2),
    p(-36, -13),
    p(-30, -28),
    p(-23, -38),
    p(-20, -44),
  ];
  const tree = p(-20, -52),
    fruit = p(-20, -52),
    fountain = p(-49, -60),
    overlook = p(21, -28),
    building = p(67, -27, 15),
    family = p(-13, -46);
  // The entire western bank is gently walkable; obstacles never wall off exploration.
  box(group, -36, -0.65, 0, 130, 0.65, 210, 0x778366, "wide field");
  box(group, 67, -0.65, 0, 38, 0.65, 210, 0x7e8176, "far shore");
  box(group, 37, -0.25, 0, 23, 0.2, 210, 0x354b50, "dark river in the gulf");
  for (const x of [26, 48])
    for (let z = -100; z < 105; z += 9)
      oval(group, x, -4, z, 3, 5.7, 6, 0x6d6e61, "gulf cliff face");
  const meadow = new T.Mesh(new T.CircleGeometry(35, 64), material(0x8b9b70));
  meadow.rotation.x = -Math.PI / 2;
  meadow.position.set(-23, 0.012, -53);
  meadow.scale.set(1.45, 1, 1);
  group.add(meadow);
  // A narrow, uninterrupted ribbon follows the winding rod.
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i],
      b = path[i + 1],
      length = distance(a, b);
    const ribbon = box(
      group,
      (a.x + b.x) / 2,
      0.025,
      (a.z + b.z) / 2,
      2.65,
      0.045,
      length + 1.3,
      0xb8b194,
      "strait and narrow path",
    );
    ribbon.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
    const railA = new T.Vector3(a.x + 1.15, 1.05, a.z),
      railB = new T.Vector3(b.x + 1.15, 1.05, b.z);
    limb(group, railA, railB, 0.075, 0.075, 0x586168).name = "rod of iron";
    for (let d = 0; d < length; d += 4) {
      const t = d / length;
      limb(
        group,
        new T.Vector3(a.x + (b.x - a.x) * t + 1.15, 0, a.z + (b.z - a.z) * t),
        new T.Vector3(
          a.x + (b.x - a.x) * t + 1.15,
          1.06,
          a.z + (b.z - a.z) * t,
        ),
        0.055,
        0.055,
        0x586168,
      );
    }
  }
  // An open, spreading crown with real branch silhouettes and individual white fruit.
  const crown = new T.Group();
  crown.position.set(tree.x, 0, tree.z);
  group.add(crown);
  limb(
    crown,
    new T.Vector3(0, 0, 0),
    new T.Vector3(0.3, 7.7, 0),
    1.05,
    0.53,
    0xb0a38b,
  );
  solid(tree.x, 0, tree.z, 1.6, 7, 1.6, 0xb0a38b, "tree trunk").visible = false;
  for (let i = 0; i < 9; i++) {
    const angle = i * 2.39996,
      r = 4.7 + (i % 3) * 0.8;
    const start = new T.Vector3(0.1, 3.8 + (i % 3) * 0.7, 0),
      joint = new T.Vector3(
        Math.cos(angle) * r * 0.6,
        7 + (i % 3),
        Math.sin(angle) * r * 0.6,
      ),
      end = new T.Vector3(
        Math.cos(angle) * r,
        9 + (i % 3) * 1.3,
        Math.sin(angle) * r,
      );
    limb(crown, start, joint, 0.44, 0.24, 0xb9af96);
    limb(crown, joint, end, 0.24, 0.06, 0xc2bba4);
    const leaves = oval(
      crown,
      end.x,
      end.y,
      end.z,
      3.3,
      2.25,
      3.0,
      [0xdce8c2, 0xe5edcc, 0xcbdab4][i % 3],
      "luminous spreading foliage",
    );
    (leaves.material as T.MeshStandardMaterial).emissive.setHex(0x67794a);
    (leaves.material as T.MeshStandardMaterial).emissiveIntensity = 0.16;
    for (let j = 0; j < 4; j++) {
      const fruitMesh = new T.Mesh(
        new T.IcosahedronGeometry(0.4, 2),
        new T.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0xf3f5da,
          emissiveIntensity: 0.65,
          roughness: 0.4,
        }),
      );
      fruitMesh.position.set(
        end.x + Math.cos(j * 1.8 + i) * 2,
        end.y - 1.5 + (j % 2) * 0.4,
        end.z + Math.sin(j * 1.8 + i) * 1.9,
      );
      fruitMesh.name = "white fruit";
      crown.add(fruitMesh);
    }
  }
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    limb(
      crown,
      new T.Vector3(0, 0.4, 0),
      new T.Vector3(Math.cos(a) * 2.6, 0.08, Math.sin(a) * 2.6),
      0.4,
      0.05,
      0xb0a38b,
    );
  }
  const light = new T.PointLight(0xf8ffcf, 26, 24, 1.6);
  light.position.set(tree.x, 7, tree.z);
  group.add(light);
  // Clear living water is deliberately separate from the dark river (1 Nephi 11:25; 15:27).
  const basin = new T.Mesh(
    new T.CylinderGeometry(4.1, 4.3, 0.2, 32),
    material(0xd7d3b3),
  );
  basin.position.set(fountain.x, 0.1, fountain.z);
  group.add(basin);
  const water = new T.Mesh(
    new T.CircleGeometry(3.7, 48),
    new T.MeshStandardMaterial({
      color: 0x8dd1c4,
      emissive: 0x387e7a,
      emissiveIntensity: 0.14,
      roughness: 0.18,
      transparent: true,
      opacity: 0.86,
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(fountain.x, 0.22, fountain.z);
  water.name = "fountain of living water";
  group.add(water);
  for (let i = 0; i < 5; i++) {
    const a = i * 2.4;
    oval(
      group,
      fountain.x + Math.sin(a) * 1.2,
      0.6,
      fountain.z + Math.cos(a) * 1.2,
      0.7,
      0.6,
      0.6,
      0xcacdb5,
      "fountain stones",
    );
  }
  const spring = new T.Mesh(
    new T.CylinderGeometry(0.1, 0.24, 1.5, 10),
    new T.MeshStandardMaterial({
      color: 0xb9f0e4,
      transparent: true,
      opacity: 0.7,
      emissive: 0x559f98,
      emissiveIntensity: 0.4,
    }),
  );
  spring.position.set(fountain.x, 1.05, fountain.z);
  group.add(spring);
  // Elevated architecture is separated by a broad gulf, never a challenge to enter.
  solid(
    building.x,
    15,
    building.z,
    31,
    1.2,
    26,
    0xb9a49c,
    "great and spacious building — suspended above earth",
  );
  for (let floor = 0; floor < 3; floor++) {
    const y = 16.2 + floor * 5.2;
    solid(
      building.x + 2.5,
      y,
      building.z + 11.7,
      25,
      1,
      1.2,
      0xbba89e,
      "balcony parapet",
    );
    solid(
      building.x,
      y + 4.6,
      building.z,
      32,
      0.65,
      27,
      0xd2c2ad,
      "broad suspended storey",
    );
    for (const x of [54, 61, 68, 75, 81]) {
      solid(x, y, building.z, 1.2, 4.7, 1.2, 0xc5b99f, "building column");
      solid(x, y, building.z + 11, 1, 4.7, 1, 0xc5b99f, "balcony column");
    }
    solid(
      building.x,
      y,
      building.z - 10.5,
      30,
      5,
      1,
      0x8c7e81,
      "distant facade",
    );
  }
  // This crossing and stair are exploratory interpretation, not details in the vision.
  solid(
    37,
    -0.3,
    5,
    26,
    0.3,
    5,
    0x9c9988,
    "ravine crossing — artistic interpretation",
  );
  for (let i = 0; i < 42; i++) {
    solid(
      53,
      0,
      20 - i * 0.7,
      5,
      (i + 1) * (16.2 / 42),
      0.75,
      0xa49b89,
      "returnable eastern stair",
    );
  }
  solid(53, 16.1, -13.5, 5, 0.1, 8, 0xb9a49c, "building entry landing");
  climbables.push({
    id: "living-tree",
    x: tree.x,
    z: tree.z,
    y: 0,
    height: 11,
    radius: 1.1,
  });
  climbables.push({
    id: "eastern-return-vine",
    x: 50.5,
    z: -26,
    y: 0,
    height: 17,
    radius: 0.4,
  });
  limb(
    group,
    new T.Vector3(50.5, 0, -26),
    new T.Vector3(50.5, 17, -26),
    0.13,
    0.13,
    0x727c57,
  ).name = "climbable return vine";
  // A low stone edge makes the overlook legible without creating a wall along the route.
  for (const z of [-35, -31, -27, -23, -19])
    solid(24, 0, z, 0.65, 1.05, 3.7, 0xa4a38b, "safe overlook edge");
  box(group, 19, 0.01, -27, 8, 0.06, 20, 0xa4a58b, "overlook terrace");
  // Deterministic planting keeps the path and all main approaches clear.
  for (let i = 0; i < 95; i++) {
    const x = -91 + ((i * 31.7) % 111),
      z = -94 + ((i * 47.3) % 192);
    if (
      nearestRoute(p(x, z), path).distance < 5 ||
      distance(p(x, z), tree) < 16 ||
      distance(p(x, z), fountain) < 8 ||
      distance(p(x, z), overlook) < 12
    )
      continue;
    if (i % 3 === 0) {
      const h = 3.4 + (i % 5) * 0.65;
      limb(
        group,
        new T.Vector3(x, 0, z),
        new T.Vector3(x + 0.3, h, z),
        0.21,
        0.1,
        0x73684e,
      );
      oval(group, x, h, z, 2.3, 1.8, 2, 0x647e57, "field olive tree");
    } else
      oval(
        group,
        x,
        0.25,
        z,
        0.55 + (i % 3) * 0.24,
        0.35,
        0.6,
        i % 2 ? 0x7e8e63 : 0x999986,
        "meadow foliage and stone",
      );
  }
  for (let i = 0; i < 26; i++) {
    const x = -115 + (i % 13) * 17,
      z = i < 13 ? -112 : 112;
    oval(
      group,
      x,
      6 + (i % 4) * 2,
      z,
      15,
      12 + (i % 5) * 3,
      14,
      0x83948b,
      "distant hills",
    );
  }
  // A quiet garden surrounds the tree, with open lanes between clusters.
  for (let i = 0; i < 76; i++) {
    const angle = i * 2.39996,
      radius = 17 + (i % 9) * 2.1;
    const x = tree.x + Math.cos(angle) * radius,
      z = tree.z + Math.sin(angle) * radius;
    if (
      x > 18 ||
      nearestRoute(p(x, z), path).distance < 4 ||
      distance(p(x, z), fountain) < 7
    )
      continue;
    const leaf = oval(
      group,
      x,
      0.19,
      z,
      0.48,
      0.23,
      0.46,
      i % 2 ? 0x7d9565 : 0x6e8a65,
      "garden ground cover",
    );
    leaf.castShadow = false;
    for (let j = 0; j < 3; j++) {
      const flower = new T.Mesh(
        new T.IcosahedronGeometry(0.1, 0),
        material([0xe6dfb4, 0xd6c3ce, 0xb7cbd0][i % 3]),
      );
      flower.position.set(
        x + Math.cos(j * 2.1) * 0.25,
        0.38 + (j % 2) * 0.12,
        z + Math.sin(j * 2.1) * 0.25,
      );
      flower.name = "small garden blossom";
      group.add(flower);
    }
  }
  // Transparent camera-facing veils localize the darkness along the middle path.
  const mist = new T.Group();
  mist.name = "mists of darkness";
  group.add(mist);
  const size = 32,
    bytes = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4,
        r = Math.hypot((x - 15.5) / 15.5, (y - 15.5) / 15.5);
      bytes[i] = bytes[i + 1] = bytes[i + 2] = 113;
      bytes[i + 3] = Math.round(Math.max(0, 1 - r) ** 1.2 * 220);
    }
  const tex = new T.DataTexture(bytes, size, size);
  tex.needsUpdate = true;
  for (let i = 0; i < 62; i++) {
    const sprite = new T.Sprite(
      new T.SpriteMaterial({
        map: tex,
        color: 0x738184,
        transparent: true,
        depthWrite: false,
        opacity: 0.9,
      }),
    );
    sprite.position.set(
      -52 + ((i * 7.1) % 27),
      2 + (i % 4) * 1.7,
      5 + ((i * 11.3) % 41),
    );
    sprite.scale.set(24, 14, 1);
    mist.add(sprite);
  }
  const reflections = [
    {
      point: fountain,
      title: "The fountain of living water",
      body: "Nephi saw the fountain of living waters and the tree of life as representations of the love of God. Pause beside the clear water. What helps you recognize that love? — 1 Nephi 11:21–25",
    },
    {
      point: overlook,
      title: "Across the gulf",
      body: "The people in the spacious building pointed and mocked. Some who tasted the fruit became ashamed. The great gulf separated the building from the tree. What helps you remain faithful when others disapprove? — 1 Nephi 8:26–28; 12:18",
    },
    {
      point: p(-42, -78),
      title: "The word of God",
      body: "Nephi explained that the iron rod represents the word of God. Those who hold fast can find their way through temptation. What does holding fast mean in your life? — 1 Nephi 15:23–24",
    },
  ];
  for (const spot of reflections) {
    // Small natural stone seating, leaving every reflection point open and accessible.
    box(
      group,
      spot.point.x - 2,
      0.02,
      spot.point.z - 1,
      1.4,
      0.45,
      0.7,
      0xabae91,
      "quiet reflection seat",
    );
  }
  let disposed = false;
  const added = scene.children.filter((child) => !before.has(child));
  return {
    name: "The Tree of Life",
    subtitle: "Lehi’s vision · Hold fast and share the joy",
    spawn: { ...p(-42, 87), yaw: Math.PI },
    solids,
    climbables,
    goal: { ...fruit, radius: 4 },
    bounds: { minX: -95, maxX: 89, minZ: -100, maxZ: 101 },
    treeData: {
      path,
      tree,
      fruit,
      fountain,
      overlook,
      building,
      family,
      river: { minX: 26, maxX: 48 },
      reflections,
      group,
      mist,
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const child of added) {
        scene.remove(child);
        child.traverse((o) => {
          if (o instanceof T.Light) o.dispose();
          if (o instanceof T.Mesh || o instanceof T.Sprite) {
            if (o instanceof T.Mesh) o.geometry.dispose();
            for (const m of Array.isArray(o.material)
              ? o.material
              : [o.material])
              m.dispose();
          }
        });
      }
      tex.dispose();
      scene.background = background;
      scene.fog = priorFog;
    },
  };
}

export function createTreeOfLifeScene(
  scene: T.Scene,
  world: WorldData,
  hooks: TreeHooks,
) {
  const data = (world as TreeWorldData).treeData;
  if (!data) throw new Error("Tree of Life metadata is required");
  let phase: "opening" | "rod" | "journey" | "fruit" | "done" = "opening",
    holdingRod = false,
    dialogOpen = false,
    disposed = false,
    time = 0,
    progress = 0;
  let checkpoint = { ...world.spawn },
    lastReflection = "",
    rescueCooldown = 0;
  const actors: {
    rig: ReturnType<typeof createCharacter>;
    state: CharacterState;
    mock: boolean;
    home: Point;
    behavior?: "press" | "lost" | "eat";
  }[] = [];
  // Crowd silhouettes share four draw calls; only named family use detailed rigs.
  const crowdParts = [
    new T.InstancedMesh(
      new T.CylinderGeometry(0.22, 0.34, 1.15, 6),
      material(0xa49377),
      108,
    ),
    new T.InstancedMesh(
      new T.IcosahedronGeometry(0.22, 1),
      material(0xb99978),
      108,
    ),
    new T.InstancedMesh(
      new T.BoxGeometry(0.14, 0.65, 0.14),
      material(0xa49377),
      108,
    ),
  ];
  crowdParts.push(
    new T.InstancedMesh(
      new T.IcosahedronGeometry(0.15, 1),
      new T.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xe7ebbc,
        emissiveIntensity: 0.5,
      }),
      108,
    ),
  );
  for (const part of crowdParts) {
    part.frustumCulled = false;
    scene.add(part);
  }
  let crowdIndex = 0;
  const transform = new T.Object3D();
  const makeActor = (
    role: Parameters<typeof createCharacter>[0],
    point: Point,
    mock = false,
    crowd = false,
  ) => {
    const index = crowdIndex;
    if (mock || crowd) crowdIndex++;
    const rig =
      mock || crowd
        ? ({
            group: new T.Group(),
            update(_dt: number, state: CharacterState) {
              for (let part = 0; part < crowdParts.length; part++) {
                transform.position.set(
                  state.x,
                  state.y + [0.7, 1.5, 1.1, 1.15][part],
                  state.z,
                );
                transform.rotation.set(
                  0,
                  state.yaw,
                  part === 2 ? (state.pointing ? -1.45 : 0.2) : 0,
                );
                if (part === 2) {
                  transform.position.x += state.pointing ? -0.45 : 0.28;
                }
                transform.scale.setScalar(
                  part === 3 && !state.carrying ? 0 : 1,
                );
                if (part === 3) {
                  transform.position.x += 0.3;
                  transform.position.z += 0.3;
                }
                transform.updateMatrix();
                crowdParts[part].setMatrixAt(index, transform.matrix);
                crowdParts[part].instanceMatrix.needsUpdate = true;
              }
            },
            dispose() {},
          } as ReturnType<typeof createCharacter>)
        : createCharacter(role);
    scene.add(rig.group);
    const state: CharacterState = {
      ...point,
      yaw: mock ? -Math.PI / 2 : 0,
      vx: 0,
      vy: 0,
      vz: 0,
      grounded: true,
      runSpeed: 0,
    };
    actors.push({ rig, state, mock, home: { ...point } });
    return rig;
  };
  makeActor("lehi", p(-25, -47)).group.name = "Lehi — dreamer and father";
  const sariah = makeActor("sariah", p(-9, -37));
  sariah.group.name = "Sariah";
  makeActor("nephi", p(-7, -34)).group.name = "Nephi";
  makeActor("sam", p(-12, -33)).group.name = "Sam";
  // Laman and Lemuel remain apart; this scene never depicts them taking the fruit.
  makeActor("laman", p(8, 65)).group.name = "Laman";
  makeActor("laman", p(12, 68)).group.name = "Lemuel";
  for (let i = 0; i < 36; i++)
    makeActor(
      i % 2 ? "guard" : "laman",
      p(
        55 + (i % 6) * 4.5,
        -18 + (Math.floor(i / 6) % 2) * 3,
        16.2 + Math.floor(i / 12) * 5.2,
      ),
      true,
    ).group.name = "people pointing from the spacious building";
  for (let i = 0; i < 72; i++) {
    const mode = i % 4 === 0 ? "lost" : i % 4 === 1 ? "eat" : "press";
    const route = data.path[i % data.path.length];
    const point =
      mode === "eat"
        ? p(data.tree.x + 3 + (i % 5), data.tree.z + (i % 7) - 3)
        : mode === "lost"
          ? p(-75 + (i % 13), 12 + (i % 40))
          : p(route.x - 2 - (i % 3), route.z + (i % 5));
    makeActor(i % 2 ? "sam" : "sariah", point, false, true).group.name =
      `vision crowd — ${mode}`;
    actors[actors.length - 1].behavior = mode;
    if (mode === "eat") actors[actors.length - 1].state.z += 12;
  }
  const familyWords: Record<string, string> = {
    "Lehi — dreamer and father":
      "Lehi desired his family to share the joy of the fruit. His concern continued for those who would not come. — 1 Nephi 8:12–18, 35–37",
    Sariah:
      "Sariah came with Nephi and Sam and partook of the fruit. Imagine the joy of finding loved ones at the tree. — 1 Nephi 8:14–16",
    Nephi:
      "Nephi came and partook. Later he sought to understand the vision and learned of the love of God. — 1 Nephi 8:16; 11:21–23",
    Sam: "Sam came with Sariah and Nephi to share the fruit. Quiet faith can lead toward the same joy. — 1 Nephi 8:16",
    Laman:
      "Lehi saw that Laman would not come to partake. The vision records his choice; this short reflection does not invent his words. — 1 Nephi 8:17–18",
    Lemuel:
      "Lemuel also would not come. Lehi still cared deeply for his sons and exhorted them with a tender parent's concern. — 1 Nephi 8:18, 35–37",
  };
  const say = (title: string, body: string, next: () => void) => {
    dialogOpen = true;
    hooks.dialog("LEHI’S VISION · 1 NEPHI 8", title, body, () => {
      if (disposed) return;
      dialogOpen = false;
      next();
    });
  };
  const save = (point: Point) => {
    checkpoint = { ...point };
    hooks.checkpoint({ ...point });
  };
  const restore = (player: PlayerState) => {
    Object.assign(player, checkpoint, {
      vx: 0,
      vy: 0,
      vz: 0,
      grounded: true,
      runSpeed: 0,
      ledge: undefined,
      climbId: undefined,
      airMoveLock: 0,
      jumpBufferTime: 0,
      jumpHoldTime: 0,
      move: "idle",
    });
  };
  const api = {
    update(
      dt: number,
      player: PlayerState,
      input: { interact: boolean; holdRod?: boolean; crouch?: boolean },
    ) {
      dt = Number.isFinite(dt) ? Math.max(0, Math.min(0.1, dt)) : 0;
      time += dt;
      rescueCooldown = Math.max(0, rescueCooldown - dt);
      if (disposed) return { objective: "", prompt: "" };
      if (phase === "opening" && !dialogOpen)
        say(
          "A vision in the wilderness",
          "You are Lehi. In a vast field you see a tree whose fruit brings great joy. Find the iron rod beside the narrow path. Walk at your own pace; there is no score or time limit. This is an artistic exploration of Lehi’s vision, with Nephi’s explanations of its symbols.",
          () => {
            phase = "rod";
            hooks.setMarker(data.path[0]);
          },
        );
      const route = nearestRoute(player, data.path);
      if (
        player.x > data.river.minX &&
        player.x < data.river.maxX &&
        Math.abs(player.z - 5) > 2.3 &&
        !rescueCooldown
      ) {
        restore(player);
        holdingRod = false;
        rescueCooldown = 0.5;
        hooks.toast(
          "The river is deep. Follow the visible crossing to reach the far bank.",
        );
      }
      if (player.y < -8 && !rescueCooldown) {
        restore(player);
        rescueCooldown = 2;
        hooks.toast("Return gently to firm ground. Your journey continues.");
      }
      if (input.holdRod !== undefined) {
        holdingRod =
          input.holdRod && (holdingRod || route.distance < 3) && !dialogOpen;
        if (holdingRod && (phase === "rod" || phase === "journey"))
          phase = "journey";
      }
      if (holdingRod) {
        player.x = route.x;
        player.z = route.z;
        // Remove velocity perpendicular to the rod; walking along it remains player controlled.
        const next = nearestRoute(
          {
            x: route.x + player.vx * 0.02,
            y: 0,
            z: route.z + player.vz * 0.02,
          },
          data.path,
        );
        player.vx = (next.x - route.x) / 0.02;
        player.vz = (next.z - route.z) / 0.02;
        if (phase === "journey") hooks.setMarker(data.fruit);
        progress = Math.max(progress, route.progress);
        if (progress > 0.15 && distance(player, checkpoint) > 12)
          save(p(route.x, route.z));
      }
      if (
        phase === "journey" &&
        progress > 0.94 &&
        distance(player, data.tree) < 12
      ) {
        phase = "fruit";
        save(p(data.tree.x, data.tree.z + 3));
        hooks.setMarker(data.fruit);
        hooks.toast("The darkness gives way. The tree stands before you.");
      }
      let prompt = "";
      if (
        !dialogOpen &&
        (phase === "rod" || phase === "journey") &&
        route.distance < 3
      ) {
        prompt = holdingRod
          ? "Hold {action} to stay attached to the iron rod"
          : "Hold {action} to grasp the iron rod";
      }
      if (
        !dialogOpen &&
        (phase === "fruit" || phase === "rod" || phase === "journey") &&
        distance(player, data.tree) < 4.5
      ) {
        prompt = "{action} Partake of the white fruit";
        if (input.interact)
          say(
            "Joy at the tree",
            "Lehi tasted the fruit and felt a joy he wanted his family to share. Nephi later learned that the tree represents the love of God, revealed through Jesus Christ. — 1 Nephi 8:10–12; 11:21–23",
            () => {
              phase = "done";
              save(p(data.tree.x, data.tree.z + 3));
              hooks.complete();
            },
          );
      }
      if (!dialogOpen) {
        const person = actors.find(
          (a) =>
            familyWords[a.rig.group.name] && distance(player, a.state) < 2.5,
        );
        if (person) {
          prompt = `{action} Reflect with ${person.rig.group.name.split(" —")[0]}`;
          if (input.interact)
            say(
              person.rig.group.name,
              familyWords[person.rig.group.name],
              () => {},
            );
        }
      }
      if (!dialogOpen && (phase === "fruit" || phase === "done"))
        for (const spot of data.reflections)
          if (distance(player, spot.point) < 5) {
            prompt = "{action} Reflect";
            if (input.interact && lastReflection !== spot.title) {
              lastReflection = spot.title;
              say(spot.title, spot.body, () => {
                lastReflection = "";
              });
            }
            break;
          }
      for (let i = 0; i < actors.length; i++) {
        const a = actors[i];
        if (a.behavior) {
          const target =
            a.behavior === "lost"
              ? p(
                  a.home.x + Math.sin(time * 0.3 + i) * 5,
                  a.home.z + Math.cos(time * 0.25 + i) * 5,
                )
              : a.behavior === "press"
                ? data.path[
                    Math.min(
                      data.path.length - 1,
                      Math.floor((time * 0.13 + i) % data.path.length),
                    )
                  ]
                : a.home;
          const dx = target.x - a.state.x,
            dz = target.z - a.state.z,
            d = Math.hypot(dx, dz);
          const speed = d > 0.4 ? (a.behavior === "lost" ? 0.65 : 1.1) : 0;
          a.state.x += d ? (dx / d) * speed * dt : 0;
          a.state.z += d ? (dz / d) * speed * dt : 0;
          a.state.runSpeed = speed;
          if (speed) a.state.yaw = Math.atan2(dx, dz);
          a.state.carrying = a.behavior === "eat";
        }
        a.state.pointing = a.mock;
        a.state.wave = !a.mock && !a.behavior && distance(player, a.state) < 7;
        a.rig.update(dt, a.state);
      }
      const inMist =
        player.z > -15 &&
        player.z < 75 &&
        player.x < data.river.minX &&
        distance(player, data.tree) > 22;
      if (scene.fog instanceof T.Fog) {
        const target = inMist ? (route.distance > 3 ? 11 : 17) : 149;
        scene.fog.far = T.MathUtils.lerp(
          scene.fog.far,
          target,
          1 - Math.exp(-dt * 2),
        );
        scene.fog.near = inMist ? 7 : 82;
        scene.fog.color.lerp(
          new T.Color(inMist ? 0x536364 : 0xbdcfd5),
          1 - Math.exp(-dt * 2),
        );
      }
      return {
        objective:
          phase === "opening"
            ? "Listen to Lehi’s vision"
            : phase === "rod"
              ? "Find the iron rod beside the narrow path"
              : phase === "journey"
                ? "Hold fast and follow the path through the mist"
                : phase === "fruit"
                  ? "Partake of the fruit of the tree"
                  : "Explore and reflect on the love of God",
        prompt,
      };
    },
    respawn(player: PlayerState) {
      restore(player);
    },
    snapshot() {
      return {
        phase,
        holdingRod,
        progress,
        checkpoint: { ...checkpoint },
        completed: phase === "done",
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const part of crowdParts) {
        scene.remove(part);
        part.dispose();
        part.geometry.dispose();
        (part.material as T.Material).dispose();
      }
      for (const a of actors) {
        scene.remove(a.rig.group);
        a.rig.dispose();
      }
    },
  };
  return api;
}

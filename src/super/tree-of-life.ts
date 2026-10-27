import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { box, material, ambient, palette } from "./art";
import { createCharacter, type CharacterState } from "./character";
import type { StoryShot } from "./cinematic";
import { terracedRock, markScenery } from "./scenery";
import type { PlayerState } from "./physics";
import type { WorldData, Point } from "./worlds";
import { capsule, ellipsoid, sculpt, smoothUnion } from "./sculpture";

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
    shot?: StoryShot,
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

/** Only immutable, non-colliding decorations are eligible. Keeping each named
 * type in local cells preserves culling across this large world and leaves all
 * story targets, collision metadata and animated objects independent. */
function batchVisionDecorations(root: T.Group) {
  const names = new Set([
    "gulf cliff face",
    "luminous spreading foliage",
    "white fruit",
    "fountain stones",
    "field olive tree",
    "meadow foliage and stone",
    "distant hills",
    "garden ground cover",
    "small garden blossom",
  ]);
  const buckets = new Map<
    string,
    T.Mesh<T.IcosahedronGeometry, T.MeshStandardMaterial>[]
  >();
  root.traverse((object) => {
    if (
      !(object instanceof T.Mesh) ||
      !names.has(object.name) ||
      !(object.geometry instanceof T.IcosahedronGeometry) ||
      !(object.material instanceof T.MeshStandardMaterial)
    )
      return;
    const mat = object.material;
    const key = JSON.stringify([
      object.parent!.id,
      object.name,
      Math.floor(object.position.x / 32),
      Math.floor(object.position.z / 32),
      object.geometry.parameters,
      mat.color.getHex(),
      mat.emissive.getHex(),
      mat.emissiveIntensity,
      mat.roughness,
      mat.metalness,
      object.castShadow,
      object.receiveShadow,
    ]);
    const bucket = buckets.get(key) ?? [];
    bucket.push(object);
    buckets.set(key, bucket);
  });
  for (const meshes of buckets.values()) {
    if (meshes.length < 2) continue;
    const first = meshes[0];
    const parent = first.parent!;
    const batch = new T.InstancedMesh(
      first.geometry,
      first.material,
      meshes.length,
    );
    batch.name = first.name;
    batch.castShadow = first.castShadow;
    batch.receiveShadow = first.receiveShadow;
    for (let i = 0; i < meshes.length; i++) {
      const mesh = meshes[i];
      mesh.updateMatrix();
      batch.setMatrixAt(i, mesh.matrix);
      mesh.removeFromParent();
      // Every source decoration owns its material and geometry; retain just the
      // first pair for the batch and release the discarded construction assets.
      if (i > 0) {
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
    }
    batch.instanceMatrix.needsUpdate = true;
    batch.computeBoundingBox();
    batch.computeBoundingSphere();
    parent.add(batch);
  }
}

/** World-space darkness uses horizontal distance so an orbiting camera never hides
 * the avatar or the ground immediately beneath it. Materials are patched locally;
 * restoring their hooks also supports the persistent player rig between worlds. */
export function createVisionDarkness(scene: T.Scene) {
  const uniforms = {
    visionPlayer: { value: new T.Vector3() },
    visionStrength: { value: 0 },
    visionRadius: { value: 0.6 },
  };
  const patched = new Map<
    T.Material,
    {
      compile: T.Material["onBeforeCompile"];
      key: T.Material["customProgramCacheKey"];
    }
  >();
  const attach = () =>
    scene.traverse((object) => {
      if (!(object instanceof T.Mesh)) return;
      for (const mat of Array.isArray(object.material)
        ? object.material
        : [object.material]) {
        if (
          patched.has(mat) ||
          !(
            mat instanceof T.MeshStandardMaterial ||
            mat instanceof T.MeshBasicMaterial
          )
        )
          continue;
        const compile = mat.onBeforeCompile,
          key = mat.customProgramCacheKey;
        patched.set(mat, { compile, key });
        mat.onBeforeCompile = function (shader, renderer) {
          compile.call(this, shader, renderer);
          Object.assign(shader.uniforms, uniforms);
          shader.vertexShader =
            "varying vec3 vVisionWorld;\n" +
            shader.vertexShader.replace(
              "#include <project_vertex>",
              `
          #include <project_vertex>
          vec4 visionLocal = vec4(transformed, 1.0);
          #ifdef USE_BATCHING
            visionLocal = batchingMatrix * visionLocal;
          #endif
          #ifdef USE_INSTANCING
            visionLocal = instanceMatrix * visionLocal;
          #endif
          vVisionWorld = (modelMatrix * visionLocal).xyz;
        `,
            );
          shader.fragmentShader =
            "varying vec3 vVisionWorld; uniform vec3 visionPlayer; uniform float visionStrength; uniform float visionRadius;\n" +
            shader.fragmentShader.replace(
              "#include <fog_fragment>",
              `
          #include <fog_fragment>
          float visionDistance = length(vVisionWorld.xz - visionPlayer.xz);
          float visionFog = smoothstep(visionRadius, visionRadius + 0.65, visionDistance);
          gl_FragColor.rgb *= 1.0 - visionStrength * visionFog;
        `,
            );
        };
        mat.customProgramCacheKey = function () {
          return key.call(this) + ":vision-world-darkness-v1";
        };
        mat.needsUpdate = true;
      }
    });
  return {
    uniforms,
    update(player: Point, strength: number, radius = 0.6) {
      uniforms.visionPlayer.value.set(player.x, player.y, player.z);
      uniforms.visionStrength.value = strength;
      uniforms.visionRadius.value = radius;
      attach();
    },
    dispose() {
      for (const [mat, hooks] of patched) {
        mat.onBeforeCompile = hooks.compile;
        mat.customProgramCacheKey = hooks.key;
        mat.needsUpdate = true;
      }
      patched.clear();
    },
  };
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
    const collider = { x, y, z, w, h, d };
    solids.push(collider);
    const mesh = box(group, x, y, z, w, h, d, c, name);
    markScenery(mesh, { kind: "solid", solids: [collider] });
    return mesh;
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
  solid(tree.x, 0, tree.z, 1.6, 7.7, 1.6, 0xb0a38b, "tree trunk").visible =
    false;
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
    const stone = oval(
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
    const collider = {
      x: stone.position.x,
      y: 0,
      z: stone.position.z,
      w: 1.4,
      h: 1.2,
      d: 1.2,
    };
    solids.push(collider);
    markScenery(stone, { kind: "solid", solids: [collider] });
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
    38.5,
    -0.3,
    5,
    19,
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
  // The landing ends at the slab edge z=-14; overlapping equal-height tops flicker.
  solid(53, 16.1, -11.5375, 5, 0.1, 4.925, 0xb9a49c, "building entry landing");
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
      const trunk = limb(
        group,
        new T.Vector3(x, 0, z),
        new T.Vector3(x + 0.3, h, z),
        0.21,
        0.1,
        0x73684e,
      );
      const collider = { x: x + 0.15, y: 0, z, w: 0.72, h, d: 0.42 };
      solids.push(collider);
      markScenery(trunk, { kind: "solid", solids: [collider] });
      climbables.push({
        id: `field-olive-${i}`,
        x,
        z,
        y: 0,
        height: h,
        radius: 0.45,
      });
      oval(group, x, h, z, 2.3, 1.8, 2, 0x647e57, "field olive tree");
    } else if (i % 2 === 0) {
      terracedRock(
        group,
        solids,
        material(0x999986),
        {
          x,
          y: 0,
          z,
          w: 2 * (0.55 + (i % 3) * 0.24),
          h: 0.7,
          d: 1.2,
        },
        "meadow stone",
      );
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
      body: "The living waters and the tree represent the love of God. Pause beside the fountain. What helps you recognize that love? — 1 Nephi 11:21–25",
    },
    {
      point: overlook,
      title: "Across the gulf",
      body: "Across the gulf, people point and mock. Some who tasted the fruit feel ashamed. What helps you remain faithful when others disapprove? — 1 Nephi 8:26–28; 12:18",
    },
    {
      point: p(-42, -78),
      title: "The word of God",
      body: "The iron rod represents the word of God, guiding those who hold fast through temptation. What does holding fast mean to you? — 1 Nephi 15:23–24",
    },
  ];
  for (const spot of reflections) {
    // Small natural stone seating, leaving every reflection point open and accessible.
    solid(
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
  batchVisionDecorations(group);
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
            if (o instanceof T.InstancedMesh) o.dispose();
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

/** Reduced smooth figures keep the large vision crowd within four draw calls. */
function createVisionCrowdParts() {
  const cloth = 0xb7a27e,
    mantle = 0x737f70,
    skin = 0xbf906b,
    hair = 0x49372c,
    leather = 0x634a34;
  const surface = () =>
    new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  const bodyMaterial = surface(),
    armMaterial = surface(),
    legMaterial = surface();
  const body = sculpt({
    bounds: [
      [-0.55, 0.15, -0.42],
      [0.55, 1.95, 0.42],
    ],
    resolution: 18,
    material: bodyMaterial,
    field(x, y, z) {
      const skirtWidth = 0.31 - T.MathUtils.clamp((y - 0.4) / 0.5, 0, 1) * 0.07;
      const folds = Math.sin(Math.atan2(x, z) * 9 + y * 2) * 0.006;
      const skirt = Math.max(
        (Math.hypot(x / skirtWidth, z / 0.21) - 1) * 0.21 + folds,
        0.39 - y,
        y - 0.96,
      );
      let d = smoothUnion(
        skirt,
        ellipsoid(x, y, z, 0, 1.035, 0, 0.27, 0.25, 0.205),
        0.09,
      );
      for (const side of [-1, 1])
        d = smoothUnion(
          d,
          ellipsoid(x, y, z, side * 0.245, 1.155, 0, 0.13, 0.135, 0.14),
          0.06,
        );
      d = smoothUnion(d, capsule(x, y, z, 0, 1.2, 0, 0, 1.38, 0, 0.085), 0.045);
      d = smoothUnion(
        d,
        ellipsoid(x, y, z, 0, 1.46, 0, 0.17, 0.205, 0.153),
        0.035,
      );
      return smoothUnion(
        d,
        ellipsoid(x, y, z, 0, 1.445, 0.15, 0.041, 0.059, 0.052),
        0.025,
      );
    },
    color(x, y, z) {
      if (y > 1.29) return y > 1.585 || (z < -0.055 && y > 1.36) ? hair : skin;
      if (y > 0.83 && y < 0.88) return leather;
      return y > 0.9 && (z < -0.1 || x < -0.12) ? mantle : cloth;
    },
  }).geometry;
  // Eyes share the body's vertex-colored geometry, with no extra meshes per person.
  const bodyPieces = [body];
  const addOval = (
    pieces: T.BufferGeometry[],
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    color: number,
  ) => {
    const geometry = new T.SphereGeometry(1, 8, 4).toNonIndexed();
    geometry.deleteAttribute("uv");
    geometry.scale(sx, sy, sz).translate(x, y, z);
    const colors = new Float32Array(
      geometry.getAttribute("position").count * 3,
    );
    const tint = new T.Color(color);
    for (let i = 0; i < colors.length; i += 3) tint.toArray(colors, i);
    geometry.setAttribute("color", new T.BufferAttribute(colors, 3));
    pieces.push(geometry);
  };
  for (const side of [-1, 1]) {
    addOval(
      bodyPieces,
      side * 0.064,
      1.49,
      0.139,
      0.034,
      0.023,
      0.014,
      0xe3d6bd,
    );
    addOval(bodyPieces, side * 0.064, 1.49, 0.151, 0.013, 0.016, 0.008, hair);
  }
  const bodyGeometry = mergeGeometries(bodyPieces)!;
  for (const geometry of bodyPieces) geometry.dispose();
  const armGeometry = sculpt({
    bounds: [
      [-0.25, -0.8, -0.25],
      [0.25, 0.3, 0.25],
    ],
    resolution: 12,
    material: armMaterial,
    field(x, y, z) {
      let d = capsule(x, y, z, 0, 0, 0, 0, -0.27, 0.01, 0.115);
      d = smoothUnion(
        d,
        capsule(x, y, z, 0, -0.26, 0.01, 0, -0.47, 0.025, 0.068),
        0.035,
      );
      return smoothUnion(
        d,
        ellipsoid(x, y, z, 0, -0.52, 0.025, 0.071, 0.093, 0.058),
        0.035,
      );
    },
    color: (_x, y) => (y > -0.3 ? cloth : skin),
  }).geometry;
  const legPieces: T.BufferGeometry[] = [];
  addOval(legPieces, 0, -0.18, 0, 0.078, 0.215, 0.08, skin);
  addOval(legPieces, 0, -0.405, 0.065, 0.1, 0.065, 0.175, leather);
  addOval(legPieces, 0, -0.37, 0.07, 0.075, 0.055, 0.115, skin);
  const legGeometry = mergeGeometries(legPieces)!;
  for (const geometry of legPieces) geometry.dispose();
  const parts = [
    new T.InstancedMesh(bodyGeometry, bodyMaterial, 108),
    new T.InstancedMesh(armGeometry, armMaterial, 216),
    new T.InstancedMesh(legGeometry, legMaterial, 216),
    new T.InstancedMesh(
      new T.SphereGeometry(0.105, 6, 4),
      new T.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xe7ebbc,
        emissiveIntensity: 0.5,
      }),
      108,
    ),
  ];
  for (let i = 0; i < parts.length; i++) {
    parts[i].name = `vision crowd ${["bodies", "arms", "legs", "fruit"][i]}`;
    parts[i].frustumCulled = false;
    parts[i].instanceMatrix.setUsage(T.DynamicDrawUsage);
  }
  return parts;
}

export function createTreeOfLifeScene(
  scene: T.Scene,
  world: WorldData,
  hooks: TreeHooks,
) {
  const data = (world as TreeWorldData).treeData;
  if (!data) throw new Error("Tree of Life metadata is required");
  const darkness = createVisionDarkness(scene);
  darkness.update(world.spawn, 1);
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
  const crowdParts = createVisionCrowdParts();
  for (const part of crowdParts) {
    part.frustumCulled = false;
    scene.add(part);
  }
  let crowdIndex = 0;
  const transform = new T.Object3D();
  const local = new T.Object3D();
  const instanceMatrix = new T.Matrix4();
  const makeActor = (
    role: Parameters<typeof createCharacter>[0],
    point: Point,
    mock = false,
    crowd = false,
  ) => {
    const index = crowdIndex;
    if (mock || crowd) crowdIndex++;
    if (mock || crowd) {
      const tint = new T.Color().setHSL(
        (index % 5) * 0.025 + 0.05,
        0.12,
        0.8 + (index % 3) * 0.07,
      );
      // A mother's muted plum mantle remains legible among the earth-colored
      // fathers and children without adding another mesh or draw call.
      if (role === "sariah") tint.setHSL(0.87 + (index % 3) * 0.015, 0.2, 0.77);
      crowdParts[0].setColorAt(index, tint);
      for (const part of [crowdParts[1], crowdParts[2]])
        for (let side = 0; side < 2; side++)
          part.setColorAt(index * 2 + side, tint);
    }
    const rig =
      mock || crowd
        ? ({
            group: new T.Group(),
            update(_dt: number, state: CharacterState) {
              const walking = Math.min(1, state.runSpeed),
                stride = Math.sin(time * 4.8 + index * 1.7) * walking,
                height =
                  role === "child"
                    ? 0.59
                    : (role === "sariah" ? 0.9 : 1.01) + (index % 3) * 0.025;
              const seated = this.group.userData.seated === true;
              transform.position.set(
                state.x,
                state.y + (seated ? -0.3 * height : Math.abs(stride) * 0.018),
                state.z,
              );
              transform.rotation.set(0, state.yaw, 0);
              // Lower the body and bend the legs forward; preserve head and torso
              // proportions instead of flattening the entire person into a squat.
              transform.scale.set(height, height, height);
              transform.updateMatrix();
              crowdParts[0].setMatrixAt(index, transform.matrix);
              for (let i = 0; i < 2; i++) {
                const side = i ? 1 : -1;
                local.position.set(side * 0.29, 1.16, 0);
                local.rotation.set(
                  state.carrying && i === 1 ? -1.4 : side * stride * 0.34,
                  0,
                  state.pointing && i === 0
                    ? -1.42 + Math.sin(time * 2 + index) * 0.08
                    : side * 0.1,
                );
                local.scale.setScalar(1);
                local.updateMatrix();
                instanceMatrix.multiplyMatrices(transform.matrix, local.matrix);
                crowdParts[1].setMatrixAt(index * 2 + i, instanceMatrix);
                local.position.set(
                  side * 0.125,
                  seated ? 0.65 : 0.47,
                  seated ? 0.2 : 0,
                );
                local.rotation.set(seated ? -0.8 : -side * stride * 0.28, 0, 0);
                local.updateMatrix();
                instanceMatrix.multiplyMatrices(transform.matrix, local.matrix);
                crowdParts[2].setMatrixAt(index * 2 + i, instanceMatrix);
              }
              local.position.set(0.29, 1.07, 0.56);
              local.rotation.set(0, 0, 0);
              local.scale.setScalar(state.carrying ? 1 : 0);
              local.updateMatrix();
              instanceMatrix.multiplyMatrices(transform.matrix, local.matrix);
              crowdParts[3].setMatrixAt(index, instanceMatrix);
            },
            dispose() {},
          } as ReturnType<typeof createCharacter>)
        : createCharacter(role);
    rig.group.userData.role = role;
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
    rig.update(0, state);
    actors.push({ rig, state, mock, home: { ...point } });
    return rig;
  };
  const sariah = makeActor("sariah", p(-9, -37));
  sariah.group.name = "Sariah";
  makeActor("nephi", p(-7, -34)).group.name = "Nephi";
  makeActor("sam", p(-12, -33)).group.name = "Sam";
  // Laman and Lemuel remain apart; this scene never depicts them taking the fruit.
  makeActor("laman", p(8, 65)).group.name = "Laman";
  makeActor("lemuel", p(12, 68)).group.name = "Lemuel";
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
  // Irregular family groups share the garden, rather than ordered ranks.
  const gardenFamilies = [
    [-8, 2],
    [7, 7],
    [-13, -8],
    [14, -10],
    [-5, 17],
    [14, 17],
  ];
  for (let i = 0; i < 72; i++) {
    const mode = i < 30 ? "eat" : i % 3 === 0 ? "lost" : "press";
    const route = data.path[i % data.path.length];
    const family = gardenFamilies[Math.floor(i / 5) % gardenFamilies.length];
    const member = i % 5;
    const jitter = Math.sin(i * 7.13) * 0.7;
    const point =
      mode === "eat"
        ? p(
            data.tree.x + family[0] + (member % 3) * 1.25 + jitter,
            data.tree.z +
              family[1] +
              Math.floor(member / 3) * 1.4 +
              Math.cos(i * 4.7) * 0.7,
          )
        : mode === "lost"
          ? p(-75 + (i % 13), 12 + (i % 40))
          : p(route.x - 2 - (i % 3), route.z + (i % 5));
    const role = member > 1 ? "child" : member === 0 ? "sam" : "sariah";
    const rig = makeActor(role, point, false, true);
    rig.group.name = `vision family — ${mode}`;
    rig.group.userData.seated = mode === "eat" && i % 6 === 0;
    if (mode === "eat") rig.group.userData.family = Math.floor(i / 5);
    actors[actors.length - 1].behavior = mode;
    actors[actors.length - 1].state.yaw = Math.atan2(
      data.tree.x - point.x,
      data.tree.z - point.z,
    );
  }
  const familyWords: Record<string, string> = {
    "Lehi — dreamer and father":
      "Lehi longs for his family to share the fruit’s joy. He still loves those who will not come. — 1 Nephi 8:12–18, 35–37",
    Sariah:
      "Sariah comes with Nephi and Sam to partake of the fruit. Imagine finding your loved ones at the tree. — 1 Nephi 8:14–16",
    Nephi:
      "Nephi partakes of the fruit. Later, seeking to understand the vision, he learns of the love of God. — 1 Nephi 8:16; 11:21–23",
    Sam: "Sam came with Sariah and Nephi to share the fruit. Quiet faith can lead toward the same joy. — 1 Nephi 8:16",
    Laman:
      "Laman will not come to partake of the fruit. Lehi sees his choice and continues to care for him. — 1 Nephi 8:17–18",
    Lemuel:
      "Lemuel also will not come. Lehi urges his sons toward faith with a tender parent’s concern. — 1 Nephi 8:18, 35–37",
  };
  const say = (
    title: string,
    body: string,
    next: () => void,
    shot?: StoryShot,
  ) => {
    dialogOpen = true;
    hooks.dialog(
      "LEHI’S VISION · 1 NEPHI 8",
      title,
      body,
      () => {
        if (disposed) return;
        dialogOpen = false;
        next();
      },
      shot ?? { actors: [], focus: data.tree, wide: 14 },
    );
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
          "You are Lehi. Find the iron rod and follow it toward the tree of life. Walk at your own pace through this artistic interpretation. — 1 Nephi 8",
          () => {
            phase = "rod";
            hooks.setMarker(data.path[0]);
          },
          // Start on the player’s visible patch; the distant tree is intentionally
          // obscured from this position, so framing it would produce a black shot.
          { actors: [], focus: { ...world.spawn, y: 1 }, wide: 4 },
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
            "The fruit fills Lehi with joy he longs to share. The tree represents the love of God, revealed through Jesus Christ. — 1 Nephi 8:10–12; 11:21–23",
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
              {
                actors: [
                  { group: person.rig.group, gesture: "talk", speaker: true },
                ],
              },
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
      for (const part of crowdParts) part.instanceMatrix.needsUpdate = true;
      // Garden light falls away in every direction, including behind the player.
      const gardenDistance = distance(player, data.tree);
      const strength = T.MathUtils.smoothstep(gardenDistance, 22, 38);
      darkness.update(player, strength, route.distance > 3 ? 0.6 : 0.85);
      if (scene.background instanceof T.Color)
        scene.background.setHex(0xbdcfd5).lerp(new T.Color(0x000000), strength);
      // Camera-depth fog must not obscure the visibility bubble when orbiting.
      if (scene.fog instanceof T.Fog) {
        scene.fog.near = 82;
        scene.fog.far = 149;
      }
      data.mist.visible = strength < 0.98;
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
      darkness.dispose();
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

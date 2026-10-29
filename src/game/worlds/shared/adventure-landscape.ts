import * as T from "three";
import { material } from "../../rendering/art";
import { markScenery, sceneryBox, terracedRock } from "./scenery";
import {
  createCharacter,
  type CharacterRole,
  type CharacterOptions,
} from "../../characters/character";
import type { Point, Solid } from "../../runtime/worlds";

/** Small outdoor worlds share one physical surface per visible solid. */
export function adventureLandscape(
  scene: T.Scene,
  name: string,
  color: number,
  width = 150,
  depth = 160,
) {
  const root = new T.Group();
  root.name = name;
  scene.add(root);
  scene.background = new T.Color(0xb8d9de);
  scene.fog = new T.Fog(0xb8d9de, 95, 230);
  root.add(new T.HemisphereLight(0xfff2cf, 0x566548, 2.5));
  const sun = new T.DirectionalLight(0xffe5b6, 2.5);
  sun.position.set(-30, 65, 25);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = sun.shadow.camera.bottom = -85;
  sun.shadow.camera.right = sun.shadow.camera.top = 85;
  sun.shadow.camera.far = 180;
  sun.shadow.normalBias = 0.04;
  sun.shadow.bias = -0.0002;
  root.add(sun);
  const solids: Solid[] = [];
  const actors: ReturnType<typeof createCharacter>[] = [];
  const ground = sceneryBox(
    root,
    solids,
    material(color),
    { x: 0, y: -0.5, z: 0, w: width, h: 0.5, d: depth },
    "Earth · sole walk surface",
  );
  // Color the single physical ground mesh itself: paths and soil patches never
  // introduce coplanar overlay floors, extra draw calls, or collision seams.
  const groundGeometry = new T.PlaneGeometry(1, 1, 90, 90);
  groundGeometry.rotateX(-Math.PI / 2);
  groundGeometry.translate(0, 0.5, 0);
  const positions = groundGeometry.getAttribute("position");
  const colors = new Float32Array(positions.count * 3);
  const orchard = name.includes("Vineyard");
  const base = new T.Color(color),
    soil = new T.Color(0xb69d72),
    sand = new T.Color(0xd6c18e);
  const segmentDistance = (
    x: number,
    z: number,
    ax: number,
    az: number,
    bx: number,
    bz: number,
  ) => {
    const t = T.MathUtils.clamp(
      ((x - ax) * (bx - ax) + (z - az) * (bz - az)) /
        ((bx - ax) ** 2 + (bz - az) ** 2),
      0,
      1,
    );
    return Math.hypot(x - ax - t * (bx - ax), z - az - t * (bz - az));
  };
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i) * width,
      z = positions.getZ(i) * depth;
    const noise =
      Math.sin(x * 0.63 + Math.cos(z * 0.21)) * Math.cos(z * 0.48) * 0.035;
    const tint = base
      .clone()
      .multiplyScalar(0.97 + noise + Math.sin(x * 0.13 + z * 0.17) * 0.055);
    const path = orchard
      ? Math.min(
          segmentDistance(x, z, 0, 37, 0, 18),
          segmentDistance(x, z, 0, 18, -30, -20),
          segmentDistance(x, z, 0, 18, 0, -42),
          segmentDistance(x, z, 0, 18, 32, -20),
          segmentDistance(x, z, 0, 23, -24, 17),
        )
      : Math.abs(x - Math.sin(z * 0.075) * 3);
    tint.lerp(soil, 1 - T.MathUtils.smoothstep(path, 2, 4.1));
    // Gentle cultivated beds and sandy coastal transition belong to this mesh.
    if (!orchard) {
      tint.lerp(
        sand,
        T.MathUtils.smoothstep(z + Math.sin(x * 0.07) * 3, 39, 66),
      );
      if (x > 7 && x < 13 && z > 29 && z < 36)
        tint.lerp(new T.Color(0x77653d), 0.8);
    } else {
      const nearest = Math.min(
        Math.hypot(x, z - 18),
        Math.hypot(x + 30, z + 20),
        Math.hypot(x, z + 42),
        Math.hypot(x - 32, z + 20),
        Math.hypot(x + 24, z - 17),
      );
      tint.lerp(soil, (1 - T.MathUtils.smoothstep(nearest, 4, 7)) * 0.55);
    }
    tint.toArray(colors, i * 3);
  }
  groundGeometry.setAttribute("color", new T.BufferAttribute(colors, 3));
  ground.geometry.dispose();
  ground.geometry = groundGeometry;
  const groundMaterial = ground.material as T.MeshStandardMaterial;
  groundMaterial.color.setHex(0xffffff);
  groundMaterial.vertexColors = true;
  const solid = (shape: Solid, color: number, name: string) =>
    sceneryBox(root, solids, material(color), shape, name);
  const tree = (x: number, z: number, scale = 1) => {
    const trunk = solid(
      { x, z, y: 0, w: 0.8 * scale, h: 4 * scale, d: 0.8 * scale },
      0x76604a,
      "Olive trunk",
    );
    const crown = new T.Group();
    crown.position.set(x, 4.9 * scale, z);
    root.add(crown);
    const geo = new T.IcosahedronGeometry(1, 1),
      mat = material(0x788d55);
    for (let i = 0; i < 4; i++) {
      const mesh = new T.Mesh(geo, mat);
      mesh.scale.set(2.1 * scale, 1.25 * scale, 1.8 * scale);
      mesh.position.set(
        Math.sin(i * 2.4) * scale,
        i % 2 ? 0.4 * scale : 0,
        Math.cos(i * 2.4) * scale,
      );
      mesh.name = "High olive canopy";
      mesh.castShadow = true;
      markScenery(mesh, {
        kind: "decoration",
        reason:
          "Foliage above the player; trunk is solid and this tree is not a climbing route.",
      });
      crown.add(mesh);
    }
    const fruit = new T.InstancedMesh(
      new T.SphereGeometry(0.12 * scale, 6, 4),
      material(0xc3b961),
      12,
    );
    const matrix = new T.Matrix4();
    for (let i = 0; i < 12; i++) {
      matrix.makeTranslation(
        Math.sin(i * 2.4) * 2 * scale,
        -0.5 * scale + Math.sin(i) * 0.6 * scale,
        Math.cos(i * 2.4) * 1.8 * scale,
      );
      fruit.setMatrixAt(i, matrix);
    }
    fruit.name = "Olives";
    crown.add(fruit);
    markScenery(fruit, {
      kind: "decoration",
      reason: "Small fruit among high foliage, outside player traversal.",
    });
    return { trunk, crown, fruit };
  };
  // Batched low plants are flexible decoration; taller perimeter trunks remain
  // physical trees. Keep central story routes and task locations open.
  const plants = new T.InstancedMesh(
    new T.IcosahedronGeometry(1, 0),
    material(0x718152),
    90,
  );
  const flowers = new T.InstancedMesh(
    new T.IcosahedronGeometry(0.1, 0),
    material(0xe5cf90),
    70,
  );
  const plantTransform = new T.Object3D();
  for (let i = 0; i < 90; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * (15 + (i % 9) * 3.5 + Math.sin(i * 4.1) * 2),
      z = -64 + (i % 23) * 5.5;
    plantTransform.position.set(x, 0.24, z);
    plantTransform.scale.set(
      0.3 + (i % 4) * 0.09,
      0.26 + (i % 3) * 0.09,
      0.33 + (i % 4) * 0.08,
    );
    plantTransform.rotation.set(0, i * 0.8, 0);
    plantTransform.updateMatrix();
    plants.setMatrixAt(i, plantTransform.matrix);
    if (i < 70) {
      plantTransform.position.y += 0.24;
      plantTransform.scale.setScalar(1);
      plantTransform.updateMatrix();
      flowers.setMatrixAt(i, plantTransform.matrix);
    }
  }
  plants.name = "Batched flexible garden shrubs";
  flowers.name = "Wildflower accents";
  plants.castShadow = true;
  root.add(plants, flowers);
  for (const object of [plants, flowers])
    markScenery(object, {
      kind: "decoration",
      reason:
        "Low flexible stems outside the central story paths; intended to brush past like ground cover.",
    });
  for (let i = 0; i < 10; i++)
    tree(
      (i % 2 ? 1 : -1) * (42 + (i % 3) * 4),
      -54 + Math.floor(i / 2) * 24,
      1 + (i % 3) * 0.14,
    );
  // Northern valley shoulders are reachable: their rendered profile and shallow
  // supporting terraces share dimensions, with an open settlement corridor.
  if (name.includes("mountain valleys")) {
    for (const x of [-60, 65])
      terracedRock(
        root,
        solids,
        material(0x7c9672),
        { x, y: 0, z: -117, w: 24, h: 8, d: 20 },
        "Northern valley foothill",
      );
  }
  const backdropMaterial = material(orchard ? 0x7d8c69 : 0x7c9672);
  const hillGeometry = new T.IcosahedronGeometry(1, 1);
  for (let i = 0; i < 15; i++) {
    const hill = new T.Mesh(hillGeometry, backdropMaterial);
    hill.name = "Distant rolling hills";
    // The full silhouette must clear the ground, even in deeper worlds.
    hill.position.set((i - 7) * 23, 2, -depth / 2 - 35 - (i % 3) * 14);
    hill.scale.set(25 + (i % 4) * 5, 18 + (i % 3) * 10, 22);
    root.add(hill);
    markScenery(hill, {
      kind: "backdrop",
      reason:
        "Distant horizon beyond all playable bounds; no player route reaches these hills.",
    });
  }
  const actor = (
    role: CharacterRole,
    point: Point,
    options: CharacterOptions = {},
  ) => {
    const rig = createCharacter(role, options);
    actors.push(rig);
    root.add(rig.group);
    rig.update(0, {
      ...point,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: point.yaw ?? Math.PI,
      grounded: true,
      runSpeed: 0,
    });
    return rig;
  };
  const marker = new T.Mesh(
    new T.OctahedronGeometry(0.42),
    new T.MeshBasicMaterial({ color: 0x4dd7ff, depthTest: false }),
  );
  marker.name = "Blue next task beacon";
  marker.renderOrder = 20;
  root.add(marker);
  markScenery(marker, {
    kind: "decoration",
    reason: "Nonphysical objective indicator.",
  });
  let disposed = false,
    time = 0;
  return {
    root,
    solids,
    ground,
    solid,
    tree,
    actor,
    marker,
    update(dt: number, target?: Point) {
      if (disposed) return;
      time += Math.min(Math.max(dt, 0), 0.1);
      marker.visible = !!target;
      if (target)
        marker.position.set(
          target.x,
          target.y + 2.6 + Math.sin(time * 3) * 0.15,
          target.z,
        );
      marker.rotation.y = time;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      actors.forEach((actor) => actor.dispose());
      const geometries = new Set<T.BufferGeometry>(),
        materials = new Set<T.Material>();
      root.traverse((object) => {
        if (object instanceof T.InstancedMesh) object.dispose();
        if (object instanceof T.Mesh) {
          geometries.add(object.geometry);
          for (const mat of Array.isArray(object.material)
            ? object.material
            : [object.material])
            materials.add(mat);
        }
      });
      sun.shadow.dispose();
      geometries.forEach((geo) => geo.dispose());
      materials.forEach((mat) => mat.dispose());
      scene.remove(root);
    },
  };
}

export const withinTask = (a: Point, b: Point, radius = 2.6) =>
  Math.hypot(a.x - b.x, a.z - b.z) < radius && Math.abs(a.y - b.y) < 1.3;

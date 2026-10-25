import * as T from "three";
import { material } from "./art";
import { createCharacter, type CharacterRole } from "./character";
import { createPlayer } from "./physics";
import { markScenery, sceneryBox } from "./scenery";
import type { Point, Solid } from "./worlds";

/** Shared set dressing for the three Alma war accounts. Each solid uses its render dimensions. */
export function warWorld(scene: T.Scene, name: string, night = false) {
  const previousBackground = scene.background,
    previousFog = scene.fog;
  const root = new T.Group();
  root.name = name;
  scene.add(root);
  const haze = night ? 0x19283f : 0x9ac4ca;
  scene.background = new T.Color(haze);
  scene.fog = new T.Fog(haze, night ? 48 : 72, night ? 135 : 190);
  const hemi = new T.HemisphereLight(
    night ? 0x9abce9 : 0xffecd0,
    0x4d5644,
    night ? 1.6 : 2.5,
  );
  root.add(hemi);
  const light = new T.DirectionalLight(
    night ? 0x9cb7e7 : 0xffdcaa,
    night ? 1.4 : 2.4,
  );
  light.position.set(-28, 55, 20);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.camera.left = light.shadow.camera.bottom = -80;
  light.shadow.camera.right = light.shadow.camera.top = 80;
  light.shadow.camera.far = 150;
  root.add(light);
  const solids: Solid[] = [];
  const rigs: ReturnType<typeof createCharacter>[] = [];
  const solid = (shape: Solid, color: number, label: string) =>
    sceneryBox(root, solids, material(color), shape, label);
  solid(
    { x: 0, y: -0.6, z: 0, w: 110, h: 0.6, d: 140 },
    night ? 0x596a62 : 0xbda980,
    "Single earth walk surface",
  );
  const decor = (
    shape: Solid,
    color: number,
    label: string,
    reason: string,
  ) => {
    const mesh = new T.Mesh(
      new T.BoxGeometry(shape.w, shape.h, shape.d),
      material(color),
    );
    mesh.position.set(shape.x, shape.y + shape.h / 2, shape.z);
    mesh.name = label;
    markScenery(mesh, { kind: "decoration", reason });
    root.add(mesh);
    return mesh;
  };
  const actor = (role: CharacterRole, point: Point, name: string) => {
    const rig = createCharacter(role, { quality: "npc" });
    rig.group.name = name;
    root.add(rig.group);
    rigs.push(rig);
    rig.update(0, {
      ...createPlayer(point.x, point.y, point.z),
      yaw: point.yaw ?? 0,
    });
    return rig;
  };
  const tree = (x: number, z: number) => {
    solid(
      { x, y: 0, z, w: 0.85, d: 0.85, h: 4.4 },
      0x68553d,
      "Solid olive trunk",
    );
    const leaves = new T.Mesh(
      new T.IcosahedronGeometry(2.5, 1),
      material(night ? 0x3c5144 : 0x617c4f),
    );
    leaves.position.set(x, 5.7, z);
    leaves.name = "High olive canopy";
    markScenery(leaves, {
      kind: "decoration",
      reason: "Canopy is above the walk path; trunk owns collision.",
    });
    root.add(leaves);
  };
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    rigs.forEach((r) => r.dispose());
    const geometries = new Set<T.BufferGeometry>(),
      materials = new Set<T.Material>();
    root.traverse((o) => {
      if (o instanceof T.InstancedMesh) o.dispose();
      if (o instanceof T.Mesh) {
        geometries.add(o.geometry);
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
          materials.add(m);
      }
    });
    light.shadow.dispose();
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    scene.remove(root);
    scene.background = previousBackground;
    scene.fog = previousFog;
  };
  return { root, solids, solid, decor, actor, tree, dispose };
}

export const nearWarPoint = (a: Point, b: Point, radius = 2.8) =>
  Math.hypot(a.x - b.x, a.z - b.z) < radius && Math.abs(a.y - b.y) < 1.6;

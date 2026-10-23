import * as T from "three";
import type { Solid } from "./physics";

type SceneryPolicy =
  | { kind: "solid"; solids: Solid[] }
  | { kind: "decoration" | "backdrop"; reason: string };
/** Register deliberate physical intent; validation checks the live collision array. */
export function markScenery(object: T.Object3D, policy: SceneryPolicy): void {
  object.userData.scenery = policy;
}
export function sceneryCollisionErrors(
  root: T.Object3D,
  solids: Solid[],
): string[] {
  const errors: string[] = [];
  root.traverse((object) => {
    const policy = object.userData.scenery as SceneryPolicy | undefined;
    if (!policy) {
      if (
        object instanceof T.Mesh &&
        /\b(trunk|boulder|limestone|outcrop|crag|rock|ridge|palm)\b/i.test(
          object.name,
        )
      )
        errors.push(
          `${object.name}: unclassified scenery; register collision or explicit decoration/backdrop intent`,
        );
      return;
    }
    if (
      policy.kind === "solid" &&
      (!policy.solids.length || policy.solids.some((s) => !solids.includes(s)))
    )
      errors.push(`${object.name}: missing scenery collision`);
    if (policy.kind !== "solid" && !policy.reason.trim())
      errors.push(`${object.name}: missing nonphysical reason`);
  });
  return errors;
}
/** One dimension source for both the visible box and its physical surface. */
export function sceneryBox(
  parent: T.Group,
  solids: Solid[],
  material: T.Material,
  shape: Solid,
  name: string,
): T.Mesh {
  const mesh = new T.Mesh(
    new T.BoxGeometry(shape.w, shape.h, shape.d),
    material,
  );
  mesh.position.set(shape.x, shape.y + shape.h / 2, shape.z);
  mesh.name = name;
  mesh.receiveShadow = true;
  parent.add(mesh);
  solids.push(shape);
  markScenery(mesh, { kind: "solid", solids: [shape] });
  return mesh;
}
/** Walkable rock terraces. Collision is exactly the rendered tiers, never a giant enclosing AABB. */
export function terracedRock(
  parent: T.Group,
  solids: Solid[],
  material: T.Material,
  shape: Solid,
  name: string,
): T.Group {
  const group = new T.Group();
  group.name = name;
  parent.add(group);
  const tiers = Math.ceil(shape.h / 0.35),
    step = shape.h / tiers;
  const batch = new T.InstancedMesh(
    new T.BoxGeometry(1, 1, 1),
    material,
    tiers,
  );
  batch.name = `${name} terrace`;
  batch.receiveShadow = true;
  const surfaces: Solid[] = [],
    matrix = new T.Matrix4();
  for (let i = 0; i < tiers; i++) {
    const taper = 1 - (i / tiers) * 0.8;
    const surface = {
      ...shape,
      y: shape.y + i * step,
      h: step,
      w: shape.w * taper,
      d: shape.d * taper,
    };
    surfaces.push(surface);
    matrix.makeScale(surface.w, surface.h, surface.d);
    matrix.setPosition(surface.x, surface.y + surface.h / 2, surface.z);
    batch.setMatrixAt(i, matrix);
  }
  batch.instanceMatrix.needsUpdate = true;
  batch.computeBoundingSphere();
  solids.push(...surfaces);
  markScenery(batch, { kind: "solid", solids: surfaces });
  group.add(batch);
  return group;
}

import { sceneryBox, markScenery } from "./scenery";
import { softBoxGeometry } from "./soft-geometry";
import * as T from "three";
import type { Solid, Climbable } from "./physics";

export type Point = { x: number; y: number; z: number };
export type ShipBuild = {
  group: T.Group;
  solids: Solid[];
  climbables: Climbable[];
  points: Record<
    | "deckArrival"
    | "helm"
    | "liahona"
    | "commonRoom"
    | "boundNephi"
    | "gangway"
    | "stairBottom"
    | "stairTop",
    Point
  >;
};

/** An imagined timber vessel: scripture does not specify its design. Coordinates use feet-on-deck heights. */
export function buildShip(parent: T.Group, origin: Point): ShipBuild {
  const group = new T.Group();
  group.name = "Ancient timber sailing vessel";
  group.position.set(origin.x, origin.y, origin.z);
  parent.add(group);
  const solids: Solid[] = [];
  const climbables: Climbable[] = [];
  const timber = new T.MeshStandardMaterial({
    color: 0x805131,
    roughness: 0.92,
  });
  const paleWood = new T.MeshStandardMaterial({
    color: 0xaf8250,
    roughness: 0.9,
  });
  const darkWood = new T.MeshStandardMaterial({
    color: 0x4c3021,
    roughness: 1,
  });
  const ropeMaterial = new T.MeshStandardMaterial({
    color: 0xb39a68,
    roughness: 1,
  });
  const sailMaterial = new T.MeshStandardMaterial({
    color: 0xf2e6c5,
    side: T.DoubleSide,
    roughness: 1,
  });
  const batches = new Map<
    string,
    { geometry: T.BufferGeometry; material: T.Material; matrices: T.Matrix4[] }
  >();
  const matrix = new T.Matrix4();
  const addBox = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    material: T.Material = timber,
    solid = false,
  ) => {
    matrix.compose(
      new T.Vector3(x, y + h / 2, z),
      new T.Quaternion(),
      new T.Vector3(w, h, d),
    );
    const geometry = softBoxGeometry(
      w,
      h,
      d,
      solid && h > 0.6 && d > 2 ? "deck" : "timber fitting",
    );
    const key = geometry.uuid + material.uuid;
    const batch = batches.get(key) ?? { geometry, material, matrices: [] };
    batch.matrices.push(matrix.clone());
    batches.set(key, batch);
    if (solid)
      solids.push({
        x: x + origin.x,
        y: y + origin.y,
        z: z + origin.z,
        w,
        h,
        d,
      });
  };
  const beam = (
    a: Point,
    b: Point,
    radius: number,
    material: T.Material = ropeMaterial,
  ) => {
    const start = new T.Vector3(a.x, a.y, a.z),
      end = new T.Vector3(b.x, b.y, b.z);
    const delta = end.clone().sub(start);
    const mesh = new T.Mesh(
      new T.CylinderGeometry(radius, radius, delta.length(), 6),
      material,
    );
    mesh.position.copy(start.add(end).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      delta.normalize(),
    );
    group.add(mesh);
  };
  // The hull has a pointed bow and a rounded stern, with a broad central body.
  const halfWidth = (z: number) =>
    8.8 * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(z) / 22, 3)), 0.55);
  const vertices: number[] = [],
    indices: number[] = [];
  for (let i = 0; i <= 44; i++) {
    const z = -22 + i,
      w = halfWidth(z);
    for (const [x, y] of [
      [-w, 4.15],
      [-w * 0.82, 0.65],
      [0, 0.04],
      [w * 0.82, 0.65],
      [w, 4.15],
    ])
      vertices.push(x, y, z);
    if (i)
      for (let j = 0; j < 4; j++) {
        const a = (i - 1) * 5 + j,
          b = i * 5 + j;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
  }
  const hullGeometry = new T.BufferGeometry();
  hullGeometry.setAttribute(
    "position",
    new T.Float32BufferAttribute(vertices, 3),
  );
  hullGeometry.setIndex(indices);
  hullGeometry.computeVertexNormals();
  const hullMaterial = timber.clone();
  hullMaterial.side = T.DoubleSide;
  const hull = new T.Mesh(hullGeometry, hullMaterial);
  hull.name = "Curved tapered plank hull";
  group.add(hull);
  markScenery(hull, {
    kind: "decoration",
    reason:
      "Outer curved waterproof skin; fitted solid inner planking owns the cabin boundary.",
  });
  // Continuous inner planking follows the tapered shell. Overlap consecutive
  // one-metre bays so even the narrow bow cannot leak through collision gaps.
  for (let z = -21; z <= 21; z++) {
    const outer =
      halfWidth(Math.max(-21.5, Math.min(21.5, z + (z < 0 ? -0.5 : 0.5)))) *
      0.85;
    for (const side of [-1, 1]) {
      const shape = { x: side * outer, y: 0, z, w: 0.5, h: 3.95, d: 1.06 };
      sceneryBox(group, solids, timber, shape, "Solid inner hull planking");
      shape.x += origin.x;
      shape.y += origin.y;
      shape.z += origin.z;
    }
  }
  for (const z of [-21.5, 21.5]) {
    const shape = {
      x: 0,
      y: 0,
      z,
      w: halfWidth(z) * 1.7 + 0.5,
      h: 3.95,
      d: 0.5,
    };
    sceneryBox(group, solids, timber, shape, "Sealed bow and stern");
    shape.x += origin.x;
    shape.y += origin.y;
    shape.z += origin.z;
  }
  // The living floor is the world baseline; visible boards have no underground geometry.
  for (let z = -18; z <= 18; z += 1) {
    const w = halfWidth(z) - 0.45;
    addBox(0, 0, z, w * 2, 0.035, 0.94, paleWood);
  }
  // Upper deck is divided around a full-height stair opening.
  for (let z = -21; z <= 21; z++) {
    const w = halfWidth(z) - 0.18;
    if (z >= -1 && z <= 10) {
      addBox((-w + 4.5) / 2, 3.95, z, w + 4.5, 0.25, 1, paleWood, true);
      if (w > 7.5)
        addBox((w + 7.5) / 2, 3.95, z, w - 7.5, 0.25, 1, paleWood, true);
    } else addBox(0, 3.95, z, w * 2, 0.25, 1, paleWood, true);
  }
  // Fourteen 30cm risers work with the shared physics step height.
  for (let i = 0; i < 14; i++)
    addBox(6, 0, 10 - i * 0.75, 2.6, (i + 1) * 0.3, 0.75, paleWood, true);
  addBox(6, 3.95, -0.8, 2.6, 0.25, 1.5, paleWood, true);
  // Cabin aft: a central doorway and a clear passage to both side aisles.
  addBox(-5.1, 0, 12, 5.8, 3.5, 0.22, timber, true);
  addBox(3.1, 0, 12, 2.2, 3.5, 0.22, timber, true);
  addBox(-1.15, 2.5, 12, 2.1, 1, 0.22, timber, true);
  addBox(-7.8, 0, 15.4, 0.2, 3.5, 6.6, timber, true);
  addBox(4.1, 0, 15.4, 0.2, 3.5, 6.6, timber, true);
  addBox(-1.85, 0, 18.7, 12.1, 3.5, 0.2, timber, true);
  // Benches and sleeping platforms leave the middle of the common room wide open.
  for (const x of [-6.5, 2.5])
    for (const z of [14.5, 17]) addBox(x, 0, z, 2, 0.48, 1.4, darkWood, true);
  for (const z of [-12, -8, -4])
    addBox(-6.6, 0, z, 1.2, 0.5, 2.6, darkWood, true);
  // Repeated ribs expose the structure below deck. Rails follow the changing hull width.
  for (let z = -19; z <= 19; z += 2) {
    const w = halfWidth(z);
    for (const side of [-1, 1]) {
      addBox(side * (w - 0.2), 0.15, z, 0.22, 4, 0.22, darkWood);
      addBox(side * (w - 0.1), 4.2, z, 0.18, 1.15, 0.18, darkWood);
      if (!(side === 1 && z >= 11 && z <= 15))
        addBox(side * (w - 0.1), 4.2, z, 0.24, 1.05, 2.1, timber, true);
    }
  }
  for (const z of [-19, 19])
    addBox(0, 4.2, z, halfWidth(z) * 2, 1, 0.22, timber, true);
  // An imagined wheel helm, with a physical pedestal and upright wheel support.
  addBox(0, 4.2, 16, 1.5, 1.65, 0.65, timber, true);
  const wheel = new T.Group();
  wheel.name = "Ship wheel pivot";
  wheel.position.set(0, 5.65, 16.4);
  group.add(wheel);
  const rim = new T.Mesh(new T.TorusGeometry(0.9, 0.09, 8, 24), darkWood);
  wheel.add(rim);
  for (let i = 0; i < 8; i++) {
    const spoke = new T.Mesh(
      new T.CylinderGeometry(0.055, 0.055, 2.15, 6),
      paleWood,
    );
    spoke.rotation.z = (i * Math.PI) / 4;
    wheel.add(spoke);
  }
  // Low table, bedding and stores make distinct living spaces below deck.
  addBox(-3.4, 0, 2, 2.2, 0.72, 3.4, darkWood, true);
  for (const z of [-12, -8, -4]) {
    addBox(-5.5, 0.5, z, 1.2, 0.12, 2.3, paleWood);
    addBox(3.4, 0, z, 1.3, 0.7, 1.1, timber, true);
  }
  for (const z of [-7, 6]) {
    beam({ x: 0, y: 4.2, z }, { x: 0, y: 18.2, z }, 0.25, darkWood);
    beam({ x: -6.5, y: 15.5, z }, { x: 6.5, y: 15.5, z }, 0.13, darkWood);
    const sail = new T.Mesh(new T.PlaneGeometry(12, 7, 6, 4), sailMaterial);
    sail.position.set(0, 11.7, z);
    sail.name = "Cream woven square sail";
    group.add(sail);
    for (const x of [-7.5, 7.5])
      for (const dz of [-5, 5])
        beam({ x: 0, y: 17.8, z }, { x, y: 4.35, z: z + dz }, 0.035);
    climbables.push({
      id: `ship-mast-${z}`,
      x: origin.x,
      y: origin.y + 4.2,
      z: origin.z + z,
      height: 14,
      radius: 0.3,
    });
  }
  for (const { geometry, material, matrices } of batches.values()) {
    const mesh = new T.InstancedMesh(geometry, material, matrices.length);
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.name = "Instanced deck planks, frames and fittings";
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  const point = (x: number, y: number, z: number): Point => ({
    x: x + origin.x,
    y: y + origin.y,
    z: z + origin.z,
  });
  return {
    group,
    solids,
    climbables,
    points: {
      deckArrival: point(3, 4.2, 13),
      helm: point(0, 4.2, 17),
      liahona: point(-3, 4.2, 12),
      commonRoom: point(0, 0, 0),
      boundNephi: point(0, 4.2, -6.25),
      gangway: point(8.5, 4.2, 13),
      stairBottom: point(6, 0, 11),
      stairTop: point(6, 4.2, -1),
    },
  };
}

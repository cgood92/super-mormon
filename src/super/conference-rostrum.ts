import * as THREE from "three";
import type { Solid } from "./physics";

export type RostrumSeat = { x: number; y: number; z: number; angle: number };

/** North is the organ wall; the choir and presiding seats look south (+Z). */
export function buildRostrum(parent: THREE.Group): {
  solids: Solid[];
  seats: RostrumSeat[];
} {
  const group = new THREE.Group();
  group.name = "Conference Center rostrum";
  parent.add(group);
  const solids: Solid[] = [];
  const seats: RostrumSeat[] = [];
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const wood = new THREE.MeshStandardMaterial({
    color: 0x97552e,
    roughness: 0.8,
  });
  const carpet = new THREE.MeshStandardMaterial({
    color: 0x7b3436,
    roughness: 0.9,
  });
  const foliage = new THREE.MeshStandardMaterial({
    color: 0x315c32,
    roughness: 0.9,
  });
  const batches = new Map<THREE.Material, THREE.Matrix4[]>();
  const transform = new THREE.Object3D();
  function box(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    material: THREE.Material,
    solid = false,
  ) {
    transform.position.set(x, y + h / 2, z);
    transform.rotation.set(0, 0, 0);
    transform.scale.set(w, h, d);
    transform.updateMatrix();
    const matrices = batches.get(material) ?? [];
    matrices.push(transform.matrix.clone());
    batches.set(material, matrices);
    if (solid) solids.push({ x, y, z, w, h, d });
  }
  // The broad wooden stage has a continuous face beneath the central pulpit.
  box(0, -0.4, -87.6, 92, 2.8, 17.2, wood, true);
  // Paired access stairs flank the lower rostrum. Every tread reaches the floor.
  for (const side of [-1, 1]) {
    for (let step = 0; step < 8; step++) {
      box(
        side * 25,
        -0.4,
        -71.3 - step,
        5,
        0.7 + step * 0.3,
        step === 7 ? 1.4 : 1.025,
        carpet,
        true,
      );
    }
  }
  // Low rows of presiding officers sit below the choir, with clear side access.
  for (let row = 0; row < 3; row++) {
    const y = 2.4 + row * 0.3;
    const z = -81 - row * 1.4;
    if (row) box(0, -0.4, z, 42, y + 0.4, 1.4, wood, true);
    for (let x = -19.2; x <= 19.2; x += 1.2) {
      if (Math.abs(x) < 3.1) continue;
      seats.push({ x, y, z, angle: Math.PI });
    }
    for (const side of [-1, 1])
      box(side * 12, y, z + 0.6, 17, 0.38, 0.15, wood);
  }
  // Modest center pulpit and a planted apron, as in the reference photographs.
  box(0, 2.4, -81.6, 1.5, 1.3, 1.1, wood);
  box(0, 3.7, -81.6, 2, 0.16, 1.35, wood);
  box(0, 2.4, -79.45, 5.2, 0.5, 0.65, wood);
  for (let x = -2.2; x <= 2.2; x += 0.55)
    box(x, 2.9, -79.45, 0.7, 0.3 + 0.1 * Math.cos(x * 3), 0.8, foliage);
  // Choir terraces rise behind the officials, filled down to the foundation.
  for (let row = 0; row < 7; row++) {
    const y = 3.3 + row * 0.3;
    const z = -85.1 - row * 1.5;
    box(0, -0.4, z, 73, y + 0.4, 1.525, wood, true);
    for (let x = -35; x <= 35; x += 1.1) {
      if (Math.abs(Math.abs(x) - 12) < 1) continue;
      seats.push({ x, y, z, angle: Math.PI });
    }
  }
  for (const [material, matrices] of batches) {
    const batch = new THREE.InstancedMesh(geometry, material, matrices.length);
    batch.name = "rostrum architecture";
    matrices.forEach((matrix, i) => batch.setMatrixAt(i, matrix));
    batch.instanceMatrix.needsUpdate = true;
    group.add(batch);
  }
  return { solids, seats };
}

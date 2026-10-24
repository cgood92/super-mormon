import * as THREE from "three";
import { disposeHuntingModel } from "./hunting-models";
import { SLING_RADIUS } from "./sling-physics";

export { disposeHuntingModel as disposeSlingModel } from "./hunting-models";
export function createStoneModel(): THREE.Group {
  const group = new THREE.Group();
  group.name = "Sling stone";
  const stone = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.09, 1),
    new THREE.MeshStandardMaterial({ color: 0x777267, roughness: 1 }),
  );
  stone.scale.set(1, 0.85, 1.12);
  stone.castShadow = true;
  group.add(stone);
  return group;
}
/** Ancient two-cord sling. Grip at origin; orbit lies in local XZ plane.
 * Set group.rotation with order YXZ, yaw Y and negative pitch X.
 * Geometry is allocated once; spinning only changes transforms and six vertices.
 */
export function createSlingModel() {
  const group = new THREE.Group();
  group.name = "Two-cord leather pouch sling";
  group.rotation.order = "YXZ";
  const leather = new THREE.MeshStandardMaterial({
    color: 0x795239,
    roughness: 1,
  });
  const pouch = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), leather);
  pouch.scale.set(0.15, 0.045, 0.105);
  group.add(pouch);
  const stone = createStoneModel();
  group.add(stone);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(new Float32Array(12), 3),
  );
  const cords = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({ color: 0xd7bd86 }),
  );
  // Dynamic line bounds would otherwise cull a newly moved pouch incorrectly.
  cords.frustumCulled = false;
  group.add(cords);
  const loop = new THREE.Mesh(
    new THREE.TorusGeometry(0.043, 0.012, 5, 10),
    leather,
  );
  loop.rotation.x = Math.PI / 2;
  group.add(loop);
  const setSpin = (phase: number, loaded = true) => {
    const x = -Math.cos(phase) * SLING_RADIUS,
      z = Math.sin(phase) * SLING_RADIUS;
    pouch.position.set(x, 0, z);
    pouch.rotation.y = -phase;
    stone.position.copy(pouch.position);
    stone.visible = loaded;
    const points = geometry.getAttribute("position") as THREE.BufferAttribute;
    // Two independent cords join opposite sides of the leather pouch.
    points.setXYZ(0, -0.025, 0, 0);
    points.setXYZ(1, x, 0, z - 0.09);
    points.setXYZ(2, 0.025, 0, 0);
    points.setXYZ(3, x, 0, z + 0.09);
    points.needsUpdate = true;
  };
  setSpin(0);
  return {
    group,
    setSpin,
    dispose() {
      disposeHuntingModel(group);
    },
  };
}

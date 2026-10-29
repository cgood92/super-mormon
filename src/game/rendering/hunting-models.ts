import * as THREE from "three";

export function disposeHuntingModel(group: THREE.Group): void {
  const geometries = new Set<THREE.BufferGeometry>(),
    materials = new Set<THREE.Material>();
  group.traverse((o) => {
    if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
      geometries.add(o.geometry);
      for (const m of Array.isArray(o.material) ? o.material : [o.material])
        materials.add(m);
    }
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  group.removeFromParent();
}
function mat(color: number) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.88 });
}
function ellipsoid(
  parent: THREE.Object3D,
  m: THREE.Material,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), m);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}
function tube(
  parent: THREE.Object3D,
  points: THREE.Vector3[],
  radius: number,
  m: THREE.Material,
) {
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points),
      16,
      radius,
      5,
      false,
    ),
    m,
  );
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}
export function createHuntingAnimal(species: "gazelle" | "ibex") {
  const group = new THREE.Group();
  group.name =
    species === "gazelle"
      ? "Arabian gazelle (creative approximation)"
      : "Nubian ibex (creative approximation)";
  const coat = mat(species === "gazelle" ? 0xc6a16a : 0x9c7752),
    cream = mat(0xe8d5ac),
    dark = mat(0x463a2f),
    horn = mat(0x60513b);
  ellipsoid(group, coat, 0, 1, 0, 0.31, 0.38, 0.66);
  ellipsoid(group, cream, 0, 0.9, 0.12, 0.28, 0.22, 0.49);
  const neck = new THREE.Group();
  neck.position.set(0, 1.1, 0.43);
  group.add(neck);
  ellipsoid(neck, coat, 0, 0.22, 0.1, 0.18, 0.39, 0.2);
  const head = new THREE.Group();
  head.position.set(0, 0.48, 0.17);
  neck.add(head);
  ellipsoid(head, coat, 0, 0, 0.08, 0.17, 0.2, 0.27);
  ellipsoid(head, cream, 0, -0.07, 0.27, 0.115, 0.11, 0.15);
  for (const side of [-1, 1]) {
    const ear = ellipsoid(head, coat, side * 0.21, 0.11, 0, 0.16, 0.055, 0.095);
    ear.rotation.z = side * 0.45;
    ellipsoid(head, dark, side * 0.145, 0.04, 0.2, 0.026, 0.032, 0.025);
    const points =
      species === "ibex"
        ? [
            new THREE.Vector3(side * 0.1, 0.13, -0.03),
            new THREE.Vector3(side * 0.16, 0.52, -0.13),
            new THREE.Vector3(side * 0.22, 0.64, -0.42),
            new THREE.Vector3(side * 0.25, 0.48, -0.6),
          ]
        : [
            new THREE.Vector3(side * 0.09, 0.13, 0),
            new THREE.Vector3(side * 0.13, 0.4, -0.07),
            new THREE.Vector3(side * 0.14, 0.65, -0.14),
            new THREE.Vector3(side * 0.12, 0.75, -0.1),
          ];
    tube(head, points, species === "ibex" ? 0.046 : 0.025, horn);
  }
  const legs: THREE.Group[] = [],
    knees: THREE.Group[] = [];
  for (const z of [-0.43, 0.43])
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.21, 0.93, z);
      group.add(leg);
      legs.push(leg);
      ellipsoid(leg, coat, 0, -0.2, 0, 0.075, 0.27, 0.095);
      const knee = new THREE.Group();
      knee.position.y = -0.4;
      leg.add(knee);
      knees.push(knee);
      ellipsoid(knee, coat, 0, -0.22, 0, 0.045, 0.24, 0.045);
      ellipsoid(knee, dark, 0, -0.45, 0.025, 0.058, 0.065, 0.09);
    }
  const tail = ellipsoid(group, cream, 0, 1.08, -0.69, 0.07, 0.08, 0.2);
  tail.rotation.x = -0.6;
  return {
    group,
    animate(time: number, speed: number) {
      const moving = Math.min(1, Math.abs(speed) / 2),
        run = Math.abs(speed) > 3,
        phase = time * (run ? 12 : 7);
      legs.forEach((l, i) => {
        const p = phase + (i === 0 || i === 3 ? 0 : Math.PI);
        l.rotation.x = Math.sin(p) * moving * (run ? 0.8 : 0.45);
        knees[i].rotation.x = Math.max(0, -Math.sin(p)) * 0.65 * moving;
      });
      neck.rotation.x = Math.sin(time * 2) * 0.025 + moving * 0.08;
      head.rotation.y = Math.sin(time * 0.7) * 0.1 * (1 - moving);
      tail.rotation.y = Math.sin(time * 5) * 0.14;
    },
    dispose() {
      disposeHuntingModel(group);
    },
  };
}
/** Grip at origin, bow lies in XY plane; arrow points along local +Z. */
export function createHuntingBow() {
  const group = new THREE.Group(),
    wood = mat(0x795337),
    wrap = mat(0xc9af78);
  group.name = "Curved hunting bow";
  tube(
    group,
    [
      new THREE.Vector3(0, -0.69, 0.13),
      new THREE.Vector3(0, -0.45, -0.09),
      new THREE.Vector3(0, 0, -0.03),
      new THREE.Vector3(0, 0.45, -0.09),
      new THREE.Vector3(0, 0.69, 0.13),
    ],
    0.032,
    wood,
  );
  ellipsoid(group, wrap, 0, 0, -0.03, 0.045, 0.13, 0.045);
  const stringGeometry = new THREE.BufferGeometry();
  stringGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [0, -0.69, 0.13, 0, 0, 0.13, 0, 0.69, 0.13],
      3,
    ),
  );
  const string = new THREE.Line(
    stringGeometry,
    new THREE.LineBasicMaterial({ color: 0xe6d5b3 }),
  );
  group.add(string);
  return {
    group,
    setDraw(charge: number) {
      const p = stringGeometry.getAttribute(
        "position",
      ) as THREE.BufferAttribute;
      p.setZ(1, 0.13 - Math.max(0, Math.min(1, charge)) * 0.53);
      p.needsUpdate = true;
      stringGeometry.computeBoundingSphere();
    },
    dispose() {
      disposeHuntingModel(group);
    },
  };
}
export function createArrowModel(): THREE.Group {
  const group = new THREE.Group();
  group.name = "Hunting arrow";
  const wood = mat(0xad8854),
    stone = mat(0x66645c),
    feather = mat(0xd8d0b4);
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 1.12, 6),
    wood,
  );
  shaft.rotation.x = Math.PI / 2;
  group.add(shaft);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 4), stone);
  tip.rotation.x = Math.PI / 2;
  tip.position.z = 0.64;
  group.add(tip);
  for (let i = 0; i < 3; i++) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.22), feather);
    f.material.side = THREE.DoubleSide;
    f.rotation.set(Math.PI / 2, 0, (i * Math.PI * 2) / 3);
    f.position.z = -0.44;
    group.add(f);
  }
  return group;
}
/** Orient local +Z toward velocity so the arrowhead follows its flight arc. */
export function orientArrowModel(
  group: THREE.Group,
  velocity: THREE.Vector3,
): void {
  if (velocity.lengthSq() > 1e-10)
    group.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      velocity.clone().normalize(),
    );
}

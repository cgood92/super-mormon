import * as THREE from "three";
import type { Solid } from "./physics";

/** The bowl is column-free; foyer connections are the three central south doors. */
export function buildAuditorium(parent: THREE.Group) {
  const group = new THREE.Group();
  group.name = "Conference Center auditorium";
  parent.add(group);
  const solids: Solid[] = [];
  const material = (color: number, roughness = 0.8) =>
    new THREE.MeshStandardMaterial({ color, roughness });
  const cream = material(0xe6dcc9),
    carpet = material(0x7b3436),
    wood = material(0x6d3924),
    gold = material(0xc5a24f, 0.35),
    burgundy = material(0x783039),
    dark = material(0x312522);
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  function box(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    solid = false,
  ) {
    const mesh = new THREE.Mesh(boxGeometry, mat);
    // Carpet lies just above shared structural slabs; collision tops stay exact.
    mesh.position.set(x, y + h / 2 + (mat === carpet ? 0.02 : 0), z);
    mesh.scale.set(w, h, d);
    group.add(mesh);
    if (solid) solids.push({ x, y, z, w, h, d });
    return mesh;
  }
  // Rear cross aisles meet the foyer at precisely the foyer's floor elevations.
  for (const y of [0, 12, 24]) box(0, y - 0.6, -3, 124, 0.6, 6, carpet, true);
  box(-64, 0, -50, 2, 35.5, 100, cream, true);
  box(64, 0, -50, 2, 35.5, 100, cream, true);
  box(0, 0, -99, 128, 35.5, 2, cream, true);
  // Tall pale acoustic bays and the wood base match the reference auditorium.
  for (const side of [-1, 1]) {
    box(side * 62.8, 0, -50, 0.3, 3, 96, wood);
    for (let z = -9; z > -96; z -= 6) {
      box(side * 62.65, 3, z, 0.55, 32, 3.9, cream);
      box(side * 62.3, 5, z + 2.45, 0.3, 29, 0.24, wood);
    }
  }
  type Seat = { x: number; y: number; z: number; angle: number };
  const seats: Seat[] = [];
  // Broad row landings support both the center aisle and every seat row. Fine
  // 30 cm risers prevent jump-only routes with the existing capsule controller.
  function tier(
    base: number,
    rows: number,
    start: number,
    spacing: number,
    rise: number,
    width: number,
    taper: number,
  ) {
    for (let row = 0; row < rows; row++) {
      const z = start - row * spacing,
        y = base + row * rise,
        half = width - row * taper;
      for (const side of [-1, 1])
        box(
          (side * (half + 4)) / 2,
          y - 0.42,
          z,
          half - 4,
          0.42,
          spacing + 0.015,
          carpet,
          true,
        );
      // A broad central processional aisle and two radial side aisles stay clear.
      for (let x = -half + 1; x < half - 1; x += 0.68) {
        if (Math.abs(x) < 4.3 || Math.abs(Math.abs(x) - half * 0.66) < 1.15)
          continue;
        const curve = (2.5 * (x * x)) / (half * half);
        const angle = Math.atan2(x, 100 + z);
        seats.push({ x, y, z: z + curve * 0.13, angle: angle * 0.3 });
      }
      // Row ends receive small warm wood fascia. Seats themselves remain
      // passable so every place can be explored without tens of thousands of colliders.
      if (row % 5 === 0)
        for (const side of [-1, 1])
          box(side * (half - 0.2), y, z, 0.25, 0.7, spacing, wood);
    }
  }
  tier(4.5, 61, -6.55, 1.1, -0.075, 60, 0.35);
  box(0, -0.4, -37, 8, 0.4, 74, carpet, true);
  // Rear lateral stairways join the descending seat terraces to the foyer.
  for (const side of [-1, 1])
    for (let i = 0; i < 15; i++)
      box(side * (4.4 + i * 0.8), i * 0.3, -4.8, 0.81, 0.3, 2.4, carpet, true);
  for (const side of [-1, 1])
    box(side * 18, 4.08, -4.8, 4, 0.42, 2.4, carpet, true);
  // Four fine steps between balcony rows preserve 0.30 m maximum changes.
  function balcony(base: number) {
    for (let i = 0; i < 80; i++) {
      const z = -6.25 - i * 0.5,
        y = base - i * 0.075;
      box(0, y - 0.6, z, 124, 0.6, 0.505, carpet, true);
    }
    // Seating follows the stepped bowl, with a sweeping open front rim.
    for (let row = 0; row < 20; row++) {
      const z = -7 - row * 2,
        y = base - (row * 4 + 2) * 0.075,
        half = 60 - row * 0.36;
      for (let x = -half; x < half; x += 0.68) {
        if (Math.abs(x) < 4.3 || Math.abs(Math.abs(x) - half * 0.66) < 1.15)
          continue;
        seats.push({ x, y, z, angle: Math.atan2(x, 110 + z) * 0.3 });
      }
    }
    box(0, base - 6.525, -46.1, 124, 0.65, 0.5, wood);
    // The cross aisle stays behind a continuous guard at the balcony drop.
    box(0, base - 5.925, -46.1, 124, 1.1, 0.2, cream, true);
  }
  balcony(12);
  balcony(24);
  // The stage is reachable from the center aisle via 30 cm treads.
  for (let i = 0; i < 18; i++)
    box(0, i * 0.3, -60.1 - i * 0.9, 8, 0.3, 0.91, carpet, true);
  box(0, 5.4 - 0.6, -85.9, 92, 0.6, 21, wood, true);
  box(0, 5.4, -80, 8, 1.15, 2.8, wood);
  box(0, 6.55, -79.5, 3.8, 0.18, 1.25, wood);
  box(0, 5.4, -77.6, 1.5, 1.3, 1.1, wood);
  box(0, 6.7, -77.6, 2, 0.16, 1.35, wood);
  // Choir terraces and chairs beneath the characteristic gold pipe facade.
  for (let row = 0; row < 7; row++) {
    const y = 5.4 + row * 0.3,
      z = -84 - row * 1.5;
    box(0, y - 0.3, z, 73, 0.3, 1.5, wood, true);
    for (let x = -35; x <= 35; x += 1.1) seats.push({ x, y, z, angle: 0 });
  }
  box(0, 6, -97.5, 82, 27, 1.1, wood);
  const pipeGeometry = new THREE.CylinderGeometry(0.38, 0.38, 1, 10);
  for (let i = -29; i <= 29; i++) {
    const x = i * 1.12,
      h =
        10 +
        6 * Math.exp(-Math.pow(i / 9, 2)) +
        3 * Math.pow(Math.cos(i * 0.23), 2);
    const pipe = new THREE.Mesh(pipeGeometry, gold);
    pipe.scale.y = h;
    pipe.position.set(x, 14 + h / 2, -96.55);
    group.add(pipe);
    box(x, 13.2, -96.05, 0.5, 0.8, 0.4, gold);
  }
  // Upholstered seats are only three instanced draws, regardless of capacity.
  const transforms = new THREE.Object3D();
  for (const part of [
    { mat: burgundy, w: 0.55, h: 0.54, d: 0.16, dy: 0.79, dz: 0.24 },
    { mat: burgundy, w: 0.55, h: 0.16, d: 0.53, dy: 0.44, dz: 0 },
    { mat: dark, w: 0.08, h: 0.43, d: 0.4, dy: 0.215, dz: 0 },
  ]) {
    const batch = new THREE.InstancedMesh(boxGeometry, part.mat, seats.length);
    batch.name = "auditorium seating";
    seats.forEach((seat, i) => {
      transforms.position.set(seat.x, seat.y + part.dy, seat.z + part.dz);
      transforms.rotation.set(0, seat.angle, 0);
      transforms.scale.set(part.w, part.h, part.d);
      transforms.updateMatrix();
      batch.setMatrixAt(i, transforms.matrix);
    });
    batch.instanceMatrix.needsUpdate = true;
    group.add(batch);
  }
  // Recessed coffer ceiling and luminous slots leave full camera clearance.
  box(0, 33.8, -49, 128, 1, 100, cream);
  const luminous = new THREE.MeshStandardMaterial({
    color: 0xfff3d4,
    emissive: 0xffe2a1,
    emissiveIntensity: 0.65,
  });
  for (let z = -12; z > -95; z -= 12)
    for (let x = -48; x <= 48; x += 16) {
      box(x, 33.5, z, 12, 0.15, 7, wood);
      box(x, 33.35, z, 10, 0.15, 5, luminous);
    }
  for (const z of [-20, -55, -86]) {
    const light = new THREE.PointLight(0xffe7c5, 120, 100, 1.2);
    light.position.set(0, 31, z);
    group.add(light);
  }
  // Batch repeated architectural boxes and organ pipes as well as chairs.
  const architecture = new Map<string, THREE.Mesh[]>();
  for (const child of [...group.children])
    if (
      child instanceof THREE.Mesh &&
      !(child instanceof THREE.InstancedMesh)
    ) {
      const key =
        child.geometry.uuid + String((child.material as THREE.Material).uuid);
      const members = architecture.get(key) ?? [];
      members.push(child);
      architecture.set(key, members);
    }
  for (const members of architecture.values()) {
    const first = members[0];
    const batch = new THREE.InstancedMesh(
      first.geometry,
      first.material,
      members.length,
    );
    members.forEach((member, i) => {
      member.updateMatrix();
      batch.setMatrixAt(i, member.matrix);
      group.remove(member);
    });
    batch.instanceMatrix.needsUpdate = true;
    group.add(batch);
  }
  group.userData.seatCount = seats.length;
  return {
    solids,
    landmarks: [
      { name: "Conference Center pulpit", x: 0, y: 5.4, z: -76 },
      { name: "Balcony", x: 0, y: 6.075, z: -45 },
      { name: "Upper balcony", x: 0, y: 18.075, z: -45 },
    ],
  };
}

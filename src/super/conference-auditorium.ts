import { softBoxGeometry, softSeatBackGeometry } from "./soft-geometry";
import * as THREE from "three";
import type { Solid } from "./physics";
import { buildRostrum } from "./conference-rostrum";

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
    wood = material(0x97552e),
    gold = material(0xc5a24f, 0.35),
    burgundy = material(0x63382f),
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
    const mesh = new THREE.Mesh(
      mat === carpet ? boxGeometry : softBoxGeometry(w, h, d),
      mat,
    );
    // Carpet lies just above shared structural slabs; collision tops stay exact.
    mesh.position.set(x, y + h / 2 + (mat === carpet ? 0.02 : 0), z);
    mesh.scale.set(w, h, d);
    group.add(mesh);
    if (solid) solids.push({ x, y, z, w, h, d });
    return mesh;
  }
  // Cover exposed foundation between the seating banks, outer aisles and stage.
  // This thin finish stays below the existing carpet tops at y=0.02.
  const carpetBase = new THREE.Mesh(new THREE.PlaneGeometry(126, 98), carpet);
  carpetBase.name = "auditorium continuous carpet";
  carpetBase.rotation.x = -Math.PI / 2;
  carpetBase.position.set(0, 0.005, -49);
  group.add(carpetBase);
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
      // The seating banks are filled to the foundation, never floating treads.
      for (const side of [-1, 1]) {
        // Exact symmetric 8 m aisle boundary; no segment can protrude into it.
        for (let edge = 4; edge < half; edge += 4) {
          const width = Math.min(4, half - edge);
          const x = side * (edge + width / 2);
          const curve = (-9 * (x / 60) ** 2 * row) / (rows - 1);
          box(
            x,
            -0.4,
            z + curve,
            width + 0.015,
            y + 0.4,
            spacing + 0.025,
            carpet,
            true,
          );
        }
      }
      box(0, -0.4, z, 8, y + 0.4, spacing + 0.025, carpet, true);
      // A broad central processional aisle and two radial side aisles stay clear.
      for (let x = -half + 1; x < half - 1; x += 0.68) {
        if (Math.abs(x) < 4.3 || Math.abs(Math.abs(x) - half * 0.66) < 1.15)
          continue;
        const curve = (-9 * (x / 60) ** 2 * row) / (rows - 1);
        const seatZ = z + curve;
        const angle = Math.atan2(x, 90 + z);
        // Include the rotated cushion and offset back in the stair clearance.
        // Only audience seats are filtered; the continuous row slabs stay intact.
        const extentX =
          0.275 * Math.abs(Math.cos(angle)) + 0.32 * Math.abs(Math.sin(angle));
        const extentZ =
          0.275 * Math.abs(Math.sin(angle)) + 0.32 * Math.abs(Math.cos(angle));
        if (
          Math.abs(Math.abs(x) - 25) <= 3.5 + extentX &&
          seatZ + extentZ >= -80.5 &&
          seatZ - extentZ <= -69
        )
          continue;
        seats.push({ x, y, z: seatZ, angle });
      }
      // Row ends receive small warm wood fascia. Seats themselves remain
      // passable so every place can be explored without tens of thousands of colliders.
      if (row % 5 === 0)
        for (const side of [-1, 1])
          box(side * (half - 0.2), y, z, 0.25, 0.7, spacing, wood);
    }
  }
  tier(2.4, 61, -13.55, 0.95, -0.04, 60, 0.35);
  // The full rear cross aisle rises gently into the bowl; the processional aisle
  // follows exactly the same rake as adjacent seats rather than forming a trench.
  for (let i = 0; i < 8; i++)
    box(0, -0.4, -6.4 - i * 0.9, 124, (i + 1) * 0.3 + 0.4, 0.925, carpet, true);
  // Four fine steps between balcony rows preserve 0.30 m maximum changes.
  function balcony(base: number) {
    const underside = base - 7.2;
    // A continuous structural underside carries the raked deck. Short AABB
    // segments follow the fan while keeping all collision faces sealed.
    for (let x = -60; x <= 60; x += 4) {
      for (let i = 0; i < 80; i++) {
        const curve = (-10 * (x / 62) ** 2 * i) / 79;
        const z = -6.25 - i * 0.5 + curve;
        const y = base - i * 0.075;
        const depth = 0.5 + (10 * (x / 62) ** 2) / 79 + 0.025;
        box(x, underside, z, 4.025, y - underside, depth, carpet, true);
      }
      const curve = -10 * (x / 62) ** 2;
      const front = -46.1 + curve;
      box(
        x,
        underside - 0.12,
        (-6 + front) / 2,
        4.025,
        0.12,
        -6 - front,
        cream,
        true,
      );
      // Keep the sealed AABB guards independent of the visible curved skin.
      solids.push(
        { x, y: base - 5.925, z: front, w: 4.025, h: 1.1, d: 0.6 },
        { x, y: underside, z: front, w: 4.025, h: 1.275, d: 0.6 },
      );
    }
    // One continuous footprint removes overlapping segment end faces. Each
    // material owns a separate height band, so cream cannot fight the wood
    // for the same depth-buffer pixels along the front and back surfaces.
    const outline = new THREE.Shape();
    // Flat runs follow each original deck segment. Short bevels join them
    // inside the shared 2.5 cm seam rather than overlapping entire box faces.
    const edge: Array<[number, number]> = [];
    for (let x = -60; x <= 60; x += 4) {
      const front = -46.1 - 10 * (x / 62) ** 2;
      edge.push(
        [x - (x === -60 ? 2 : 1.9875), front],
        [x + (x === 60 ? 2 : 1.9875), front],
      );
    }
    edge.forEach(([x, front], i) => {
      if (i === 0) outline.moveTo(x, front - 0.3);
      else outline.lineTo(x, front - 0.3);
    });
    for (const [x, front] of [...edge].reverse())
      outline.lineTo(x, front + 0.3);
    outline.closePath();
    for (const [bottom, height, mat] of [
      [underside, 0.675, cream],
      [base - 6.525, 0.6, wood],
      [base - 5.925, 1.1, cream],
    ] as const) {
      const geometry = new THREE.ExtrudeGeometry(outline, {
        depth: height,
        bevelEnabled: false,
        steps: 1,
      });
      geometry.rotateX(Math.PI / 2);
      geometry.translate(0, bottom + height, 0);
      group.add(new THREE.Mesh(geometry, mat));
    }
    for (let row = 0; row < 20; row++) {
      const centerZ = -7 - row * 2;
      const y = base - (row * 4 + 2) * 0.075;
      const half = 60 - row * 0.36;
      for (let x = -half; x < half; x += 0.8) {
        if (Math.abs(x) < 4.3 || Math.abs(Math.abs(x) - half * 0.66) < 1.15)
          continue;
        const z = centerZ - (10 * (x / 62) ** 2 * (row * 4 + 2)) / 79;
        seats.push({ x, y, z, angle: Math.atan2(x, 90 + z) });
      }
    }
  }

  balcony(12);
  balcony(24);
  const rostrum = buildRostrum(group);
  solids.push(...rostrum.solids);
  seats.push(...rostrum.seats);
  for (const side of [-1, 1]) {
    box(side * 47, 15, -97.1, 18, 11, 0.8, cream);
    box(side * 47, 15.6, -96.6, 16, 9.8, 0.1, material(0xeeeade));
  }
  const blue = material(0x566c91);
  box(0, 10, -97.7, 100, 23, 0.7, blue);
  const pipeGeometry = new THREE.CylinderGeometry(0.24, 0.24, 1, 8);
  // Three tall pipe towers in a stepped walnut case, with lower side wings.
  for (const [cx, width, top] of [
    [-28, 13, 25],
    [-15, 12, 29],
    [0, 16, 33],
    [15, 12, 29],
    [28, 13, 25],
  ]) {
    box(cx, 12, -96.6, width, top - 12, 1.8, wood);
    box(cx, top - 0.5, -95.9, width + 0.7, 0.65, 2.4, wood);
    for (const side of [-1, 1])
      box(cx + (side * width) / 2, 12, -95.4, 0.65, top - 12, 1.1, wood);
    for (let j = -5; j <= 5; j++) {
      const h = top - 14 - Math.abs(j) * 0.7;
      const pipe = new THREE.Mesh(pipeGeometry, gold);
      pipe.scale.y = h;
      pipe.position.set(cx + (j * width) / 13, 13 + h / 2, -95.3);
      group.add(pipe);
    }
  }
  // Upholstered seats are only three instanced draws, regardless of capacity.
  const transforms = new THREE.Object3D();
  for (const part of [
    { mat: burgundy, w: 0.55, h: 0.54, d: 0.16, dy: 0.79, dz: 0.24 },
    { mat: burgundy, w: 0.55, h: 0.16, d: 0.53, dy: 0.44, dz: 0 },
    { mat: dark, w: 0.08, h: 0.43, d: 0.4, dy: 0.215, dz: 0 },
  ]) {
    const batch = new THREE.InstancedMesh(
      part.h > 0.5 ? softSeatBackGeometry() : boxGeometry,
      part.mat,
      seats.length,
    );
    batch.name = "auditorium seating";
    seats.forEach((seat, i) => {
      transforms.position.set(
        seat.x + Math.sin(seat.angle) * part.dz,
        seat.y + part.dy,
        seat.z + Math.cos(seat.angle) * part.dz,
      );
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
  // Broad concentric wood ribs sweep across the ceiling above the fan.
  for (let row = 0; row < 8; row++) {
    for (let x = -60; x <= 60; x += 4) {
      const z = -9 - row * 10 - 12 * (x / 62) ** 2;
      if (z < -97) continue;
      box(x, 32.6, z, 4.15, 0.95, 1.3, cream);
      box(x, 32.55, z + 0.9, 3.2, 0.12, 0.35, luminous);
    }
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
  group.userData.reference =
    "https://newsroom.churchofjesuschrist.org/media/orig/orig_auditorium_right_hr.jpg";
  group.userData.seatCount = seats.length;
  return {
    solids,
    landmarks: [
      { name: "Conference Center pulpit", x: 0, y: 2.4, z: -81 },
      { name: "Balcony", x: 0, y: 6.075, z: -45 },
      { name: "Upper balcony", x: 0, y: 18.075, z: -45 },
    ],
  };
}

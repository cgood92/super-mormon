import * as T from "three";
import type { Solid } from "./physics";

/** Interpretive landscape inspired by OLIN's native mountain meadow and terraces. */
export function buildRooftop(parent: T.Group): {
  solids: Solid[];
  landmarks: { name: string; x: number; y: number; z: number }[];
} {
  const group = new T.Group();
  group.name = "Conference Center rooftop gardens";
  parent.add(group);
  const solids: Solid[] = [];
  const stone = new T.MeshStandardMaterial({
    color: 0xa6a49c,
    roughness: 0.92,
  });
  const paving = new T.MeshStandardMaterial({
    color: 0xc7c4b8,
    roughness: 0.9,
  });
  const soil = new T.MeshStandardMaterial({ color: 0x6c7953, roughness: 1 });
  const water = new T.MeshStandardMaterial({
    color: 0x5c9aab,
    transparent: true,
    opacity: 0.78,
    roughness: 0.22,
    metalness: 0.2,
  });
  const glass = new T.MeshStandardMaterial({
    color: 0x97b7c0,
    transparent: true,
    opacity: 0.65,
    roughness: 0.18,
    metalness: 0.25,
  });
  const trunk = new T.MeshStandardMaterial({ color: 0x62594a, roughness: 1 });
  const pine = new T.MeshStandardMaterial({ color: 0x344f43, roughness: 1 });
  const leaf = new T.MeshStandardMaterial({ color: 0x829063, roughness: 1 });
  const meadow = new T.MeshStandardMaterial({ color: 0xa6ab78, roughness: 1 });
  function box(
    name: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    mat: T.Material,
    solid = false,
  ) {
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    group.add(mesh);
    if (solid) solids.push({ x, y: y - h / 2, z, w, h, d });
    return mesh;
  }
  // Slab is split around the escalator shaft, which the hub supplies and guards.
  box("west roof support", -76.5, 35.8, -25, 27, 0.4, 160, stone, true);
  box("east roof support", 20.5, 35.8, -25, 139, 0.4, 160, stone, true);
  box("north roof support", -56, 35.8, -52.5, 14, 0.4, 105, stone, true);
  box("south roof support", -56, 35.8, 47.5, 14, 0.4, 15, stone, true);
  box("arrival granite promenade", -56, 36.03, -3, 35, 0.06, 6, paving);
  // Broad orthogonal promenades leave room for children to run around the gardens.
  for (const x of [-72, -36, 0, 36, 72])
    box("granite north south promenade", x, 36.025, -25, 7, 0.05, 154, paving);
  for (const z of [-92, -58, -24, 12, 43]) {
    box("long granite promenade", 18, 36.03, z, 140, 0.06, 7, paving);
    box("west promenade", -76, 36.03, z, 20, 0.06, 7, paving);
  }
  // Continuous high perimeter parapets keep every accessible edge safe.
  box("north granite parapet", 0, 37.6, -104.5, 180, 3.2, 1, stone, true);
  box("south granite parapet", 0, 37.6, 54.5, 180, 3.2, 1, stone, true);
  for (const x of [-89.5, 89.5])
    box("side granite parapet", x, 37.6, -25, 1, 3.2, 160, stone, true);
  for (const x of [-31, 5, 41])
    for (const z of [-75, -41, -7]) {
      box("skylight granite curb", x, 36.18, z, 13, 0.36, 9, stone, true);
      box("sealed rectangular skylight", x, 36.39, z, 12, 0.08, 8, glass);
      for (const dx of [-4, 0, 4])
        box("skylight mullion", x + dx, 36.45, z, 0.13, 0.1, 8, stone);
    }
  const trees: { x: number; z: number; conifer: boolean; scale: number }[] = [];
  // Linear mountain plantings match the long horizontal planters in the reference.
  for (const x of [-79, -47, 56, 79])
    for (const z of [-78, -44, -10, 27]) {
      if (x === -47 && z === 27) continue;
      box("native meadow planter", x, 36.18, z, 12, 0.36, 21, stone, true);
      box("native meadow soil", x, 36.39, z, 11, 0.08, 20, soil);
      for (let n = 0; n < 3; n++)
        trees.push({
          x: x + (n % 2 ? 2.6 : -2.5),
          z: z - 6 + n * 6,
          conifer: (n + Math.round(x)) % 2 === 0,
          scale: 0.8 + ((n + 4) % 3) * 0.14,
        });
    }
  const matrix = new T.Matrix4(),
    q = new T.Quaternion();
  function instances(
    name: string,
    geometry: T.BufferGeometry,
    mat: T.Material,
    poses: {
      x: number;
      y: number;
      z: number;
      sx: number;
      sy: number;
      sz: number;
    }[],
  ) {
    const mesh = new T.InstancedMesh(geometry, mat, poses.length);
    mesh.name = name;
    poses.forEach((p, i) => {
      matrix.compose(
        new T.Vector3(p.x, p.y, p.z),
        q,
        new T.Vector3(p.sx, p.sy, p.sz),
      );
      mesh.setMatrixAt(i, matrix);
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  instances(
    "native grove trunks",
    new T.CylinderGeometry(0.22, 0.32, 1, 7),
    trunk,
    trees.map((t) => ({
      x: t.x,
      y: 38.5,
      z: t.z,
      sx: t.scale,
      sy: 4.3 * t.scale,
      sz: t.scale,
    })),
  );
  trees.forEach((t) =>
    solids.push({ x: t.x, y: 36.4, z: t.z, w: 0.6, h: 4.5, d: 0.6 }),
  );
  const conifers = trees.filter((t) => t.conifer),
    deciduous = trees.filter((t) => !t.conifer);
  instances(
    "alpine conifer canopies",
    new T.ConeGeometry(1, 1, 8),
    pine,
    conifers.flatMap((t) =>
      [0, 1, 2].map((n) => ({
        x: t.x,
        y: 39 + n * 1.5 * t.scale,
        z: t.z,
        sx: (2.8 - n * 0.6) * t.scale,
        sy: 4 * t.scale,
        sz: (2.8 - n * 0.6) * t.scale,
      })),
    ),
  );
  instances(
    "native deciduous canopies",
    new T.IcosahedronGeometry(1, 1),
    leaf,
    deciduous.map((t) => ({
      x: t.x,
      y: 41 * t.scale + (1 - t.scale) * 36,
      z: t.z,
      sx: 3 * t.scale,
      sy: 3.6 * t.scale,
      sz: 2.7 * t.scale,
    })),
  );
  instances(
    "alpine meadow grasses",
    new T.ConeGeometry(0.14, 0.65, 4),
    meadow,
    trees.flatMap((t, i) =>
      Array.from({ length: 14 }, (_, n) => ({
        x: t.x + Math.sin(n * 2.4 + i) * 4.5,
        y: 36.7,
        z: t.z + Math.cos(n * 1.7) * 3,
        sx: 1,
        sy: 0.7 + (n % 3) * 0.3,
        sz: 1,
      })),
    ),
  );
  for (const [x, z] of [
    [16, 27],
    [16, -92],
  ]) {
    box("fountain stone basin", x, 36.22, z, 19, 0.44, 10, stone, true);
    box("fountain still water", x, 36.47, z, 17, 0.08, 8, water);
    for (const dx of [-5, 0, 5]) {
      const jet = new T.Mesh(new T.CylinderGeometry(0.07, 0.16, 2.2, 7), water);
      jet.name = "fountain water jet";
      jet.position.set(x + dx, 37.55, z);
      group.add(jet);
    }
  }
  // Water descends outside the guarded roof to stepped horizontal terraces.
  for (const side of [-1, 1])
    for (let level = 0; level < 3; level++) {
      const x = side * (88 + level * 2),
        y = 31 - level * 6;
      box("exterior planted granite terrace", x, y, -30, 8, 1, 70, stone);
      box("terrace water basin", x, y + 0.55, -30, 6, 0.1, 24, water);
      box("terrace cascade", x + side * 2, y + 3, -30, 0.16, 5.8, 12, water);
    }
  // Distant context is scenery only: a low city beneath a layered mountain skyline.
  const cityMat = new T.MeshStandardMaterial({ color: 0x9ca7aa, roughness: 1 });
  for (let i = 0; i < 25; i++)
    box(
      "distant urban skyline",
      -200 + i * 17,
      4 + (i % 5) * 2,
      -180,
      9,
      15 + (i % 5) * 4,
      10,
      cityMat,
    );
  const mountainMat = new T.MeshStandardMaterial({
    color: 0x768a98,
    roughness: 1,
  });
  for (let i = 0; i < 12; i++) {
    const mountain = new T.Mesh(
      new T.ConeGeometry(65, 65 + (i % 4) * 15, 4),
      mountainMat,
    );
    mountain.name = "Wasatch mountain backdrop";
    mountain.position.set(-300 + i * 56, 21, -280 - (i % 3) * 20);
    mountain.rotation.y = 0.4;
    group.add(mountain);
  }
  return {
    solids,
    landmarks: [
      { name: "Rooftop arrival", x: -56, y: 36, z: 0 },
      { name: "South fountain", x: 16, y: 36, z: 19 },
      { name: "North source fountain", x: 16, y: 36, z: -84 },
      { name: "Mountain overlook", x: 72, y: 36, z: -96 },
      { name: "Alpine meadow", x: 56, y: 36, z: -58 },
    ],
  };
}

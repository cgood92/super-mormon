import * as THREE from "three";

type Point = [number, number];
type Rectangle = [number, number, number, number];

/** Clip the decorative tile finish to the slab footprint, including partial tiles. */
function clip(polygon: Point[], axis: 0 | 1, edge: number, greater: boolean) {
  const result: Point[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!,
      b = polygon[(i + 1) % polygon.length]!;
    const insideA = greater ? a[axis] >= edge : a[axis] <= edge;
    const insideB = greater ? b[axis] >= edge : b[axis] <= edge;
    if (insideA) result.push(a);
    if (insideA !== insideB) {
      const t = (edge - a[axis]) / (b[axis] - a[axis]);
      result.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    }
  }
  return result;
}

export function tileFloor(group: THREE.Group, y: number, upper: boolean) {
  // Disjoint regions avoid duplicate coplanar surfaces at landing joins.
  // The finish is decorative: the structural slabs own physical support.
  const regions: Rectangle[] = [
    [-88, -67, upper ? -100 : -102, 1],
    [67, 88, upper ? -100 : -102, 1],
    [-88, 88, 40, 53],
    ...(upper
      ? ([
          [-88, 88, 1, 6],
          [-88, -62, 6, 40],
          [-50, 50, 6, 40],
          [62, 88, 6, 40],
        ] as Rectangle[])
      : ([[-88, 88, 1, 40]] as Rectangle[])),
  ];
  const positions: number[][] = [[], []];
  const radius = 2.75 / Math.SQRT2;
  for (let a = -60; a <= 60; a++) {
    for (let b = -60; b <= 60; b++) {
      const x = (a - b) * radius,
        z = (a + b) * radius;
      for (const [minX, maxX, minZ, maxZ] of regions) {
        if (
          x + radius <= minX ||
          x - radius >= maxX ||
          z + radius <= minZ ||
          z - radius >= maxZ
        )
          continue;
        let polygon: Point[] = [
          [x - radius, z],
          [x, z + radius],
          [x + radius, z],
          [x, z - radius],
        ];
        polygon = clip(polygon, 0, minX, true);
        polygon = clip(polygon, 0, maxX, false);
        polygon = clip(polygon, 1, minZ, true);
        polygon = clip(polygon, 1, maxZ, false);
        for (let i = 1; i + 1 < polygon.length; i++) {
          const p = polygon[0]!,
            q = polygon[i]!,
            r = polygon[i + 1]!;
          if (
            Math.abs(
              (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]),
            ) < 1e-9
          )
            continue;
          for (const point of [p, q, r])
            positions[(a + b) & 1]!.push(point[0], y + 0.0425, point[1]);
        }
      }
    }
  }
  for (let shade = 0; shade < 2; shade++) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions[shade]!, 3),
    );
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: shade ? 0xb5ad9c : 0xe7e1d2,
        roughness: 0.34,
        metalness: 0.06,
      }),
    );
    mesh.name = "diagonal polished limestone checkerboard";
    mesh.receiveShadow = true;
    group.add(mesh);
  }
}

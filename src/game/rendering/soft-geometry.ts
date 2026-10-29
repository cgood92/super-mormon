import * as T from "three";
import { ConvexGeometry } from "three/addons/geometries/ConvexGeometry.js";

const boxes = new Map<string, T.BufferGeometry>();
/** A 44-triangle chamfer, shared by dimension profile; exact outer bounds remain unchanged. */
export function softBoxGeometry(
  w: number,
  h: number,
  d: number,
  name = "",
): T.BufferGeometry {
  const flat =
    h <= 0.16 ||
    (h <= 0.65 && w > h * 2 && d > h * 2) ||
    /floor|stair|tread|landing|slab|ground|carpet|ramp|deck|paving|trail|summit|platform|foundation|ceiling|boardwalk|causeway/i.test(
      name,
    );
  const radius = Math.min(0.18, Math.min(w, h, d) * 0.18);
  const bevel = flat
    ? [0, 0, 0]
    : [w, h, d].map((v) =>
        Math.max(0.0025, Math.round(radius / v / 0.0025) * 0.0025),
      );
  const key = bevel.join(":");
  let geometry = boxes.get(key);
  if (!geometry) {
    if (flat) geometry = new T.BoxGeometry(1, 1, 1);
    else {
      const points: T.Vector3[] = [];
      for (let axis = 0; axis < 3; axis++)
        for (const x of [-1, 1])
          for (const y of [-1, 1])
            for (const z of [-1, 1]) {
              const p = new T.Vector3(
                x * (0.5 - bevel[0]),
                y * (0.5 - bevel[1]),
                z * (0.5 - bevel[2]),
              );
              p.setComponent(axis, [x, y, z][axis] * 0.5);
              points.push(p);
            }
      geometry = new ConvexGeometry(points);
    }
    geometry.userData.softConstruction = !flat;
    boxes.set(key, geometry);
    geometry.addEventListener("dispose", () => {
      if (boxes.get(key) === geometry) boxes.delete(key);
    });
  }
  return geometry;
}

/** Rounded, faceted skyline; no square pyramid silhouettes. Unit bottom is y=0. */
export function mountainGeometry(seed = 0): T.BufferGeometry {
  const geometry = new T.SphereGeometry(
    1,
    12,
    7,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2,
  );
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    const ripple = 1 + 0.07 * Math.sin(Math.atan2(z, x) * 3 + seed) * (1 - y);
    p.setXYZ(i, x * ripple, y, z * ripple);
  }
  geometry.computeVertexNormals();
  return geometry;
}

let seatBack: T.BufferGeometry | undefined;
/** Six-point upholstered back silhouette, only 20 triangles for distant seating. */
export function softSeatBackGeometry(): T.BufferGeometry {
  if (!seatBack) {
    const outline = [
      [-0.5, -0.5],
      [0.5, -0.5],
      [0.5, 0.3],
      [0.34, 0.5],
      [-0.34, 0.5],
      [-0.5, 0.3],
    ];
    seatBack = new ConvexGeometry(
      outline.flatMap(([x, y]) =>
        [-0.5, 0.5].map((z) => new T.Vector3(x, y, z)),
      ),
    );
    seatBack.addEventListener("dispose", () => {
      seatBack = undefined;
    });
  }
  return seatBack;
}

/** A folded, arching leaf ribbon rather than a pointed solid cone. */
export function palmFrondGeometry(): T.BufferGeometry {
  const vertices: number[] = [];
  for (let i = 0; i < 5; i++) {
    const leafPoint = (t: number, side: number) =>
      new T.Vector3(
        side * 0.45 * Math.sin(t * Math.PI),
        0.5 * Math.sin(t * Math.PI) - 0.42 * t,
        3.3 * t,
      );
    const a = leafPoint(i / 5, -1),
      b = leafPoint(i / 5, 1),
      c = leafPoint((i + 1) / 5, 1),
      d = leafPoint((i + 1) / 5, -1);
    vertices.push(
      ...a.toArray(),
      ...c.toArray(),
      ...b.toArray(),
      ...a.toArray(),
      ...d.toArray(),
      ...c.toArray(),
    );
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
  g.computeVertexNormals();
  return g;
}

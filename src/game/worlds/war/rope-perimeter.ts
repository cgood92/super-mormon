/** Ground-plane geometry for the six-post rope challenge. */
export type Point2 = { x: number; z: number };
const EPSILON = 1e-8;
const finite = (p: Point2) => Number.isFinite(p.x) && Number.isFinite(p.z);
const cross = (a: Point2, b: Point2, c: Point2) =>
  (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
const onSegment = (p: Point2, a: Point2, b: Point2) =>
  Math.abs(cross(a, b, p)) <= EPSILON &&
  p.x >= Math.min(a.x, b.x) - EPSILON &&
  p.x <= Math.max(a.x, b.x) + EPSILON &&
  p.z >= Math.min(a.z, b.z) - EPSILON &&
  p.z <= Math.max(a.z, b.z) + EPSILON;

function segmentsIntersect(
  a: Point2,
  b: Point2,
  c: Point2,
  d: Point2,
): boolean {
  if (
    onSegment(a, c, d) ||
    onSegment(b, c, d) ||
    onSegment(c, a, b) ||
    onSegment(d, a, b)
  )
    return true;
  const abC = cross(a, b, c),
    abD = cross(a, b, d),
    cdA = cross(c, d, a),
    cdB = cross(c, d, b);
  return (
    ((abC > EPSILON && abD < -EPSILON) || (abC < -EPSILON && abD > EPSILON)) &&
    ((cdA > EPSILON && cdB < -EPSILON) || (cdA < -EPSILON && cdB > EPSILON))
  );
}

/** Even/odd containment supports concave rings; a point on a rope counts inside. */
export function pointInRopeRing(
  point: Point2,
  posts: readonly Point2[],
): boolean {
  if (posts.length < 3 || !finite(point) || !posts.every(finite)) return false;
  let inside = false;
  for (let i = 0, j = posts.length - 1; i < posts.length; j = i++) {
    const a = posts[j],
      b = posts[i];
    if (onSegment(point, a, b)) return true;
    if (
      a.z > point.z !== b.z > point.z &&
      point.x < a.x + ((point.z - a.z) * (b.x - a.x)) / (b.z - a.z)
    )
      inside = !inside;
  }
  return inside;
}

/** Sweep each movement segment so a fast enemy cannot tunnel through a rope.
 * During placement, only already-connected spans block; the final gap stays open.
 */
export function ropeBlocksMove(
  from: Point2,
  to: Point2,
  posts: readonly Point2[],
  closed: boolean,
): boolean {
  if (posts.length < 2 || !finite(from) || !finite(to) || !posts.every(finite))
    return false;
  const count = closed ? posts.length : posts.length - 1;
  for (let i = 0; i < count; i++)
    if (segmentsIntersect(from, to, posts[i], posts[(i + 1) % posts.length]))
      return true;
  return false;
}

/** Six posts must form one uncrossed perimeter, with at least a metre per span. */
export function validRopeRing(posts: readonly Point2[]): boolean {
  if (posts.length !== 6 || !posts.every(finite)) return false;
  let area = 0;
  for (let i = 0; i < posts.length; i++) {
    const a = posts[i],
      b = posts[(i + 1) % posts.length],
      c = posts[(i + 2) % posts.length];
    if (Math.hypot(a.x - b.x, a.z - b.z) < 1 - EPSILON) return false;
    // Straight-through collinear posts are fine; doubling back overlaps a span.
    if (
      Math.abs(cross(a, b, c)) <= EPSILON &&
      (a.x - b.x) * (c.x - b.x) + (a.z - b.z) * (c.z - b.z) > EPSILON
    )
      return false;
    area += a.x * b.z - b.x * a.z;
    for (let j = i + 1; j < posts.length; j++) {
      if (j === i + 1 || (i === 0 && j === posts.length - 1)) continue;
      if (segmentsIntersect(a, b, posts[j], posts[(j + 1) % posts.length]))
        return false;
    }
  }
  return Math.abs(area) > EPSILON;
}

export function ropeRingContainsAll(
  posts: readonly Point2[],
  enemies: readonly Point2[],
): boolean {
  return (
    validRopeRing(posts) &&
    enemies.every((enemy) => pointInRopeRing(enemy, posts))
  );
}

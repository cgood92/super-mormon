import type { BufferAttribute, BufferGeometry } from "three";

/** Keep duplicated marching-cubes vertices smooth after cloth deformation. */
export function createClothNormalUpdater(geometry: BufferGeometry): () => void {
  const positions = geometry.getAttribute("position");
  const groups = new Uint32Array(positions.count);
  const coincident = new Map<string, number>();
  for (let i = 0; i < positions.count; i++) {
    const key = `${Math.round(positions.getX(i) * 1e5)},${Math.round(positions.getY(i) * 1e5)},${Math.round(positions.getZ(i) * 1e5)}`;
    let group = coincident.get(key);
    if (group === undefined) {
      group = coincident.size;
      coincident.set(key, group);
    }
    groups[i] = group;
  }
  if (coincident.size === positions.count)
    return () => geometry.computeVertexNormals();
  const sums = new Float32Array(coincident.size * 3);
  return () => {
    geometry.computeVertexNormals();
    const normals = geometry.getAttribute("normal") as BufferAttribute;
    sums.fill(0);
    for (let i = 0; i < positions.count; i++) {
      const offset = groups[i] * 3;
      sums[offset] += normals.getX(i);
      sums[offset + 1] += normals.getY(i);
      sums[offset + 2] += normals.getZ(i);
    }
    for (let i = 0; i < sums.length; i += 3) {
      const length = Math.hypot(sums[i], sums[i + 1], sums[i + 2]) || 1;
      sums[i] /= length;
      sums[i + 1] /= length;
      sums[i + 2] /= length;
    }
    for (let i = 0; i < positions.count; i++) {
      const offset = groups[i] * 3;
      normals.setXYZ(i, sums[offset], sums[offset + 1], sums[offset + 2]);
    }
    normals.needsUpdate = true;
  };
}

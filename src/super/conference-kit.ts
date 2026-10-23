import { softBoxGeometry } from "./soft-geometry";
import * as THREE from "three";
import type { Solid } from "./worlds";
export type ConferenceBuild = {
  solids: Solid[];
  landmarks?: { name: string; x: number; y: number; z: number }[];
};
export const conferencePalette = {
  stone: 0xe4dfd0,
  pale: 0xf2ecdc,
  timber: 0x845034,
  bronze: 0xa28351,
  mullion: 0x252e30,
  carpet: 0x713c40,
};
/** Shared materials and box geometry keep the large building inexpensive. y is the base. */
export function conferenceKit(group: THREE.Group) {
  const solids: Solid[] = [];
  const materials = new Map<number, THREE.MeshStandardMaterial>();
  const decor = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: number,
    name = "",
  ) => {
    let material = materials.get(color);
    if (!material) {
      material = new THREE.MeshStandardMaterial({ color, roughness: 0.72 });
      materials.set(color, material);
    }
    const mesh = new THREE.Mesh(softBoxGeometry(w, h, d, name), material);
    mesh.position.set(x, y + h / 2, z);
    mesh.scale.set(w, h, d);
    mesh.name = name;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const add = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: number,
    name = "",
  ) => {
    solids.push({ x, y, z, w, h, d });
    return decor(x, y, z, w, h, d, color, name);
  };
  const batch = () => {
    for (const material of materials.values()) {
      const byGeometry = new Map<THREE.BufferGeometry, THREE.Mesh[]>();
      for (const child of group.children)
        if (
          child instanceof THREE.Mesh &&
          !(child instanceof THREE.InstancedMesh) &&
          child.material === material
        ) {
          const list = byGeometry.get(child.geometry) ?? [];
          list.push(child);
          byGeometry.set(child.geometry, list);
        }
      for (const [shape, meshes] of byGeometry) {
        const instances = new THREE.InstancedMesh(
          shape,
          material,
          meshes.length,
        );
        instances.name = "Conference Center stonework, windows and woodwork";
        instances.receiveShadow = true;
        meshes.forEach((mesh, index) => {
          mesh.updateMatrix();
          instances.setMatrixAt(index, mesh.matrix);
          group.remove(mesh);
        });
        group.add(instances);
      }
    }
  };
  return { add, decor, solids, batch };
}
export function disposeConference(group: THREE.Group) {
  const geometries = new Set<THREE.BufferGeometry>(),
    materials = new Set<THREE.Material>(),
    textures = new Set<THREE.Texture>();
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material)
        ? object.material
        : [object.material]) {
        materials.add(material);
        for (const value of Object.values(material))
          if (value instanceof THREE.Texture) textures.add(value);
      }
      if (object instanceof THREE.InstancedMesh) object.dispose();
    }
    if (object instanceof THREE.Light) object.dispose();
  });
  for (const texture of textures) texture.dispose();
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();
  group.removeFromParent();
}

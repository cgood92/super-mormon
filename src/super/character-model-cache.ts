import * as T from "three";
import {
  buildSculptedCharacter,
  type SculptedCharacterRole,
  type SculptedCharacterQuality,
  type SculptedLehi,
} from "./lehi-sculpted-models";

// A small bounded source cache avoids rebuilding identical guards on entry.
// Animated actors own their buffers; no actor can deform another actor's clothes.
const templates = new Map<string, SculptedLehi>();
const MAX_TEMPLATES = 4;
export function acquireCharacterModel(
  role: SculptedCharacterRole,
  quality: SculptedCharacterQuality,
): SculptedLehi {
  const key = `${role}:${quality}`;
  let template = templates.get(key);
  if (!template) {
    template = buildSculptedCharacter(role, { quality });
    templates.set(key, template);
    while (templates.size > MAX_TEMPLATES) {
      const oldest = templates.keys().next().value!;
      templates.get(oldest)!.dispose();
      templates.delete(oldest);
    }
  } else {
    templates.delete(key);
    templates.set(key, template);
  }
  const group = template.group.clone(true);
  const geometries = new Map<T.BufferGeometry, T.BufferGeometry>();
  const materials = new Map<T.Material, T.Material>();
  group.traverse((object) => {
    if (!(object instanceof T.Mesh)) return;
    if (!geometries.has(object.geometry))
      geometries.set(object.geometry, object.geometry.clone());
    object.geometry = geometries.get(object.geometry)!;
    const cloneMaterial = (material: T.Material) => {
      if (!materials.has(material)) materials.set(material, material.clone());
      return materials.get(material)!;
    };
    object.material = Array.isArray(object.material)
      ? object.material.map(cloneMaterial)
      : cloneMaterial(object.material);
  });
  let disposed = false;
  return {
    group,
    dispose() {
      if (disposed) return;
      disposed = true;
      group.removeFromParent();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      group.clear();
    },
  };
}
export function clearCharacterModelCache() {
  templates.forEach((model) => model.dispose());
  templates.clear();
}

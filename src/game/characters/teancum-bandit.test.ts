import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildSculptedCharacter } from "./lehi-sculpted-models";
import { createCharacter } from "./character";

const part = (group: T.Group, name: string) => {
  const value = group.getObjectByName(name);
  assert.ok(value instanceof T.Mesh, `missing ${name}`);
  return value;
};

test("Teancum wears an opaque hood and lower face wrap with visible eyes and a short cape", () => {
  for (const quality of ["hero", "npc"] as const) {
    const actor = buildSculptedCharacter("teancum", { quality });
    for (const name of [
      "character-headwear",
      "teancum-face-wrap",
      "teancum-shoulder-cape",
      "teancum-blue-sash",
      "teancum-left-bracer",
      "teancum-right-bracer",
    ]) {
      const mesh = part(actor.group, name);
      const material = mesh.material as T.MeshPhysicalMaterial;
      assert.equal(material.opacity, 1, `${quality}/${name}`);
      assert.equal(material.transparent, false, `${quality}/${name}`);
      assert.equal(
        material.metalness,
        0,
        `${quality}/${name}: matte cloth/leather`,
      );
    }
    const mask = part(actor.group, "teancum-face-wrap");
    mask.geometry.computeBoundingBox();
    assert.ok(
      mask.geometry.boundingBox!.max.y <
        part(actor.group, "left-eye").position.y,
      "wrap ends below eyes",
    );
    const cape = part(actor.group, "teancum-shoulder-cape");
    cape.geometry.computeBoundingBox();
    assert.ok(
      cape.geometry.boundingBox!.min.y > 0.95,
      "cape stays above the legs",
    );
    const coat = part(actor.group, "flowing-mantle");
    coat.geometry.computeBoundingBox();
    assert.ok(
      coat.geometry.boundingBox!.min.y > 0.45,
      "short layers expose the legs",
    );
    assert.equal(actor.group.getObjectByName("guard-breastplate"), undefined);
    const geometries = new Set<T.BufferGeometry>();
    const materials = new Set<T.Material>();
    actor.group.traverse((mesh) => {
      if (mesh instanceof T.Mesh) {
        geometries.add(mesh.geometry);
        for (const material of Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material])
          materials.add(material);
      }
    });
    let disposedGeometries = 0,
      disposedMaterials = 0;
    for (const geometry of geometries)
      geometry.addEventListener("dispose", () => disposedGeometries++);
    for (const material of materials)
      material.addEventListener("dispose", () => disposedMaterials++);
    actor.dispose();
    assert.equal(disposedGeometries, geometries.size);
    assert.equal(disposedMaterials, materials.size);
  }
});

test("Teancum's short coat covers all inner garments through turns and reversals", () => {
  for (const quality of ["hero", "npc"] as const) {
    const actor = createCharacter("teancum", { quality });
    const coat = part(actor.group, "flowing-mantle") as T.SkinnedMesh;
    const inners = [
      "continuous-robe-and-sleeves",
      "visible-front-tunic",
      "left-trouser",
      "right-trouser",
      "left-sandal",
      "right-sandal",
    ].map((name) => part(actor.group, name));
    for (let frame = 0; frame < 48; frame++) {
      const yaw = frame < 12 ? 0 : frame < 32 ? Math.PI / 2 : -Math.PI / 2;
      const velocityYaw =
        frame < 18 ? 0 : frame < 38 ? Math.PI / 2 : -Math.PI / 2;
      actor.update(1 / 60, {
        x: 0,
        y: 0,
        z: 0,
        vx: Math.sin(velocityYaw) * 4,
        vy: 0,
        vz: Math.cos(velocityYaw) * 4,
        yaw,
        grounded: true,
        runSpeed: 4,
        move: "run",
      });
      if (frame !== 23 && frame !== 47) continue;
      coat.skeleton.update();
      for (const x of [-0.18, 0, 0.18])
        for (const y of [0.72, 0.85, 1, 1.15, 1.3]) {
          const ray = new T.Raycaster(
            new T.Vector3(x, y, -3).applyMatrix4(coat.matrixWorld),
            new T.Vector3(0, 0, 1).transformDirection(coat.matrixWorld),
          );
          const outer = ray.intersectObject(coat, false)[0];
          const inner = ray.intersectObjects(inners, false)[0];
          assert.ok(outer, `${quality}/${frame}: coat missing at ${x},${y}`);
          if (inner)
            assert.ok(
              outer.distance + 0.002 < inner.distance,
              `${quality}/${frame}: inner layer crosses coat at ${x},${y}`,
            );
        }
    }
    actor.dispose();
  }
});

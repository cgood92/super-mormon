import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import { buildSculptedCharacter } from "../src/super/lehi-sculpted-models.ts";
import { createCharacter } from "../src/super/character.ts";
import { clearCharacterModelCache } from "../src/super/character-model-cache.ts";

for (const quality of ["hero", "npc"] as const) {
  test(`Moroni ${quality} has fitted complete armor and independently removable cloth`, () => {
    const model = buildSculptedCharacter("moroni", { quality });
    const coat = model.group.getObjectByName("moroni-removable-coat")!;
    assert.equal(coat.visible, false);
    assert.equal(coat.getObjectByName("flowing-mantle")?.parent, coat);
    assert.equal(model.group.userData.costume, "illustrative-full-armor");
    const equipment = [
      "moroni-breastplate",
      "moroni-backplate",
      "character-headwear",
      ...["left", "right"].flatMap((side) =>
        ["pauldron", "bracer", "greave", "hip-lame"].map(
          (piece) => `moroni-${side}-${piece}`,
        ),
      ),
    ];
    const disposed = new Set<T.BufferGeometry>();
    for (const name of equipment) {
      const mesh = model.group.getObjectByName(name) as T.Mesh;
      assert.ok(mesh instanceof T.Mesh, name);
      assert.equal(mesh.visible, true);
      assert.notEqual(mesh.parent, coat);
      const bounds = new T.Box3().setFromObject(mesh);
      assert.ok(bounds.getSize(new T.Vector3()).length() > 0.05, name);
      mesh.geometry.addEventListener("dispose", () =>
        disposed.add(mesh.geometry),
      );
    }
    // Front and back plate truly cover the torso on opposing sides.
    const front = new T.Box3().setFromObject(
      model.group.getObjectByName("moroni-breastplate")!,
    );
    const back = new T.Box3().setFromObject(
      model.group.getObjectByName("moroni-backplate")!,
    );
    assert.ok(front.max.z > 0.35 && back.min.z < -0.3);
    const tunic = model.group.getObjectByName("visible-front-tunic") as T.Mesh;
    tunic.geometry.computeBoundingBox();
    assert.ok(
      tunic.geometry.boundingBox!.min.y >= 0.67,
      "no robe skirt beneath the armor",
    );
    // Removing the robe must never expose an empty thigh or shin. Sample the
    // actual rendered trouser/armor surfaces along both legs.
    for (const side of [-1, 1]) {
      const label = side < 0 ? "left" : "right";
      const surfaces = ["trouser", "greave", "hip-lame"].map((piece) =>
        model.group.getObjectByName(
          piece === "trouser" ? `${label}-trouser` : `moroni-${label}-${piece}`,
        )!,
      );
      for (const y of [0.15, 0.25, 0.4, 0.55, 0.7, 0.85]) {
        const ray = new T.Raycaster(
          new T.Vector3(side * 0.205, y, 2).applyMatrix4(
            model.group.matrixWorld,
          ),
          new T.Vector3(0, 0, -1).transformDirection(model.group.matrixWorld),
        );
        assert.ok(
          ray.intersectObjects(surfaces).length > 0,
          `${label} leg gap at ${y}`,
        );
      }
    }
    coat.visible = true;
    coat.visible = false;
    assert.equal(
      model.group.getObjectByName("moroni-breastplate")!.visible,
      true,
    );
    model.dispose();
    assert.equal(disposed.size, equipment.length);
    assert.equal(model.group.children.length, 0);
  });

  test(`Moroni ${quality} limb armor follows its limb through turns and crawling`, () => {
    const actor = createCharacter("moroni", { quality });
    const coat = actor.group.getObjectByName("moroni-removable-coat")!;
    assert.equal(
      coat.getObjectByName("flowing-mantle")?.parent,
      coat,
      "skinning preserves removable layer",
    );
    for (const side of ["left", "right"]) {
      for (const piece of ["pauldron", "bracer"])
        assert.equal(
          actor.group.getObjectByName(`moroni-${side}-${piece}`)!.parent!.name,
          `${side}-arm`,
        );
      for (const piece of ["greave", "greave-trim"])
        assert.equal(
          actor.group.getObjectByName(`moroni-${side}-${piece}`)!.parent!.name,
          `${side}-knee`,
        );
      assert.equal(
        actor.group.getObjectByName(`moroni-${side}-hip-lame`)!.parent!.name,
        `${side}-leg`,
      );
    }
    for (const yaw of [0, Math.PI / 4, Math.PI / 2, Math.PI, -Math.PI / 4]) {
      for (const move of ["run", "crawl", "idle"] as const) {
        actor.update(1 / 30, {
          x: 0,
          y: 0,
          z: 0,
          vx: Math.sin(yaw) * 2,
          vy: 0,
          vz: Math.cos(yaw) * 2,
          yaw,
          grounded: true,
          runSpeed: 2,
          move,
          crouching: move === "crawl",
        });
        actor.group.traverse((object) => {
          if (!object.name.startsWith("moroni-")) return;
          assert.ok(
            object.matrixWorld.elements.every(Number.isFinite),
            object.name,
          );
        });
      }
    }
    actor.dispose();
    assert.equal(actor.group.children.length, 0);
    clearCharacterModelCache();
  });
}

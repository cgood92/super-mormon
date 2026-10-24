import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import {
  createCharacter,
  type CharacterRole,
  type CharacterState,
} from "../src/super/character";

const standing: CharacterState = {
  x: 2,
  y: 0,
  z: 3,
  vx: 0,
  vy: 0,
  vz: 0,
  yaw: 0,
  grounded: true,
  runSpeed: 0,
};
test("spy rendered head world forward matches supplied gaze through body turn smoothing", () => {
  const character = createCharacter("spy", { quality: "npc" });
  try {
    for (let frame = 0; frame < 25; frame++) {
      const lookYaw = frame < 10 ? 1.1 : -1.3;
      const lookPitch = frame < 10 ? 0.1 : -0.14;
      character.update(1 / 60, {
        ...standing,
        yaw: frame ? 2 : 0,
        vx: frame ? 1 : 0,
        runSpeed: frame ? 1 : 0,
        lookYaw,
        lookPitch,
      });
      character.group.updateMatrixWorld(true);
      const head = character.group.getObjectByName("head")!;
      const forward = new T.Vector3(0, 0, 1).transformDirection(
        head.matrixWorld,
      );
      const intended = new T.Vector3(
        Math.sin(lookYaw) * Math.cos(lookPitch),
        Math.sin(lookPitch),
        Math.cos(lookYaw) * Math.cos(lookPitch),
      );
      assert.ok(
        forward.angleTo(intended) < 1e-5,
        `frame ${frame}: gaze error ${(forward.angleTo(intended) * 180) / Math.PI} degrees`,
      );
    }
  } finally {
    character.dispose();
  }
});

test("new story NPC roles retain visible opaque materials and finite rig poses", () => {
  for (const role of [
    "jacob",
    "sherem",
    "alma",
    "convert",
    "spy",
  ] satisfies CharacterRole[]) {
    const character = createCharacter(role, { quality: "npc" });
    try {
      character.update(1 / 60, standing);
      character.group.updateMatrixWorld(true);
      const head = character.group.getObjectByName("head");
      assert.ok(head, `${role} has a visible head rig`);
      let meshCount = 0;
      character.group.traverse((object) => {
        if (!(object instanceof T.Mesh)) return;
        meshCount++;
        assert.ok(
          object.matrixWorld.elements.every(Number.isFinite),
          `${role} finite transforms`,
        );
        for (const material of Array.isArray(object.material)
          ? object.material
          : [object.material]) {
          assert.equal(material.visible, true, `${role} material visible`);
          assert.equal(material.opacity, 1, `${role} material opaque`);
          assert.ok(
            !material.clippingPlanes?.length,
            `${role} no accidental clipping`,
          );
        }
      });
      assert.ok(meshCount > 10, `${role} complete NPC silhouette`);
    } finally {
      character.dispose();
    }
  }
});

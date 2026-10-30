import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createCharacter } from "./character";
import {
  buildSculptedCharacter,
  SCULPTED_CAST_TRAITS,
} from "./lehi-sculpted-models";

const mesh = (group: T.Group, name: string) => {
  const object = group.getObjectByName(name);
  assert.ok(object instanceof T.Mesh, `missing ${name}`);
  return object;
};

test("Teancum's patrol wears separate bronze armor over matte blue garments", () => {
  for (const quality of ["hero", "npc", "crowd"] as const) {
    const actor = buildSculptedCharacter("teancum-soldier", { quality });
    for (const name of [
      "character-headwear",
      "guard-breastplate",
      "patrol-left-bracer",
      "patrol-right-bracer",
    ]) {
      const armor = mesh(actor.group, name).material as T.MeshPhysicalMaterial;
      assert.equal(
        armor.color.getHex(),
        0xa8753e,
        `${quality}/${name}: bronze`,
      );
      assert.ok(armor.metalness >= 0.5, `${quality}/${name}: visible metal`);
    }
    const cloth = mesh(actor.group, "flowing-mantle")
      .material as T.MeshPhysicalMaterial;
    assert.equal(cloth.color.getHex(), 0x315d80);
    assert.equal(cloth.metalness, 0, "the blue coat is woven fabric");
    actor.dispose();
  }
});

test("patrol bracers follow their animated arms during sharp turns", () => {
  const actor = createCharacter("teancum-soldier");
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    actor.update(1 / 60, {
      x: 0,
      y: 0,
      z: 0,
      vx: 4,
      vy: 0,
      vz: -4,
      yaw,
      grounded: true,
      runSpeed: 5,
      move: "run",
    });
    for (const side of ["left", "right"]) {
      const bracer = mesh(actor.group, `patrol-${side}-bracer`);
      assert.equal(bracer.parent?.name, `${side}-arm`);
      actor.group.updateMatrixWorld(true);
      assert.ok(bracer.matrixWorld.elements.every(Number.isFinite));
    }
  }
  actor.dispose();
});

test("Morianton's followers use dark garments and stern brows with the same complexion as the patrol", () => {
  const actor = buildSculptedCharacter("morianton-follower", {
    quality: "npc",
  });
  const patrol = SCULPTED_CAST_TRAITS["teancum-soldier"];
  const follower = SCULPTED_CAST_TRAITS["morianton-follower"];
  assert.equal(
    follower.skin,
    patrol.skin,
    "complexion is independent of allegiance",
  );
  assert.equal(follower.robe, 0x30333b);
  assert.equal(follower.coat, 0x542d3c);
  assert.ok(follower.brow < 0);
  assert.equal(actor.group.getObjectByName("guard-breastplate"), undefined);
  assert.equal(actor.group.getObjectByName("character-headwear"), undefined);
  actor.dispose();
});

import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import {
  createCharacter,
  type CharacterState,
} from "../src/super/character.ts";

const standing: CharacterState = {
  x: 0,
  y: 0,
  z: 0,
  vx: 0,
  vy: 0,
  vz: 0,
  yaw: 0,
  grounded: true,
  runSpeed: 0,
};

function bounds(character: ReturnType<typeof createCharacter>) {
  character.group.updateMatrixWorld(true);
  return new T.Box3().setFromObject(character.group);
}

test("crouch and crawl visibly fit beneath a 0.9 high opening", () => {
  const character = createCharacter("nephi");
  character.update(1 / 60, { ...standing, crouching: true, move: "crouch" });
  const crouch = bounds(character);
  assert.ok(crouch.max.y <= 0.9, `crouch reaches ${crouch.max.y}`);
  assert.ok(crouch.min.y >= -0.02, `crouch feet sink to ${crouch.min.y}`);
  character.update(1 / 60, {
    ...standing,
    crouching: true,
    move: "crawl",
    runSpeed: 1.5,
    moveTime: 0.2,
  });
  const crawl = bounds(character);
  assert.ok(crawl.max.y <= 0.9, `crawl reaches ${crawl.max.y}`);
  assert.ok(crawl.min.y >= -0.02, `crawl feet sink to ${crawl.min.y}`);
  character.dispose();
});

test("mid-flip poses rotate around the character center and clear the floor", () => {
  const character = createCharacter("nephi");
  for (const move of ["backflip", "sideflip"] as const) {
    character.update(1 / 60, {
      ...standing,
      grounded: false,
      move,
      moveTime: 0.35,
    });
    const box = bounds(character);
    assert.ok(box.min.y >= -0.05, `${move} sinks to ${box.min.y}`);
    assert.ok(box.max.y > 0.4, `${move} no longer has a body silhouette`);
  }
  character.dispose();
});

test("carrying keeps both hands raised in front of the body", () => {
  const character = createCharacter("nephi");
  character.update(1 / 60, { ...standing, carrying: true });
  const left = character.group.getObjectByName("left-arm")!;
  const right = character.group.getObjectByName("right-arm")!;
  assert.ok(left.rotation.x < -0.5);
  assert.ok(right.rotation.x < -0.5);
  character.dispose();
});

test("Nephi is clean shaven and can wave while idle", () => {
  const nephi = createCharacter("nephi");
  const lehi = createCharacter("lehi");
  assert.equal(nephi.group.getObjectByName("beard"), undefined);
  assert.ok(lehi.group.getObjectByName("beard"));
  nephi.update(1 / 60, { ...standing, wave: true });
  const wavingArm = nephi.group.getObjectByName("right-arm")!;
  assert.ok(wavingArm.rotation.z > 2);
  nephi.update(1 / 60, { ...standing, wave: true, runSpeed: 4 });
  assert.ok(wavingArm.rotation.z < 1);
  nephi.dispose();
  lehi.dispose();
});

test("Nephi's disguise retains his young face with guard clothes", () => {
  const disguised = createCharacter("nephi-disguised");
  assert.equal(disguised.group.getObjectByName("beard"), undefined);
  assert.ok(disguised.group.getObjectByName("guard-cuirass"));
  disguised.update(1 / 60, standing);
  assert.ok(bounds(disguised).max.y <= 1.66);
  disguised.dispose();
});

test("Sam looks young and wears a distinct mantle", () => {
  const sam = createCharacter("sam");
  const nephi = createCharacter("nephi");
  assert.equal(sam.group.getObjectByName("beard"), undefined);
  const samCloak = sam.group.getObjectByName("cloak")!.children[0] as T.Mesh;
  const nephiCloak = nephi.group.getObjectByName("cloak")!
    .children[0] as T.Mesh;
  const samColor = (samCloak.material as T.MeshStandardMaterial).color.getHex();
  const nephiColor = (
    nephiCloak.material as T.MeshStandardMaterial
  ).color.getHex();
  assert.notEqual(samColor, nephiColor);
  sam.update(1 / 60, standing);
  assert.ok(bounds(sam).max.y <= 1.66);
  sam.dispose();
  nephi.dispose();
});

test("all character roles keep crouch and flip poses above the floor", () => {
  for (const role of ["nephi", "sam", "lehi", "laman", "guard"] as const) {
    const character = createCharacter(role);
    for (const move of ["crouch", "crawl"] as const) {
      character.update(1 / 60, {
        ...standing,
        crouching: true,
        move,
        runSpeed: move === "crawl" ? 1.5 : 0,
      });
      const box = bounds(character);
      assert.ok(
        box.min.y >= -0.02,
        `${role} ${move} feet sink to ${box.min.y}`,
      );
      assert.ok(box.max.y <= 0.9, `${role} ${move} reaches ${box.max.y}`);
    }
    for (const move of ["backflip", "sideflip", "tripleJump"] as const) {
      for (const moveTime of [0, 0.175, 0.35, 0.525, 0.7]) {
        character.update(1 / 60, {
          ...standing,
          grounded: false,
          move,
          moveTime,
        });
        const box = bounds(character);
        assert.ok(
          box.min.y >= -0.05,
          `${role} ${move} at ${moveTime} sinks to ${box.min.y}`,
        );
      }
    }
    character.dispose();
  }
});

test("jump stage selects the airborne pose when move is omitted", () => {
  const character = createCharacter("nephi");
  character.update(1 / 60, { ...standing, grounded: false, jumpStage: 2 });
  assert.ok(character.group.getObjectByName("left-arm")!.rotation.x < -1);
  character.update(1 / 60, {
    ...standing,
    grounded: false,
    jumpStage: 3,
    moveTime: 0.175,
  });
  const body = character.group.children[0];
  assert.ok(body.rotation.x > 1);
  character.dispose();
});

test("forced crouch stays compact during airborne moves under a ceiling", () => {
  for (const role of ["nephi", "lehi", "laman", "guard"] as const) {
    const character = createCharacter(role);
    for (const move of ["jump", "longJump", "backflip", "sideflip"] as const) {
      character.update(1 / 60, {
        ...standing,
        grounded: false,
        crouching: true,
        move,
        moveTime: 0.35,
      });
      const box = bounds(character);
      assert.ok(box.max.y <= 0.9, `${role} ${move} reaches ${box.max.y}`);
      assert.ok(box.min.y >= -0.02, `${role} ${move} sinks to ${box.min.y}`);
    }
    character.dispose();
  }
});

test("Laban's official garments match Nephi's disguise and leave a modest linen covering", () => {
  const laban = createCharacter("laban"),
    disguise = createCharacter("nephi-disguised"),
    undressed = createCharacter("laban-undressed");
  for (const name of ["guard-cuirass", "tunic"]) {
    const material = (rig: typeof laban) =>
      (
        (rig.group.getObjectByName(name) as T.Mesh)
          .material as T.MeshStandardMaterial
      ).color.getHex();
    assert.equal(material(laban), material(disguise));
  }
  assert.ok(laban.group.getObjectByName("beard"));
  assert.equal(undressed.group.getObjectByName("guard-cuirass"), undefined);
  assert.ok(undressed.group.getObjectByName("bare-torso"));
  const linen = undressed.group.getObjectByName("modesty-linen") as T.Mesh;
  assert.ok((linen.geometry as T.CylinderGeometry).parameters.height >= 0.65);
  assert.equal(undressed.group.getObjectByName("cloak")!.visible, false);
  laban.dispose();
  disguise.dispose();
  undressed.dispose();
});

test("Sariah has an adult face, ankle length robe and pale linen head covering", () => {
  const sariah = createCharacter("sariah");
  assert.equal(sariah.group.getObjectByName("beard"), undefined);
  const robe = sariah.group.getObjectByName("long-robe") as T.Mesh;
  assert.ok(robe);
  assert.ok((robe.geometry as T.CylinderGeometry).parameters.height >= 0.9);
  const veil = sariah.group.getObjectByName("linen-head-covering")!;
  assert.ok(veil && veil.children.length >= 4);
  const material = (veil.children[0] as T.Mesh)
    .material as T.MeshStandardMaterial;
  assert.equal(material.color.getHex(), 0xe8dfcb);
  sariah.update(1 / 60, standing);
  assert.ok(bounds(sariah).min.y >= -0.02);
  assert.ok(bounds(sariah).max.y < 1.7);
  sariah.dispose();
  assert.equal(sariah.group.children.length, 0);
});

test("pointing figures use a forward gesture distinct from the family's wave", () => {
  const actor = createCharacter("laman");
  actor.update(1 / 60, { ...standing, move: "idle", pointing: true });
  const arm = actor.group.getObjectByName("right-arm")!;
  assert.ok(arm.rotation.x < -1.3);
  assert.ok(Math.abs(arm.rotation.z) < 0.3);
  actor.update(1 / 60, { ...standing, move: "idle", wave: true });
  assert.ok(arm.rotation.z > 2.3);
  actor.dispose();
});

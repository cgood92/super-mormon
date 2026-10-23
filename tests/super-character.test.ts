import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import {
  createCharacter,
  type CharacterState,
  type CharacterRole,
} from "../src/super/character.ts";

const roles: CharacterRole[] = [
  "nephi",
  "nephi-disguised",
  "sam",
  "lehi",
  "laman",
  "lemuel",
  "guard",
  "laban",
  "laban-undressed",
  "sariah",
  "zoram",
  "child",
];

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
  assert.equal(
    nephi.group.getObjectByName("one-piece-sculpted-beard"),
    undefined,
  );
  assert.ok(lehi.group.getObjectByName("one-piece-sculpted-beard"));
  nephi.update(1 / 60, { ...standing, wave: true });
  const wavingArm = nephi.group.getObjectByName("right-arm")!;
  assert.ok(wavingArm.rotation.z > 2);
  nephi.update(1 / 60, { ...standing, wave: true, runSpeed: 4 });
  assert.ok(wavingArm.rotation.z < 1);
  nephi.dispose();
  lehi.dispose();
});

test("Nephi's disguise retains his young face with Laban's garments", () => {
  const disguised = createCharacter("nephi-disguised");
  assert.equal(
    disguised.group.getObjectByName("one-piece-sculpted-beard"),
    undefined,
  );
  assert.ok(disguised.group.getObjectByName("continuous-robe-and-sleeves"));
  disguised.update(1 / 60, standing);
  assert.ok(bounds(disguised).max.y <= 1.66);
  disguised.dispose();
});

test("Sam looks young and wears a distinct mantle", () => {
  const sam = createCharacter("sam");
  const nephi = createCharacter("nephi");
  assert.equal(
    sam.group.getObjectByName("one-piece-sculpted-beard"),
    undefined,
  );
  const samCloak = sam.group.getObjectByName("flowing-mantle") as T.Mesh;
  const nephiCloak = nephi.group.getObjectByName("flowing-mantle") as T.Mesh;
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
  for (const role of roles) {
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
  for (const role of roles) {
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
  for (const name of [
    "continuous-robe-and-sleeves",
    "flowing-mantle",
    "character-headwear",
    "left-regal-embroidery",
    "right-regal-embroidery",
  ]) {
    const material = (rig: typeof laban) =>
      (
        (rig.group.getObjectByName(name) as T.Mesh)
          .material as T.MeshStandardMaterial
      ).color.getHex();
    assert.equal(material(laban), material(disguise), name);
  }
  assert.ok(laban.group.getObjectByName("one-piece-sculpted-beard"));
  assert.equal(
    disguise.group.getObjectByName("one-piece-sculpted-beard"),
    undefined,
  );
  const linen = undressed.group.getObjectByName(
    "continuous-robe-and-sleeves",
  ) as T.Mesh;
  assert.ok(linen, "Laban must retain a continuous linen covering");
  undressed.update(1 / 60, standing);
  undressed.group.updateMatrixWorld(true);
  const linenBounds = new T.Box3().setFromObject(linen);
  assert.ok(linenBounds.min.y < 0.55, "linen must extend below the thighs");
  assert.ok(linenBounds.max.y > 1.15, "linen must cover the torso");
  assert.equal(undressed.group.getObjectByName("flowing-mantle"), undefined);
  laban.dispose();
  disguise.dispose();
  undressed.dispose();
});

test("Sariah has an adult face, ankle length robe and linen head covering", () => {
  const sariah = createCharacter("sariah");
  assert.equal(
    sariah.group.getObjectByName("one-piece-sculpted-beard"),
    undefined,
  );
  const robe = sariah.group.getObjectByName(
    "continuous-robe-and-sleeves",
  ) as T.Mesh;
  const veil = sariah.group.getObjectByName("character-headwear") as T.Mesh;
  assert.ok(robe && veil);
  sariah.update(1 / 60, standing);
  sariah.group.updateMatrixWorld(true);
  const robeBounds = new T.Box3().setFromObject(robe);
  const veilBounds = new T.Box3().setFromObject(veil);
  assert.ok(robeBounds.min.y < 0.2, "robe must reach the ankles");
  assert.ok(robeBounds.max.y - robeBounds.min.y > 0.9);
  assert.ok(
    veilBounds.max.y > 1.5 && veilBounds.min.y < 1.4,
    "head covering must drape from the crown",
  );
  const material = veil.material as T.MeshStandardMaterial;
  const linenColor = material.color.clone().convertLinearToSRGB();
  assert.ok(
    linenColor.r > 0.65 && linenColor.g > 0.6 && linenColor.b > 0.5,
    "head covering should read as pale linen",
  );
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

import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSculptedCharacter,
  SCULPTED_CAST_TRAITS,
} from "./lehi-sculpted-models.ts";
import type { CharacterRole } from "./character-types.ts";
const finalRoles = [
  "peace-builder",
  "mormon",
  "ammaron",
  "jared",
  "jared-brother",
  "ether",
  "moroni-keeper",
] as const;
test("the final adventures have distinct sculpted identities and occupational equipment", () => {
  const silhouettes = new Set<string>();
  for (const role of finalRoles) {
    const traits = SCULPTED_CAST_TRAITS[role as CharacterRole];
    assert.ok(traits, `${role}: missing approved-style profile`);
    silhouettes.add(
      JSON.stringify([
        traits.head,
        traits.tall,
        traits.faceWidth,
        traits.jaw,
        traits.nose,
        traits.hairStyle,
        traits.beard,
        traits.hem,
        traits.width,
      ]),
    );
    const actor = buildSculptedCharacter(role as CharacterRole, {
      quality: "crowd",
    });
    assert.ok(actor.group.getObjectByName(`${role}-equipment`), role);
    assert.ok(actor.group.getObjectByName("flowing-mantle"), role);
    actor.dispose();
  }
  assert.equal(silhouettes.size, finalRoles.length);
});

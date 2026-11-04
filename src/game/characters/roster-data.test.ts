import assert from "node:assert/strict";
import test from "node:test";
import {
  CHARACTER_ROSTER,
  createCarriedProp,
  analyzeCharacterMesh,
} from "./roster-data";
import { SCULPTED_CAST_TRAITS } from "./lehi-sculpted-models";
import { createCharacter } from "./character";
import type { CharacterRole } from "./character-types";

test("CHARACTER_ROSTER has all 41 sculpted cast roles", () => {
  const rolesInTraits = Object.keys(SCULPTED_CAST_TRAITS);
  assert.equal(CHARACTER_ROSTER.length, 41);
  assert.equal(rolesInTraits.length, 41);

  const rosterRoles = new Set(CHARACTER_ROSTER.map((entry) => entry.role));
  for (const role of rolesInTraits) {
    assert.ok(rosterRoles.has(role as CharacterRole), `Missing role: ${role}`);
  }

  for (const entry of CHARACTER_ROSTER) {
    assert.ok(entry.name.length > 0, `Role ${entry.role} has empty name`);
    assert.ok(
      entry.description.length > 10,
      `Role ${entry.role} has short description`,
    );
    assert.ok(entry.faction, `Role ${entry.role} missing faction`);
    assert.ok(entry.archetype, `Role ${entry.role} missing archetype`);
  }
});

test("createCarriedProp generates valid 3D props", () => {
  for (const type of ["plates", "jar", "crate", "pack", "banner"] as const) {
    const prop = createCarriedProp(type);
    assert.ok(prop, `Prop ${type} should return group`);
    assert.ok(prop.children.length > 0, `Prop ${type} should have children`);
  }
  assert.equal(createCarriedProp("none"), null);
});

test("analyzeCharacterMesh inspects character geometry without warnings on hero Lehi", () => {
  const actor = createCharacter("lehi", { quality: "hero" });
  actor.update(1 / 60, {
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: 0,
    grounded: true,
    runSpeed: 0,
  });
  const report = analyzeCharacterMesh(actor);
  assert.equal(report.role, "lehi");
  assert.ok(report.totalVertices > 200);
  assert.ok(report.totalTriangles > 100);
  assert.ok(report.boundingBox.height > 1.4 && report.boundingBox.height < 2.0);
  assert.ok(report.normalsValid);
  assert.ok(report.shoesClosed);
  assert.equal(report.warnings.length, 0);
  actor.dispose();
});

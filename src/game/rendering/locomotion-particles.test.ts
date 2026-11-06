import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import { createLocomotionParticles } from "./locomotion-particles.ts";

test("locomotion particles emit footfalls, skid smoke, landing rings and dispose cleanly", () => {
  const scene = new T.Scene();
  const particles = createLocomotionParticles(scene);
  const group = scene.getObjectByName("Locomotion particles") as T.Group;
  assert.ok(group, "particle group added to scene");

  // Footfall puff
  particles.footstep(1, 0, 2);
  const activePuff = group.children.find((c) => c.visible);
  assert.ok(activePuff, "footstep activated a puff");

  // Skid puffs
  particles.skid(0, 0, 0, 5, 0);
  const activeCount = group.children.filter((c) => c.visible).length;
  assert.ok(activeCount >= 3, "skid added multiple puffs");

  // Landing ring
  particles.landingRing(0, 0, 0, 0.8);
  const landingCount = group.children.filter((c) => c.visible).length;
  assert.ok(landingCount > 10, "landing ring spawned circular puffs");

  // Update ticks and fades
  particles.update(0.15);
  particles.update(0.3);
  const remaining = group.children.filter((c) => c.visible).length;
  assert.ok(remaining < landingCount, "expired puffs fade out");

  // Disposal cleans scene
  particles.dispose();
  assert.equal(scene.children.length, 0, "disposed group removed from scene");
});

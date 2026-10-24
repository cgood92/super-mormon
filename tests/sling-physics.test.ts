import test from "node:test";
import assert from "node:assert/strict";
import { Box3, Vector3 } from "three";
import {
  createSlingSpinState,
  stepSlingSpin,
  requestSlingRelease,
  releaseSlingStone,
  stepStone,
  SLING_RADIUS,
  slingCharge,
  cancelSlingSpin,
} from "../src/super/sling-physics";

test("spin builds speed; pending release preserves momentum and reaches the actual forward tangent", () => {
  const spin = createSlingSpinState();
  for (let i = 0; i < 120; i++) stepSlingSpin(spin, 1 / 100, true);
  assert.ok(slingCharge(spin) > 0.999);
  const speed = spin.angularSpeed;
  requestSlingRelease(spin);
  let released = false;
  for (let i = 0; i < 60 && !released; i++)
    released = stepSlingSpin(spin, 1 / 100, false);
  assert.ok(released);
  assert.equal(spin.phase, 0);
  assert.equal(spin.angularSpeed, speed);
  const stone = releaseSlingStone(new Vector3(0, 2, 0), 0, 0, spin);
  assert.ok(Math.abs(stone.velocity.length() - speed * SLING_RADIUS) < 1e-8);
  assert.equal(stone.velocity.x, 0);
  assert.equal(stone.velocity.y, 0);
  assert.ok(stone.velocity.z > 0);
  assert.equal(stone.position.x, -SLING_RADIUS);
  cancelSlingSpin(spin);
  assert.equal(slingCharge(spin), 0);
  assert.equal(spin.pendingRelease, false);
});

test("release is tangent to the visible orbit at arbitrary phase and respects world yaw/pitch", () => {
  const spin = createSlingSpinState();
  spin.phase = Math.PI / 2;
  const sideways = releaseSlingStone(new Vector3(), 0, 0, spin);
  assert.ok(sideways.velocity.x > 0);
  assert.ok(Math.abs(sideways.velocity.z) < 1e-8);
  spin.phase = 0;
  const aimed = releaseSlingStone(
    new Vector3(),
    Math.PI / 2,
    Math.PI / 6,
    spin,
  );
  assert.ok(aimed.velocity.x > 0);
  assert.ok(aimed.velocity.y > 0);
  assert.ok(Math.abs(aimed.velocity.z) < 1e-8);
});

function shot() {
  const stone = releaseSlingStone(
    new Vector3(SLING_RADIUS, 3, 0),
    0,
    0,
    createSlingSpinState(),
  );
  stone.velocity.set(0, 0, 40);
  return stone;
}
test("stone gravity is ballistic and a nearer wall blocks a moving target", () => {
  const stone = shot();
  const wall = new Box3(new Vector3(-2, 0, 3), new Vector3(2, 6, 3.2));
  const target = {
    id: "raider",
    previous: new Vector3(-1, 3, 7),
    position: new Vector3(1, 3, 7),
    radius: 1,
  };
  const hit = stepStone(stone, 0.25, [wall], [target]);
  assert.equal(hit?.kind, "world");
  assert.ok(Math.abs(stone.position.z - 3) < 1e-8);
  assert.ok(stone.position.y < 3);
  assert.equal(stone.active, false);
});
test("sweep catches a crossing moving target and chooses the earliest target", () => {
  const stone = shot();
  const hit = stepStone(
    stone,
    0.2,
    [],
    [
      {
        id: "far",
        previous: new Vector3(0, 3, 7),
        position: new Vector3(0, 3, 7),
        radius: 0.7,
      },
      {
        id: "crossing",
        previous: new Vector3(-2, 3, 4),
        position: new Vector3(2, 3, 4),
        radius: 0.7,
      },
    ],
  );
  assert.equal(hit?.kind, "target");
  assert.equal(hit?.targetId, "crossing");
});
test("unhit stones expire after finite flight", () => {
  const stone = shot();
  stepStone(stone, 10, [], []);
  assert.equal(stone.active, false);
  assert.ok(stone.age <= 5.00001);
});

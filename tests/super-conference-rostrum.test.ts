import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { buildRostrum } from "../src/super/conference-rostrum";
import { createPlayer, stepPlayer } from "../src/super/physics";

test("rostrum has paired foundation stairs and a continuous central wooden stage", () => {
  const { solids, seats } = buildRostrum(new THREE.Group());
  const stairs = solids.filter((solid) => Math.abs(solid.x) === 25);
  assert.equal(stairs.length, 16);
  assert.ok(stairs.every((solid) => solid.y === -0.4));
  assert.equal(
    solids.filter((solid) => solid.z > -79 && solid.x === 0).length,
    0,
  );
  assert.ok(
    solids.some(
      (solid) =>
        solid.x === 0 &&
        solid.w === 92 &&
        Math.abs(solid.y + solid.h - 2.4) < 1e-9,
    ),
  );
  assert.ok(seats.length > 400);
  assert.ok(seats.every((seat) => seat.angle === Math.PI));
});

test("both offset stairways provide a walking route from the aisle to the pulpit and back", () => {
  const { solids } = buildRostrum(new THREE.Group());
  for (const side of [-1, 1]) {
    const player = createPlayer(0, 0, -70);
    const walkTo = (x: number, z: number) => {
      for (let frame = 0; frame < 900; frame++) {
        const dx = x - player.x,
          dz = z - player.z;
        if (Math.hypot(dx, dz) < 0.08) break;
        const scale = Math.min(1, Math.hypot(dx, dz) * 2);
        const length = Math.hypot(dx, dz);
        stepPlayer(
          player,
          {
            x: (-dx / length) * scale,
            y: (dz / length) * scale,
            jump: false,
            jumpHeld: false,
            traversal: false,
          },
          1 / 120,
          0,
          solids,
        );
      }
      assert.ok(
        Math.hypot(x - player.x, z - player.z) < 0.15,
        `missed waypoint ${x}, ${z}: ${player.x}, ${player.z}`,
      );
    };
    walkTo(side * 25, -70);
    walkTo(side * 25, -80);
    assert.ok(Math.abs(player.y - 2.4) < 0.001);
    walkTo(side * 4, -80);
    walkTo(side * 4, -83);
    walkTo(0, -83);
    walkTo(side * 4, -83);
    walkTo(side * 4, -80);
    walkTo(side * 25, -80);
    walkTo(side * 25, -70);
    walkTo(0, -70);
    assert.ok(Math.abs(player.y) < 0.001);
  }
});

test("twelve plush front chairs and solid pulpit and planted apron", () => {
  const root = new THREE.Group();
  const { solids } = buildRostrum(root);
  const chairs: THREE.Object3D[] = [];
  root.traverse((object) => {
    if (object.name === "apostle armchair") chairs.push(object);
  });
  assert.equal(chairs.length, 12);
  assert.equal(new Set(chairs.map((chair) => chair.position.x)).size, 12);
  for (const z of [-81.6, -79.45])
    assert.ok(
      solids.some((s) => s.x === 0 && s.z === z && s.y >= 2.4 && s.h >= 0.5),
    );
});

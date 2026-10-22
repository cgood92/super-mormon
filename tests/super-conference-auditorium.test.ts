import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { buildAuditorium } from "../src/super/conference-auditorium";
import {
  createPlayer,
  stepPlayer,
  type PlayerState,
  type Solid,
} from "../src/super/physics";
function walk(p: PlayerState, z: number, solids: Solid[]) {
  for (let i = 0; i < 5000 && Math.abs(p.z - z) > 0.1; i++)
    stepPlayer(
      p,
      {
        x: 0,
        y: Math.sign(z - p.z),
        jump: false,
        jumpHeld: false,
        traversal: false,
      },
      1 / 60,
      0,
      solids,
    );
  assert.ok(
    Math.abs(p.z - z) < 0.15,
    `Reached ${p.z}, expected ${z}; height ${p.y}`,
  );
}
test("all three foyer levels enter the bowl and return without jumping", () => {
  const { solids } = buildAuditorium(new THREE.Group());
  for (const level of [0, 12, 24]) {
    const p = createPlayer(0, level, -0.5);
    p.grounded = true;
    walk(p, level === 0 ? -70 : -44, solids);
    for (let i = 0; i < 30; i++)
      stepPlayer(
        p,
        { x: 0, y: 0, jump: false, jumpHeld: false },
        1 / 60,
        0,
        solids,
      );
    assert.ok(p.grounded);
    assert.equal(p.crouching, false);
    walk(p, -0.5, solids);
    assert.ok(Math.abs(p.y - level) < 0.01);
  }
});
test("the ground center aisle reaches the pulpit stage and returns", () => {
  const { solids } = buildAuditorium(new THREE.Group());
  const p = createPlayer(0, 0, -0.5);
  walk(p, -76, solids);
  assert.ok(Math.abs(p.y - 5.4) < 0.01);
  walk(p, -0.5, solids);
  assert.equal(p.y, 0);
});
test("seating is instanced and landmarks are useful open viewing places", () => {
  const parent = new THREE.Group();
  const result = buildAuditorium(parent);
  let batches = 0;
  let seats = 0;
  parent.traverse((object) => {
    if (
      object instanceof THREE.InstancedMesh &&
      object.name === "auditorium seating"
    ) {
      batches++;
      seats = object.count;
    }
  });
  assert.equal(batches, 3);
  assert.ok(seats > 10000);
  assert.equal(result.landmarks.length, 3);
});

test("rear stair connects the lower seating terraces to the foyer circulation", () => {
  const { solids } = buildAuditorium(new THREE.Group());
  const p = createPlayer(0, 0, -4.8);
  for (let i = 0; i < 180; i++)
    stepPlayer(
      p,
      { x: -1, y: 0, jump: false, jumpHeld: false, traversal: false },
      1 / 60,
      0,
      solids,
    );
  assert.ok(p.x > 16, `Rear stair stopped at ${p.x}, height ${p.y}`);
  assert.ok(Math.abs(p.y - 4.5) < 0.01);
  walk(p, -55, solids);
  assert.ok(p.y < 1.5);
});

test("both balcony center aisles terminate at a continuous guard", () => {
  const { solids } = buildAuditorium(new THREE.Group());
  for (const y of [6.075, 18.075]) {
    const p = createPlayer(0, y, -45);
    p.grounded = true;
    for (let i = 0; i < 180; i++)
      stepPlayer(
        p,
        { x: 0, y: -1, jump: false, jumpHeld: false, traversal: false },
        1 / 60,
        0,
        solids,
      );
    assert.ok(p.z > -46);
    assert.ok(Math.abs(p.y - y) < 0.2, `fell from balcony to ${p.y}`);
  }
});

test("the auditorium architecture stays below the roof slab", () => {
  const group = new THREE.Group();
  buildAuditorium(group);
  group.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(group);
  assert.ok(bounds.max.y < 35.6, `auditorium reaches roof at ${bounds.max.y}`);
});

test("carpet visually clears the shared structural foundation", () => {
  const parent = new THREE.Group();
  const { solids } = buildAuditorium(parent);
  const matrix = new THREE.Matrix4();
  let groundCarpetTop: number | undefined;
  parent.traverse((object) => {
    if (!(object instanceof THREE.InstancedMesh)) return;
    const material = object.material as THREE.MeshStandardMaterial;
    if (material.color.getHex() !== 0x7b3436) return;
    for (let i = 0; i < object.count; i++) {
      object.getMatrixAt(i, matrix);
      const bounds = new THREE.Box3(
        new THREE.Vector3(-0.5, -0.5, -0.5),
        new THREE.Vector3(0.5, 0.5, 0.5),
      ).applyMatrix4(matrix);
      if (bounds.containsPoint(new THREE.Vector3(0, -0.1, -30)))
        groundCarpetTop = bounds.max.y;
    }
  });
  assert.ok(groundCarpetTop !== undefined && groundCarpetTop > 0.015);
  assert.ok(
    solids.some((s) => s.x === 0 && s.z === -37 && Math.abs(s.y + s.h) < 0.001),
  );
});

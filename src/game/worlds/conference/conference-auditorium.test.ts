import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { buildAuditorium } from "./conference-auditorium";
import {
  createPlayer,
  stepPlayer,
  type PlayerState,
  type Solid,
} from "../../physics/physics";
function walk(p: PlayerState, z: number, solids: Solid[]) {
  for (let i = 0; i < 5000 && Math.abs(p.z - z) > 0.1; i++)
    stepPlayer(
      p,
      {
        x: 0,
        y: Math.sign(z - p.z) * Math.min(1, Math.abs(z - p.z) * 0.75),
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
function walkAcross(p: PlayerState, x: number, solids: Solid[]) {
  for (let i = 0; i < 2000 && Math.abs(p.x - x) > 0.1; i++)
    stepPlayer(
      p,
      {
        x: -Math.sign(x - p.x) * Math.min(1, Math.abs(x - p.x) * 0.75),
        y: 0,
        jump: false,
        jumpHeld: false,
        traversal: false,
      },
      1 / 60,
      0,
      solids,
    );
  assert.ok(Math.abs(p.x - x) < 0.15, `Reached ${p.x}, expected ${x}`);
}

test("the center aisle reaches paired side stairs to the pulpit and returns", () => {
  const { solids } = buildAuditorium(new THREE.Group());
  for (const side of [-25, 25]) {
    const p = createPlayer(0, 0, -0.5);
    walk(p, -70, solids);
    walkAcross(p, side, solids);
    walk(p, -79.8, solids);
    walkAcross(p, Math.sign(side) * 3.6, solids);
    walk(p, -83, solids);
    walkAcross(p, 0, solids);
    assert.ok(Math.abs(p.y - 3) < 0.01);
    walkAcross(p, side, solids);
    walk(p, -70, solids);
    walkAcross(p, 0, solids);
    walk(p, -0.5, solids);
    assert.equal(p.y, 0);
  }
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
      seats += object.count;
    }
  });
  assert.ok(batches > 3);
  assert.ok(seats / 3 > 10000);
  assert.equal(result.landmarks.length, 3);
});

test("rendered choir backrests face the organ while audience backrests face away", () => {
  const parent = new THREE.Group();
  buildAuditorium(parent);
  parent.updateMatrixWorld(true);
  const backs: THREE.InstancedMesh[] = [];
  parent.traverse((object) => {
    if (
      object instanceof THREE.InstancedMesh &&
      object.name === "auditorium seating" &&
      object.geometry.attributes.position.count === 60
    )
      backs.push(object);
  });
  const back = new THREE.Matrix4(),
    cushion = new THREE.Matrix4();
  let choir = 0,
    audience = 0;
  for (const part of backs) {
    const cushionPart = part.parent!.children[1] as THREE.InstancedMesh;
    for (let i = 0; i < part.count; i++) {
      part.getMatrixAt(i, back);
      cushionPart.getMatrixAt(i, cushion);
      back.premultiply(part.matrixWorld);
      cushion.premultiply(cushionPart.matrixWorld);
      const backZ = back.elements[14],
        seatZ = cushion.elements[14];
      if (seatZ < -85) {
        choir++;
        assert.ok(
          backZ < seatZ - 0.2,
          "choir backrest must be on the organ side",
        );
      } else if (seatZ > -60) {
        audience++;
        assert.ok(backZ > seatZ, "audience backrest must be away from stage");
      }
    }
  }
  assert.ok(choir > 300 && audience > 1000);
});

test("rear stair connects the lower seating terraces to the foyer circulation", () => {
  const { solids } = buildAuditorium(new THREE.Group());
  const p = createPlayer(18, 0, -0.5);
  walk(p, -14, solids);
  assert.ok(Math.abs(p.y - 2.4) < 0.1);
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
      if (bounds.containsPoint(new THREE.Vector3(0, -0.1, -70.55)))
        groundCarpetTop = bounds.max.y;
    }
  });
  assert.ok(groundCarpetTop !== undefined && groundCarpetTop > 0.015);
  assert.ok(
    solids.some(
      (s) => s.x === 0 && s.z < -69 && s.z > -71 && Math.abs(s.y + s.h) < 0.001,
    ),
  );
});

test("all side foyer entrances retain walkable balcony routes", () => {
  const { solids } = buildAuditorium(new THREE.Group());
  for (const x of [-56, 56]) {
    for (const level of [0, 12, 24]) {
      const p = createPlayer(x, level, -0.5);
      p.grounded = true;
      // Ground entries climb from the rear cross aisle; balconies continue
      // down their side aisles, whose curved fronts reach farther toward stage.
      walk(p, level ? -44 : -20, solids);
      walk(p, -0.5, solids);
      assert.ok(Math.abs(p.y - level) < 0.01);
      assert.equal(p.crouching, false);
    }
  }
});

test("lower seating and stage treads have solid infill rather than walk-under gaps", () => {
  const { solids } = buildAuditorium(new THREE.Group());
  const contains = (x: number, y: number, z: number) =>
    solids.some(
      (s) =>
        Math.abs(x - s.x) < s.w / 2 &&
        Math.abs(z - s.z) < s.d / 2 &&
        y >= s.y &&
        y < s.y + s.h,
    );
  assert.ok(contains(18, 0.1, -20));
  assert.ok(contains(25, 0.1, -74));
  assert.equal(contains(0, 0.1, -74), false, "central staircase is absent");
  assert.ok(contains(0, 0.1, -85));
  const p = createPlayer(0, 0, -0.5);
  walk(p, -20, solids);
  const centerHeight = p.y;
  for (let i = 0; i < 120; i++)
    stepPlayer(
      p,
      { x: -1, y: 0, jump: false, jumpHeld: false, traversal: false },
      1 / 60,
      0,
      solids,
    );
  assert.ok(p.x > 10, `raked aisle cannot reach adjoining seats at ${p.x}`);
  assert.ok(
    Math.abs(p.y - centerHeight) < 0.2,
    "aisle must match seat bank height",
  );
  assert.equal(p.crouching, false);
});

test("balcony decks are deep continuous structures with visibly curved front guards", () => {
  const { solids } = buildAuditorium(new THREE.Group());
  for (const base of [12, 24]) {
    const decks = solids.filter(
      (s) => s.h > 1.2 && Math.abs(s.y - (base - 7.2)) < 0.001,
    );
    assert.ok(decks.length >= 2400);
    const guards = solids.filter(
      (s) => s.h === 1.1 && Math.abs(s.y - (base - 5.925)) < 0.001,
    );
    const center = guards.find((s) => s.x === 0)!;
    const edge = guards.find((s) => s.x === 60)!;
    assert.ok(
      center.z - edge.z > 9,
      "balcony should sweep almost ten metres at its wings",
    );
    assert.ok(decks.every((s) => s.h > 1.2));
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import { buildRostrum } from "./conference-rostrum";
import { createPlayer, stepPlayer, type Solid } from "../../physics/physics";
import { sceneryCollisionErrors } from "../shared/scenery";

const idle = { x: 0, y: 0, jump: false, jumpHeld: false };
function tick(
  p: ReturnType<typeof createPlayer>,
  solids: Solid[],
  input = idle,
  frames = 60,
) {
  for (let i = 0; i < frames; i++) stepPlayer(p, input, 1 / 60, 0, solids);
}
function setup() {
  const root = new T.Group(),
    { solids } = buildRostrum(root);
  const chairs: T.Object3D[] = [];
  root.traverse((o) => {
    if (o.name === "apostle armchair") chairs.push(o);
  });
  return { root, solids, chairs };
}

test("all twelve stage armchairs stop walking through their seats, backs and arms", () => {
  const { solids, chairs } = setup();
  assert.equal(chairs.length, 12);
  for (const chair of chairs) {
    const x = chair.position.x;
    const front = createPlayer(x, 2.4, -79.5);
    tick(front, solids, { ...idle, y: -1 });
    assert.ok(
      front.z > -80.15,
      `walked through front of chair at ${x}: ${front.z}`,
    );
    const back = createPlayer(x, 2.7, -82.5);
    tick(back, solids, { ...idle, y: 1 });
    assert.ok(back.z < -81.95, `walked through back at ${x}: ${back.z}`);
    for (const side of [-1, 1]) {
      const p = createPlayer(x + side * 1.2, 2.4, -81);
      tick(p, solids, { ...idle, x: side });
      assert.ok(side * (p.x - x) > 1.15, `walked through arm at ${x}`);
    }
  }
});

test("the player can jump onto each cushion and walk between neighboring chairs", () => {
  const { solids, chairs } = setup();
  for (const chair of chairs) {
    const x = chair.position.x;
    const p = createPlayer(x, 2.4, -79.5);
    tick(p, solids, idle, 3);
    tick(p, solids, { ...idle, jump: true, jumpHeld: true }, 1);
    tick(p, solids, { ...idle, y: -1, jumpHeld: true }, 12);
    tick(p, solids, idle, 100);
    assert.ok(
      p.grounded && Math.abs(p.y - 3.15) < 0.01,
      `failed cushion landing at ${x}: ${p.y},${p.z}`,
    );
  }
  for (const side of [-1, 1]) {
    const p = createPlayer(side * 6.25, 2.4, -79.5);
    tick(p, solids, { ...idle, y: -1 }, 35);
    assert.ok(p.z < -82, `gap blocked: ${p.x},${p.z}`);
  }
});

test("each visible chair surface owns fitted collision from the same dimensions", () => {
  const { root, solids, chairs } = setup();
  root.updateMatrixWorld(true);
  for (const chair of chairs) {
    assert.equal(chair.children.length, 4);
    for (const surface of chair.children) {
      const policy = surface.userData.scenery;
      assert.equal(policy?.kind, "solid", "unclassified chair surface");
      const shape = policy.solids[0] as Solid;
      assert.ok(solids.includes(shape));
      const bounds = new T.Box3().setFromObject(surface);
      assert.ok(
        bounds.min.distanceTo(
          new T.Vector3(shape.x - shape.w / 2, shape.y, shape.z - shape.d / 2),
        ) < 1e-6,
      );
      assert.ok(
        bounds.max.distanceTo(
          new T.Vector3(
            shape.x + shape.w / 2,
            shape.y + shape.h,
            shape.z + shape.d / 2,
          ),
        ) < 1e-6,
      );
    }
  }
  assert.deepEqual(sceneryCollisionErrors(root, solids), []);
});

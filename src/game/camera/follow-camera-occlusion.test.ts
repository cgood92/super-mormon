import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import { FollowCamera, cameraSegmentClear } from "./camera";

const player = { x: 0, y: 0, z: 0, yaw: 0, grounded: true, runSpeed: 0 };
const column = { x: 0, y: 0, z: -3, w: 1.5, h: 10.9, d: 1.5 };
function rig() {
  const camera = new T.PerspectiveCamera(58, 16 / 9, 0.08, 200);
  const follow = new FollowCamera(camera);
  follow.reset(player);
  return { camera, follow };
}

for (const moving of [false, true]) {
  test(`${moving ? "a moving column crossing" : "a stationary column in"} the player sightline does not steer or zoom the camera`, () => {
    const actual = rig(),
      reference = rig();
    for (let frame = 0; frame < 180; frame++) {
      const obstacle = { ...column, x: moving ? -4 + frame / 22.5 : 0 };
      reference.follow.update(1 / 60, player, []);
      actual.follow.update(1 / 60, player, [obstacle]);
      assert.ok(
        actual.camera.position.distanceTo(reference.camera.position) < 1e-8,
        `camera moved for sightline occlusion on frame ${frame}`,
      );
      assert.equal(actual.follow.yaw, reference.follow.yaw);
      assert.equal(actual.follow.pitch, reference.follow.pitch);
      assert.equal(actual.follow.obstructed, false);
      assert.ok(
        actual.camera.quaternion.angleTo(reference.camera.quaternion) < 1e-7,
      );
    }
  });
}

test("walking behind a column preserves the unobstructed trailing geometry when the eye path is clear", () => {
  const actual = rig(),
    reference = rig();
  // The closer default framing reaches this column earlier. Keep the fixture
  // within the interval where the eye's swept path is physically clear, which
  // is the behavior this test is isolating.
  for (let frame = 0; frame < 35; frame++) {
    const p = { ...player, z: frame / 40, runSpeed: 1.5 };
    const previous = actual.camera.position.clone();
    reference.follow.update(1 / 60, p, []);
    assert.ok(
      cameraSegmentClear(previous, reference.camera.position, [column], 0.22),
      "fixture must leave the eye path clear",
    );
    actual.follow.update(1 / 60, p, [column]);
    assert.ok(
      actual.camera.position.distanceTo(reference.camera.position) < 1e-8,
      `trailing geometry changed on frame ${frame}`,
    );
    assert.equal(actual.follow.yaw, reference.follow.yaw);
    assert.equal(actual.follow.pitch, reference.follow.pitch);
  }
});

test("manual zoom sweeps the physical eye up to a wall without crossing it", () => {
  const { camera, follow } = rig();
  const wall = { x: 0, y: 0, z: -8.4, w: 10, h: 10, d: 0.5 };
  for (let frame = 0; frame < 120; frame++) {
    const previous = camera.position.clone();
    follow.update(1 / 60, player, [wall], {
      orbitX: 0,
      orbitY: 0,
      recenter: false,
      zoom: frame === 0 ? 1 : 0,
    });
    assert.ok(
      cameraSegmentClear(camera.position, camera.position, [wall], 0.2),
    );
    assert.ok(cameraSegmentClear(previous, camera.position, [wall], 0.2));
  }
  assert.ok(camera.position.z < -7.5 && camera.position.z > -8);
});

test("an embedded eye recovers to physical safety even while a separate column blocks the player", () => {
  const { camera, follow } = rig();
  const wall = { x: 0, y: 0, z: camera.position.z, w: 2, h: 8, d: 2 };
  follow.update(1 / 60, player, [wall, column]);
  assert.ok(
    cameraSegmentClear(camera.position, camera.position, [wall, column], 0.2),
  );
  const recovered = camera.position.clone();
  for (let frame = 0; frame < 60; frame++) {
    follow.update(1 / 60, player, [wall, column]);
    assert.ok(
      cameraSegmentClear(camera.position, camera.position, [wall, column], 0.2),
    );
  }
  assert.ok(
    camera.position.distanceTo(recovered) < 0.1,
    "recovery should settle rather than hunt for a player sightline",
  );
});

test("the conference spawn camera follows past its physical column without freezing or jumping", () => {
  const p = { x: 0, y: 0, z: 36, yaw: Math.PI, grounded: true, runSpeed: 6.5 };
  const camera = new T.PerspectiveCamera(58, 16 / 9, 0.08, 200);
  const follow = new FollowCamera(camera);
  const obstacle = { x: 0, y: 0, z: 43, w: 1.5, h: 10.9, d: 1.5 };
  follow.reset(p, p.yaw, "conference");
  // The closer default can begin inside this deliberately nearby column.
  // Recover once before asserting subsequent swept motion.
  follow.update(1 / 60, p, [obstacle], undefined, "conference");
  for (let frame = 0; frame < 300; frame++) {
    p.z = Math.max(15.545, p.z - 6.5 / 60);
    const previous = camera.position.clone();
    follow.update(1 / 60, p, [obstacle], undefined, "conference");
    assert.ok(
      cameraSegmentClear(previous, camera.position, [obstacle], 0.2),
      `eye crossed column at ${frame}`,
    );
    assert.ok(
      camera.position.distanceTo(previous) < 0.5,
      `eye jumped at ${frame}`,
    );
    assert.ok(
      camera.position.distanceTo(new T.Vector3(p.x, p.y + 2, p.z)) < 13,
      `camera stranded behind column at ${frame}`,
    );
  }
  assert.ok(
    camera.position.z < 27,
    "camera must continue following beyond the column",
  );
});

test("walking past Laban's palace column follows the player continuously without freezing", () => {
  const p = { x: 5, y: 0, z: -12, yaw: Math.PI, grounded: true, runSpeed: 6.5 };
  const camera = new T.PerspectiveCamera(58, 16 / 9, 0.08, 200);
  const follow = new FollowCamera(camera);
  const column = { x: 5, y: 0, z: -18, w: 0.85, h: 6.1, d: 0.85 };
  follow.reset(p, p.yaw, "streets");

  for (let frame = 0; frame < 300; frame++) {
    p.z -= 0.1; // Running straight past the column toward the audience hall
    const previous = camera.position.clone();
    follow.update(1 / 60, p, [column], undefined, "streets");
    const camDistToPlayer = camera.position.distanceTo(
      new T.Vector3(p.x, p.y + 1, p.z),
    );
    assert.ok(
      camDistToPlayer < 9.0,
      `camera stranded behind column at frame ${frame}: dist=${camDistToPlayer.toFixed(2)}m`,
    );
    assert.ok(
      camera.position.distanceTo(previous) > 1e-4,
      `camera froze stationary at frame ${frame}`,
    );
  }
  assert.ok(
    camera.position.z < -30,
    "camera must continue following far past the column",
  );
});

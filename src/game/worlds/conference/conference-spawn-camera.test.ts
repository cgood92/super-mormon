import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { gallery } from "./conference-center";
import { FollowCamera, cameraSegmentClear } from "../../camera/camera";

for (const aspect of [16 / 9, 9 / 16]) {
  test(`the starting character is visible clear of columns at aspect ${aspect}`, () => {
    const scene = new T.Scene();
    const world = gallery(scene);
    try {
      const player = {
        ...world.spawn,
        yaw: world.spawn.yaw ?? Math.PI,
        runSpeed: 0,
      };
      const camera = new T.PerspectiveCamera(58, aspect, 0.08, 320);
      const follow = new FollowCamera(camera);
      scene.updateMatrixWorld(true);
      const raycaster = new T.Raycaster();
      follow.reset(player, player.yaw, "conference");
      for (let frame = 0; frame < 120; frame++) {
        follow.update(1 / 60, player, world.solids, undefined, "conference");
        camera.updateMatrixWorld(true);
        assert.ok(
          cameraSegmentClear(camera.position, camera.position, world.solids),
        );
        for (const height of [0.15, 1, 1.7]) {
          const point = new T.Vector3(player.x, player.y + height, player.z);
          assert.ok(
            cameraSegmentClear(camera.position, point, world.solids, 0.01),
            `spawn sightline blocked at height ${height}`,
          );
          if (frame === 0 || frame === 119) {
            const delta = point.clone().sub(camera.position);
            raycaster.set(camera.position, delta.clone().normalize());
            raycaster.far = delta.length() - 0.01;
            assert.equal(
              raycaster.intersectObjects(scene.children, true).length,
              0,
              `rendered scenery hides height ${height}`,
            );
          }
          const ndc = point.project(camera);
          assert.ok(
            Math.abs(ndc.x) < 0.9 &&
              Math.abs(ndc.y) < 0.9 &&
              ndc.z > -1 &&
              ndc.z < 1,
          );
        }
      }
    } finally {
      world.dispose?.();
    }
  });
}

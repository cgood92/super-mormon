import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildAmmonFlocks } from "./ammon-flocks";
import { createPlayer, stepPlayer } from "../../physics/physics";
import { cameraSegmentClear, FollowCamera } from "../../camera/camera";
import {
  applyAdventureCamera,
  adventureCameraYaw,
} from "../../camera/adventure-camera";

const idle = { interact: false, interactHeld: false, x: 0, y: 0 };

for (const flank of [-1, 1]) {
  test(`Sebus edited entrance, watch and return remain framed from flank ${flank}`, () => {
    const scene = new T.Scene();
    const world = buildAmmonFlocks(scene);
    const player = createPlayer(world.spawn.x, 0, world.spawn.z);
    let viewAspect = 1.78;
    const runtime = world.adventure!({
      viewAspect: () => viewAspect,
      setAvatar() {},
      toast() {},
      complete() {},
      dialog(_k, _t, _b, next) {
        next();
      },
    });
    const snapshot = () =>
      runtime.snapshot() as {
        phase: string;
        flock: { position: T.Vector3 }[];
        raiders: { position: T.Vector3 }[];
      };
    const tick = (x = 0, z = 0) => {
      if (!runtime.movementLocked?.())
        stepPlayer(
          player,
          { x: -x, y: z, jump: false, jumpHeld: false },
          1 / 60,
          0,
          world.solids,
        );
      runtime.update(1 / 60, player, idle);
    };
    const walk = (x: number, z: number, limit = 100) => {
      for (let n = 0; n < limit && snapshot().phase === "drive"; n++) {
        const dx = x - player.x,
          dz = z - player.z,
          d = Math.hypot(dx, dz);
        if (d < 0.3) break;
        tick(dx / d, dz / d);
      }
    };
    // Herd the actual simulated animals from spawn; no actor or player teleportation.
    for (let round = 0; round < 800 && snapshot().phase === "drive"; round++) {
      const animal = snapshot()
        .flock.map((a) => a.position)
        .sort(
          (a, b) => Math.hypot(b.x, b.z - 34) - Math.hypot(a.x, a.z - 34),
        )[0];
      const d = Math.hypot(animal.x, animal.z - 34),
        nx = animal.x / d,
        nz = (animal.z - 34) / d;
      if (Math.hypot(player.x - animal.x, player.z - animal.z) > 6)
        walk(
          animal.x + nx * 3 - nz * 5 * flank,
          animal.z + nz * 3 + nx * 5 * flank,
        );
      for (let f = 0; f < 100 && snapshot().phase === "drive"; f++) {
        const current = snapshot()
          .flock.map((a) => a.position)
          .sort(
            (a, b) => Math.hypot(b.x, b.z - 34) - Math.hypot(a.x, a.z - 34),
          )[0];
        const dist = Math.hypot(current.x, current.z - 34);
        const dx = current.x + (current.x / dist) * 2.5 - player.x,
          dz = current.z + ((current.z - 34) / dist) * 2.5 - player.z,
          dd = Math.hypot(dx, dz);
        tick(dd > 0.25 ? dx / dd : 0, dd > 0.25 ? dz / dd : 0);
      }
    }
    assert.equal(
      snapshot().phase,
      "scatter",
      "walking route reaches the cinematic",
    );
    scene.updateMatrixWorld(true);
    const canopies = world.actorParent!.children.filter(
      (o) => o instanceof T.Mesh && o.position.y === 4.7 && o.scale.x === 3.1,
    );
    assert.equal(canopies.length, 2);
    const canopySolids = canopies.map((o) => {
      const b = new T.Box3().setFromObject(o),
        size = b.getSize(new T.Vector3()),
        center = b.getCenter(new T.Vector3());
      return {
        x: center.x,
        y: b.min.y,
        z: center.z,
        w: size.x,
        h: size.y,
        d: size.z,
      };
    });
    const opaque = [...world.solids, ...canopySolids];
    const cameras = [0.46, 1.78].map(
      (aspect) => new T.PerspectiveCamera(58, aspect, 0.08, 320),
    );
    const follows = cameras.map((camera) => {
      const follow = new FollowCamera(camera);
      follow.reset(player, player.yaw, "streets");
      return follow;
    });
    // Recover from an initially embedded eye at the actual tree trunk.
    cameras.forEach((c) => c.position.set(-18, 2, 9));
    const xSigns = new Set<number>();
    let samples = 0;
    while (snapshot().phase === "scatter" && samples < 600) {
      const shot = runtime.camera?.();
      assert.ok(shot);
      assert.equal(
        shot.cut,
        true,
        "edited entrances never sweep through opaque scenery",
      );
      xSigns.add(Math.sign(shot.position.x - shot.focus.x));
      for (const camera of cameras) {
        viewAspect = camera.aspect;
        runtime.update(0, player, idle);
        const aspectShot = runtime.camera!()!;
        applyAdventureCamera(camera, aspectShot, opaque, 1 / 60);
        follows[cameras.indexOf(camera)].yaw = adventureCameraYaw(
          aspectShot,
          0,
        );
        assert.ok(
          cameraSegmentClear(camera.position, camera.position, opaque, 0.2),
        );
        camera.updateMatrixWorld();
        const subjects = [
          new T.Vector3(player.x, player.y + 1, player.z),
          new T.Vector3(0, 1, 34),
          ...snapshot().flock.map((a) =>
            a.position.clone().add(new T.Vector3(0, 0.7, 0)),
          ),
          ...snapshot().raiders.map((r) => r.position.clone()),
        ];
        for (const target of subjects) {
          const p = target.clone().project(camera);
          assert.ok(
            Math.abs(p.x) < 0.98 && Math.abs(p.y) < 0.98 && p.z > -1 && p.z < 1,
            `aspect ${camera.aspect} frame ${samples}: subject ${target.toArray()} projects ${p.toArray()}`,
          );
          assert.ok(
            cameraSegmentClear(camera.position, target, opaque, 0.035),
            `subject clear at sample ${samples}`,
          );
          const direction = target.clone().sub(camera.position),
            ray = new T.Raycaster(
              camera.position,
              direction.clone().normalize(),
              0.01,
              direction.length(),
            );
          assert.equal(
            ray.intersectObjects(canopies, true).length,
            0,
            "actual rendered opaque canopy stays outside the shot",
          );
        }
      }
      tick();
      samples++;
    }
    assert.equal(snapshot().phase, "recover");
    assert.ok(samples > 450, "samples the entire acted sequence");
    assert.equal(xSigns.size, 2, "checks both authored watch angles");
    assert.equal(runtime.camera?.(), undefined);
    assert.equal(runtime.movementLocked?.(), false);
    for (const camera of cameras) {
      const follow = follows[cameras.indexOf(camera)];
      for (let f = 0; f < 60; f++) {
        follow.update(1 / 60, player, opaque, undefined, "streets");
        assert.ok(
          cameraSegmentClear(camera.position, camera.position, opaque, 0.2),
          "return to player control remains clear",
        );
      }
    }
    runtime.dispose();
    world.dispose!();
  });
}

test("edited Sebus camera recovers if an opaque prop moves onto its endpoint", () => {
  const camera = new T.PerspectiveCamera(58, 0.46, 0.08, 320);
  const shot = {
    position: new T.Vector3(20, 19.2, 6),
    focus: new T.Vector3(0, 1.2, 32),
    cut: true,
  };
  applyAdventureCamera(camera, shot, [], 1 / 60);
  const movedProp = [{ x: 20, y: 18, z: 6, w: 2, h: 2, d: 2 }];
  assert.equal(
    cameraSegmentClear(camera.position, camera.position, movedProp, 0.2),
    false,
  );
  applyAdventureCamera(camera, shot, movedProp, 1 / 60);
  assert.ok(
    cameraSegmentClear(camera.position, camera.position, movedProp, 0.2),
  );
  assert.ok(cameraSegmentClear(camera.position, shot.focus, movedProp, 0.035));
});

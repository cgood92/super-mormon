import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildPromisedLand } from "../src/super/promised-land";
import { buildOliveVineyard } from "../src/super/olive-vineyard";
import { createPlayer, stepPlayer } from "../src/super/physics";
import { sceneryCollisionErrors } from "../src/super/scenery";
import type { Point, WorldData } from "../src/super/worlds";

const idle = { interact: false, interactHeld: false, x: 0, y: 0 };
function walk(
  world: WorldData,
  player: ReturnType<typeof createPlayer>,
  target: Point,
  update?: () => void,
) {
  for (let i = 0; i < 1600; i++) {
    const dx = target.x - player.x,
      dz = target.z - player.z,
      d = Math.hypot(dx, dz);
    if (d < 0.15 && Math.hypot(player.vx, player.vz) < 0.3) return;
    const strength = Math.min(1, d * 1.5);
    stepPlayer(
      player,
      {
        x: d ? (-dx / d) * strength : 0,
        y: d ? (dz / d) * strength : 0,
        jump: false,
        jumpHeld: false,
      },
      1 / 60,
      0,
      world.solids,
      world.climbables,
    );
    world.update?.(1 / 60, player);
    update?.();
  }
  assert.fail(
    `Route blocked to ${target.x},${target.z}: ${player.x},${player.y},${player.z}`,
  );
}

for (const [label, build, count] of [
  ["promised land", buildPromisedLand, 11],
  ["olive vineyard", buildOliveVineyard, 23],
] as const) {
  test(`${label}: a normal walking route reaches every task, and work takes sustained input`, () => {
    const scene = new T.Scene(),
      world = build(scene),
      player = createPlayer(world.spawn.x, world.spawn.y, world.spawn.z);
    let completed = 0;
    const refs: string[] = [],
      texts: string[] = [];
    const runtime = world.adventure!({
      setAvatar: () => {},
      toast: () => {},
      complete: () => {
        completed++;
      },
      dialog: (ref, _title, text, next) => {
        refs.push(ref);
        texts.push(text);
        next();
      },
    });
    type State = {
      phase: string;
      index: number;
      effort: number;
      targets: (Point & { id: string })[];
    };
    const snapshot = () => runtime.snapshot() as State;
    assert.equal(snapshot().targets.length, count);
    assert.deepEqual(sceneryCollisionErrors(scene, world.solids), []);
    const ordered: string[] = [];
    for (const target of snapshot().targets) {
      assert.equal(snapshot().phase, target.id);
      ordered.push(target.id);
      // Holding action away from the target cannot progress the story.
      for (let i = 0; i < 18; i++)
        runtime.update(
          0.1,
          { ...player, x: 60, z: 58 },
          { ...idle, interact: true, interactHeld: true },
        );
      assert.equal(snapshot().phase, target.id);
      if (label === "olive vineyard" && target.id === "gradual1") {
        // Walk around the mother tree when returning straight from the northern plot.
        walk(world, player, { x: 6, y: 0, z: -35 });
        walk(world, player, { x: 6, y: 0, z: 25 });
      }
      walk(world, player, target, () => runtime.update(1 / 60, player, idle));
      runtime.update(0.016, player, {
        ...idle,
        interact: true,
        interactHeld: true,
      });
      if (snapshot().phase === target.id) {
        assert.equal(completed, 0);
        for (let i = 0; i < 16 && snapshot().phase === target.id; i++) {
          runtime.update(0.1, player, { ...idle, interactHeld: true });
          world.update?.(0.1, player);
        }
      }
      assert.notEqual(snapshot().phase, target.id);
      assert.deepEqual(sceneryCollisionErrors(scene, world.solids), []);
    }
    assert.equal(snapshot().phase, "done");
    assert.equal(completed, 1);
    for (let i = 0; i < 4; i++)
      runtime.update(0.1, player, {
        ...idle,
        interact: true,
        interactHeld: true,
      });
    assert.equal(completed, 1);
    if (label === "promised land") {
      assert.ok(refs.indexOf("2 Nephi 4:12") < refs.indexOf("2 Nephi 5:5–7"));
      assert.ok(texts.some((text) => text.includes("manner of his death")));
      assert.equal(scene.getObjectByName("lehi-character")?.visible, false);
      assert.ok(scene.getObjectByName("Temple foundation"));
    } else {
      assert.ok(ordered.indexOf("firstReturn") < ordered.indexOf("decline"));
      assert.ok(ordered.indexOf("spare") < ordered.indexOf("regraft"));
      assert.ok(ordered.indexOf("gradual1") < ordered.indexOf("gradual2"));
      assert.ok(texts.some((text) => text.includes("gradually")));
    }
    runtime.dispose();
    world.dispose!();
    world.dispose!();
    assert.equal(scene.children.length, 0);
  });

  test(`${label}: trunks block walking, can be walked around, and instance buffers are disposed once`, () => {
    const scene = new T.Scene(),
      world = build(scene);
    const trunk = scene.getObjectByName("Olive trunk") as T.Mesh;
    const { x, z } = trunk.position;
    const p = createPlayer(x, 0, z + 3);
    for (let i = 0; i < 150; i++)
      stepPlayer(
        p,
        { x: 0, y: -1, jump: false, jumpHeld: false },
        1 / 60,
        0,
        world.solids,
      );
    assert.ok(p.z > z + 0.6, "cannot walk through solid trunk");
    walk(world, p, { x: x + 3, y: 0, z: z + 3 });
    walk(world, p, { x: x + 3, y: 0, z: z - 3 });
    walk(world, p, { x, y: 0, z: z - 3 });
    p.y = 3;
    p.grounded = false;
    for (let i = 0; i < 120; i++)
      stepPlayer(
        p,
        { x: 0, y: 0, jump: false, jumpHeld: false },
        1 / 60,
        0,
        world.solids,
      );
    assert.ok(
      p.grounded && Math.abs(p.y) < 0.01,
      "lands on the sole earth surface",
    );
    scene.updateMatrixWorld(true);
    const ray = new T.Raycaster(
      new T.Vector3(40, 8, 40),
      new T.Vector3(0, -1, 0),
    );
    assert.equal(
      ray
        .intersectObjects(scene.children, true)
        .filter((hit) => Math.abs(hit.point.y) < 0.01).length,
      1,
      "one owner for representative walk surface",
    );
    let disposed = 0,
      count = 0;
    scene.traverse((object) => {
      if (object instanceof T.InstancedMesh) {
        count++;
        object.addEventListener("dispose", () => {
          disposed++;
        });
      }
    });
    assert.ok(count > 0);
    world.dispose!();
    world.dispose!();
    assert.equal(disposed, count);
  });
}

// Validate the real authored shots against the final built scenery as well as the player.
// Both moving into the shot and returning to gameplay must remain clear on a phone.
test("new adventure cinematics preserve clear player framing on phone and desktop", async () => {
  const { StoryCinematic } = await import("../src/super/cinematic");
  const { FollowCamera } = await import("../src/super/camera");
  for (const build of [buildPromisedLand, buildOliveVineyard]) {
    const scene = new T.Scene(),
      world = build(scene),
      p = createPlayer();
    const shots: {
      shot: import("../src/super/cinematic").StoryShot;
      at: Point;
    }[] = [];
    const runtime = world.adventure!({
      setAvatar: () => {},
      toast: () => {},
      complete: () => {},
      dialog: (_ref, _title, _body, next, shot) => {
        if (shot) shots.push({ shot, at: { x: p.x, y: p.y, z: p.z } });
        next();
      },
    });
    const state = () =>
      runtime.snapshot() as {
        phase: string;
        targets: (Point & { id: string })[];
      };
    for (const target of state().targets) {
      Object.assign(p, target);
      for (let i = 0; i < 16 && state().phase === target.id; i++)
        runtime.update(0.1, p, { ...idle, interact: true, interactHeld: true });
    }
    assert.ok(shots.length > 5);
    for (const aspect of [16 / 9, 390 / 844])
      for (const { shot, at } of shots)
        for (const yaw of [0, Math.PI / 2]) {
          const actor = new T.Group();
          actor.position.set(at.x, at.y, at.z);
          scene.add(actor);
          const camera = new T.PerspectiveCamera(58, aspect, 0.08, 320),
            follow = new FollowCamera(camera);
          follow.reset({ ...at, yaw }, yaw, "streets");
          follow.update(
            0.04,
            { ...at, yaw },
            world.solids,
            undefined,
            "streets",
          );
          const movie = new StoryCinematic(
            camera,
            {
              ...shot,
              actors: [...(shot.actors ?? []), { group: actor, speaker: true }],
            },
            world.solids,
            scene,
          );
          for (let frame = 0; frame < 65; frame++) {
            if (frame === 45) movie.finish();
            movie.update(1 / 30);
            camera.updateMatrixWorld();
            const diagnostic = movie.snapshot();
            assert.equal(
              diagnostic.clear,
              true,
              `${world.name}: opaque geometry intersects camera`,
            );
            assert.equal(
              diagnostic.actorVisible,
              true,
              `${world.name}: scenery occludes player`,
            );
          }
          movie.dispose();
          scene.remove(actor);
        }
    runtime.dispose();
    world.dispose!();
  }
});

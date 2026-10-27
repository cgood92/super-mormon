import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildTreeOfLife } from "../src/super/tree-of-life";
import { buildBountiful } from "../src/super/bountiful";
import { FollowCamera } from "../src/super/camera";
import { StoryCinematic, StoryMeshObstacles } from "../src/super/cinematic";
import type { Solid } from "../src/super/physics";
const inside = (p: T.Vector3, s: Solid, pad = 0.12) =>
  Math.abs(p.x - s.x) < s.w / 2 + pad &&
  p.y > s.y - pad &&
  p.y < s.y + s.h + pad &&
  Math.abs(p.z - s.z) < s.d / 2 + pad;
for (const aspect of [16 / 9, 844 / 390, 390 / 844])
  for (const kind of ["tree", "ore"] as const)
    test(`${kind} prop-centered shots preserve an unobstructed actor at aspect ${aspect.toFixed(2)} at every approach and return frame`, () => {
      const scene = new T.Scene();
      const world =
        kind === "tree" ? buildTreeOfLife(scene) : buildBountiful(scene);
      const focus =
        kind === "tree" ? { x: -20, y: 0, z: -52 } : { x: -22, y: 0, z: 18 };
      for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
        const actor = new T.Group();
        actor.position.set(
          focus.x + Math.sin(angle) * 3,
          0,
          focus.z + Math.cos(angle) * 3,
        );
        scene.add(actor);
        const camera = new T.PerspectiveCamera(58, aspect, 0.08, 320);
        const follow = new FollowCamera(camera);
        const player = { ...actor.position, yaw: angle + Math.PI };
        follow.reset(player, angle + Math.PI, "streets");
        follow.update(0.04, player, world.solids, undefined, "streets");
        const movie = new StoryCinematic(
          camera,
          { actors: [{ group: actor, speaker: true }], focus },
          world.solids,
          scene,
        );
        const check = () => {
          const diagnostic = movie.snapshot();
          assert.equal(
            diagnostic.clear,
            true,
            `${kind}: camera intersects opaque render geometry`,
          );
          assert.equal(
            diagnostic.actorVisible,
            true,
            `${kind}: opaque scenery hides actor`,
          );
          assert.ok(
            !world.solids.some((s) => inside(camera.position, s)),
            `${kind}: camera entered scenery at ${camera.position.toArray()}`,
          );
          assert.ok(
            camera.position.distanceTo(actor.position) > 2.4,
            `${kind}: camera collapsed into actor`,
          );
          const chest = actor.position.clone().add(new T.Vector3(0, 1.1, 0));
          for (let i = 1; i < 30; i++)
            assert.ok(
              !world.solids.some((s) =>
                inside(camera.position.clone().lerp(chest, i / 30), s, 0),
              ),
              `${kind}: actor occluded`,
            );
          const head = actor.position
            .clone()
            .add(new T.Vector3(0, 1.65, 0))
            .project(camera);
          const feet = actor.position
            .clone()
            .add(new T.Vector3(0, 0.3, 0))
            .project(camera);
          assert.ok(
            head.y < 0.95 && Math.abs(head.x) < 0.86,
            `${kind}: head left viewport`,
          );
          assert.ok(
            Math.abs(head.y - feet.y) > 0.1,
            `${kind}: actor became too small`,
          );
          const projected = chest.project(camera);
          assert.ok(
            Math.abs(projected.x) < 0.86 &&
              projected.y > -0.55 &&
              projected.y < 0.8,
            `${kind}: actor left frame ${projected.toArray()}`,
          );
        };
        for (let i = 0; i < 120; i++) {
          movie.update(1 / 30);
          camera.updateMatrixWorld();
          check();
        }
        movie.finish();
        for (let i = 0; i < 30; i++) {
          movie.update(1 / 30);
          camera.updateMatrixWorld();
          check();
        }
        actor.removeFromParent();
      }
      world.dispose?.();
    });

test("tight interiors retain the safe gameplay view instead of squeezing through walls", () => {
  const scene = new T.Scene(),
    actor = new T.Group();
  scene.add(actor);
  const solids: Solid[] = [
    { x: 0, y: 0, z: 3.5, w: 8, h: 3, d: 0.2 },
    { x: 0, y: 0, z: -3.5, w: 8, h: 3, d: 0.2 },
    { x: 3.5, y: 0, z: 0, w: 0.2, h: 3, d: 8 },
    { x: -3.5, y: 0, z: 0, w: 0.2, h: 3, d: 8 },
    { x: 0, y: 2.2, z: 0, w: 8, h: 0.2, d: 8 },
  ];
  const camera = new T.PerspectiveCamera(58, 16 / 9, 0.08, 100);
  camera.position.set(0, 1.6, 2.9);
  camera.lookAt(0, 1.05, 0);
  const original = camera.position.clone();
  const movie = new StoryCinematic(
    camera,
    { actors: [{ group: actor }], focus: { x: 0, y: 2.6, z: 0 } },
    solids,
    scene,
  );
  for (let i = 0; i < 100; i++) {
    movie.update(0.04);
    assert.ok(!solids.some((s) => inside(camera.position, s)));
    assert.equal(movie.snapshot().actorVisible, true);
  }
  assert.equal(movie.snapshot().fallback, true);
  assert.ok(camera.position.distanceTo(original) < 1e-8);
});

test("render-only canopy and pillar constrain camera travel without adding physics boxes", () => {
  const scene = new T.Scene(),
    actor = new T.Group();
  scene.add(actor);
  for (const [x, y, z, w, h, d] of [
    [0, 3.2, 4, 8, 0.7, 3],
    [2, 1.5, 4, 1, 3, 2],
  ]) {
    const mesh = new T.Mesh(
      new T.BoxGeometry(w, h, d),
      new T.MeshBasicMaterial(),
    );
    mesh.position.set(x, y, z);
    scene.add(mesh);
  }
  const camera = new T.PerspectiveCamera(58, 16 / 9, 0.08, 100);
  camera.position.set(0, 1.8, 7);
  camera.lookAt(0, 1.05, 0);
  const movie = new StoryCinematic(
    camera,
    { actors: [{ group: actor }], focus: { x: 0, y: 3.2, z: 4 } },
    [],
    scene,
  );
  for (let i = 0; i < 100; i++) {
    movie.update(0.04);
    assert.equal(movie.snapshot().clear, true);
    assert.equal(movie.snapshot().actorVisible, true);
  }
  movie.finish();
  for (let i = 0; i < 25; i++) {
    movie.update(0.04);
    assert.equal(movie.snapshot().clear, true);
    assert.equal(movie.snapshot().actorVisible, true);
  }
});

test("an opaque canopy containing the gameplay camera is escaped before the first story frame", () => {
  const scene = new T.Scene(),
    actor = new T.Group();
  scene.add(actor);
  const canopy = new T.Mesh(
    new T.BoxGeometry(2, 2, 2),
    new T.MeshBasicMaterial(),
  );
  canopy.position.set(0, 3, 6);
  scene.add(canopy);
  const camera = new T.PerspectiveCamera(58, 16 / 9, 0.08, 100);
  camera.position.set(0, 3, 6);
  camera.lookAt(0, 1, 0);
  const movie = new StoryCinematic(
    camera,
    { actors: [{ group: actor }] },
    [],
    scene,
  );
  assert.equal(movie.snapshot().clear, true);
  assert.equal(movie.snapshot().actorVisible, true);
  for (let i = 0; i < 60; i++) {
    movie.update(0.04);
    assert.equal(movie.snapshot().clear, true);
    assert.equal(movie.snapshot().actorVisible, true);
  }
  movie.finish();
  for (let i = 0; i < 25; i++) {
    movie.update(0.04);
    assert.equal(movie.snapshot().clear, true);
  }
  movie.dispose();
  assert.equal(movie.snapshot().clear, true);
});

test("opaque prop bounds follow its changed world matrix instead of the constructor location", () => {
  const scene = new T.Scene(),
    prop = new T.Mesh(new T.BoxGeometry(2, 2, 2), new T.MeshBasicMaterial());
  prop.position.set(10, 1, 0);
  scene.add(prop);
  const obstacles = new StoryMeshObstacles(scene, []),
    camera = new T.Vector3(0, 1, 6),
    actor = new T.Vector3(0, 1, 0);
  assert.equal(obstacles.clear(camera, actor), true);
  prop.position.set(0, 1, 3);
  prop.updateWorldMatrix(true, true);
  assert.equal(obstacles.clear(camera, actor), false);
});

test("prop movement is applied before validating the current story camera", () => {
  const scene = new T.Scene(),
    actor = new T.Group();
  scene.add(actor);
  const prop = new T.Mesh(
    new T.BoxGeometry(2, 3, 2),
    new T.MeshBasicMaterial(),
  );
  prop.position.set(10, 1.5, 0);
  scene.add(prop);
  const camera = new T.PerspectiveCamera(58, 16 / 9, 0.08, 100);
  camera.position.set(0, 3, 7);
  camera.lookAt(0, 1, 0);
  const movie = new StoryCinematic(
    camera,
    {
      actors: [{ group: actor }],
      props: [{ object: prop, to: { x: 0, y: 1.5, z: 3 } }],
    },
    [],
    scene,
  );
  for (let i = 0; i < 80; i++) {
    movie.update(0.04);
    assert.equal(movie.snapshot().clear, true);
    assert.equal(movie.snapshot().actorVisible, true);
  }
});

test("camera obstacles include detailed LOD surfaces before a distant level switches", () => {
  const root = new T.Group();
  const lod = new T.LOD();
  const detail = new T.Group();
  const thickBack = new T.Mesh(
    new T.BoxGeometry(2, 2, 0.4),
    new T.MeshStandardMaterial(),
  );
  detail.add(thickBack);
  const distant = new T.Group();
  lod.addLevel(detail, 0);
  lod.addLevel(distant, 48);
  root.add(lod);
  const camera = new T.PerspectiveCamera();
  camera.position.set(0, 0, 100);
  camera.updateMatrixWorld();
  root.updateMatrixWorld(true);
  lod.update(camera);
  assert.equal(detail.visible, false);
  const obstacles = new StoryMeshObstacles(root, []);
  camera.position.z = 5;
  camera.updateMatrixWorld();
  lod.update(camera);
  assert.equal(detail.visible, true);
  assert.equal(
    obstacles.clear(new T.Vector3(0, 0, -0.5), new T.Vector3(0, 0, 0.5)),
    false,
  );
  root.visible = false;
  assert.equal(
    new StoryMeshObstacles(root, []).clear(
      new T.Vector3(0, 0, -0.5),
      new T.Vector3(0, 0, 0.5),
    ),
    true,
  );
});

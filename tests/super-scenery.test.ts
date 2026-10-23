import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildBountiful } from "../src/super/bountiful";
import { createPlayer, stepPlayer } from "../src/super/physics";

const walk = (
  p: ReturnType<typeof createPlayer>,
  solids: Parameters<typeof stepPlayer>[4],
  x: number,
  y: number,
  frames = 180,
) => {
  for (let i = 0; i < frames; i++)
    stepPlayer(
      p,
      { x, y, jump: false, jumpHeld: false, traversal: false },
      1 / 60,
      0,
      solids,
    );
};
test("Bountiful palms block walking and leave room to walk around", () => {
  const w = buildBountiful(new T.Scene());
  const p = createPlayer(-68, 0, -8);
  walk(p, w.solids, -1, 0, 60);
  assert.ok(p.x < -65.45, `walked through palm: ${p.x}`);
  walk(p, w.solids, 0, 1, 30);
  walk(p, w.solids, -1, 0, 60);
  assert.ok(p.x > -64);
  w.dispose!();
});
test("shore limestone supports a continuous ascent and a landing", () => {
  const w = buildBountiful(new T.Scene());
  const p = createPlayer(43, 0, -42);
  walk(p, w.solids, 0, 1, 65);
  assert.ok(p.y > 0.7, `limestone had no supporting terrain: ${p.y}`);
  const landing = createPlayer(43, 8, -35);
  walk(landing, w.solids, 0, 0, 100);
  assert.ok(landing.grounded && landing.y > 3.5);
  const surface = landing.y;
  const launched = stepPlayer(
    landing,
    { x: 0, y: 0, jump: true, jumpHeld: true },
    1 / 60,
    0,
    w.solids,
  );
  assert.ok(launched.jumped);
  let landed = false;
  for (let i = 0; i < 100; i++)
    landed =
      stepPlayer(
        landing,
        { x: 0, y: 0, jump: false, jumpHeld: i < 12 },
        1 / 60,
        0,
        w.solids,
      ).landed || landed;
  assert.ok(landed && landing.grounded);
  assert.equal(landing.y, surface);
  w.dispose!();
});

test("registered foreground scenery cannot lose its physical surfaces silently", async () => {
  const { sceneryCollisionErrors } = await import("../src/super/scenery");
  const scene = new T.Scene(),
    w = buildBountiful(scene);
  assert.deepEqual(sceneryCollisionErrors(scene, w.solids), []);
  let registered = 0;
  scene.traverse((o) => {
    if (o.userData.scenery?.kind === "solid")
      registered += o.userData.scenery.solids.length;
  });
  assert.ok(
    registered > 200,
    "discover all physical scenery, including individual rock terraces",
  );
  const palm = scene.getObjectByName("Palm trunk")!;
  const shape = palm.userData.scenery.solids[0];
  w.solids.splice(w.solids.indexOf(shape), 1);
  assert.ok(
    sceneryCollisionErrors(scene, w.solids).some((e) =>
      e.includes("Palm trunk"),
    ),
  );
  w.dispose!();
});

test("new named foreground models must declare physical intent", async () => {
  const { sceneryCollisionErrors, markScenery } =
    await import("../src/super/scenery");
  const scene = new T.Scene();
  const rock = new T.Mesh(new T.BoxGeometry(), new T.MeshBasicMaterial());
  rock.name = "New riverside boulder";
  scene.add(rock);
  assert.ok(
    sceneryCollisionErrors(scene, []).some((e) => e.includes("unclassified")),
  );
  markScenery(rock, {
    kind: "backdrop",
    reason: "Beyond the playable boundary",
  });
  assert.deepEqual(sceneryCollisionErrors(scene, []), []);
  rock.geometry.dispose();
  (rock.material as T.Material).dispose();
});

test("Jerusalem scenery and conference grove instances retain collision registration", async () => {
  const { sceneryCollisionErrors } = await import("../src/super/scenery");
  const { buildJerusalem } = await import("../src/super/jerusalem");
  const { buildRooftop } = await import("../src/super/conference-rooftop");
  const scene = new T.Scene(),
    city = buildJerusalem("streets", scene);
  assert.deepEqual(sceneryCollisionErrors(scene, city.solids), []);
  city.dispose!();
  const group = new T.Group(),
    roof = buildRooftop(group);
  assert.deepEqual(sceneryCollisionErrors(group, roof.solids), []);
});

test("adjacent limestone terraces have no duplicate coplanar top hits", () => {
  const scene = new T.Scene(),
    world = buildBountiful(scene);
  scene.updateMatrixWorld(true);
  const rocks: T.Object3D[] = [];
  scene.traverse((o) => {
    if (o.name === "Coastal limestone natural surface") rocks.push(o);
  });
  const ray = new T.Raycaster();
  for (let x = 46.8; x <= 48.2; x += 0.07)
    for (let z = -40; z <= -30; z += 0.43) {
      ray.set(new T.Vector3(x, 20, z), new T.Vector3(0, -1, 0));
      const tops = ray
        .intersectObjects(rocks, false)
        .filter((hit) => hit.face!.normal.y > 0.9);
      for (const hit of tops)
        assert.equal(
          new Set(
            tops
              .filter((other) => Math.abs(other.point.y - hit.point.y) < 1e-5)
              .map(
                (other) => `${other.object.uuid}:${other.instanceId ?? "mesh"}`,
              ),
          ).size,
          1,
          `duplicate limestone top at ${x},${z},${hit.point.y}`,
        );
    }
  world.dispose!();
});

test("each cave shell face has its own matching collider", async () => {
  const { buildJerusalem } = await import("../src/super/jerusalem");
  const scene = new T.Scene(),
    world = buildJerusalem("streets", scene);
  scene.updateMatrixWorld(true);
  scene.traverse((o) => {
    if (!o.name.startsWith("weathered cave rock")) return;
    const bounds = new T.Box3().setFromObject(o),
      [s] = o.userData.scenery.solids;
    assert.equal(o.userData.scenery.solids.length, 1);
    assert.ok(Math.abs(bounds.min.x - (s.x - s.w / 2)) < 1e-5);
    assert.ok(Math.abs(bounds.max.x - (s.x + s.w / 2)) < 1e-5);
    assert.ok(Math.abs(bounds.min.y - s.y) < 1e-5);
    assert.ok(Math.abs(bounds.max.y - (s.y + s.h)) < 1e-5);
  });
  world.dispose!();
});

test("natural rock surfaces stay within a physical step of supporting layers", () => {
  const scene = new T.Scene(),
    world = buildBountiful(scene);
  scene.updateMatrixWorld(true);
  const ray = new T.Raycaster();
  let samples = 0;
  scene.traverse((o) => {
    if (!(o instanceof T.Mesh) || !o.name.endsWith("natural surface")) return;
    const surfaces = o.userData.scenery.solids;
    const bounds = new T.Box3().setFromObject(o);
    for (
      let x = bounds.min.x + 0.1;
      x < bounds.max.x;
      x += (bounds.max.x - bounds.min.x) / 9
    )
      for (
        let z = bounds.min.z + 0.1;
        z < bounds.max.z;
        z += (bounds.max.z - bounds.min.z) / 9
      ) {
        ray.set(new T.Vector3(x, bounds.max.y + 2, z), new T.Vector3(0, -1, 0));
        const hit = ray.intersectObject(o, false)[0];
        if (!hit) continue;
        const support = Math.max(
          0,
          ...surfaces
            .filter(
              (s: any) =>
                x >= s.x - s.w / 2 &&
                x <= s.x + s.w / 2 &&
                z >= s.z - s.d / 2 &&
                z <= s.z + s.d / 2,
            )
            .map((s: any) => s.y + s.h),
        );
        if (support === 0) continue;
        assert.ok(
          Math.abs(hit.point.y - support) <= 0.35,
          `${o.name} render/support mismatch ${hit.point.y - support} at ${x},${z}`,
        );
        samples++;
      }
  });
  assert.ok(samples > 300);
  world.dispose!();
});

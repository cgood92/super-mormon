import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { adventureLandscape } from "../shared/adventure-landscape";
import { createPlayer, stepPlayer } from "../../physics/physics";
import { sceneryCollisionErrors } from "../shared/scenery";

const landscape = () =>
  adventureLandscape(
    new T.Scene(),
    "The Promised Land — mountain valleys",
    0x8b9b68,
    190,
    260,
  );
const walk = (
  p: ReturnType<typeof createPlayer>,
  solids: Parameters<typeof stepPlayer>[4],
  x: number,
  y: number,
  frames: number,
) => {
  for (let i = 0; i < frames; i++)
    stepPlayer(p, { x, y, jump: false, jumpHeld: false }, 1 / 60, 0, solids);
};

test("decorative horizon hills stay beyond the explorable northern ground", () => {
  const land = landscape();
  land.root.updateMatrixWorld(true);
  land.root.traverse((object) => {
    if (object.name !== "Distant rolling hills") return;
    const box = new T.Box3().setFromObject(object);
    assert.ok(
      box.max.z < -130,
      `reachable nonphysical hill ends at ${box.max.z}`,
    );
  });
  land.dispose();
});

test("rear foothills provide fitted support while the settlement valley remains open", () => {
  const land = landscape();
  const climber = createPlayer(-60, 0, -100);
  walk(climber, land.solids, 0, -1, 100);
  assert.ok(
    climber.y > 1,
    `walked through foothill at ground height ${climber.y}`,
  );
  const landing = createPlayer(-60, 18, -117);
  walk(landing, land.solids, 0, 0, 150);
  assert.ok(landing.grounded && landing.y >= 7.9);
  const around = createPlayer(-43, 0, -100);
  walk(around, land.solids, 0, -1, 230);
  assert.ok(around.z < -123 && around.y === 0, "open passage around foothill");
  const valley = createPlayer(25, 0, -92);
  walk(valley, land.solids, 0, -1, 120);
  assert.ok(valley.z < -104 && valley.y === 0);
  assert.deepEqual(sceneryCollisionErrors(land.root, land.solids), []);
  land.dispose();
});

test("foothills keep one visible summit surface and a bounded collision/render cost", () => {
  const land = landscape();
  land.root.updateMatrixWorld(true);
  const ray = new T.Raycaster(
    new T.Vector3(-60.3, 20, -116.8),
    new T.Vector3(0, -1, 0),
  );
  const summit = ray
    .intersectObject(land.root, true)
    .filter((hit) => Math.abs(hit.point.y - 8) < 0.01);
  assert.equal(summit.length, 1, "one rendered owner for the summit");
  let meshes = 0;
  land.root.traverse((object) => {
    if (object instanceof T.Mesh) meshes++;
  });
  assert.ok(meshes < 90, `unexpected terrain draw workload: ${meshes}`);
  assert.ok(
    land.solids.length < 450,
    `unexpected collision workload: ${land.solids.length}`,
  );
  const instances: T.InstancedMesh[] = [];
  land.root.traverse((object) => {
    if (object instanceof T.InstancedMesh) instances.push(object);
  });
  let disposed = 0;
  instances.forEach((object) =>
    object.addEventListener("dispose", () => disposed++),
  );
  land.dispose();
  assert.equal(disposed, instances.length);
});

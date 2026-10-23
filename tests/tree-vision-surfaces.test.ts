import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import {
  buildTreeOfLife,
  createVisionDarkness,
  createTreeOfLifeScene,
} from "../src/super/tree-of-life";

test("vision fog patches independent materials, shares live world uniforms, and restores hooks", () => {
  const originalChunk = T.ShaderChunk.fog_fragment;
  const scene = new T.Scene();
  const material = new T.MeshStandardMaterial();
  const originalCompile = material.onBeforeCompile;
  scene.add(new T.Mesh(new T.BoxGeometry(), material));
  const darkness = createVisionDarkness(scene);
  darkness.update({ x: -42, y: 0, z: 65 }, 1);
  const shader = {
    uniforms: {},
    vertexShader: T.ShaderLib.standard.vertexShader,
    fragmentShader: T.ShaderLib.standard.fragmentShader,
  };
  material.onBeforeCompile(shader as never, {} as T.WebGLRenderer);
  assert.equal(
    (shader.uniforms as any).visionPlayer,
    darkness.uniforms.visionPlayer,
  );
  assert.ok(shader.vertexShader.includes("instanceMatrix * visionLocal"));
  assert.ok(
    shader.fragmentShader.includes("length(vVisionWorld.xz - visionPlayer.xz)"),
  );
  darkness.update({ x: 1, y: 0, z: 2 }, 0.7);
  assert.deepEqual(darkness.uniforms.visionPlayer.value.toArray(), [1, 0, 2]);
  assert.equal(darkness.uniforms.visionStrength.value, 0.7);
  assert.equal(T.ShaderChunk.fog_fragment, originalChunk);
  const otherScene = new T.Scene();
  const other = createVisionDarkness(otherScene);
  assert.equal(other.uniforms.visionStrength.value, 0);
  darkness.dispose();
  assert.equal(material.onBeforeCompile, originalCompile);
  assert.equal(material.customProgramCacheKey(), originalCompile.toString());
});

test("crossing and elevated entry have one exposed top surface away from shared edges", () => {
  const scene = new T.Scene();
  const world = buildTreeOfLife(scene);
  scene.updateMatrixWorld(true);
  const meshes: T.Object3D[] = [];
  world.treeData.group.traverse((object) => {
    if (object instanceof T.Mesh) meshes.push(object);
  });
  for (const [x, z, y] of [
    [27, 5, 0],
    [30, 5, 0],
    [48.5, 5, 0],
    [53, -16, 16.2],
    [53, -12, 16.2],
  ]) {
    const hits = new T.Raycaster(
      new T.Vector3(x, 60, z),
      new T.Vector3(0, -1, 0),
    ).intersectObjects(meshes, false);
    const topHits = hits.filter((hit) => Math.abs(hit.point.y - y) < 0.0001);
    assert.equal(
      new Set(topHits.map((hit) => hit.object.uuid)).size,
      1,
      `unique exposed top at ${x},${z}`,
    );
  }
  const slab = world.treeData.group.getObjectByName(
    "great and spacious building — suspended above earth",
  )!;
  const landing = world.treeData.group.getObjectByName(
    "building entry landing",
  )!;
  const slabBounds = new T.Box3().setFromObject(slab),
    landingBounds = new T.Box3().setFromObject(landing);
  assert.ok(Math.abs(slabBounds.max.z - landingBounds.min.z) < 1e-6);
  world.dispose();
});

test("paused opening initializes darkness around spawn before the first update", () => {
  const scene = new T.Scene();
  const world = buildTreeOfLife(scene);
  const runtime = createTreeOfLifeScene(scene, world, {
    dialog() {},
    toast() {},
    complete() {},
    checkpoint() {},
    setMarker() {},
  });
  const ground = world.treeData.group.getObjectByName("wide field") as T.Mesh;
  const shader = {
    uniforms: {} as Record<string, { value: any }>,
    vertexShader: T.ShaderLib.standard.vertexShader,
    fragmentShader: T.ShaderLib.standard.fragmentShader,
  };
  (ground.material as T.Material).onBeforeCompile(
    shader as never,
    {} as T.WebGLRenderer,
  );
  assert.deepEqual(shader.uniforms.visionPlayer.value.toArray(), [
    world.spawn.x,
    world.spawn.y,
    world.spawn.z,
  ]);
  assert.equal(shader.uniforms.visionStrength.value, 1);
  runtime.dispose();
  world.dispose();
});

test("world disposal releases natural meadow rock surfaces exactly once", () => {
  const scene = new T.Scene();
  const world = buildTreeOfLife(scene);
  const rocks: T.Mesh[] = [];
  world.treeData.group.traverse((object) => {
    if (object instanceof T.Mesh && object.name.endsWith("natural surface"))
      rocks.push(object);
  });
  assert.ok(
    rocks.length > 0,
    "actual meadow rocks have smooth natural surfaces",
  );
  const counts = new Map(rocks.map((rock) => [rock.geometry, 0]));
  for (const rock of rocks)
    rock.geometry.addEventListener("dispose", () =>
      counts.set(rock.geometry, counts.get(rock.geometry)! + 1),
    );
  world.dispose();
  world.dispose();
  for (const count of counts.values()) assert.equal(count, 1);
});

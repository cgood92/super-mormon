import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import {
  buildTreeOfLife,
  createVisionDarkness,
} from "../src/super/tree-of-life";

test("vision batches static planting while retaining its geometry, shadows and darkness", () => {
  const scene = new T.Scene();
  const world = buildTreeOfLife(scene);
  const meshes: T.Mesh[] = [];
  scene.traverse((object) => {
    if (object instanceof T.Mesh) meshes.push(object);
  });
  // Construction baseline: 694 meshes, including 207 separate blossoms.
  assert.ok(meshes.length < 430, `${meshes.length} static draws`);
  const count = (name: string) =>
    meshes
      .filter((mesh) => mesh.name === name)
      .reduce(
        (sum, mesh) => sum + (mesh instanceof T.InstancedMesh ? mesh.count : 1),
        0,
      );
  assert.equal(count("small garden blossom"), 207);
  assert.equal(count("white fruit"), 36);
  assert.equal(count("garden ground cover"), 69);
  assert.equal(count("gulf cliff face"), 46);
  assert.equal(count("field olive tree"), 28);
  assert.equal(
    meshes.reduce(
      (sum, mesh) =>
        sum +
        ((mesh.geometry.index?.count ??
          mesh.geometry.attributes.position.count) /
          3) *
          (mesh instanceof T.InstancedMesh ? mesh.count : 1),
      0,
    ),
    35764,
  );
  scene.updateMatrixWorld(true);
  const blossomBounds = new T.Box3();
  for (const mesh of meshes.filter(
    (mesh) => mesh.name === "small garden blossom",
  )) {
    assert.ok(mesh instanceof T.InstancedMesh);
    assert.ok(
      mesh.boundingSphere && mesh.boundingSphere.radius < 26,
      "local planting batches retain useful frustum bounds",
    );
    blossomBounds.union(new T.Box3().setFromObject(mesh));
  }
  assert.ok(blossomBounds.min.y >= 0.27 && blossomBounds.max.y <= 0.61);
  const fruit = meshes.find((mesh) => mesh.name === "white fruit")!;
  assert.ok(fruit instanceof T.InstancedMesh);
  assert.equal(
    (fruit.material as T.MeshStandardMaterial).emissiveIntensity,
    0.65,
  );
  for (const mesh of meshes.filter(
    (mesh) => mesh.name === "garden ground cover",
  )) {
    assert.equal(mesh.castShadow, false);
    assert.equal(mesh.receiveShadow, true);
  }
  const darkness = createVisionDarkness(scene);
  darkness.update(world.spawn, 1);
  const shader = {
    uniforms: {},
    vertexShader: T.ShaderLib.standard.vertexShader,
    fragmentShader: T.ShaderLib.standard.fragmentShader,
  };
  (fruit.material as T.Material).onBeforeCompile(
    shader as never,
    {} as T.WebGLRenderer,
  );
  assert.ok(shader.vertexShader.includes("instanceMatrix * visionLocal"));
  darkness.dispose();
  world.dispose();
});

test("vision releases every static instance buffer once when leaving the world", () => {
  const scene = new T.Scene();
  const world = buildTreeOfLife(scene);
  const batches: T.InstancedMesh[] = [];
  scene.traverse((object) => {
    if (object instanceof T.InstancedMesh) batches.push(object);
  });
  assert.ok(batches.length > 0);
  const counts = new Map<T.InstancedMesh, number>();
  for (const batch of batches) {
    counts.set(batch, 0);
    batch.addEventListener("dispose", () =>
      counts.set(batch, counts.get(batch)! + 1),
    );
  }
  world.dispose();
  world.dispose();
  for (const count of counts.values()) assert.equal(count, 1);
  assert.equal(scene.children.length, 0);
});

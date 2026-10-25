import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import { createSculptedCharacterRig } from "../src/super/playable-lehi.ts";
import type { CharacterState } from "../src/super/character-types.ts";

const walking: CharacterState = {
  x: 0,
  y: 0,
  z: 0,
  vx: 0,
  vy: 0,
  vz: 4,
  yaw: 0,
  grounded: true,
  runSpeed: 4,
  move: "run",
};

test("walking cast keeps boot cuffs behind the coat without flaring its hem", () => {
  for (const speed of [1.5, 4, 6.5]) {
    for (const role of [
      "nephi",
      "lehi",
      "laman",
      "child",
      "jacob",
      "convert",
      "ammon",
      "moroni",
    ] as const) {
      const actor = createSculptedCharacterRig(role, { quality: "crowd" });
      const coat = actor.group.getObjectByName(
        "flowing-mantle",
      ) as T.SkinnedMesh;
      const boots = ["left-sandal", "right-sandal"].map(
        (name) => actor.group.getObjectByName(name) as T.Mesh,
      );
      const model = coat.parent!;
      actor.update(1 / 60, { ...walking, vz: 0, runSpeed: 0, move: "idle" });
      const positions = coat.geometry.getAttribute(
        "position",
      ) as T.BufferAttribute;
      const rest = Float32Array.from(positions.array);

      for (let frame = 0; frame < 48; frame++) {
        actor.update(1 / 60, {
          ...walking,
          z: (frame * speed) / 60,
          vz: speed,
          runSpeed: speed,
        });
        if (frame % 4 !== 0) continue;
        actor.group.updateMatrixWorld(true);
        coat.skeleton.update();
        let maximumHemFlare = 0;
        for (let i = 0; i < positions.count; i++) {
          const j = i * 3;
          if (rest[j + 1] > 0.7 || rest[j + 2] > -0.1) continue;
          maximumHemFlare = Math.max(
            maximumHemFlare,
            rest[j + 2] - positions.getZ(i),
          );
        }
        assert.ok(
          maximumHemFlare < 0.11,
          `${role} speed ${speed} frame ${frame}: coat hem flares ${maximumHemFlare.toFixed(3)}m`,
        );

        const direction = new T.Vector3(0, 0, 1).transformDirection(
          model.matrixWorld,
        );
        const tunic = actor.group.getObjectByName(
          "visible-front-tunic",
        ) as T.Mesh;
        for (const x of [-0.245, -0.18, 0, 0.18, 0.245]) {
          for (let y = 0.3; y <= 0.9; y += 0.05) {
            const origin = new T.Vector3(x, y, -2).applyMatrix4(
              model.matrixWorld,
            );
            const ray = new T.Raycaster(origin, direction);
            const coatHit = ray.intersectObject(coat, false)[0];
            const tunicHit = ray.intersectObject(tunic, false)[0];
            if (coatHit && tunicHit)
              assert.ok(
                coatHit.distance + 0.002 < tunicHit.distance,
                `${role} speed ${speed} frame ${frame}: tunic crosses rear coat at x=${x}, y=${y.toFixed(3)}`,
              );
          }
        }
        for (const side of [-1, 1]) {
          for (let y = 0.3; y <= 0.5; y += 0.025) {
            const origin = new T.Vector3(side * 0.245, y, -2).applyMatrix4(
              model.matrixWorld,
            );
            const ray = new T.Raycaster(origin, direction);
            const coatHit = ray.intersectObject(coat, false)[0];
            const bootHit = ray.intersectObjects(boots, false)[0];
            if (coatHit && bootHit)
              assert.ok(
                coatHit.distance <= bootHit.distance + 0.002,
                `${role} speed ${speed} frame ${frame}: boot crosses rear coat at y=${y.toFixed(3)} by ${(coatHit.distance - bootHit.distance).toFixed(3)}m`,
              );
          }
        }
      }
      actor.dispose();
    }
  }
});

test("turning coats cover the lower side while retaining their open fronts", () => {
  for (const quality of ["hero", "npc"] as const) {
    for (const role of [
      "nephi",
      "lehi",
      "laman",
      "child",
      "jacob",
      "convert",
      "ammon",
      "moroni",
    ] as const) {
      const actor = createSculptedCharacterRig(role, { quality });
      const coat = actor.group.getObjectByName(
        "flowing-mantle",
      ) as T.SkinnedMesh;
      const tunic = actor.group.getObjectByName(
        "visible-front-tunic",
      ) as T.Mesh;
      const model = coat.parent!;
      let x = 0;
      let z = 0;
      for (let frame = 0; frame <= 42; frame++) {
        const yaw = frame < 10 ? 0 : frame < 30 ? Math.PI / 2 : -Math.PI / 2;
        const velocityYaw =
          frame < 16 ? 0 : frame < 36 ? Math.PI / 2 : -Math.PI / 2;
        const vx = Math.sin(velocityYaw) * 4;
        const vz = Math.cos(velocityYaw) * 4;
        x += vx / 60;
        z += vz / 60;
        actor.update(1 / 60, {
          ...walking,
          x,
          z,
          vx,
          vz,
          yaw,
        });
        if (frame !== 23 && frame !== 42) continue;
        actor.group.updateMatrixWorld(true);
        coat.skeleton.update();
        for (const [degrees, projectedX] of [
          [80, -0.2],
          [90, -0.25],
          [270, 0.25],
          [280, 0.2],
        ]) {
          const angle = (degrees * Math.PI) / 180;
          const radial = new T.Vector3(Math.sin(angle), 0, Math.cos(angle));
          const across = new T.Vector3(Math.cos(angle), 0, -Math.sin(angle));
          const direction = radial
            .clone()
            .negate()
            .transformDirection(model.matrixWorld);
          for (const y of [0.44, 0.48, 0.6]) {
            const origin = radial
              .clone()
              .multiplyScalar(2)
              .addScaledVector(across, projectedX);
            origin.y = y;
            const ray = new T.Raycaster(
              origin.applyMatrix4(model.matrixWorld),
              direction,
            );
            const tunicHit = ray.intersectObject(tunic, false)[0];
            if (!tunicHit) continue;
            const coatHit = ray.intersectObject(coat, false)[0];
            assert.ok(
              coatHit && coatHit.distance + 0.002 < tunicHit.distance,
              `${role} ${quality} turn frame ${frame} side ${degrees}° at y=${y}: lower tunic visible through coat`,
            );
          }
        }
        for (const y of [0.42, 0.7]) {
          const front = new T.Raycaster(
            new T.Vector3(0, y, 2).applyMatrix4(model.matrixWorld),
            new T.Vector3(0, 0, -1).transformDirection(model.matrixWorld),
          );
          const frontTunic = front.intersectObject(tunic, false)[0];
          const frontCoat = front.intersectObject(coat, false)[0];
          assert.ok(frontTunic);
          assert.ok(
            !frontCoat || frontTunic.distance < frontCoat.distance,
            `${role} ${quality}: front opening should remain visible at y=${y}`,
          );
        }
      }
      actor.dispose();
    }
  }
});

test("a reversing coat stays in front of its posed trousers at the side camera", () => {
  // This camera is framed at adult height; child garment coverage is sampled
  // in the model-local side rays above.
  const camera = new T.PerspectiveCamera(32, 0.8, 0.03, 30);
  camera.position.set(0, 1.1, 4.2);
  camera.lookAt(0, 0.83, 0);
  camera.updateMatrixWorld(true);
  for (const quality of ["hero", "npc"] as const) {
    for (const role of [
      "nephi",
      "lehi",
      "laman",
      "jacob",
      "convert",
      "ammon",
      "moroni",
    ] as const) {
      const actor = createSculptedCharacterRig(role, { quality });
      let x = 0;
      let z = 0;
      for (let frame = 0; frame <= 42; frame++) {
        const yaw = frame < 10 ? 0 : frame < 30 ? Math.PI / 2 : -Math.PI / 2;
        const velocityYaw =
          frame < 16 ? 0 : frame < 36 ? Math.PI / 2 : -Math.PI / 2;
        const vx = Math.sin(velocityYaw) * 4;
        const vz = Math.cos(velocityYaw) * 4;
        x += vx / 60;
        z += vz / 60;
        actor.update(1 / 60, { ...walking, x, z, vx, vz, yaw });
      }
      const body = actor.group.getObjectByName("body")!;
      actor.group.position.set(0, 0, 0);
      actor.group.rotation.y = Math.PI * 1.25 - 2.35 - body.rotation.y;
      actor.group.updateMatrixWorld(true);
      const coat = actor.group.getObjectByName("flowing-mantle")!;
      const trousers = ["left-trouser", "right-trouser"].map((name) =>
        actor.group.getObjectByName(name)!,
      );
      for (const ndcX of [-0.05, -0.03, -0.01]) {
        for (const ndcY of [-0.32, -0.3, -0.28, -0.26]) {
          const ray = new T.Raycaster();
          ray.setFromCamera(new T.Vector2(ndcX, ndcY), camera);
          const coatHit = ray.intersectObject(coat, false)[0];
          const trouserHit = ray.intersectObjects(trousers, false)[0];
          if (coatHit && trouserHit && coatHit.point.y > 0.35)
            assert.ok(
              coatHit.distance + 0.002 < trouserHit.distance,
              `${role} ${quality}: ${trouserHit.object.name} appears through coat at ${ndcX},${ndcY}`,
            );
        }
      }
      actor.dispose();
    }
  }
});

test("the complete inner costume stays inside the side and rear coat through turns", () => {
  for (const quality of ["hero", "npc", "crowd"] as const) {
    const actor = createSculptedCharacterRig("nephi", { quality });
    const coat = actor.group.getObjectByName("flowing-mantle") as T.SkinnedMesh;
    const inner = [
      "continuous-robe-and-sleeves",
      "visible-front-tunic",
      "left-trouser",
      "right-trouser",
      "left-sandal",
      "right-sandal",
    ].map((name) => actor.group.getObjectByName(name) as T.Mesh);
    assert.ok(inner.every(Boolean));
    const model = coat.parent!;
    let x = 0;
    let z = 0;
    for (let frame = 0; frame < 48; frame++) {
      const yaw = frame < 12 ? 0 : frame < 28 ? Math.PI / 2 : -Math.PI / 2;
      const travelYaw =
        frame < 18 ? 0 : frame < 36 ? Math.PI / 2 : -Math.PI / 2;
      const vx = Math.sin(travelYaw) * 5;
      const vz = Math.cos(travelYaw) * 5;
      x += vx / 60;
      z += vz / 60;
      actor.update(1 / 60, { ...walking, x, z, vx, vz, yaw, runSpeed: 5 });
      if (frame % 6 !== 2) continue;
      actor.group.updateMatrixWorld(true);
      coat.skeleton.update();
      for (const degrees of [80, 90, 100, 180, 260, 270, 280]) {
        const angle = (degrees * Math.PI) / 180;
        const radial = new T.Vector3(Math.sin(angle), 0, Math.cos(angle));
        const across = new T.Vector3(Math.cos(angle), 0, -Math.sin(angle));
        const direction = radial
          .clone()
          .negate()
          .transformDirection(model.matrixWorld);
        for (const projectedX of [-0.15, 0, 0.15]) {
          for (const y of [0.36, 0.48, 0.65]) {
            const origin = radial
              .clone()
              .multiplyScalar(2)
              .addScaledVector(across, projectedX);
            origin.y = y;
            const ray = new T.Raycaster(
              origin.applyMatrix4(model.matrixWorld),
              direction,
            );
            const coatHit = ray.intersectObject(coat, false)[0];
            if (!coatHit) continue;
            const innerHit = ray.intersectObjects(inner, false)[0];
            if (!innerHit) continue;
            assert.ok(
              coatHit.distance <= innerHit.distance + 0.002,
              `${quality} frame ${frame} angle ${degrees} y=${y}: ${innerHit.object.name} lies outside coat by ${(coatHit.distance - innerHit.distance).toFixed(3)}m`,
            );
          }
        }
      }
    }
    actor.dispose();
  }
});

test("coated actors build only the visible front inset and short footwear", () => {
  for (const quality of ["hero", "npc", "crowd"] as const) {
    for (const role of ["nephi", "lehi", "moroni"] as const) {
      const actor = createSculptedCharacterRig(role, { quality });
      const shirt = actor.group.getObjectByName(
        "continuous-robe-and-sleeves",
      ) as T.Mesh;
      const front = actor.group.getObjectByName(
        "visible-front-tunic",
      ) as T.Mesh;
      assert.ok(front, `${role} ${quality}: coat opening has a front inset`);
      shirt.geometry.computeBoundingBox();
      front.geometry.computeBoundingBox();
      assert.ok(
        shirt.geometry.boundingBox!.min.y > 0.6,
        `${role} ${quality}: hidden full skirt remains`,
      );
      assert.ok(
        front.geometry.boundingBox!.min.y < 0.55,
        `${role} ${quality}: front opening is empty`,
      );
      for (const name of ["left-sandal", "right-sandal"]) {
        const shoe = actor.group.getObjectByName(name) as T.Mesh;
        shoe.geometry.computeBoundingBox();
        assert.ok(
          shoe.geometry.boundingBox!.max.y < 0.28,
          `${role} ${quality}: buried boot shaft remains`,
        );
      }
      actor.dispose();
    }
  }
  const undertunic = createSculptedCharacterRig("laban-undressed");
  const shirt = undertunic.group.getObjectByName(
    "continuous-robe-and-sleeves",
  ) as T.Mesh;
  shirt.geometry.computeBoundingBox();
  assert.ok(shirt.geometry.boundingBox!.min.y < 0.4);
  assert.equal(
    undertunic.group.getObjectByName("visible-front-tunic"),
    undefined,
  );
  undertunic.dispose();
});

test("crawl gathers the rear coat ahead of bent shoes through a full gait", () => {
  for (const quality of ["hero", "npc", "crowd"] as const) {
    for (const role of ["nephi", "sariah"] as const) {
      const actor = createSculptedCharacterRig(role, { quality });
      const coat = actor.group.getObjectByName(
        "flowing-mantle",
      ) as T.SkinnedMesh;
      const shoes = ["left-sandal", "right-sandal"].map(
        (name) => actor.group.getObjectByName(name) as T.Mesh,
      );
      const inner = [
        "continuous-robe-and-sleeves",
        "visible-front-tunic",
        "left-trouser",
        "right-trouser",
        "left-sandal",
        "right-sandal",
      ].map((name) => actor.group.getObjectByName(name) as T.Mesh);
      const model = coat.parent!;
      const modelInverse = new T.Matrix4();
      const shoeBox = new T.Box3();
      for (let frame = 0; frame < 60; frame++) {
        actor.update(1 / 60, {
          ...walking,
          z: frame * 0.025,
          vz: 1.5,
          runSpeed: 1.5,
          move: "crawl",
          crouching: true,
        });
        actor.group.updateMatrixWorld(true);
        coat.skeleton.update();
        coat.geometry.computeBoundingBox();
        modelInverse.copy(model.matrixWorld).invert();
        const hemY = coat.geometry.boundingBox!.min.y;
        for (const shoe of shoes) {
          shoe.geometry.computeBoundingBox();
          shoeBox
            .copy(shoe.geometry.boundingBox!)
            .applyMatrix4(shoe.matrixWorld)
            .applyMatrix4(modelInverse);
          assert.ok(
            hemY > shoeBox.max.y,
            `${role} ${quality} crawl frame ${frame}: ${shoe.name} enters rear coat by ${(shoeBox.max.y - hemY).toFixed(3)}m`,
          );
        }
        if (frame % 5 !== 0) continue;
        const direction = new T.Vector3(0, 0, 1).transformDirection(
          model.matrixWorld,
        );
        for (const x of [-0.22, -0.11, 0.11, 0.22]) {
          for (const y of [0.42, 0.52, 0.62, 0.72]) {
            const ray = new T.Raycaster(
              new T.Vector3(x, y, -2).applyMatrix4(model.matrixWorld),
              direction,
            );
            const coatHit = ray.intersectObject(coat, false)[0];
            const innerHit = ray.intersectObjects(inner, false)[0];
            if (coatHit && innerHit)
              assert.ok(
                coatHit.distance <= innerHit.distance + 0.002,
                `${role} ${quality} crawl frame ${frame}: ${innerHit.object.name} shows through rear coat`,
              );
          }
        }
      }
      actor.dispose();
    }
  }
});

test("crawl and return keep coincident garment vertices smoothly shaded", () => {
  for (const role of ["lehi", "nephi"] as const) {
    const actor = createSculptedCharacterRig(role, { quality: "hero" });
    const names = [
      "flowing-mantle",
      "continuous-robe-and-sleeves",
      "visible-front-tunic",
      "left-trouser",
      "right-trouser",
    ];
    const seams = names.flatMap((name) => {
      const mesh = actor.group.getObjectByName(name) as T.Mesh | undefined;
      if (!mesh) return [];
      const positions = mesh.geometry.getAttribute(
        "position",
      ) as T.BufferAttribute;
      const seen = new Map<string, number>();
      const pairs: [number, number][] = [];
      for (let i = 0; i < positions.count; i++) {
        const key = `${Math.round(positions.getX(i) * 1e5)},${Math.round(positions.getY(i) * 1e5)},${Math.round(positions.getZ(i) * 1e5)}`;
        const earlier = seen.get(key);
        if (earlier === undefined) seen.set(key, i);
        else pairs.push([earlier, i]);
      }
      return [{ name, mesh, pairs }];
    });
    assert.ok(
      seams.find((part) => part.name === "flowing-mantle")!.pairs.length > 0,
    );
    const check = (pose: string) => {
      for (const { name, mesh, pairs } of seams) {
        const normals = mesh.geometry.getAttribute(
          "normal",
        ) as T.BufferAttribute;
        for (const [a, b] of pairs) {
          const mismatch = Math.hypot(
            normals.getX(a) - normals.getX(b),
            normals.getY(a) - normals.getY(b),
            normals.getZ(a) - normals.getZ(b),
          );
          assert.ok(
            mismatch < 0.001,
            `${role} ${name} ${pose}: split normal seam ${mismatch.toFixed(3)}`,
          );
        }
      }
    };
    for (let frame = 0; frame < 24; frame++)
      actor.update(1 / 60, {
        ...walking,
        z: frame * 0.025,
        vz: 1.5,
        runSpeed: 1.5,
        move: "crawl",
        crouching: true,
      });
    check("crawl");
    actor.update(1 / 60, { ...walking, runSpeed: 0, vz: 0, move: "idle" });
    check("upright recovery");
    actor.dispose();
  }
});

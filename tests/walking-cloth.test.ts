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
          "continuous-robe-and-sleeves",
        ) as T.SkinnedMesh;
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

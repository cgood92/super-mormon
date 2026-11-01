import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import { createSculptedCharacterRig } from "./playable-lehi.ts";

for (const quality of ["hero", "npc"] as const) {
  for (const role of ["nephi", "lehi", "mormon"] as const) {
    test(`${role} ${quality} front tunic joins the torso across leaning frontal and quarter sight lines`, () => {
      const actor = createSculptedCharacterRig(role, { quality });
      for (let frame = 0; frame < 90; frame++)
        actor.update(1 / 60, {
          x: 0,
          y: 0,
          z: (frame * 6.5) / 60,
          vx: 0,
          vy: 0,
          vz: 6.5,
          yaw: 0,
          grounded: true,
          runSpeed: 6.5,
          move: "run",
        });
      actor.group.updateMatrixWorld(true);
      const panel = actor.group.getObjectByName(
        "visible-front-tunic",
      ) as T.Mesh;
      const shirt = actor.group.getObjectByName(
        "continuous-robe-and-sleeves",
      ) as T.SkinnedMesh;
      shirt.skeleton.update();
      const model = panel.parent!;
      const inverse = model.matrixWorld.clone().invert();
      // Above the panel edge, front/downward rays used to miss its top and
      // pass below the rounded torso, exposing the inside of the costume.
      for (const side of [-0.35, 0, 0.35]) {
        for (const slope of [-0.35, -0.15, 0.35, 0.55, 0.75]) {
          const target = new T.Vector3(0, 0.825, 0.285);
          const origin = target.clone().add(new T.Vector3(side, slope, 0.8));
          origin.applyMatrix4(model.matrixWorld);
          target.applyMatrix4(model.matrixWorld);
          const ray = new T.Raycaster(origin, target.sub(origin).normalize());
          const hit = ray.intersectObjects([panel, shirt], false)[0];
          assert.ok(hit, `open torso at side ${side}, slope ${slope}`);
          const local = hit.point.clone().applyMatrix4(inverse);
          assert.ok(
            local.y > 0.78 && local.z > 0.1,
            `ray enters costume through torso join at side ${side}, slope ${slope}: ${local.toArray()}`,
          );
        }
      }
      actor.dispose();
    });
  }
}

for (const quality of ["hero", "npc"] as const) {
  for (const role of ["nephi", "lehi", "mormon"] as const) {
    test(`${role} ${quality} lateral torso join blocks sight into the rear coat`, () => {
      const actor = createSculptedCharacterRig(role, { quality });
      for (let frame = 0; frame < 90; frame++)
        actor.update(1 / 60, {
          x: 0,
          y: 0,
          z: 0,
          vx: 0,
          vy: 0,
          vz: 6.5,
          yaw: 0,
          grounded: true,
          runSpeed: 6.5,
          move: "run",
        });
      actor.group.updateMatrixWorld(true);
      const panel = actor.group.getObjectByName(
        "visible-front-tunic",
      ) as T.Mesh;
      const shirt = actor.group.getObjectByName(
        "continuous-robe-and-sleeves",
      ) as T.SkinnedMesh;
      const coat = actor.group.getObjectByName(
        "flowing-mantle",
      ) as T.SkinnedMesh;
      shirt.skeleton.update();
      coat.skeleton.update();
      const model = panel.parent!;
      const inverse = model.matrixWorld.clone().invert();
      for (const x of [-0.16, -0.12, -0.08, 0.08, 0.12, 0.16]) {
        for (const y of [0.8, 0.84, 0.92]) {
          for (const side of [-0.35, 0, 0.35])
            for (const slope of [-0.15, 0.35, 0.55]) {
              const target = new T.Vector3(x, y, 0.285);
              const origin = target
                .clone()
                .add(new T.Vector3(side, slope, 0.8))
                .applyMatrix4(model.matrixWorld);
              target.applyMatrix4(model.matrixWorld);
              const hit = new T.Raycaster(
                origin,
                target.sub(origin).normalize(),
              ).intersectObjects([panel, shirt, coat], false)[0];
              assert.ok(hit, `uncovered torso at x=${x} y=${y} slope=${slope}`);
              const local = hit.point.clone().applyMatrix4(inverse);
              assert.ok(
                local.z > 0.05,
                `see-through lateral torso at x=${x} y=${y} slope=${slope}: first hit ${hit.object.name} ${local.toArray()}`,
              );
            }
        }
      }
      actor.dispose();
    });
  }
}

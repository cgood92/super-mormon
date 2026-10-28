import { moroniHeight } from "../src/super/moroni-commander.ts";
import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import { buildSculptedCharacter } from "../src/super/lehi-sculpted-models.ts";
import { createCharacter } from "../src/super/character.ts";
import { clearCharacterModelCache } from "../src/super/character-model-cache.ts";

for (const quality of ["hero", "npc", "crowd"] as const) {
  test(`Moroni ${quality} has fitted complete armor and independently removable cloth`, () => {
    const model = buildSculptedCharacter("moroni", { quality });
    const coat = model.group.getObjectByName("moroni-removable-coat")!;
    assert.equal(coat.visible, false);
    assert.equal(coat.getObjectByName("flowing-mantle")?.parent, coat);
    assert.equal(model.group.userData.costume, "illustrative-full-armor");
    const equipment = [
      "moroni-breastplate",
      "moroni-backplate",
      "moroni-headband",
      "moroni-half-cloak",
      "moroni-shield",
      "moroni-sheathed-sword",
      ...["left", "right"].flatMap((side) =>
        ["pauldron", "bracer", "greave", "hip-lame"].map(
          (piece) => `moroni-${side}-${piece}`,
        ),
      ),
    ];
    const disposed = new Set<T.BufferGeometry>();
    for (const name of equipment) {
      const mesh = model.group.getObjectByName(name) as T.Mesh;
      assert.ok(mesh instanceof T.Mesh, name);
      assert.equal(mesh.visible, true);
      assert.ok(mesh.parent !== coat);
      const bounds = new T.Box3().setFromObject(mesh);
      assert.ok(bounds.getSize(new T.Vector3()).length() > 0.05, name);
      mesh.geometry.addEventListener("dispose", () =>
        disposed.add(mesh.geometry),
      );
    }
    // Front and back plate truly cover the torso on opposing sides.
    const front = new T.Box3().setFromObject(
      model.group.getObjectByName("moroni-breastplate")!,
    );
    const back = new T.Box3().setFromObject(
      model.group.getObjectByName("moroni-backplate")!,
    );
    assert.ok(front.max.z > 0.29 && back.min.z < -0.29);
    const tunic = model.group.getObjectByName("visible-front-tunic") as T.Mesh;
    tunic.geometry.computeBoundingBox();
    assert.ok(
      tunic.geometry.boundingBox!.min.y >= 0.67,
      "no robe skirt beneath the armor",
    );
    // Removing the robe must never expose an empty thigh or shin. Sample the
    // actual rendered trouser/armor surfaces along both legs.
    for (const side of [-1, 1]) {
      const label = side < 0 ? "left" : "right";
      const surfaces = ["trouser", "greave", "hip-lame"].map((piece) =>
        model.group.getObjectByName(
          piece === "trouser" ? `${label}-trouser` : `moroni-${label}-${piece}`,
        )!,
      );
      for (const y of [0.15, 0.25, 0.4, 0.55, 0.7, 0.85]) {
        const ray = new T.Raycaster(
          new T.Vector3(side * 0.205, moroniHeight(y), 2).applyMatrix4(
            model.group.matrixWorld,
          ),
          new T.Vector3(0, 0, -1).transformDirection(model.group.matrixWorld),
        );
        assert.ok(
          ray.intersectObjects(surfaces).length > 0,
          `${label} leg gap at ${y}`,
        );
      }
    }
    coat.visible = true;
    coat.visible = false;
    assert.equal(
      model.group.getObjectByName("moroni-breastplate")!.visible,
      true,
    );
    model.dispose();
    assert.equal(disposed.size, equipment.length);
    assert.equal(model.group.children.length, 0);
  });

  test(`Moroni ${quality} limb armor follows its limb through turns and crawling`, () => {
    const actor = createCharacter("moroni", { quality });
    const coat = actor.group.getObjectByName("moroni-removable-coat")!;
    assert.equal(
      coat.getObjectByName("flowing-mantle")?.parent,
      coat,
      "skinning preserves removable layer",
    );
    for (const side of ["left", "right"]) {
      for (const piece of ["pauldron", "bracer"])
        assert.equal(
          actor.group.getObjectByName(`moroni-${side}-${piece}`)!.parent!.name,
          `${side}-arm`,
        );
      for (const piece of ["greave", "greave-trim"])
        assert.equal(
          actor.group.getObjectByName(`moroni-${side}-${piece}`)!.parent!.name,
          `${side}-knee`,
        );
      assert.equal(
        actor.group.getObjectByName(`moroni-${side}-hip-lame`)!.parent!.name,
        `${side}-leg`,
      );
    }
    for (const yaw of [0, Math.PI / 4, Math.PI / 2, Math.PI, -Math.PI / 4]) {
      for (const move of ["run", "crawl", "idle"] as const) {
        actor.update(1 / 30, {
          x: 0,
          y: 0,
          z: 0,
          vx: Math.sin(yaw) * 2,
          vy: 0,
          vz: Math.cos(yaw) * 2,
          yaw,
          grounded: true,
          runSpeed: 2,
          move,
          crouching: move === "crawl",
        });
        actor.group.traverse((object) => {
          if (!object.name.startsWith("moroni-")) return;
          assert.ok(
            object.matrixWorld.elements.every(Number.isFinite),
            object.name,
          );
        });
      }
    }
    actor.dispose();
    assert.equal(actor.group.children.length, 0);
    clearCharacterModelCache();
  });
}

for (const quality of ["hero", "npc", "crowd"] as const) {
  test(`Bronze Commander ${quality} has adult proportions and faceted armor`, () => {
    const model = buildSculptedCharacter("moroni", { quality });
    assert.ok(!model.group.getObjectByName("character-headwear"));
    assert.equal(model.group.userData.anatomy, "bronze-commander");
    const box = (name: string) =>
      new T.Box3().setFromObject(model.group.getObjectByName(name)!);
    const head = box("sculpted-face-neck-nose").getSize(new T.Vector3());
    const body = box("moroni-breastplate").getSize(new T.Vector3());
    assert.ok(head.x / body.x < 0.55, "small adult head against broad chest");
    assert.ok(
      box("left-trouser").getSize(new T.Vector3()).y > 0.85,
      "long visible legs",
    );
    for (const name of [
      "moroni-breastplate",
      "moroni-backplate",
      "moroni-left-pauldron",
      "moroni-right-pauldron",
    ]) {
      const mesh = model.group.getObjectByName(name) as T.Mesh;
      assert.notEqual(mesh.geometry.type, "SphereGeometry", name);
      assert.equal(
        (mesh.material as T.MeshStandardMaterial).color.getHex(),
        0x9e692f,
      );
    }
    assert.ok(box("moroni-shield").getSize(new T.Vector3()).y > 0.9);
    const cloak = model.group.getObjectByName("moroni-half-cloak")!;
    assert.notEqual(cloak.parent?.name, "moroni-removable-coat");
    model.dispose();
  });
}

for (const quality of ["hero", "npc", "crowd"] as const) {
  test(`Bronze Commander ${quality} wraps armor around limbs and owns all resources`, () => {
    const model = buildSculptedCharacter("moroni", { quality });
    const mesh = (name: string) => model.group.getObjectByName(name) as T.Mesh;
    const extent = (name: string) => {
      mesh(name).geometry.computeBoundingBox();
      return mesh(name).geometry.boundingBox!.getSize(new T.Vector3());
    };
    for (const side of ["left", "right"]) {
      const shoulder = extent(`moroni-${side}-pauldron`);
      assert.ok(
        shoulder.z > 0.35 && shoulder.y > 0.07,
        "shoulder shell arches front to back with outward slope",
      );
      const bracer = extent(`moroni-${side}-bracer`);
      assert.ok(
        bracer.z > 0.15 && bracer.x > 0.15,
        "bracer wraps a forearm rather than a flat slab",
      );
      assert.ok(
        mesh(`moroni-${side}-hip-lame`).material !==
          mesh(`${side}-trouser`).material,
        "short tunic and exposed skin legs have distinct visible surfaces",
      );
    }
    let vertices = 0;
    const geometries = new Set<T.BufferGeometry>(),
      materials = new Set<T.Material>(),
      disposed = new Set<unknown>();
    model.group.traverse((o) => {
      if (!(o instanceof T.Mesh)) return;
      vertices += o.geometry.getAttribute("position").count;
      geometries.add(o.geometry);
      for (const m of Array.isArray(o.material) ? o.material : [o.material])
        materials.add(m);
    });
    if (quality !== "hero")
      assert.ok(
        vertices <= (quality === "npc" ? 15000 : 3600),
        `${vertices} vertices`,
      );
    for (const resource of [...geometries, ...materials])
      resource.addEventListener("dispose", () => disposed.add(resource));
    model.dispose();
    assert.equal(
      disposed.size,
      geometries.size + materials.size,
      "every visible surface releases geometry and material",
    );
  });
}

test("Moroni tunic panels cover their thighs through running reversals and crawling", () => {
  const actor = createCharacter("moroni", { quality: "npc" });
  for (let frame = 0; frame < 100; frame++) {
    const yaw = frame < 25 ? 0 : frame < 50 ? Math.PI : Math.PI / 4;
    const crawl = frame >= 50 && frame < 85;
    actor.update(1 / 30, {
      x: 0,
      y: 0,
      z: 0,
      vx: Math.sin(yaw) * 3,
      vy: 0,
      vz: Math.cos(yaw) * 3,
      yaw,
      grounded: true,
      runSpeed: 3,
      move: crawl ? "crawl" : "run",
      crouching: crawl,
    });
    if (frame % 5) continue;
    actor.group.updateMatrixWorld(true);
    for (const side of [-1, 1]) {
      const label = side < 0 ? "left" : "right";
      const panel = actor.group.getObjectByName(
        `moroni-${label}-hip-lame`,
      ) as T.Mesh;
      const thigh = actor.group.getObjectByName(`${label}-trouser`) as T.Mesh;
      for (const direction of [-1, 1]) {
        const ray = new T.Raycaster(
          new T.Vector3(
            side * 0.19,
            moroniHeight(0.79),
            direction * 2,
          ).applyMatrix4(
            crawl
              ? actor.group.getObjectByName("sculpted-moroni")!.matrixWorld
              : panel.matrixWorld,
          ),
          new T.Vector3(0, 0, -direction).transformDirection(
            crawl
              ? actor.group.getObjectByName("sculpted-moroni")!.matrixWorld
              : panel.matrixWorld,
          ),
        );
        const cloth = ray.intersectObject(panel)[0];
        // A folded shin can lie in front of the tunic along the body ray in a
        // crawl. Compare the covered upper-thigh triangles, not that exposed shin.
        const thighRest = thigh.userData.crawlRest as Float32Array;
        const skin = ray
          .intersectObject(thigh)
          .find(
            (hit) =>
              hit.face &&
              [hit.face.a, hit.face.b, hit.face.c].every(
                (index) => thighRest[index * 3 + 1] >= moroniHeight(0.72),
              ),
          );
        assert.ok(cloth, `${label} panel missing frame ${frame}`);
        assert.ok(skin, `${label} upper thigh missing frame ${frame}`);
        assert.ok(
          cloth.distance + 0.01 < skin.distance,
          `${label} thigh crosses tunic frame ${frame}`,
        );
      }
    }
  }
  actor.dispose();
  clearCharacterModelCache();
});

for (const quality of ["hero", "npc", "crowd"] as const)
  test(`Moroni ${quality} crawl has no upper-thigh or tunic spikes above the back`, () => {
    const actor = createCharacter("moroni", { quality });
    const names = [
      "left-trouser",
      "right-trouser",
      "moroni-left-hip-lame",
      "moroni-right-hip-lame",
    ];
    const rest = names.map((name) =>
      Float32Array.from(
        (actor.group.getObjectByName(name) as T.Mesh).geometry.getAttribute(
          "position",
        ).array,
      ),
    );
    for (const yaw of [0, Math.PI / 4, Math.PI / 2, Math.PI])
      for (let frame = 0; frame < 35; frame++) {
        actor.update(1 / 30, {
          x: 0,
          y: 0,
          z: 0,
          vx: Math.sin(yaw) * 2,
          vy: 0,
          vz: Math.cos(yaw) * 2,
          yaw,
          grounded: true,
          runSpeed: 2,
          move: "crawl",
          crouching: true,
        });
        const back = new T.Box3().setFromObject(
          actor.group.getObjectByName("moroni-backplate")!,
        );
        for (const name of names) {
          const part = actor.group.getObjectByName(name) as T.Mesh;
          const box = new T.Box3().setFromObject(part);
          assert.ok(
            box.max.y <= back.max.y + 0.025,
            `${quality}/${name} projects above physical back by ${box.max.y - back.max.y}`,
          );
          const normals = part.geometry.getAttribute("normal");
          for (const value of normals.array)
            assert.ok(Number.isFinite(value), `${name} invalid seam normal`);
        }
      }
    actor.update(1 / 30, {
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: 0,
      grounded: true,
      runSpeed: 0,
      move: "idle",
      crouching: false,
    });
    names.forEach((name, i) =>
      assert.deepEqual(
        (actor.group.getObjectByName(name) as T.Mesh).geometry.getAttribute(
          "position",
        ).array,
        rest[i],
        `${name} returns exactly to standing surface`,
      ),
    );
    actor.dispose();
    clearCharacterModelCache();
  });

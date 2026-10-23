import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import {
  buildSculptedCharacter,
  buildSculptedLehi,
  SCULPTED_CAST_TRAITS,
  type SculptedCharacterRole,
} from "../src/super/lehi-sculpted-models.ts";

const roles = Object.keys(SCULPTED_CAST_TRAITS) as SculptedCharacterRole[];

function assertClosedShoes(group: T.Group, label: string) {
  group.updateMatrixWorld(true);
  for (const side of [-1, 1]) {
    const name = side < 0 ? "left-sandal" : "right-sandal";
    const mesh = group.getObjectByName(name) as T.Mesh;
    const positions = mesh.geometry.getAttribute("position");
    const vertexIds: number[] = [];
    const welded = new Map<string, number>();
    for (let i = 0; i < positions.count; i++) {
      const key = [positions.getX(i), positions.getY(i), positions.getZ(i)]
        .map((value) => Math.round(value * 1e6))
        .join(",");
      if (!welded.has(key)) welded.set(key, welded.size);
      vertexIds.push(welded.get(key)!);
    }
    const indices =
      mesh.geometry.index?.array ??
      Uint32Array.from({ length: positions.count }, (_, i) => i);
    const edges = new Map<string, number>();
    for (let i = 0; i < indices.length; i += 3) {
      const triangle = [
        vertexIds[indices[i]],
        vertexIds[indices[i + 1]],
        vertexIds[indices[i + 2]],
      ];
      if (new Set(triangle).size < 3) continue;
      for (let j = 0; j < 3; j++) {
        const a = triangle[j],
          b = triangle[(j + 1) % 3];
        const key = a < b ? `${a}:${b}` : `${b}:${a}`;
        edges.set(key, (edges.get(key) ?? 0) + 1);
      }
    }
    assert.ok(edges.size > 0, `${label}/${name}: missing shoe`);
    assert.equal(
      [...edges.values()].filter((count) => count !== 2).length,
      0,
      `${label}/${name}: shoe has an open or nonmanifold edge`,
    );
    const cx = side * 0.195;
    for (const [origin, direction, surface] of [
      [[cx, 0.065, 2], [0, 0, -1], "toe"],
      [[cx, -2, 0.24], [0, 1, 0], "sole"],
      [[cx, 2, 0.24], [0, -1, 0], "top"],
      [[cx, 0.12, -2], [0, 0, 1], "heel"],
    ] as const) {
      const ray = new T.Raycaster(
        new T.Vector3(...origin).applyMatrix4(mesh.matrixWorld),
        new T.Vector3(...direction).transformDirection(mesh.matrixWorld),
      );
      assert.ok(
        ray.intersectObject(mesh, false).length >= 2,
        `${label}/${name}: ${surface} ray must enter and leave a closed shoe`,
      );
    }
  }
}

test("the accepted Lehi hero retains every style-nine geometry buffer", () => {
  const approved = buildSculptedLehi(2);
  const cast = buildSculptedCharacter("lehi", { quality: "hero" });
  const meshes = (group: T.Group) => {
    const result: T.Mesh[] = [];
    group.traverse((object) => {
      if (object instanceof T.Mesh) result.push(object);
    });
    return result;
  };
  const original = meshes(approved.group);
  const current = meshes(cast.group);
  assert.equal(current.length, original.length);
  for (let i = 0; i < original.length; i++) {
    assert.equal(current[i].name, original[i].name);
    assert.deepEqual(
      current[i].geometry.getAttribute("position").array,
      original[i].geometry.getAttribute("position").array,
      current[i].name,
    );
    assert.deepEqual(
      current[i].geometry.getAttribute("normal").array,
      original[i].geometry.getAttribute("normal").array,
      current[i].name,
    );
  }
  approved.dispose();
  cast.dispose();
});

test("every NPC and crowd role fits the vertex budget and keeps its coat outside the tunic", () => {
  for (const quality of ["npc", "crowd"] as const) {
    for (const role of roles) {
      const actor = buildSculptedCharacter(role, { quality });
      const label = `${role}/${quality}`;
      let vertices = 0;
      actor.group.traverse((object) => {
        if (object instanceof T.Mesh) {
          const geometry = object.geometry;
          vertices += geometry.getAttribute("position").count;
          const lastIndex = geometry.index
            ? Math.max(...geometry.index.array)
            : geometry.getAttribute("position").count - 1;
          for (const [name, attribute] of Object.entries(geometry.attributes))
            assert.ok(
              lastIndex < attribute.count,
              `${label}/${object.name}: ${name} buffer too small for draw index ${lastIndex}`,
            );
        }
      });
      assert.ok(
        vertices <= (quality === "npc" ? 15_000 : 3_600),
        `${label}: ${vertices} vertices`,
      );
      assert.ok(vertices > 1_000, `${label}: missing geometry`);
      const coat = actor.group.getObjectByName("flowing-mantle") as
        T.Mesh | undefined;
      const tunic = actor.group.getObjectByName(
        "continuous-robe-and-sleeves",
      ) as T.Mesh;
      assert.ok(tunic);
      if (role === "laban-undressed") assert.equal(coat, undefined);
      else {
        assert.ok(coat, label);
        actor.group.updateMatrixWorld(true);
        for (const y of [0.5, 0.8, 1.0, 1.1, 1.25, 1.4]) {
          for (const x of [-0.18, 0, 0.18]) {
            const ray = new T.Raycaster(
              new T.Vector3(x, y, -3).applyMatrix4(coat.matrixWorld),
              new T.Vector3(0, 0, 1).transformDirection(coat.matrixWorld),
            );
            const outer = ray.intersectObject(coat, false)[0];
            const inner = ray.intersectObject(tunic, false)[0];
            assert.ok(outer, `${label}: missing coat at ${x},${y}`);
            if (inner)
              assert.ok(
                outer.distance + 0.005 < inner.distance,
                `${label}: tunic breaks through at ${x},${y}`,
              );
          }
        }
      }
      assertClosedShoes(actor.group, label);
      for (const name of [
        "continuous-robe-and-sleeves",
        "continuous-folded-robe",
        "flowing-mantle",
        "mantle-edge",
      ]) {
        const mesh = actor.group.getObjectByName(name) as T.Mesh | undefined;
        if (mesh)
          assert.equal(
            (mesh.material as T.MeshPhysicalMaterial).clearcoat,
            0,
            `${label}/${name}: cloth must be matte`,
          );
      }
      actor.dispose();
      assert.equal(actor.group.children.length, 0);
    }
  }
});

test("models own independent geometry and dispose headwear details", () => {
  const first = buildSculptedCharacter("laban");
  const second = buildSculptedCharacter("laban");
  let disposalEvents = 0;
  first.group.traverse((object) => {
    if (!(object instanceof T.Mesh)) return;
    const other = second.group.getObjectByName(object.name);
    if (other instanceof T.Mesh)
      assert.notEqual(object.geometry, other.geometry);
    object.geometry.addEventListener("dispose", () => disposalEvents++);
  });
  const count = (() => {
    let value = 0;
    first.group.traverse((object) => {
      if (object instanceof T.Mesh) value++;
    });
    return value;
  })();
  first.dispose();
  assert.equal(disposalEvents, count);
  assert.ok(second.group.getObjectByName("character-headwear"));
  second.dispose();
});

test("low detail Lehi keeps the beard closed across the chin", () => {
  // Marching cubes omits outer voxel rows. Reusing hero bounds at lower
  // resolution used to clip away the front of the beard and expose skin.
  for (const quality of ["npc", "crowd"] as const) {
    const actor = buildSculptedCharacter("lehi", { quality });
    actor.group.updateMatrixWorld(true);
    const beard = actor.group.getObjectByName(
      "one-piece-sculpted-beard",
    ) as T.Mesh;
    const face = actor.group.getObjectByName(
      "sculpted-face-neck-nose",
    ) as T.Mesh;
    for (const y of [1.35, 1.4, 1.45, 1.5, 1.55]) {
      for (const x of [-0.12, -0.06, 0, 0.06, 0.12]) {
        const ray = new T.Raycaster(
          new T.Vector3(x, y, 3).applyMatrix4(beard.matrixWorld),
          new T.Vector3(0, 0, -1).transformDirection(beard.matrixWorld),
        );
        const outer = ray.intersectObject(beard, false)[0];
        const inner = ray.intersectObject(face, false)[0];
        assert.ok(outer, `${quality}: missing beard at ${x},${y}`);
        if (inner)
          assert.ok(
            outer.distance < inner.distance,
            `${quality}: exposed chin at ${x},${y}`,
          );
      }
    }
    actor.dispose();
  }
});

test("hero shoes close the toe, heel and sole for every cast member", () => {
  // Hero geometry uses the same support field as both lower-detail qualities.
  for (const role of roles) {
    const actor = buildSculptedCharacter(role, { quality: "hero" });
    assertClosedShoes(actor.group, `${role}/hero`);
    actor.dispose();
  }
});

test("Nephi has an athletic waist while retaining broad shoulders", () => {
  const elder = buildSculptedCharacter("lehi", { quality: "hero" });
  const width = (group: T.Group, y: number, z: number) => {
    group.updateMatrixWorld(true);
    const mesh = group.getObjectByName("continuous-robe-and-sleeves") as T.Mesh;
    const hit = (side: number) => {
      const ray = new T.Raycaster(
        new T.Vector3(side * 2, y, z).applyMatrix4(mesh.matrixWorld),
        new T.Vector3(-side, 0, 0).transformDirection(mesh.matrixWorld),
      );
      return ray
        .intersectObject(mesh, false)[0]
        .point.applyMatrix4(mesh.matrixWorld.clone().invert()).x;
    };
    return hit(1) - hit(-1);
  };
  const elderWaist = width(elder.group, 1.04, -0.2);
  const elderShoulders = width(elder.group, 1.28, -0.1);
  for (const role of ["nephi", "nephi-disguised"] as const) {
    const actor = buildSculptedCharacter(role, { quality: "hero" });
    assert.ok(
      width(actor.group, 1.04, -0.2) < elderWaist * 0.7,
      `${role}: waist should taper rather than retain the elder's round torso`,
    );
    assert.ok(
      width(actor.group, 1.28, -0.1) > elderShoulders * 0.95,
      `${role}: shoulders should retain their breadth`,
    );
    actor.dispose();
  }
  elder.dispose();
});

test("the child's side hair ends above the bottom of the ears", () => {
  for (const quality of ["hero", "npc", "crowd"] as const) {
    const actor = buildSculptedCharacter("child", { quality });
    const hair = actor.group.getObjectByName(
      "single-sculpted-hair-cap",
    ) as T.Mesh;
    const positions = hair.geometry.getAttribute("position");
    let sideVertices = 0;
    for (let i = 0; i < positions.count; i++)
      if (
        Math.abs(positions.getX(i)) > 0.245 &&
        positions.getZ(i) > -0.025 &&
        positions.getZ(i) < 0.27
      ) {
        sideVertices++;
        assert.ok(
          positions.getY(i) > 1.6,
          `${quality}: dangling sideburn below the ear`,
        );
      }
    assert.ok(sideVertices > 0, `${quality}: missing side hair`);
    actor.dispose();
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildSculptedCharacter } from "./lehi-sculpted-models";

test("maidservant has a distinct narrow silhouette and long sculpted back hair", () => {
  for (const quality of ["hero", "npc", "crowd"] as const) {
    const maid = buildSculptedCharacter("maidservant", { quality });
    const wife = buildSculptedCharacter("wife", { quality });
    const back = maid.group.getObjectByName(
      "long-sculpted-back-hair",
    ) as T.Mesh;
    assert.ok(
      back,
      `${quality}: long hair must remain visible at every quality`,
    );
    back.geometry.computeBoundingBox();
    const bounds = back.geometry.boundingBox!;
    assert.ok(
      bounds.min.y < 1.12 && bounds.max.y > 1.72,
      "hair reaches from crown down the back",
    );
    assert.ok(
      bounds.max.z < -0.15,
      "hair stays behind the face and coat front",
    );
    const robe = maid.group.getObjectByName("flowing-mantle") as T.Mesh;
    const oldRobe = wife.group.getObjectByName("flowing-mantle") as T.Mesh;
    robe.geometry.computeBoundingBox();
    oldRobe.geometry.computeBoundingBox();
    assert.ok(
      robe.geometry.boundingBox!.getSize(new T.Vector3()).x <
        oldRobe.geometry.boundingBox!.getSize(new T.Vector3()).x,
      "maidservant garment is narrower than the existing wife costume",
    );
    assert.equal(
      wife.group.getObjectByName("long-sculpted-back-hair"),
      undefined,
      "existing wives keep their own appearance",
    );
    maid.dispose();
    wife.dispose();
  }
});

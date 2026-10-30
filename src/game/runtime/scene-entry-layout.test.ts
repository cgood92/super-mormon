import test from "node:test";
import assert from "node:assert/strict";
import { sceneEntry, cameraModeForWorld } from "./scene-entry";
import { STORY_ORDER } from "./progression";
import { laterPaintingLocation } from "../worlds/conference/gallery-layout";

test("direct scene entry accepts every registered story and rejects invalid values", () => {
  assert.equal(sceneEntry("?scene=missionary"), "missionary");
  for (const id of STORY_ORDER) {
    assert.equal(sceneEntry(`?scene=${id}`), id);
    assert.ok(
      ["conference", "streets", "house", "palace", "trade", "night"].includes(
        cameraModeForWorld(id),
      ),
    );
  }
  for (const search of [
    "",
    "?scene=invalid",
    "?scene=__proto__",
    "?scene=hub",
    "?playtest",
  ])
    assert.equal(sceneEntry(search), null);
});
test("later paintings progress through side hallways before ascending, never auditorium", () => {
  for (let i = 0; i < 26; i++) {
    const p = laterPaintingLocation(i);
    assert.ok(Math.abs(p.x) > 67);
    assert.equal(p.y, Math.floor(i / 10) * 12);
    assert.ok(p.z < 0 && p.z > -100);
    assert.notDeepEqual(p, laterPaintingLocation(i + 1));
  }
});

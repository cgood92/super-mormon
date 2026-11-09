import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN_SCENES,
  ADMIN_GROUPS,
  escapeHtml,
  renderAdminMenuHtml,
} from "./admin-scenes";
import { STORY_ORDER, STORY_TITLES } from "../game/runtime/progression";
import { sceneEntry } from "../game/runtime/scene-entry";

test("admin scene registry includes all 32 story scenes plus hub and missionary", () => {
  assert.equal(ADMIN_SCENES.length, 34);

  const ids = new Set(ADMIN_SCENES.map((s) => s.id));
  assert.equal(ids.size, 34, "All scene IDs must be unique");

  for (const storyId of STORY_ORDER) {
    assert.ok(
      ids.has(storyId),
      `Missing story scene in admin registry: ${storyId}`,
    );
    const scene = ADMIN_SCENES.find((s) => s.id === storyId)!;
    assert.equal(scene.title, STORY_TITLES[storyId]);
    assert.ok(
      scene.chapter.length > 0,
      `Scene ${storyId} must have chapter reference`,
    );
    assert.ok(
      scene.description.length > 0,
      `Scene ${storyId} must have description`,
    );
    assert.ok(
      ADMIN_GROUPS.includes(scene.group as any),
      `Scene ${storyId} group "${scene.group}" must be in ADMIN_GROUPS`,
    );

    // Verify sceneEntry recognizes this scene
    const parsed = sceneEntry(`?scene=${storyId}`);
    assert.equal(parsed, storyId, `sceneEntry must parse ?scene=${storyId}`);
  }

  assert.ok(ids.has("missionary"), "Registry must include missionary");
  assert.equal(sceneEntry("?scene=missionary"), "missionary");

  assert.ok(ids.has("hub"), "Registry must include hub");
});

test("renderAdminMenuHtml builds a standalone menu with links and filter controls", () => {
  const html = renderAdminMenuHtml("/");

  assert.ok(html.startsWith("<!doctype html>"));
  assert.ok(html.includes("Super Mormon"));
  assert.ok(html.includes("Local Dev Only"));
  assert.ok(html.includes('id="filter"'));
  assert.ok(html.includes('id="pills-bar"'));
  assert.ok(html.includes('id="search-status"'));

  for (const scene of ADMIN_SCENES) {
    if (scene.id === "hub") {
      assert.ok(html.includes('data-id="hub"'));
    } else {
      assert.ok(
        html.includes(`?scene=${encodeURIComponent(scene.id)}`),
        `HTML must include jump link for ${scene.id}`,
      );
    }
  }

  // Check custom base path handling
  const prefixedHtml = renderAdminMenuHtml("/super-mormon/");
  assert.ok(
    prefixedHtml.includes('href="/super-mormon/?scene=bountiful"'),
    "Custom base path must be prefixed on scene links",
  );
  assert.ok(
    prefixedHtml.includes('href="/super-mormon/"'),
    "Custom base path must be prefixed on hub return link",
  );
});

test("escapeHtml sanitizes special characters", () => {
  assert.equal(
    escapeHtml("<script>alert(\"xss\") & 'foo'</script>"),
    "&lt;script&gt;alert(&quot;xss&quot;) &amp; &#039;foo&#039;&lt;/script&gt;",
  );
});

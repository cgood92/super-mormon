import assert from "node:assert/strict";
import test from "node:test";
import { chapterLabel, entryMessage } from "./scene-copy";
import { STORY_ORDER, type StoryId } from "./progression";
import { WAR_CHAPTERS } from "./scene-entry";
import type { WorldId } from "./worlds";

const world = { initialObjective: "Find the path.", subtitle: "Explore." };
const completed = new Set<StoryId>();

test("chapter labels preserve gallery, scripture and fictional scene distinctions", () => {
  assert.equal(chapterLabel("hub"), "");
  assert.equal(
    chapterLabel("missionary"),
    "A FICTIONAL NEIGHBORHOOD CHALLENGE",
  );
  assert.equal(chapterLabel("streets"), "1 NEPHI 1–2 · ABOUT 600 BC");
  assert.equal(chapterLabel("house"), "1 NEPHI 3 · ABOUT 600 BC");
  assert.equal(chapterLabel("night"), "1 NEPHI 4 · ABOUT 600 BC");
  assert.equal(chapterLabel("voyage"), "1 NEPHI 18 · THE OCEAN VOYAGE");
});

test("later chapter copy uses scripture labels and world objectives", () => {
  for (const [id, chapter] of Object.entries(WAR_CHAPTERS)) {
    assert.equal(chapterLabel(id as WorldId), chapter);
    assert.equal(
      entryMessage(id as WorldId, world, completed),
      "Find the path.",
    );
  }
  assert.equal(entryMessage("missionary", world, completed), "Find the path.");
  assert.equal(
    entryMessage("missionary", { subtitle: "Explore." }, completed),
    "Explore.",
  );
  assert.equal(
    entryMessage(
      "samuel",
      { initialObjective: "", subtitle: "Explore." },
      completed,
    ),
    "",
  );
});

test("gallery entry message names the next unfinished story or offers replay", () => {
  assert.equal(
    entryMessage("hub", world, completed),
    "Next story: Jerusalem Streets. Jump into its painting.",
  );
  assert.equal(
    entryMessage("hub", world, new Set(["streets"])),
    "Next story: Laban’s Palace. Jump into its painting.",
  );
  assert.equal(
    entryMessage("hub", world, new Set(STORY_ORDER)),
    "All stories complete. Jump into any painting to replay.",
  );
});

test("early chapter messages preserve their authored hints rather than world objectives", () => {
  assert.equal(
    entryMessage("streets", world, completed),
    "Find the blue door. Watch the streets.",
  );
  assert.equal(
    entryMessage("house", world, completed),
    "Five treasures. Every room has a story.",
  );
  assert.equal(
    entryMessage("tree", world, completed),
    "Take your time. Follow the path toward the tree.",
  );
  assert.equal(
    entryMessage("trade", world, completed),
    "Your brothers will follow. Bring the treasures to Laban.",
  );
});

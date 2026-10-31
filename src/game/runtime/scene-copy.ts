import { nextStory, STORY_TITLES, type StoryId } from "./progression";
import { WAR_CHAPTERS } from "./scene-entry";
import type { WorldData, WorldId } from "./worlds";

const CHAPTER_LABELS: Partial<Record<WorldId, string>> = {
  missionary: "A FICTIONAL NEIGHBORHOOD CHALLENGE",
  hub: "",
  streets: "1 NEPHI 1–2 · ABOUT 600 BC",
  tree: "1 NEPHI 8 · LEHI’S VISION",
  "broken-bow": "1 NEPHI 16 · THE BROKEN BOW",
  bountiful: "1 NEPHI 17 · BUILDING THE SHIP",
  voyage: "1 NEPHI 18 · THE OCEAN VOYAGE",
  jacob: "JACOB 7 · FAITH IN CHRIST",
  ammon: "ALMA 17 · ABOUT 91 BC",
  waters: "MOSIAH 18 · ABOUT 147–145 BC",
  promised: "1 NEPHI 18 · 2 NEPHI 1–5",
  vineyard: "JACOB 5 · THE OLIVE VINEYARD",
  night: "1 NEPHI 4 · ABOUT 600 BC",
};

const ENTRY_MESSAGES: Partial<Record<WorldId, string>> = {
  house: "Five treasures. Every room has a story.",
  palace: "Find Laban at the far end of the courtyard.",
  trade: "Your brothers will follow. Bring the treasures to Laban.",
  jacob: "Explore the settlement and meet Jacob’s neighbors.",
  ammon: "Meet Lamoni, gather the flocks, and guard the waters of Sebus.",
  waters: "Many generations later: slip past Noah’s spies and find Alma.",
  promised: "Help the family settle, then follow the journey to a new home.",
  vineyard: "Explore the vineyard in Jacob’s retelling. Care for the trees.",
  night: "Enter the city and search its moonlit streets.",
  tree: "Take your time. Follow the path toward the tree.",
  "broken-bow": "Hunt in the mountains and help feed the family.",
  bountiful: "Climb the mountain trail and pray. Then help build the ship.",
  voyage: "Explore the ship and meet the family aboard.",
};

export function chapterLabel(id: WorldId): string {
  if (id === "missionary") return CHAPTER_LABELS.missionary!;
  return WAR_CHAPTERS[id] ?? CHAPTER_LABELS[id] ?? "1 NEPHI 3 · ABOUT 600 BC";
}

export function entryMessage(
  id: WorldId,
  world: Pick<WorldData, "initialObjective" | "subtitle">,
  completed: ReadonlySet<StoryId>,
): string {
  if (WAR_CHAPTERS[id] || id === "missionary")
    return world.initialObjective ?? world.subtitle;
  if (id === "hub") {
    const next = nextStory(completed);
    return next
      ? `Next story: ${STORY_TITLES[next]}. Jump into its painting.`
      : "All stories complete. Jump into any painting to replay.";
  }
  return ENTRY_MESSAGES[id] ?? "Find the blue door. Watch the streets.";
}

export const STORY_ORDER = [
  "streets",
  "palace",
  "house",
  "trade",
  "night",
  "tree",
  "bountiful",
  "voyage",
] as const;
export type StoryId = (typeof STORY_ORDER)[number];

export const STORY_TITLES: Record<StoryId, string> = {
  streets: "Jerusalem Streets",
  palace: "Laban’s Palace",
  house: "Lehi’s House",
  trade: "The Treasure Offer",
  night: "Jerusalem by Night",
  tree: "The Tree of Life",
  bountiful: "Building the Ship",
  voyage: "The Ocean Voyage",
};

export function isStoryId(value: unknown): value is StoryId {
  return STORY_ORDER.includes(value as StoryId);
}

export function readCompleted(value: unknown): Set<StoryId> {
  return new Set(Array.isArray(value) ? value.filter(isStoryId) : []);
}

export function nextStory(completed: ReadonlySet<StoryId>): StoryId | null {
  return STORY_ORDER.find((id) => !completed.has(id)) ?? null;
}

export function canEnter(
  id: StoryId,
  completed: ReadonlySet<StoryId>,
): boolean {
  if (completed.has(id)) return true;
  return STORY_ORDER.slice(0, STORY_ORDER.indexOf(id)).every((prior) =>
    completed.has(prior),
  );
}

export function prerequisite(
  id: StoryId,
  completed: ReadonlySet<StoryId>,
): StoryId | null {
  if (completed.has(id)) return null;
  return (
    STORY_ORDER.slice(0, STORY_ORDER.indexOf(id)).find(
      (prior) => !completed.has(prior),
    ) ?? null
  );
}

import { STORY_TITLES, type StoryId } from "./progression";

// Entrance paintings remain fixed; later chapters invite exploration of side halls.
// Four stories per wing before continuing up. All positions are outside the auditorium.
export function laterPaintingLocation(index: number) {
  const floor = Math.floor(index / 8);
  const slot = index % 8;
  return {
    x: slot < 4 ? 67.38 : -67.38,
    y: floor * 12,
    z: -20 - (slot % 4) * 23,
  };
}
export function laterPainting(id: StoryId, index: number) {
  return {
    id,
    title: STORY_TITLES[id].toUpperCase(),
    ...laterPaintingLocation(index),
  };
}

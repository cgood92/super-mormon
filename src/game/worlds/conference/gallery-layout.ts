import { STORY_TITLES, type StoryId } from "../../runtime/progression";

// Entrance paintings remain fixed; later chapters invite exploration of side halls.
// Five well-spaced bays per wing keep the complete 32-story collection on three floors.
export const SIDE_HALL_PAINTING_Z = [-16, -34, -52, -70, -88] as const;
export function laterPaintingLocation(index: number) {
  const floor = Math.floor(index / 10);
  const slot = index % 10;
  return {
    x: slot < 5 ? 67.38 : -67.38,
    y: floor * 12,
    z: SIDE_HALL_PAINTING_Z[slot % 5],
  };
}
export function laterPainting(id: StoryId, index: number) {
  return {
    id,
    title: STORY_TITLES[id].toUpperCase(),
    ...laterPaintingLocation(index),
  };
}

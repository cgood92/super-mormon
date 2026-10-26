import { isStoryId, type StoryId } from "./progression";
import type { CameraMode } from "./camera";
import type { WorldId } from "./worlds";

/** Deliberately undocumented in the player UI; test sessions never save progress. */
export function sceneEntry(search: string): StoryId | null {
  const candidate = new URLSearchParams(search).get("scene");
  return isStoryId(candidate) ? candidate : null;
}
export function cameraModeForWorld(id: WorldId): CameraMode {
  if (id === "hub") return "conference";
  if (["house", "palace", "trade", "night"].includes(id))
    return id as CameraMode;
  return "streets";
}
export const WAR_CHAPTERS: Partial<Record<WorldId, string>> = {
  samuel: "HELAMAN 13–16 · ABOUT 6 BC",
  "title-liberty": "ALMA 46 · THE TITLE OF LIBERTY",
  lehonti: "ALMA 47 · MOUNT ANTIPAS",
  morianton: "ALMA 50 · THE NARROW PASS",
  teancum: "ALMA 51 · A NIGHT MISSION",
  gid: "ALMA 55 · THE PRISONERS OF GID",
  nephihah: "ALMA 62 · THE WALLS OF NEPHIHAH",
};

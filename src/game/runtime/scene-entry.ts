import { isStoryId, type StoryId } from "./progression";
import type { CameraMode } from "../camera/camera";
import type { WorldId } from "./worlds";

/** Deliberately undocumented in the player UI; test sessions never save progress. */
export function sceneEntry(search: string): StoryId | "missionary" | null {
  const candidate = new URLSearchParams(search).get("scene");
  return candidate === "missionary" || isStoryId(candidate) ? candidate : null;
}
export function cameraModeForWorld(id: WorldId): CameraMode {
  if (id === "hub") return "conference";
  if (["house", "palace", "trade", "night"].includes(id))
    return id as CameraMode;
  return "streets";
}
/** These open worlds keep their optional routes available after the story ends. */
export function keepsExploringAfterCompletion(id: WorldId): boolean {
  return [
    "signs",
    "gathering",
    "christ-bountiful",
    "peace-city",
    "mormon-records",
  ].includes(id);
}
export const WAR_CHAPTERS: Partial<Record<WorldId, string>> = {
  "peace-city": "4 NEPHI 1 · A PEOPLE OF PEACE",
  "mormon-records": "MORMON 1, 4, 6 · PRESERVING THE RECORDS",
  signs: "3 NEPHI 1 · THE NIGHT WITHOUT DARKNESS",
  gathering: "3 NEPHI 3–4 · GATHERING TO SAFETY",
  "christ-bountiful": "3 NEPHI 11, 17 · CHRIST AT BOUNTIFUL",
  samuel: "HELAMAN 13–16 · ABOUT 6 BC",
  "title-liberty": "ALMA 46 · THE TITLE OF LIBERTY",
  lehonti: "ALMA 47 · MOUNT ANTIPAS",
  morianton: "ALMA 50 · THE NARROW PASS",
  teancum: "ALMA 51 · A NIGHT MISSION",
  gid: "ALMA 55 · THE PRISONERS OF GID",
  nephihah: "ALMA 62 · THE WALLS OF NEPHIHAH",
};

import * as T from "three";
import { adventureLandscape, withinTask } from "./adventure-landscape";
import { buildNephiteTemple } from "./nephite-temple";
import type { Point, WorldData } from "./worlds";

/** Jacob 7:1–23. Architecture and exploration staging are interpretive. */
export function buildJacobSherem(scene: T.Scene): WorldData {
  const land = adventureLandscape(
    scene,
    "Jacob's settlement",
    0xb3b081,
    140,
    190,
  );
  const { root, solids, solid } = land;
  const temple = buildNephiteTemple(root, solids);
  // Open doorways face the streets. Walls and roofs share their physical dimensions.
  function home(x: number, z: number, tint: number) {
    solid({ x: x - 4, y: 0, z, w: 0.6, h: 4.2, d: 8 }, tint, "Home west wall");
    solid({ x: x + 4, y: 0, z, w: 0.6, h: 4.2, d: 8 }, tint, "Home east wall");
    solid({ x, y: 0, z: z - 4, w: 8, h: 4.2, d: 0.6 }, tint, "Home back wall");
    for (const dx of [-2.8, 2.8])
      solid(
        { x: x + dx, y: 0, z: z + 4, w: 2.4, h: 4.2, d: 0.6 },
        tint,
        "Doorway side",
      );
    solid(
      { x, y: 4.2, z, w: 8.8, h: 0.5, d: 8.8 },
      0x9d7955,
      "Solid timber roof",
    );
  }
  home(-17, 23, 0xc8b58b);
  home(17, 20, 0xd1b990);
  home(-19, -19, 0xbfa981);
  home(20, -19, 0xd6c29b);
  solid(
    { x: -15, y: 0, z: 23, w: 2, h: 0.8, d: 1.5 },
    0x816046,
    "Household table",
  );
  solid(
    { x: 24, y: 0, z: 4, w: 4, h: 0.75, d: 2 },
    0x9d805a,
    "Low garden terrace",
  );
  solid(
    { x: -25, y: 0, z: -3, w: 3, h: 0.7, d: 2 },
    0x947653,
    "Stone resting bench",
  );
  for (const [x, z] of [
    [-29, 29],
    [29, 30],
    [-30, -31],
    [31, -31],
  ])
    land.tree(x, z);
  const sherem = land.actor("sherem", {
    x: 2.8,
    y: 0,
    z: 0,
    yaw: -Math.PI / 2,
  });
  sherem.group.name = "Sherem · articulate visitor";
  const listeners = [
    land.actor("sam", { x: -5, y: 0, z: -6 }),
    land.actor("sariah", { x: 6, y: 0, z: -7 }),
    land.actor("child", { x: 0, y: 0, z: -9 }),
  ];
  const study = { x: -17, y: 0, z: 29 };
  const square = { x: 0, y: 0, z: 3 };
  const care = { x: 17, y: 0, z: 27 };
  const peace = { x: 0, y: 0, z: -17 };
  const discovery = { x: -23, y: 0, z: -3 };
  const stages = [
    {
      id: "settlement",
      at: study,
      action: "Leave home and consider Jacob's witness",
      ref: "Jacob 7:1–5",
      title: "Steady faith",
      text: "Sherem wins many hearts by denying Christ. Jacob's faith rests on revelation and his own experience with God.",
    },
    {
      id: "testimony",
      at: square,
      action: "Meet Sherem in the square",
      ref: "Jacob 7:6–12",
      title: "The scriptures testify of Christ",
      text: "Sherem challenges Jacob's teaching. Strengthened by the Spirit, Jacob testifies that the prophets speak of Christ, and that all need His Atonement.",
    },
    {
      id: "sign",
      at: square,
      action: "Hear Sherem's demand",
      ref: "Jacob 7:13–15",
      title: "God's will",
      text: "Sherem demands a sign. Jacob leaves the matter to God's will. The Lord's power comes upon Sherem, and he falls.",
    },
    {
      id: "days",
      at: care,
      action: "Walk to the house of care",
      ref: "Jacob 7:15–16",
      title: "Many days pass",
      text: "Sherem is nourished for many days. Then he asks the people to gather the next day, so he can speak before he dies.",
    },
    {
      id: "confession",
      at: square,
      action: "Return for the next day's gathering",
      ref: "Jacob 7:17–22",
      title: "Sherem's confession",
      text: "Sherem rejects his former teachings, confesses Christ, and speaks of his deception and fear. After speaking, he dies. The witnesses are overcome by God's power.",
    },
    {
      id: "peace",
      at: peace,
      action: "Walk with the community toward peace",
      ref: "Jacob 7:23",
      title: "Peace restored",
      text: "Peace and God's love return among the people. They search the scriptures and no longer follow Sherem's teachings.",
    },
  ];
  let fallTime = 0;
  let index = 0,
    pending = false,
    ended = false,
    discovered = false;
  land.update(0, study);
  return {
    name: "Jacob and Sherem",
    subtitle: "A witness of Christ • Jacob 7",
    initialObjective: stages[0].action,
    spawn: { x: 0, y: 0, z: 38 },
    solids,
    actorParent: root,
    bounds: { minX: -55, maxX: 55, minZ: -86, maxZ: 55 },
    goal: { ...peace, radius: 3 },
    landmarks: [
      { name: "Jacob's home", ...study },
      { name: "Meeting square", ...square },
      { name: "House of care", ...care },
      { name: "Quiet garden", ...discovery },
      { name: "Nephi's temple · interpretive", ...temple.entrance },
    ],
    update(dt) {
      if (index === 3 && !ended) {
        fallTime = Math.min(1, fallTime + Math.min(Math.max(dt, 0), 0.1) / 0.9);
        sherem.group.rotation.z =
          (-Math.PI / 2) * (fallTime * fallTime * (3 - 2 * fallTime));
        sherem.group.position.y = fallTime * 0.35;
      }
      land.update(dt, ended ? undefined : stages[index].at);
    },
    adventure(hooks) {
      hooks.setAvatar("jacob");
      hooks.toast(
        "Explore the settlement as Jacob. Homes and streets are an imagined setting for Jacob 7; follow the blue beacon.",
      );
      return {
        snapshot: () => ({
          phase: ended ? "done" : stages[index].id,
          index,
          pending,
          discovered,
          target: stages[index].at,
          targets: stages.map((s) => ({ id: s.id, ...s.at })),
        }),
        update(_dt, player, input) {
          if (ended)
            return { objective: "Peace restored", prompt: "Journey complete" };
          const stage = stages[index];
          const close = withinTask(player, stage.at);
          const optional = !discovered && withinTask(player, discovery);
          const atTemple =
            withinTask(player, temple.entrance, 3.2) ||
            withinTask(player, temple.hall, 3.2) ||
            withinTask(player, temple.inner, 3.2);
          if (!pending && input.interact && optional) {
            discovered = true;
            hooks.toast(
              "Quiet garden · Jacob's confidence came from revelation, not a contest of eloquence (Jacob 7:4–5). This resting place is imagined.",
            );
          } else if (!pending && atTemple && input.interact && !close) {
            hooks.toast(
              "Nephi built a temple after the manner of Solomon's, with fewer precious things (2 Nephi 5:16). This layout and its furnishings are interpretive; explore the porch, hall, and inner room.",
            );
          } else if (!pending && close && input.interact) {
            pending = true;
            hooks.dialog(
              stage.ref,
              stage.title,
              stage.text,
              () => {
                pending = false;
                if (stage.id === "sign") {
                  // No attack, flash, or reward: the narrated event leads into care.
                  fallTime = 0;
                }
                if (stage.id === "days") {
                  sherem.group.rotation.z = 0;
                  sherem.group.position.set(2.8, 0, 0);
                  sherem.group.visible = true;
                  listeners.forEach((a) => {
                    a.group.visible = true;
                  });
                }
                if (stage.id === "confession") sherem.group.visible = false;
                if (index === stages.length - 1) {
                  ended = true;
                  land.marker.visible = false;
                  hooks.complete();
                } else {
                  index++;
                  land.update(0, stages[index].at);
                }
              },
              {
                focus: { x: stage.at.x, y: 1.1, z: stage.at.z },
                wide: 5,
                playerGesture: "talk",
                actors:
                  stage.at === square && sherem.group.visible
                    ? [
                        { group: sherem.group, gesture: "talk", speaker: true },
                        ...listeners.map((a) => ({ group: a.group })),
                      ]
                    : [],
              },
            );
          }
          return {
            objective: stages[index].action,
            prompt: pending
              ? ""
              : optional
                ? "{action} · Reflect in the quiet garden"
                : atTemple
                  ? "{action} · Explore Nephi's temple"
                  : close
                    ? `{action} · ${stage.action}`
                    : "",
          };
        },
        dispose() {
          ended = true;
          land.marker.visible = false;
        },
      };
    },
    dispose() {
      ended = true;
      land.dispose();
    },
  };
}

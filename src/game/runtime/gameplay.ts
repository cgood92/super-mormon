import * as T from "three";
import {
  activeFrameSeconds,
  movementActions,
  type GameplayAnalytics,
} from "./analytics";
import { stepPlayer } from "../physics/physics";
import {
  stepCarryObjects,
  dropObject,
  throwObject,
  nearestCarryObject,
  pickUp,
} from "../physics/objects";
import { hasLineOfSight } from "../physics/interactions";
import { navigateGuard } from "../physics/guard-navigation";
import {
  applyAdventureCamera,
  adventureCameraYaw,
} from "../camera/adventure-camera";
import { cameraModeForWorld } from "./scene-entry";
import { conferenceLocation } from "../worlds/conference/conference-location";
import { canJumpIntoPainting } from "../worlds/conference/gallery-entry";
import {
  nextStory,
  STORY_TITLES,
  isStoryId,
  prerequisite,
  canEnter,
  type StoryId,
} from "./progression";
import type { WorldId } from "./worlds";
import type { InputState } from "../controls/input";
import type { WorldSession } from "./world-session";
import type { Discoveries } from "./discoveries";
import type { GameUI } from "../ui/game-ui";
import type { GameView } from "../rendering/game-view";
import type { SoundKind } from "../audio/sound-effects";
import type { StoryShot } from "../camera/cinematic";
import { el } from "../ui/game-shell";
export interface GameplayHooks {
  sound(kind: SoundKind): void;
  complete(): void;
  warp(id: WorldId): void;
  dialog(
    kicker: string,
    title: string,
    body: string,
    next: () => void,
    shot?: StoryShot,
  ): void;
  caught(): void;
  isTransitioning(): boolean;
  playOrgan(): void;
}
/** Coordinates one active simulation step in the same order as player input. */
export class Gameplay {
  time = 0;
  levelTime = 0;
  guardsActive = false;
  caughtGrace = 0;
  organSeated = false;
  hubLocation = "";
  constructor(
    private readonly session: WorldSession,
    private readonly discoveries: Discoveries,
    private readonly ui: GameUI,
    private readonly view: GameView,
    private readonly analytics: GameplayAnalytics,
    private readonly completed: Set<StoryId>,
    private readonly hooks: GameplayHooks,
  ) {}
  reset(id: WorldId) {
    this.levelTime = 0;
    this.guardsActive = id === "streets";
    this.caughtGrace = 3;
    this.organSeated = false;
    this.hubLocation = "";
  }
  updateObjective = () => {
    const text =
      this.session.storyObjective ||
      (this.discoveries.practiceVisible
        ? "Movement Studio · Learn at your own pace."
        : this.session.worldId === "hub"
          ? conferenceLocation(this.session.player).name !== "Story Gallery"
            ? conferenceLocation(this.session.player).hint
            : nextStory(this.completed)
              ? `Next: ${STORY_TITLES[nextStory(this.completed)!]} · {jump} into the painting.`
              : "All stories complete · {jump} into any painting to replay."
          : this.session.worldId === "streets"
            ? "Help Lehi reach his home safely."
            : this.session.worldId === "house"
              ? this.session.collected.size === 5
                ? "Return to the courtyard entrance."
                : `Find the family’s treasures · ${this.session.collected.size} of 5`
              : this.guardsActive
                ? "Run through the gate. Your brothers are outside."
                : "Find Laban and ask for the brass plates.");
    this.ui.setObjective(text);
  };

  near = (
    p: { x: number; y: number; z: number },
    radius = 1.6,
    vertical = 1.8,
  ) => {
    return (
      Math.hypot(this.session.player.x - p.x, this.session.player.z - p.z) <
        radius && Math.abs(this.session.player.y - p.y) < vertical
    );
  };

  private updateStoryObjective(
    objective: string,
    runtime: { snapshot(): unknown },
  ) {
    if (this.session.storyObjective === objective) return;
    const phase = (runtime.snapshot() as { phase?: unknown }).phase;
    if (typeof phase === "string") this.analytics.storyStep(phase);
    this.session.storyObjective = objective;
    this.updateObjective();
  }
  update(dt: number, activeElapsed: number, state: InputState) {
    const movementLocked = this.updatePlayerAndWorld(dt, activeElapsed, state);
    const storyPrompt = this.updateStoryAndAvatar(dt, state);
    if (storyPrompt === null) return;
    this.updateCameraAndExtras(dt, state);
    this.discoveries.updatePickups(dt, this.time);
    const prompt = this.updateWorldInteractions(dt, state, storyPrompt);
    if (prompt === null) return;
    if (this.updatePursuers(dt, movementLocked)) return;
    this.updateInteractionHints(dt, state, prompt);
  }

  private updatePlayerAndWorld(
    dt: number,
    activeElapsed: number,
    state: InputState,
  ): boolean {
    this.time += dt;
    this.ui.time = this.time;
    const opening =
      this.session.worldId === "streets" &&
      !!this.session.adventure?.movementLocked?.();
    this.ui.app.classList.toggle("story-opening", opening);
    if (!opening) this.levelTime += dt;
    this.analytics.setDevice(this.ui.input.device);
    this.analytics.tick(activeFrameSeconds(activeElapsed));
    this.ui.app.classList.toggle("chapter-faded", this.levelTime >= 10);
    if (!opening) this.caughtGrace = Math.max(0, this.caughtGrace - dt);
    if (
      this.organSeated &&
      (!this.session.world.organ?.playing() || state.interact || state.jump)
    ) {
      this.session.world.organ?.stop();
      this.organSeated = false;
      this.session.player.z = -91.7;
      this.session.player.y = 4.5;
      this.ui.input.reset();
      state.interact = state.jump = false;
    }
    const movementLocked =
      this.organSeated || !!this.session.adventure?.movementLocked?.();
    if (movementLocked) this.session.player.vx = this.session.player.vz = 0;
    const previousMove = {
      move: this.session.player.move,
      climbId: this.session.player.climbId,
    };
    const events = stepPlayer(
      this.session.player,
      movementLocked
        ? { ...state, x: 0, y: 0, jump: false, jumpHeld: false }
        : state,
      dt,
      adventureCameraYaw(
        this.session.adventure?.camera?.(),
        this.view.follow.yaw,
      ),
      this.session.world.solids,
      this.session.world.climbables,
      this.session.world.swimRegions,
    );
    if (!movementLocked)
      for (const action of movementActions(
        previousMove,
        this.session.player,
        events,
      ))
        this.analytics.move(action);
    if (this.organSeated && this.session.world.organ) {
      Object.assign(this.session.player, this.session.world.organ.seat, {
        vx: 0,
        vy: 0,
        vz: 0,
        yaw: Math.PI,
      });
    }
    this.session.world.update?.(dt, this.session.player);
    if (events.jumped) this.hooks.sound("jump");
    if (events.pounded) {
      this.session.poundImpact?.trigger(this.session.player);
      this.hooks.sound("pound");
    }
    this.session.poundImpact?.update(dt);
    const b = this.session.world.bounds;
    if (b) {
      this.session.player.x = T.MathUtils.clamp(
        this.session.player.x,
        b.minX + 0.35,
        b.maxX - 0.35,
      );
      this.session.player.z = T.MathUtils.clamp(
        this.session.player.z,
        b.minZ + 0.35,
        b.maxZ - 0.35,
      );
    }
    return movementLocked;
  }

  private updateStoryAndAvatar(dt: number, state: InputState): string | null {
    let adventureCarrying = false;
    let holdingBanner = false;
    let wavingBanner = false;
    let pointing = false;
    let adventureAiming = false;
    let holdingBow = false;
    let adventureDraw = 0;
    let treePrompt = "";
    if (this.session.adventure) {
      const result = this.session.adventure.update(
        dt,
        this.session.player,
        state,
      );
      treePrompt =
        result.prompt && this.session.worldId === "bountiful"
          ? `{action} · ${result.prompt}`
          : result.prompt;
      adventureCarrying = !!result.carrying;
      holdingBanner = !!result.holdingBanner;
      wavingBanner = !!result.wave;
      pointing = !!result.pointing;
      adventureAiming = !!result.aiming;
      holdingBow = !!result.holdingBow;
      adventureDraw = result.draw ?? 0;
      this.updateStoryObjective(result.objective, this.session.adventure);
      if (this.ui.paused || this.hooks.isTransitioning()) return null;
    }
    if (this.session.treeScene) {
      const result = this.session.treeScene.update(dt, this.session.player, {
        interact: state.interact,
        holdRod: state.interactHeld,
        crouch: state.crouch,
      });
      treePrompt = result.prompt;
      this.updateStoryObjective(result.objective, this.session.treeScene);
      if (this.ui.paused || this.hooks.isTransitioning()) return null;
    }
    stepCarryObjects(
      this.discoveries.carryObjects,
      this.session.player,
      dt,
      this.session.world.solids,
    );
    const held = this.discoveries.carryObjects.find((object) => object.held);
    if (held && state.interact) {
      if (state.crouch) dropObject(held, this.session.player);
      else if (
        !throwObject(held, this.session.player, this.session.world.solids)
      )
        this.ui.message("A little more room to throw.", 1.5);
      state.interact = false;
    }
    this.ui.app.classList.toggle("bow-aiming", adventureAiming);
    el("bow-aim").style.setProperty("--draw", String(adventureDraw));
    this.session.avatar.update(dt, {
      ...this.session.player,
      crouching: this.organSeated || this.session.player.crouching,
      holdingBow,
      holdingBanner,
      wave: wavingBanner,
      pointing,
      aiming: adventureAiming,
      draw: adventureDraw,
      carrying:
        adventureCarrying ||
        this.discoveries.carryObjects.some((object) => object.held) ||
        !!(
          this.session.storyScene?.snapshot() as
            { treasureHeld?: boolean } | undefined
        )?.treasureHeld ||
        (this.session.worldId === "night" &&
          !!(
            this.session.storyScene?.snapshot() as
              { plates?: boolean } | undefined
          )?.plates),
    });
    if (this.session.worldId === "title-liberty") {
      const direction = this.session.world.actorParent?.userData;
      const coat = this.session.avatar.group.getObjectByName(
        "moroni-removable-coat",
      );
      if (coat) coat.visible = direction?.moroniCoatVisible === true;
      const gesture = direction?.moroniGesture;
      const right = this.session.avatar.group.getObjectByName("right-arm");
      const left = this.session.avatar.group.getObjectByName("left-arm");
      const head = this.session.avatar.group.getObjectByName("head");
      if (gesture === "pray" || gesture === "work") {
        if (right && !holdingBanner)
          right.rotation.x =
            -1.1 +
            (gesture === "work" ? Math.sin(this.levelTime * 7) * 0.3 : 0);
        if (left && !holdingBanner) left.rotation.x = -1.05;
        if (head) head.rotation.x = gesture === "pray" ? 0.3 : 0.15;
      }
      if (gesture === "point" && right && !holdingBanner)
        right.rotation.x = -1.8;
    }
    return treePrompt;
  }

  private updateCameraAndExtras(dt: number, state: InputState): void {
    const adventureCamera = this.session.adventure?.camera?.();
    if (!adventureCamera && !this.organSeated) {
      this.analytics.camera(
        Math.abs(state.cameraX) + Math.abs(state.cameraY) > 0.02 ||
          Math.abs(state.cameraZoom) > 0.02,
        state.recenter,
        dt,
      );
      this.view.follow.update(
        dt,
        this.session.player,
        this.session.world.solids,
        {
          orbitX: state.cameraX,
          orbitY: state.cameraY,
          recenter: state.recenter,
          zoom: state.cameraZoom,
        },
        cameraModeForWorld(this.session.worldId),
      );
    }
    if (adventureCamera) {
      applyAdventureCamera(
        this.view.camera,
        adventureCamera,
        this.session.world.solids,
        dt,
      );
      this.view.follow.yaw = adventureCameraYaw(
        adventureCamera,
        this.view.follow.yaw,
      );
    }
    if (this.organSeated) {
      this.view.camera.position.lerp(
        new T.Vector3(33, 8, -89),
        1 - Math.exp(-5 * dt),
      );
      this.view.camera.lookAt(30, 6, -94);
    }
    this.ui.app.classList.toggle(
      "camera-obstructed",
      this.view.follow.obstructed,
    );
    for (const entry of this.session.wavingExtras)
      entry.actor.update(dt, {
        ...entry.state,
        wave:
          Math.hypot(
            this.session.player.x - entry.state.x,
            this.session.player.z - entry.state.z,
          ) < 23,
      });
    const distCam = this.view.camera.position.distanceTo(
      new T.Vector3(
        this.session.player.x,
        this.session.player.y + 1.05,
        this.session.player.z,
      ),
    );
    this.session.avatar.group.visible = distCam > 0.7;
  }

  private updateWorldInteractions(
    dt: number,
    state: InputState,
    prompt: string,
  ): string | null {
    if (this.session.worldId === "hub") {
      const location = conferenceLocation(this.session.player);
      if (location.name !== this.hubLocation) {
        this.hubLocation = location.name;
        this.analytics.discover(
          `area_${location.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
        );
        el("world-name").textContent = location.name;
        this.updateObjective();
      }
      if (
        this.session.world.organ &&
        (this.organSeated || this.near(this.session.world.organ.point, 3, 2))
      ) {
        prompt = this.organSeated
          ? "{action} Stand up · We Thank Thee, O God, for a Prophet"
          : "{action} Sit at the organ and play";
        if (state.interact && !this.organSeated) {
          try {
            this.hooks.playOrgan();
            this.analytics.discover("organ");
            this.analytics.activity("organ");
            this.organSeated = true;
            this.ui.input.reset();
            this.ui.message(
              "We Thank Thee, O God, for a Prophet · {action} to stand up",
              5,
            );
          } catch {
            this.ui.message("Organ audio is unavailable in this browser.", 3);
          }
        }
      }
      if (
        this.session.world.secretEntrance &&
        this.near(this.session.world.secretEntrance, 3, 2)
      ) {
        prompt = "{action} · Join the elders’ neighborhood challenge";
        if (state.interact) {
          this.hooks.warp("missionary");
          return null;
        }
      }
      const p = this.session.world.portals?.find((p) => this.near(p, 2.2, 4));
      if (p && isStoryId(p.id)) {
        const prior = prerequisite(p.id, this.completed);
        prompt = prior
          ? `${p.title} locked · Finish ${STORY_TITLES[prior]} first`
          : this.completed.has(p.id)
            ? `${p.title} · {jump} to replay`
            : `${p.title} · {jump} into the painting`;
        if (canJumpIntoPainting(this.session.player, p)) {
          if (canEnter(p.id, this.completed)) this.hooks.warp(p.id);
          else
            this.ui.message(
              `Finish ${STORY_TITLES[prior!]} to unlock ${p.title}.`,
              3,
            );
          return null;
        }
      }
    }
    if (
      this.session.worldId === "streets" &&
      this.near(this.session.world.goal, this.session.world.goal.radius ?? 2)
    ) {
      this.hooks.complete();
      return null;
    }
    if (this.session.worldId === "house") {
      for (const t of this.session.world.treasures ?? []) {
        const mesh = this.session.treasureMeshes.get(t.id);
        if (!mesh || this.session.collected.has(t.id)) continue;
        mesh.rotation.y += dt * 0.7;
        mesh.position.y =
          t.y + 0.3 + Math.sin(this.time * 2.4 + Number(t.x)) * 0.055;
        if (
          this.near(t, 2.05, 1.7) &&
          hasLineOfSight(this.session.player, t, this.session.world.solids)
        ) {
          prompt = `${t.name} · {action} to gather`;
          if (state.interact || this.near(t, 0.65, 0.65)) {
            this.session.collected.add(t.id);
            mesh.visible = false;
            this.hooks.sound("collect");
            this.ui.message(
              `${t.name} · ${this.session.collected.size} / 5`,
              2,
            );
            this.discoveries.updateCollectionHud();
            this.updateObjective();
            break;
          }
        }
      }
      if (
        this.session.collected.size === 5 &&
        this.near(this.session.world.goal, 2.1)
      ) {
        this.hooks.complete();
        return null;
      }
    }
    if (this.session.worldId === "palace") {
      if (
        !this.guardsActive &&
        this.near(this.session.world.goal, 3.7, 2) &&
        hasLineOfSight(
          this.session.player,
          this.session.world.story!.laban,
          this.session.world.solids,
        )
      ) {
        prompt = "Laban · {action} to speak";
        if (state.interact) {
          this.hooks.dialog(
            "1 NEPHI 3:11–14",
            "Laman asks for the plates.",
            "Laman asks for his family’s records. Laban refuses and threatens him. Laman flees.",
            () => {
              this.guardsActive = true;
              this.caughtGrace = 3.8;
              for (const g of this.session.guards) {
                g.actor.group.visible = true;
                const p =
                  this.session.world.pursuers![this.session.guards.indexOf(g)];
                g.state.x = p.x;
                g.state.y = p.y;
                g.state.z = p.z;
              }
              if (this.session.goalMarker) {
                this.session.goalMarker.position.set(
                  this.session.world.escapeGoal!.x,
                  this.session.world.escapeGoal!.y + 0.04,
                  this.session.world.escapeGoal!.z,
                );
              }
              this.updateObjective();
              this.ui.message("Through the gate! Keep running.", 3);
            },
            {
              actors: [
                {
                  group: this.session.extras[0].group,
                  gesture: "point",
                  speaker: true,
                },
                { group: this.session.avatar.group, gesture: "recoil" },
              ],
              focus: this.session.world.story!.laban,
            },
          );
          return null;
        }
      }
      if (
        this.guardsActive &&
        this.near(
          this.session.world.escapeGoal ?? this.session.world.goal,
          3.1,
        ) &&
        this.session.player.z > this.session.world.story!.gate.z + 1
      ) {
        this.hooks.complete();
        return null;
      }
    }
    if (this.session.storyScene) {
      const result = this.session.storyScene.update(dt, this.session.player, {
        interact: state.interact,
      });
      this.updateStoryObjective(result.objective, this.session.storyScene);
      if (result.prompt)
        prompt = result.prompt.startsWith("Wait")
          ? result.prompt
          : `{action} · ${result.prompt}`;
      if (this.ui.paused || this.hooks.isTransitioning()) return null;
    }
    return prompt;
  }

  private updatePursuers(dt: number, movementLocked: boolean): boolean {
    if (this.guardsActive && !movementLocked && this.levelTime > 1.5) {
      for (const guard of this.session.guards) {
        guard.timer -= dt;
        if (guard.timer <= 0) {
          guard.path = navigateGuard(
            guard.state,
            this.session.player,
            this.session.world.solids,
            this.session.world.bounds,
          );
          guard.timer = 0.8;
        }
        let target = guard.path[0] ?? this.session.player;
        if (
          Math.hypot(guard.state.x - target.x, guard.state.z - target.z) < 0.7
        ) {
          guard.path.shift();
          target = guard.path[0] ?? this.session.player;
        }
        const dx = target.x - guard.state.x,
          dz = target.z - guard.state.z,
          d = Math.hypot(dx, dz) || 1;
        stepPlayer(
          guard.state,
          {
            x: (-dx / d) * 0.58,
            y: (dz / d) * 0.58,
            jump: false,
            jumpHeld: false,
            traversal: false,
          },
          dt,
          0,
          this.session.world.solids,
        );
        guard.actor.update(dt, guard.state);
        if (
          this.caughtGrace === 0 &&
          Math.hypot(
            this.session.player.x - guard.state.x,
            this.session.player.z - guard.state.z,
          ) < 0.73 &&
          Math.abs(this.session.player.y - guard.state.y) < 1.2
        ) {
          this.hooks.caught();
          return true;
        }
      }
    }
    return false;
  }

  private updateInteractionHints(
    dt: number,
    state: InputState,
    prompt: string,
  ): void {
    if (this.session.goalMarker) {
      this.session.goalMarker.children[1].position.y =
        2.6 + Math.sin(this.time * 2) * 0.12;
      this.session.goalMarker.children[0].rotation.z += dt * 0.25;
    }
    const carrying = this.discoveries.carryObjects.find(
      (object) => object.held,
    );
    const loose = nearestCarryObject(
      this.session.player,
      this.discoveries.carryObjects,
      this.session.world.solids,
    );
    if (!prompt && carrying)
      prompt = "{action} throw · {crouch} + {action} set down";
    else if (!prompt && loose) {
      prompt = "Supply bundle · {action} pick up";
      if (
        state.interact &&
        pickUp(loose, this.session.player, this.session.world.solids)
      )
        this.ui.message("{action} throws · {crouch} + {action} sets down", 2.5);
    }
    if (!prompt && this.session.player.move === "ledgeHang")
      prompt = "{up} or {jump} to pull up · {crouch} to drop";
    if (!prompt && this.session.player.move === "climb")
      prompt = "{up} / {down} to climb · {jump} away · {crouch} to drop";
    this.discoveries.updatePracticeLesson();
    this.ui.setPrompt(prompt);
    this.ui.expireMessages(this.time);
  }
}

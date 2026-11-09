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
import { selectCameraRoom } from "../camera/camera-rooms";
import { CameraRelativeInput } from "../camera/camera-relative-input";
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
  private readonly cameraRelativeInput = new CameraRelativeInput();
  private movementYaw = 0;
  private avatarGazeYaw = 0;
  private avatarGazePitch = 0;
  private stepDistance = 0;
  private stepFoot = 1;
  private skidParticleCooldown = 0;
  private previousAirVy = 0;
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
    this.cameraRelativeInput.reset();
    this.avatarGazeYaw = this.session.player.yaw;
    this.avatarGazePitch = 0;
    this.stepDistance = 0;
    this.stepFoot = 1;
    this.skidParticleCooldown = 0;
    this.previousAirVy = 0;
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
    if (this.session.adventure?.camera?.()) this.cameraRelativeInput.reset();
    this.movementYaw = this.cameraRelativeInput.yaw(
      state,
      adventureCameraYaw(
        this.session.adventure?.camera?.(),
        this.view.follow.yaw,
      ),
    );
    if (!this.session.player.grounded)
      this.previousAirVy = this.session.player.vy;
    const events = stepPlayer(
      this.session.player,
      movementLocked
        ? { ...state, x: 0, y: 0, jump: false, jumpHeld: false }
        : state,
      dt,
      this.movementYaw,
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
      this.session.locomotionParticles?.poundShockwave(
        this.session.player.x,
        this.session.player.y,
        this.session.player.z,
      );
      this.hooks.sound("pound");
    } else if (events.landed) {
      const impactSpeed = Math.abs(this.previousAirVy);
      if (impactSpeed > 4.5) {
        const severity = Math.min(1, (impactSpeed - 4.5) / 14);
        this.session.locomotionParticles?.landingRing(
          this.session.player.x,
          this.session.player.y,
          this.session.player.z,
          severity,
        );
      }
    }
    if (
      this.session.player.grounded &&
      this.session.player.runSpeed > 4.6 &&
      (this.session.player.move === "run" || !this.session.player.move)
    ) {
      this.stepDistance += this.session.player.runSpeed * dt;
      if (this.stepDistance >= 0.85) {
        this.stepDistance = 0;
        this.stepFoot = -this.stepFoot;
        const footLateral = this.stepFoot * 0.18;
        const footX =
          this.session.player.x +
          Math.cos(this.session.player.yaw) * footLateral;
        const footZ =
          this.session.player.z -
          Math.sin(this.session.player.yaw) * footLateral;
        this.session.locomotionParticles?.footstep(
          footX,
          this.session.player.y,
          footZ,
        );
      }
    } else {
      this.stepDistance = 0.5;
    }
    if (
      this.session.player.grounded &&
      this.session.player.move === "turnSkid"
    ) {
      this.skidParticleCooldown -= dt;
      if (this.skidParticleCooldown <= 0) {
        this.skidParticleCooldown = 0.05;
        this.session.locomotionParticles?.skid(
          this.session.player.x,
          this.session.player.y,
          this.session.player.z,
          this.session.player.vx,
          this.session.player.vz,
        );
      }
    } else {
      this.skidParticleCooldown = 0;
    }
    this.session.poundImpact?.update(dt);
    this.session.locomotionParticles?.update(dt);
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

    const px = this.session.player.x;
    const py = this.session.player.y;
    const pz = this.session.player.z;
    let bestScore = 0;
    let targetYaw = this.session.player.yaw;
    let targetPitch = 0;

    for (const extra of this.session.extras) {
      if (!extra.group.visible) continue;
      const dx = extra.group.position.x - px;
      const dy = extra.group.position.y + 1.2 - (py + 1.4);
      const dz = extra.group.position.z - pz;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.4 && dist < 6.5) {
        const yaw = Math.atan2(dx, dz);
        const yawDiff = Math.abs(
          Math.atan2(
            Math.sin(yaw - this.session.player.yaw),
            Math.cos(yaw - this.session.player.yaw),
          ),
        );
        if (yawDiff < 1.35) {
          const score = 1 / dist + 0.6;
          if (score > bestScore) {
            bestScore = score;
            targetYaw = yaw;
            targetPitch = Math.atan2(dy, dist);
          }
        }
      }
    }

    for (const [id, mesh] of this.session.treasureMeshes) {
      if (this.session.collected.has(id) || !mesh.visible) continue;
      const dx = mesh.position.x - px;
      const dy = mesh.position.y - (py + 1.4);
      const dz = mesh.position.z - pz;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.3 && dist < 6.0) {
        const yaw = Math.atan2(dx, dz);
        const yawDiff = Math.abs(
          Math.atan2(
            Math.sin(yaw - this.session.player.yaw),
            Math.cos(yaw - this.session.player.yaw),
          ),
        );
        if (yawDiff < 1.35) {
          const score = 1 / dist + 0.9;
          if (score > bestScore) {
            bestScore = score;
            targetYaw = yaw;
            targetPitch = Math.atan2(dy, dist);
          }
        }
      }
    }

    if (this.session.player.grounded && this.session.player.runSpeed > 0.5) {
      const forwardDist = 1.0;
      const aheadX = px + Math.sin(this.session.player.yaw) * forwardDist;
      const aheadZ = pz + Math.cos(this.session.player.yaw) * forwardDist;
      let dropY = 0;
      for (const solid of this.session.world.solids) {
        const top = solid.y + solid.h;
        if (
          top <= py + 0.001 &&
          aheadX + 0.32 > solid.x - solid.w / 2 &&
          aheadX - 0.32 < solid.x + solid.w / 2 &&
          aheadZ + 0.32 > solid.z - solid.d / 2 &&
          aheadZ - 0.32 < solid.z + solid.d / 2
        ) {
          dropY = Math.max(dropY, top);
        }
      }
      if (py - dropY > 1.8) {
        const score = 1.2;
        if (score > bestScore) {
          bestScore = score;
          targetYaw = this.session.player.yaw;
          targetPitch = -0.45;
        }
      }
    }

    const dampFactor = 1 - Math.exp(-8 * Math.min(Math.max(dt, 0), 0.1));
    const gazeYawDiff = Math.atan2(
      Math.sin(targetYaw - this.avatarGazeYaw),
      Math.cos(targetYaw - this.avatarGazeYaw),
    );
    this.avatarGazeYaw += gazeYawDiff * dampFactor;
    this.avatarGazePitch += (targetPitch - this.avatarGazePitch) * dampFactor;

    this.session.avatar.update(dt, {
      ...this.session.player,
      lookYaw: adventureAiming ? undefined : this.avatarGazeYaw,
      lookPitch: adventureAiming ? undefined : this.avatarGazePitch,
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
      const previousRoom = this.view.follow.roomId;
      this.view.follow.update(
        dt,
        { ...this.session.player, role: this.session.avatarRole },
        this.session.world.solids,
        {
          orbitX: state.cameraX,
          orbitY: state.cameraY,
          recenter: state.recenter,
          zoom: state.cameraZoom,
          movementIntent: Math.hypot(state.x, state.y) > 0.05,
        },
        cameraModeForWorld(this.session.worldId),
        selectCameraRoom(
          this.session.world.cameraRooms ?? [],
          this.session.player,
          this.view.follow.roomId,
        ),
      );
      if (previousRoom !== this.view.follow.roomId)
        this.cameraRelativeInput.hold(state, this.movementYaw);
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
      const inCircle = this.near(this.session.world.goal, 3.2, 2);
      if (
        !this.guardsActive &&
        (inCircle || this.near(this.session.world.goal, 4.0, 2)) &&
        hasLineOfSight(
          this.session.player,
          this.session.world.story!.laban,
          this.session.world.solids,
        )
      ) {
        prompt = inCircle ? "" : "Laban · {action} to speak";
        if (inCircle || state.interact) {
          this.hooks.dialog(
            "1 NEPHI 3:11–14",
            "Laman asks for the plates.",
            "Laman asks for his family’s records. Laban refuses and threatens him. Laman has to flee.",
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
      // Guard separation steering: prevent pursuers from converging into a single overlapping mesh
      for (let i = 0; i < this.session.guards.length; i++) {
        for (let j = i + 1; j < this.session.guards.length; j++) {
          const g1 = this.session.guards[i].state;
          const g2 = this.session.guards[j].state;
          const dist = Math.hypot(g1.x - g2.x, g1.z - g2.z);
          if (dist < 1.35 && dist > 0.001) {
            const push = (1.35 - dist) * 0.5;
            const nx = (g1.x - g2.x) / dist;
            const nz = (g1.z - g2.z) / dist;
            g1.x += nx * push;
            g1.z += nz * push;
            g2.x -= nx * push;
            g2.z -= nz * push;
          }
        }
      }

      for (let i = 0; i < this.session.guards.length; i++) {
        const guard = this.session.guards[i];
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

        // Distinct speeds and flanking lateral offset ensure pursuers maintain individual identities
        const flankSign = i % 2 === 0 ? 1 : -1;
        const flankX = (-dz / d) * 0.65 * flankSign;
        const flankZ = (dx / d) * 0.65 * flankSign;
        const aimX = target.x + flankX;
        const aimZ = target.z + flankZ;
        const adx = aimX - guard.state.x;
        const adz = aimZ - guard.state.z;
        const ad = Math.hypot(adx, adz) || 1;
        const speedScale = 0.54 + (i % 2) * 0.08;

        stepPlayer(
          guard.state,
          {
            x: (-adx / ad) * speedScale,
            y: (adz / ad) * speedScale,
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
      const baseHeight =
        (this.session.goalMarker.userData.beamHeight as number | undefined) ??
        2.6;
      const bob = baseHeight < 1.5 ? 0.03 : 0.12;
      this.session.goalMarker.children[1].position.y =
        baseHeight + Math.sin(this.time * 2) * bob;
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

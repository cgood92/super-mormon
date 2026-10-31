import { createPlayer } from "../physics/physics";
import { resetCarryObject } from "../physics/objects";
import { cameraModeForWorld } from "./scene-entry";
import type { WorldSession } from "./world-session";
import type { Discoveries } from "./discoveries";
import type { Gameplay } from "./gameplay";
import type { GameUI } from "../ui/game-ui";
import type { GameView } from "../rendering/game-view";
import type { GameplayAnalytics } from "./analytics";
import type { SoundKind } from "../audio/sound-effects";
import { el } from "../ui/game-shell";
/** Runs the caught/wipe/safe sequence and restores the active checkpoint. */
export class CheckpointRecovery {
  private caughtPhase: "none" | "caught" | "wipe" | "safe" = "none";
  private caughtTransition = 0;
  private pendingAdventureReset: (() => void) | null = null;
  get active() {
    return this.caughtPhase !== "none";
  }
  constructor(
    private readonly session: WorldSession,
    private readonly discoveries: Discoveries,
    private readonly gameplay: Gameplay,
    private readonly ui: GameUI,
    private readonly view: GameView,
    private readonly analytics: GameplayAnalytics,
    private readonly hooks: {
      setTransition(value: boolean): void;
      sound(kind: SoundKind): void;
    },
  ) {}
  clear = () => {
    this.caughtTransition = 0;
    this.pendingAdventureReset = null;
    this.caughtPhase = "none";
    const overlay = el("caught-overlay");
    overlay.hidden = true;
    overlay.removeAttribute("data-phase");
  };
  private setCaughtPhase = (phase: "caught" | "wipe" | "safe") => {
    this.caughtPhase = phase;
    const overlay = el("caught-overlay");
    overlay.dataset.phase = phase;
    if (phase === "safe") {
      el("caught-heading").textContent = "Back at a safe spot";
      el("caught-detail").textContent = "Keep going!";
      this.ui.setPrompt("");
    }
  };
  begin = (reset?: () => void) => {
    this.pendingAdventureReset = reset ?? null;
    this.hooks.setTransition(true);
    this.caughtTransition = 0;
    this.ui.input.reset();
    this.hooks.sound("caught");
    el("toast").classList.remove("visible");
    el("prompt").classList.remove("visible");
    el("caught-heading").textContent = "Caught!";
    el("caught-detail").textContent = "Let’s try again.";
    el("caught-overlay").hidden = false;
    this.setCaughtPhase("caught");
    if (reset) {
      el("caught-heading").textContent = "Spotted!";
      el("caught-detail").textContent = "A spy saw you. Back to the beginning.";
    }
  };
  private resetCaughtCheckpoint = () => {
    this.analytics.retry("checkpoint");
    const checkpoint = this.session.storyCheckpoint ?? this.session.world.spawn;
    this.session.player = createPlayer(
      checkpoint.x,
      checkpoint.y,
      checkpoint.z,
    );
    this.session.player.yaw = checkpoint.yaw ?? Math.PI;
    if (this.session.worldId === "palace") {
      this.session.player.x = 0;
      this.session.player.z = -14;
      this.session.player.yaw = 0;
    }
    for (let i = 0; i < this.session.guards.length; i++) {
      const p = this.session.world.pursuers?.[i] ?? {
        x: i ? -4 : 4,
        y: 0,
        z: 12,
      };
      this.session.guards[i].state = createPlayer(p.x, p.y, p.z);
      this.session.guards[i].path = [];
      this.session.guards[i].timer = 0;
      this.session.guards[i].actor.update(0, this.session.guards[i].state);
    }
    this.pendingAdventureReset?.();
    this.pendingAdventureReset = null;
    this.session.storyScene?.respawn(this.session.player);
    this.session.avatar.update(0, this.session.player);
    this.session.treeScene?.respawn(this.session.player);
    this.view.follow.reset(
      this.session.player,
      this.session.player.yaw,
      cameraModeForWorld(this.session.worldId),
    );
    for (const object of this.discoveries.carryObjects)
      if (object.held) resetCarryObject(object);
    this.gameplay.caughtGrace = 3.4;
  };
  update = (dt: number) => {
    this.caughtTransition += dt;
    if (this.caughtPhase === "caught" && this.caughtTransition >= 0.5)
      this.setCaughtPhase("wipe");
    if (this.caughtPhase === "wipe" && this.caughtTransition >= 0.76) {
      this.resetCaughtCheckpoint();
      this.setCaughtPhase("safe");
    }
    if (this.caughtTransition >= 1.3) {
      this.clear();
      this.hooks.setTransition(false);
      this.ui.input.reset();
    }
  };
}

import { playSoundEffect, type SoundKind } from "../audio/sound-effects";
import { recordExplorationEntry } from "./exploration";
import { GameplayAnalytics, browserAnalytics } from "./analytics";
import { StoryPresentation } from "../ui/story-presentation";
import { chapterLabel, entryMessage } from "./scene-copy";
import { createPlayer } from "../physics/physics";
import { Input } from "../controls/input";
import { createCharacter } from "../characters/character";
import {
  sceneEntry,
  cameraModeForWorld,
  keepsExploringAfterCompletion,
} from "./scene-entry";
import { prepareWorld } from "./world-loading";
import {
  canEnter,
  isStoryId,
  readCompleted,
  STORY_ORDER,
  type StoryId,
} from "./progression";
import type { WorldId } from "./worlds";
import { GameUI } from "../ui/game-ui";
import { mountGameShell, el } from "../ui/game-shell";
import { GameView } from "../rendering/game-view";
import { WorldSession } from "./world-session";
import { Discoveries } from "./discoveries";
import { Gameplay } from "./gameplay";
import { CheckpointRecovery } from "./checkpoint-recovery";

/** Application lifecycle; scene data, simulation, UI and rendering own their state. */
export class Game {
  private readonly app = mountGameShell();
  private readonly view = new GameView(el("viewport"));
  private readonly input = new Input(document);
  private readonly analytics = new GameplayAnalytics(
    browserAnalytics(
      import.meta.env.PROD,
      import.meta.env.VITE_GA_MEASUREMENT_ID,
    ),
  );
  private readonly session = new WorldSession();
  private readonly testScene = sceneEntry(location.search);
  private readonly completed = this.readProgress();
  private readonly ui = new GameUI(this.app, this.input, this.analytics, {
    canPause: () => this.started && !this.transition,
    restart: () => {
      void this.load(this.session.worldId);
    },
    returnToGallery: () => {
      void this.load("hub");
    },
    getGraphicsMode: () => this.view.graphicsMode,
    setGraphicsMode: (mode) => this.view.setGraphicsMode(mode),
    isSoundOn: () => this.soundOn,
    toggleSound: () => {
      this.soundOn = !this.soundOn;
    },
    invalidate: () => {
      this.view.renderDirty = true;
    },
  });
  private readonly discoveries = new Discoveries(
    this.session,
    this.ui,
    this.analytics,
    {
      sound: (kind) => this.sound(kind),
      updateObjective: () => this.gameplay.updateObjective(),
    },
  );
  private readonly gameplay = new Gameplay(
    this.session,
    this.discoveries,
    this.ui,
    this.view,
    this.analytics,
    this.completed,
    {
      sound: (kind) => this.sound(kind),
      complete: () => this.complete(),
      warp: (id) => this.warp(id),
      dialog: (...args) => this.presentation.dialog(...args),
      caught: () => this.recovery.begin(),
      isTransitioning: () => this.transition,
      playOrgan: () => {
        this.audio ??= new AudioContext();
        this.session.world.organ!.start(this.audio);
      },
    },
  );
  private readonly recovery = new CheckpointRecovery(
    this.session,
    this.discoveries,
    this.gameplay,
    this.ui,
    this.view,
    this.analytics,
    {
      setTransition: (value) => {
        this.transition = value;
      },
      sound: (kind) => this.sound(kind),
    },
  );
  private readonly presentation = new StoryPresentation(
    this.session,
    this.ui,
    this.view,
  );
  private started = false;
  private transition = false;
  private splashTime = 0;
  private audio: AudioContext | undefined;
  private soundOn = true;
  private loadGeneration = 0;
  private completionSceneSeen = false;
  constructor() {
    this.analytics.setFullscreen(document.fullscreenElement !== null);
    document.addEventListener("fullscreenchange", () =>
      this.analytics.setFullscreen(document.fullscreenElement !== null),
    );
    window.addEventListener("resize", () => this.view.resize());
    this.view.resize();
    this.ui.refreshControlHints();
    void this.load(this.testScene ?? "hub");
    document.addEventListener("keydown", (e) => {
      if (
        !this.started &&
        !this.ui.controllerSetup &&
        (e.code === "Enter" || e.code === "Space")
      )
        this.startGame();
    });
    el("pause").onclick = () => this.ui.pause();
    el("home").onclick = () => {
      if (this.started && !this.transition) {
        this.analytics.exit("gallery");
        this.warp("hub");
      }
    };
    window.addEventListener("pagehide", () =>
      this.analytics.exit("page_close"),
    );
    window.addEventListener("pageshow", (event) => {
      if (event.persisted && this.session.world)
        this.analytics.start(
          this.session.worldId,
          "page_resume",
          this.input.device,
        );
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.analytics.flush();
        this.session.world?.organ?.stop();
        this.view.suspend();
        if (this.started && !this.ui.paused) this.ui.pause();
      } else this.view.resume();
    });
    this.view.start({
      update: this.update,
      updatePreview: (dt) => {
        if (!this.started && this.session.world)
          this.view.follow.update(
            dt,
            this.session.player,
            this.session.world.solids,
            { orbitX: 0, orbitY: 0, recenter: false },
            cameraModeForWorld(this.session.worldId),
          );
      },
      state: () => ({
        paused: this.ui.paused,
        cinematic: this.presentation.active,
        transition: this.transition,
        scene: this.session.scene,
      }),
    });
    if (
      import.meta.env.DEV ||
      new URLSearchParams(location.search).has("playtest")
    )
      Object.assign(window, {
        superMormon: {
          performance: () => this.view.snapshot(),
          snapshot: this.snapshot,
        },
      });
  }
  private readProgress(): Set<StoryId> {
    try {
      return readCompleted(
        JSON.parse(localStorage.getItem("super-mormon-v1") || "[]"),
      );
    } catch {
      return new Set<StoryId>();
    }
  }

  private saveProgress = () => {
    if (this.testScene) return;
    try {
      localStorage.setItem(
        "super-mormon-v1",
        JSON.stringify([...this.completed]),
      );
    } catch {
      /* optional */
    }
  };

  private sound = (kind: SoundKind) => {
    if (!this.soundOn || this.session.worldId === "tree") return;
    try {
      this.audio ??= new AudioContext();
      playSoundEffect(this.audio, kind);
    } catch {
      /* sound optional */
    }
  };

  private complete = () => {
    if (this.ui.paused || this.transition || !isStoryId(this.session.worldId))
      return;
    if (
      !this.completionSceneSeen &&
      (this.session.worldId === "streets" ||
        this.session.worldId === "house" ||
        this.session.worldId === "palace")
    ) {
      this.completionSceneSeen = true;
      // The palace reunion already has the three brothers in the world.
      const family =
        this.session.worldId === "palace"
          ? []
          : [
              createCharacter(
                this.session.worldId === "streets" ? "sariah" : "laman",
              ),
              createCharacter(
                this.session.worldId === "streets" ? "nephi" : "sam",
              ),
            ];
      family.forEach((actor, i) => {
        const state = createPlayer(
          this.session.player.x +
            (this.session.worldId === "streets" ? 0 : i ? 1.7 : -1.7),
          this.session.player.y,
          this.session.player.z +
            (this.session.worldId === "streets" ? (i ? 1.5 : -1.5) : 1.8),
        );
        state.yaw = Math.PI;
        actor.update(0, state);
        this.session.scene.add(actor.group);
      });
      this.presentation.dialog(
        "1 NEPHI 1–3",
        this.session.worldId === "streets"
          ? "Home, safely"
          : this.session.worldId === "house"
            ? "The family’s treasures"
            : "Together again",
        this.session.worldId === "streets"
          ? "Lehi: Gather the family. The Lord has warned us to leave Jerusalem."
          : this.session.worldId === "house"
            ? "Nephi: We will offer these treasures for the brass plates."
            : "Nephi: Do not give up. The Lord will prepare a way.",
        () => {
          family.forEach((actor) => actor.dispose());
          this.complete();
        },
        {
          actors: [
            {
              group: this.session.avatar.group,
              gesture: "point",
              speaker: this.session.worldId !== "palace",
            },
            ...(this.session.worldId === "palace"
              ? this.session.wavingExtras.map((entry) => entry.actor)
              : family
            ).map((actor, i) => ({
              group: actor.group,
              gesture: "talk" as const,
              speaker: this.session.worldId === "palace" && i === 0,
            })),
          ],
        },
      );
      return;
    }
    this.analytics.finish();
    this.completed.add(this.session.worldId);
    this.saveProgress();
    el("seal-count").textContent =
      `Stories ${this.completed.size} / ${STORY_ORDER.length}`;
    this.sound("win");
    if (keepsExploringAfterCompletion(this.session.worldId)) {
      this.ui.message(
        "Story complete. Keep exploring, or use the gallery button to return.",
        7,
      );
      return;
    }
    // The story scene is the ending. Completed adventures return directly to
    // the gallery; replay remains available by entering the painting again.
    this.warp("hub");
  };

  private warp = (id: WorldId) => {
    if (this.transition) return;
    this.transition = true;
    this.input.reset();
    this.sound("portal");
    el("curtain").classList.add("closed");
    setTimeout(() => {
      void this.load(id);
    }, 330);
  };

  private startGame = () => {
    if (this.started || !this.session.world) return;
    this.started = true;
    this.analytics.start(this.session.worldId, "initial", this.input.device);
    el("title-screen").hidden = true;
    this.input.reset();
    const mobileScreen = matchMedia(
      "(max-width: 800px), (pointer: coarse) and (max-height: 600px)",
    ).matches;
    if (mobileScreen)
      this.ui.modal(
        "READY TO EXPLORE",
        "A bigger adventure.",
        "Play full screen and sideways for the best view.",
        [
          {
            label: "Enter Full Screen (recommended)",
            run: () => {
              void this.ui.requestFullScreen();
            },
          },
          { label: "Continue", run: () => {}, secondary: true },
        ],
      );
    else if (document.fullscreenElement || navigator.userActivation?.isActive)
      void this.ui.requestFullScreen();
    this.ui.message(
      this.session.worldId === "hub"
        ? "Run toward a painting, then press {jump}. {pause} → Moves for practice."
        : (this.session.world.initialObjective ?? this.session.world.subtitle),
      6,
    );
  };

  private load = async (id: WorldId) => {
    if (
      isStoryId(id) &&
      id !== this.testScene &&
      !canEnter(id, this.completed)
    ) {
      id = "hub";
    }
    const returnFrom =
      id === "hub" && this.session.worldId !== "hub"
        ? this.session.worldId
        : undefined;
    const generation = ++this.loadGeneration;
    this.transition = true;
    this.input.reset();
    el("load-error").hidden = true;
    el("curtain").classList.add("closed");
    let prepared: Awaited<ReturnType<typeof prepareWorld>>;
    try {
      prepared = await prepareWorld(id);
    } catch (error) {
      if (generation !== this.loadGeneration) return;
      this.transition = !this.session.world;
      el("curtain").classList.remove("closed");
      this.ui.paused = true;
      el("load-error").hidden = false;
      el("load-error-title").textContent =
        `The ${id === "hub" ? "gallery" : "scene"} could not load.`;
      el("load-retry").onclick = () => void this.load(id);
      el("load-retry").focus();
      console.error(error);
      return;
    }
    if (generation !== this.loadGeneration) return;
    this.presentation.dispose();
    this.recovery.clear();
    this.ui.paused = false;
    el("modal").hidden = true;
    if (this.session.world) this.session.dispose();
    this.view.camera.far = id === "voyage" ? 1400 : 320;
    this.view.camera.updateProjectionMatrix();
    this.completionSceneSeen = false;
    this.app.classList.remove("bow-aiming", "story-opening", "chapter-faded");
    this.session.build(id, prepared, returnFrom, this.completed);
    this.gameplay.reset(id);
    this.discoveries.setup();
    this.view.follow.reset(
      this.session.player,
      this.session.player.yaw,
      cameraModeForWorld(id),
    );
    this.input.reset();
    el("world-title").hidden = id === "hub";
    el("world-name").textContent = this.session.world.name;
    el("chapter-label").textContent = chapterLabel(id);
    el("seal-count").textContent =
      `Stories ${this.completed.size} / ${STORY_ORDER.length}`;
    this.session.startStories(prepared, {
      dialog: this.presentation.dialog,
      toast: (text, duration) => this.ui.message(text, duration),
      complete: this.complete,
      caught: (reset) => this.recovery.begin(reset),
      viewAspect: () => this.view.camera.aspect,
    });
    if (this.started)
      this.analytics.start(
        id,
        id === "hub"
          ? "gallery"
          : isStoryId(id) && this.completed.has(id)
            ? "replay"
            : "painting",
        this.input.device,
      );
    if (recordExplorationEntry(id, this.completed)) {
      this.saveProgress();
      el("seal-count").textContent =
        `Stories ${this.completed.size} / ${STORY_ORDER.length}`;
    }
    this.view.resetScene(id);
    this.transition = false;
    el("curtain").classList.remove("closed");
    this.discoveries.updateCollectionHud();
    this.gameplay.updateObjective();
    if (this.started)
      this.ui.message(entryMessage(id, this.session.world, this.completed), 4);
  };

  private update = (dt: number, activeElapsed = dt) => {
    this.ui.refreshControlHints();
    if (
      this.ui.updateControllerSetup(
        this.started && !this.ui.paused && !this.transition,
      )
    )
      return;
    const state = this.input.latest(dt);
    if (!this.started) {
      this.splashTime += dt;
      if (this.splashTime >= 2.6 || state.jump || state.interact)
        this.startGame();
      return;
    }
    if (this.recovery.active) {
      this.recovery.update(dt);
      return;
    }
    if (this.transition) return;
    if (state.pause && performance.now() - this.ui.modalSince > 450) {
      this.ui.pause();
      return;
    }
    if (this.presentation.active) {
      this.presentation.update(dt, state);
      return;
    }
    if (this.ui.paused) {
      this.ui.navigateMenu(state, dt);
      return;
    }
    this.gameplay.update(dt, activeElapsed, state);
  };
  private snapshot = () => ({
    performance: this.view.diagnostics.snapshot(),
    world: this.session.worldId,
    player: { ...this.session.player },
    cameraYaw: this.view.follow.yaw,
    cameraObstructed: this.view.follow.obstructed,
    story: this.session.storyScene?.snapshot(),
    vision: this.session.treeScene?.snapshot(),
    cinematic: this.presentation.snapshot(),
    adventure: this.session.adventure?.snapshot(),
    tutorials: this.session.world.tutorials,
    practiceBounds: this.session.world.practiceBounds,
    learnedMoves: [...this.discoveries.learnedMoves],
    cameraPosition: {
      x: this.view.camera.position.x,
      y: this.view.camera.position.y,
      z: this.view.camera.position.z,
    },
    paused: this.ui.paused,
    transition: this.transition,
    collected: [...this.session.collected],
    completed: [...this.completed],
    guards: this.session.guards.map((g) => ({ ...g.state })),
    goal: this.session.world.goal,
    escapeGoal: this.session.world.escapeGoal,
    treasures: this.session.world.treasures,
    portals: this.session.world.portals,
    landmarks: this.session.world.landmarks,
    climbables: this.session.world.climbables,
    tokens: this.session.world.tokens,
    bonusCollected: [...this.discoveries.bonusCollected],
    carryObjects: this.discoveries.carryObjects.map((object) => ({
      ...object,
    })),
    delivery: this.session.world.delivery,
    deliveryDone: this.discoveries.deliveryDone,
  });
}

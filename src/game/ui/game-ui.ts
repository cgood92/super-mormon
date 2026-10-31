import type { Input, InputState } from "../controls/input";
import { createControllerSetup } from "../controls/controller-setup";
import { resolveControllerProfile } from "../controls/gamepad";
import {
  renderControlLegend,
  renderControlText,
  type ControlDevice,
} from "../controls/controls";
import type { GameplayAnalytics } from "../runtime/analytics";
import { GRAPHICS_MODES, type GraphicsMode } from "../rendering/render-policy";
import { MenuNavigation } from "./menu";
import { el } from "./game-shell";

export interface GameUICallbacks {
  canPause(): boolean;
  restart(): void;
  returnToGallery(): void;
  getGraphicsMode(): GraphicsMode;
  setGraphicsMode(mode: GraphicsMode): void;
  isSoundOn(): boolean;
  toggleSound(): void;
  invalidate(): void;
}

/** Owns game menus, device-specific hints, and controller setup. */
export class GameUI {
  paused = false;
  modalSince = 0;
  private pauseMenuOpen = false;
  controllerSetup: ReturnType<typeof createControllerSetup> | null = null;
  private waitForControllerRelease = false;
  private readonly offeredControllers = new Set<string>();
  private readonly menuNavigation = new MenuNavigation();
  private controlsDevice: ControlDevice | null = null;
  private modalText = "";
  private toastText = "";
  private promptText = "";
  private objectiveText = "";
  private toastUntil = 0;
  time = 0;

  constructor(
    readonly app: HTMLDivElement,
    readonly input: Input,
    readonly analytics: GameplayAnalytics,
    private readonly callbacks: GameUICallbacks,
  ) {}

  refreshControlHints() {
    const device = this.input.device;
    if (device === this.controlsDevice) return;
    this.controlsDevice = device;
    this.app.dataset.controls = device;
    renderControlLegend(
      document.querySelector<HTMLElement>(".desktop-controls")!,
      device,
    );
    renderControlText(el("modal-body"), this.modalText, device);
    renderControlText(el("toast"), this.toastText, device);
    renderControlText(el("prompt"), this.promptText, device);
    renderControlText(el("objective"), this.objectiveText, device);
    renderControlText(
      el("modal-hint"),
      "{move} Choose · {jump} Select",
      device,
    );
    for (const confirm of document.querySelectorAll<HTMLElement>(
      ".menu-confirm",
    ))
      renderControlText(confirm, "{jump}", device);
  }

  message(text: string, duration = 3) {
    this.toastText = text;
    renderControlText(el("toast"), text, this.input.device);
    this.toastUntil = this.time + duration;
    el("toast").classList.add("visible");
  }

  modal(
    kicker: string,
    title: string,
    body: string,
    buttons: { label: string; run: () => void; secondary?: boolean }[],
  ) {
    el("modal").classList.remove("story-subtitles");
    this.analytics.flush();
    this.callbacks.invalidate();
    this.paused = true;
    this.pauseMenuOpen = false;
    this.modalSince = performance.now();
    this.input.reset();
    el("modal-kicker").textContent = kicker;
    el("modal-title").textContent = title;
    this.modalText = body;
    renderControlText(el("modal-body"), body, this.input.device);
    const box = el("modal-buttons");
    box.replaceChildren();
    for (const [index, data] of buttons.entries()) {
      const b = document.createElement("button");
      b.className = data.secondary ? "secondary" : "primary";
      const name = document.createElement("span");
      name.textContent = data.label;
      const confirm = document.createElement("span");
      confirm.className = "menu-confirm";
      renderControlText(confirm, "{jump}", this.input.device);
      b.append(name, confirm);
      b.addEventListener("focus", () => {
        this.menuNavigation.index = index;
        this.updateMenuSelection();
      });
      b.onclick = () => {
        el("modal").hidden = true;
        this.paused = false;
        this.input.reset();
        data.run();
      };
      box.append(b);
    }
    this.menuNavigation.reset(buttons.length);
    this.updateMenuSelection();
    renderControlText(
      el("modal-hint"),
      "{move} Choose · {jump} Select",
      this.input.device,
    );
    el("modal").hidden = false;
    setTimeout(() => {
      if (!el("modal").hidden) box.querySelector("button")?.focus();
    }, 20);
  }

  closeModalFirst() {
    const b =
      el("modal-buttons").querySelectorAll<HTMLButtonElement>("button")[
        this.menuNavigation.index
      ];
    b?.click();
  }

  updateMenuSelection() {
    el("modal-buttons")
      .querySelectorAll("button")
      .forEach((button, index) =>
        button.classList.toggle(
          "menu-selected",
          index === this.menuNavigation.index,
        ),
      );
  }

  pause() {
    if (!this.callbacks.canPause()) return;
    if (!el("modal").hidden) {
      if (this.pauseMenuOpen) {
        el("modal").hidden = true;
        this.paused = false;
        this.pauseMenuOpen = false;
        this.input.reset();
      }
      return;
    }
    this.modal(
      "TAKE YOUR TIME",
      "A little pause.",
      "Move with {move}. Use {camera} to look around. Hold {jump} to leap higher.",
      [
        { label: "Keep exploring", run: () => {} },
        {
          label: "Moves & practice",
          run: () => this.showMoves(),
          secondary: true,
        },
        {
          label: "Privacy & analytics",
          run: () => {
            window.open(
              `${import.meta.env.BASE_URL}privacy.html`,
              "_blank",
              "noopener,noreferrer",
            );
          },
          secondary: true,
        },
        {
          label: "Restart this scene",
          run: () => {
            this.analytics.retry("manual_restart");
            this.analytics.exit("restart");
            this.callbacks.restart();
          },
          secondary: true,
        },
        {
          label: "Return to the gallery",
          run: () => {
            this.analytics.exit("gallery");
            this.callbacks.returnToGallery();
          },
          secondary: true,
        },
        {
          label: document.fullscreenElement
            ? "Leave full screen"
            : "Full screen",
          run: () => {
            if (document.fullscreenElement) void document.exitFullscreen();
            else void this.requestFullScreen();
          },
          secondary: true,
        },
        { label: "Settings", run: () => this.showSettings(), secondary: true },
      ],
    );
    this.pauseMenuOpen = true;
  }

  showSettings() {
    this.modal(
      "SETTINGS",
      "Make yourself comfortable.",
      "Adjust sound, graphics, or your controller.",
      [
        {
          label: `Sound · ${this.callbacks.isSoundOn() ? "On" : "Off"}`,
          run: () => {
            this.callbacks.toggleSound();
            this.showSettings();
          },
        },
        {
          label: `Graphics · ${GRAPHICS_MODES[this.callbacks.getGraphicsMode()].label}`,
          run: () => this.showGraphics(),
          secondary: true,
        },
        {
          label: "Set up N64 controller",
          run: () => this.openControllerSetup(() => this.showSettings()),
          secondary: true,
        },
        { label: "Back", run: () => this.pause(), secondary: true },
      ],
    );
    this.pauseMenuOpen = true;
  }

  showGraphics() {
    this.modal(
      "GRAPHICS & BATTERY",
      "Choose how to play.",
      "Balanced keeps movement smooth at 60 FPS. Battery saver uses 30 FPS and a softer picture. High refresh follows your display and uses more power. Picture detail adjusts when needed.",
      [
        ...(["balanced", "battery", "refresh"] as const).map((mode) => ({
          label: `${GRAPHICS_MODES[mode].label}${mode === this.callbacks.getGraphicsMode() ? " · selected" : ""}`,
          run: () => {
            this.callbacks.setGraphicsMode(mode);
            this.showSettings();
          },
          secondary: mode !== this.callbacks.getGraphicsMode(),
        })),
        { label: "Back", run: () => this.showSettings(), secondary: true },
      ],
    );
  }

  openControllerSetup(onDone?: () => void) {
    if (!this.callbacks.canPause() || this.controllerSetup) return;
    this.analytics.flush();
    this.callbacks.invalidate();
    this.paused = true;
    el("modal").hidden = true;
    this.input.reset();
    this.controllerSetup = createControllerSetup(this.app, (profile) => {
      this.controllerSetup?.dispose();
      this.controllerSetup = null;
      if (profile) {
        this.input.setControllerProfile(profile);
        this.offeredControllers.add(profile.id);
        this.message(
          "N64 controls saved. {jump} jumps · {action} acts · {crouch} crawls.",
          5,
        );
      }
      this.paused = false;
      this.waitForControllerRelease = true;
      this.input.reset();
      onDone?.();
    });
  }

  connectedController() {
    return Array.from(navigator.getGamepads?.() ?? []).find(
      (pad) => pad?.connected,
    );
  }

  showMoves(page = 0) {
    const pages = [
      [
        "RUN & JUMP",
        "Try a new move.",
        "Hold {crouch} and move to crawl on hands and knees. Run + {crouch} + {jump} for a long jump. Stand still + {crouch} + {jump} for a backflip. While airborne, press {crouch} for a ground pound.",
      ],
      [
        "JUMP COMBINATIONS",
        "Keep the rhythm.",
        "Press {jump} again as you land for a double jump. Keep running and chain another for a triple jump. Reverse direction + {jump} for a side somersault. Jump against a wall, then press {jump} again to kick away.",
      ],
      [
        "CLIMB & EXPLORE",
        "Find another route.",
        "Jump toward a ledge to catch it. Move toward it or press {jump} to pull up; {crouch} drops. Jump toward a tree or pole, then use {up} / {down} to climb. Press {jump} to jump away or {crouch} to let go.",
      ],
      [
        "CARRY & DISCOVER",
        "Give it a try.",
        "{action} picks up a nearby bundle. Press again to throw; {crouch} + {action} sets it down. Find six gold tokens in the gallery garden. Carry the practice bundle to the gold ring. These challenges are optional.",
      ],
    ];
    const [kicker, title, body] = pages[page];
    // this.modal() normally resumes before invoking its action; this new modal pauses again.
    this.modal(kicker, title, body, [
      ...(page < pages.length - 1
        ? [{ label: "Next moves", run: () => this.showMoves(page + 1) }]
        : []),
      { label: "Try it", run: () => {}, secondary: page < pages.length - 1 },
    ]);
  }

  async requestFullScreen() {
    try {
      if (!document.fullscreenElement) await this.app.requestFullscreen();
      await (
        window.screen.orientation as ScreenOrientation & {
          lock?: (s: string) => Promise<void>;
        }
      ).lock?.("landscape");
    } catch {
      /* Browser chrome/orientation remains under device control. */
    }
  }
  setPrompt(text: string) {
    this.promptText = text;
    renderControlText(el("prompt"), text, this.input.device);
    el("prompt").classList.toggle("visible", !!text);
  }

  setObjective(text: string) {
    this.objectiveText = text;
    renderControlText(el("objective"), text, this.input.device);
    el("objective").parentElement!.hidden = !text;
  }

  expireMessages(time = this.time) {
    this.time = time;
    if (time > this.toastUntil) el("toast").classList.remove("visible");
  }

  /** Returns true while controller setup consumes this update. */
  updateControllerSetup(mayOffer: boolean): boolean {
    if (this.controllerSetup) {
      this.controllerSetup.update();
      return true;
    }
    if (this.waitForControllerRelease) {
      const pad = this.connectedController();
      if (pad?.buttons.some((button) => button.pressed)) return true;
      this.waitForControllerRelease = false;
      this.input.reset();
    }
    if (mayOffer) {
      const pad = this.connectedController();
      if (
        pad &&
        typeof pad.id === "string" &&
        pad.id.length > 0 &&
        pad.mapping !== "standard" &&
        !resolveControllerProfile(pad) &&
        !this.offeredControllers.has(pad.id)
      ) {
        this.offeredControllers.add(pad.id);
        this.modal(
          "CONTROLLER CONNECTED",
          "Make the buttons feel familiar.",
          "Set up your N64 controller once: press the buttons shown, and we’ll remember them.",
          [
            {
              label: "Set up N64 controls",
              run: () => this.openControllerSetup(),
            },
            { label: "Keep current controls", run: () => {}, secondary: true },
          ],
        );
        return true;
      }
    }
    return false;
  }

  navigateMenu(state: Pick<InputState, "y" | "jump" | "interact">, dt: number) {
    if (performance.now() - this.modalSince > 300) {
      const index = this.menuNavigation.update(state.y, dt);
      if (index !== null) {
        el("modal-buttons")
          .querySelectorAll<HTMLButtonElement>("button")
          [index]?.focus();
        this.updateMenuSelection();
      }
    }
    if (
      performance.now() - this.modalSince > 450 &&
      (state.interact || state.jump)
    )
      this.closeModalFirst();
  }
}

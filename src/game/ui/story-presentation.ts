import { StoryCinematic, type StoryShot } from "../camera/cinematic";
import type { InputState } from "../controls/input";
import { renderControlText } from "../controls/controls";
import type { GameView } from "../rendering/game-view";
import type { WorldSession } from "../runtime/world-session";
import type { GameUI } from "./game-ui";
import { el } from "./game-shell";

/** Presents acted dialogue and hands control back after the camera restores. */
export class StoryPresentation {
  private cinematic: StoryCinematic | null = null;
  private cinematicContinue: (() => void) | null = null;

  constructor(
    private readonly session: WorldSession,
    private readonly ui: GameUI,
    private readonly view: GameView,
  ) {}

  get active(): boolean {
    return this.cinematic !== null;
  }

  dialog = (
    kicker: string,
    title: string,
    body: string,
    next: () => void,
    shot?: StoryShot,
  ) => {
    this.cinematic?.dispose();
    const actors = shot?.actors?.length
      ? shot.actors
      : [
          {
            group: this.session.avatar.group,
            gesture: "talk" as const,
            speaker: true,
          },
        ];
    this.cinematic = new StoryCinematic(
      this.view.camera,
      {
        ...shot,
        actors: shot?.cutaway
          ? actors
          : [
              {
                group: this.session.avatar.group,
                gesture:
                  shot?.playerGesture ??
                  actors.find((a) => a.group === this.session.avatar.group)
                    ?.gesture ??
                  "talk",
                speaker:
                  actors.find((a) => a.group === this.session.avatar.group)
                    ?.speaker ?? false,
              },
              ...actors.filter((a) => a.group !== this.session.avatar.group),
            ],
      },
      this.session.world.solids,
      this.session.scene,
    );
    this.ui.modal(kicker, title, body, [{ label: "Continue", run: () => {} }]);
    el("modal").classList.add("story-subtitles");
    const button =
      el("modal-buttons").querySelector<HTMLButtonElement>("button")!;
    button.disabled = true;
    this.cinematicContinue = next;
    button.onclick = () => {
      if (!this.cinematic?.finish()) return;
      el("modal").hidden = true;
      this.ui.input.reset();
    };
    renderControlText(
      el("modal-hint"),
      "Watch the scene",
      this.ui.input.device,
    );
  };

  update(dt: number, state: Pick<InputState, "jump" | "interact">) {
    if (!this.cinematic) return;
    if (this.cinematic.update(dt)) {
      this.cinematic = null;
      const next = this.cinematicContinue;
      this.cinematicContinue = null;
      this.ui.paused = false;
      this.ui.input.reset();
      next?.();
      return;
    }
    if (this.cinematic.ready && !this.cinematic.restoring) {
      const button =
        el("modal-buttons").querySelector<HTMLButtonElement>("button");
      if (button) button.disabled = false;
      renderControlText(
        el("modal-hint"),
        "{jump} Continue",
        this.ui.input.device,
      );
      if (state.jump || state.interact) this.ui.closeModalFirst();
    }
  }

  dispose() {
    this.cinematic?.dispose();
    this.cinematic = null;
    this.cinematicContinue = null;
  }

  snapshot() {
    return this.cinematic?.snapshot() ?? { active: false };
  }
}

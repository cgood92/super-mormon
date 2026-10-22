import {
  isBindingPressed,
  saveProfile,
  type GamepadBinding,
  type N64Action,
  type N64Profile,
} from "./gamepad";

const STEPS: { action: N64Action; label: string; hint: string }[] = [
  { action: "a", label: "A", hint: "Press A on your N64 controller." },
  { action: "b", label: "B", hint: "Press B on your N64 controller." },
  { action: "z", label: "Z", hint: "Press the Z trigger." },
  { action: "start", label: "Start", hint: "Press Start." },
  { action: "r", label: "R", hint: "Press the right shoulder button." },
  { action: "cLeft", label: "C ←", hint: "Press C Left." },
  { action: "cRight", label: "C →", hint: "Press C Right." },
  { action: "cUp", label: "C ↑", hint: "Press C Up." },
  { action: "cDown", label: "C ↓", hint: "Press C Down." },
];

type PadSample = Pick<Gamepad, "id" | "buttons" | "axes"> & {
  connected?: boolean;
};
type Snapshot = { buttons: boolean[]; axes: number[] };

function snapshot(pad: PadSample): Snapshot {
  return {
    buttons: Array.from(pad.buttons, (button) => button.pressed),
    axes: Array.from(pad.axes),
  };
}

function sameBinding(a: GamepadBinding, b: GamepadBinding): boolean {
  if (a.type !== b.type || a.index !== b.index) return false;
  if (a.type === "button" || b.type === "button") return true;
  return Math.sign(a.active - a.rest) === Math.sign(b.active - b.rest);
}

/** Poll once per animation frame. The first neutral sample arms edge detection. */
export class CaptureSession {
  id: string | null = null;
  connected = false;
  saveRequested = false;
  step = 0;
  message =
    "Connect your controller, release every button, and center the sticks.";
  private bindings: Partial<Record<N64Action, GamepadBinding>> = {};
  private previous: Snapshot | null = null;
  private restAxes: number[] = [];
  private pending: GamepadBinding | null = null;
  private armed = false;
  private completionArmed = false;

  get complete(): boolean {
    return this.step === STEPS.length;
  }
  get waitingForRelease(): boolean {
    return this.pending !== null;
  }
  get mapped(): Readonly<Partial<Record<N64Action, GamepadBinding>>> {
    return this.bindings;
  }

  poll(pad: PadSample | null): void {
    if (
      !pad ||
      pad.connected === false ||
      (this.id !== null && pad.id !== this.id)
    ) {
      this.connected = false;
      this.completionArmed = false;
      this.previous = null;
      this.armed = false;
      this.message = this.id
        ? "Controller disconnected. Reconnect the same controller to continue."
        : "Connect your controller, release every button, and center the sticks.";
      return;
    }
    if (this.id === null) this.id = pad.id;
    this.connected = true;
    const now = snapshot(pad);
    if (this.complete) {
      const aPressed = isBindingPressed(pad as Gamepad, this.bindings.a!);
      if (!aPressed) this.completionArmed = true;
      else if (this.completionArmed) {
        this.saveRequested = true;
        this.completionArmed = false;
      }
      this.message = "Press A to save, or select Save controller.";
      return;
    }

    if (this.pending) {
      const released =
        this.pending.type === "button"
          ? !now.buttons[this.pending.index]
          : Math.abs((now.axes[this.pending.index] ?? 0) - this.pending.rest) <
            0.25;
      this.previous = now;
      if (released) {
        this.pending = null;
        this.step++;
        if (this.complete)
          this.completionArmed = !isBindingPressed(
            pad as Gamepad,
            this.bindings.a!,
          );
        this.message = this.complete
          ? "Press A to save, or select Save controller."
          : `Now press ${STEPS[this.step].label}.`;
      }
      return;
    }

    if (!this.armed) {
      this.previous = now;
      if (now.buttons.every((pressed) => !pressed)) {
        this.armed = true;
        this.restAxes = now.axes.slice();
        this.message = `Press ${STEPS[this.step].label} on your controller.`;
      } else {
        this.message = "Release every button to begin.";
      }
      return;
    }

    const before = this.previous!;
    this.previous = now;
    let binding: GamepadBinding | null = null;
    for (let index = 0; index < now.buttons.length; index++) {
      if (now.buttons[index] && !before.buttons[index]) {
        binding = { type: "button", index };
        break;
      }
    }
    if (!binding && STEPS[this.step].action.startsWith("c")) {
      for (let index = 2; index < now.axes.length; index++) {
        const rest = this.restAxes[index] ?? 0;
        const value = now.axes[index];
        if (
          !Number.isFinite(value) ||
          Math.abs(value - rest) < 0.55 ||
          Math.abs((before.axes[index] ?? rest) - rest) >= 0.55
        )
          continue;
        binding = { type: "axis", index, rest, active: value };
        break;
      }
    }
    if (!binding) return;
    if (
      Object.values(this.bindings).some(
        (saved) => saved && sameBinding(saved, binding),
      )
    ) {
      this.message =
        "That control is already mapped. Release it and press a different control.";
      return;
    }
    this.bindings[STEPS[this.step].action] = binding;
    this.pending = binding;
    this.message = `${STEPS[this.step].label} mapped. Release the control to continue.`;
  }

  back(): void {
    if (this.pending) {
      delete this.bindings[STEPS[this.step].action];
      this.pending = null;
    } else if (this.step > 0) {
      this.step--;
      delete this.bindings[STEPS[this.step].action];
    }
    this.armed = false;
    this.previous = null;
    this.message = `Release every button, then press ${STEPS[this.step].label} again.`;
  }

  retry(): void {
    if (this.pending) delete this.bindings[STEPS[this.step].action];
    this.pending = null;
    this.armed = false;
    this.previous = null;
    this.message = `Release every button, then press ${STEPS[this.step].label} again.`;
  }

  profile(): N64Profile | null {
    if (!this.complete || !this.id || !this.connected) return null;
    return {
      version: 1,
      id: this.id,
      bindings: this.bindings as Record<N64Action, GamepadBinding>,
    };
  }
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

export function createControllerSetup(
  parent: HTMLElement,
  onDone: (profile: N64Profile | null) => void,
): { update(): void; dispose(): void } {
  const session = new CaptureSession();
  const screen = element("section", "screen modal-screen");
  screen.id = "controller-setup";
  const card = element("div", "modal-card");
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-modal", "true");
  card.setAttribute("aria-labelledby", "controller-setup-title");
  const kicker = element("span", "eyebrow");
  kicker.textContent = "CONTROLLER SETUP";
  const title = element("h2");
  title.id = "controller-setup-title";
  title.textContent = "Set up your N64 controller";
  const progress = element("div", "controller-progress");
  const key = element("strong", "controller-key");
  const prompt = element("p");
  const status = element("p");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  const device = element("small");
  const mapped = element("div");
  const actions = element("div");
  actions.style.cssText = "display:flex;flex-wrap:wrap;gap:9px;margin-top:24px";
  const back = element("button", "secondary");
  back.type = "button";
  back.textContent = "Back";
  const retry = element("button", "secondary");
  retry.type = "button";
  retry.textContent = "Try again";
  const cancel = element("button", "secondary");
  cancel.type = "button";
  cancel.textContent = "Cancel";
  const save = element("button", "primary");
  save.type = "button";
  save.textContent = "Save controller";
  actions.append(back, retry, cancel, save);
  card.append(
    kicker,
    title,
    progress,
    key,
    prompt,
    status,
    device,
    mapped,
    actions,
  );
  screen.append(card);
  parent.append(screen);

  let disposed = false;
  let saveError = false;
  const previousFocus =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  function dispose(): void {
    if (disposed) return;
    disposed = true;
    screen.removeEventListener("keydown", keydown);
    screen.remove();
    previousFocus?.focus();
  }
  function finish(profile: N64Profile | null): void {
    dispose();
    onDone(profile);
  }
  function keydown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      finish(null);
    }
    if (event.key === "Tab") {
      const focusable = [back, retry, cancel, save].filter(
        (button) => !button.disabled && !button.hidden,
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }
  screen.addEventListener("keydown", keydown);
  back.addEventListener("click", () => {
    session.back();
    render();
  });
  retry.addEventListener("click", () => {
    session.retry();
    render();
  });
  cancel.addEventListener("click", () => finish(null));
  function saveSetup(): void {
    const profile = session.profile();
    if (!profile) return;
    saveError = false;
    try {
      saveProfile(profile);
      finish(profile);
    } catch {
      saveError = true;
      render();
    }
  }
  save.addEventListener("click", saveSetup);

  function render(): void {
    const progressText = session.complete
      ? "9 of 9 controls mapped"
      : `${session.step + 1} of 9`;
    if (progress.textContent !== progressText)
      progress.textContent = progressText;
    const keyText = session.complete ? "✓" : STEPS[session.step].label;
    if (key.textContent !== keyText) key.textContent = keyText;
    const promptText = session.complete
      ? "Your controller is ready."
      : STEPS[session.step].hint;
    if (prompt.textContent !== promptText) prompt.textContent = promptText;
    const statusText = saveError
      ? "Could not save this setup. Please try again."
      : session.message;
    if (status.textContent !== statusText) status.textContent = statusText;
    const deviceText = session.connected
      ? "Controller connected"
      : session.id
        ? "Controller disconnected"
        : "Waiting for a controller";
    if (device.textContent !== deviceText) device.textContent = deviceText;
    const mappedText = STEPS.filter(({ action }) => session.mapped[action])
      .map(({ label }) => label)
      .join("  ·  ");
    if (mapped.textContent !== mappedText) mapped.textContent = mappedText;
    back.disabled = session.step === 0 && !session.waitingForRelease;
    retry.hidden = !session.waitingForRelease;
    save.hidden = !session.complete;
    save.disabled = !session.connected;
  }
  render();
  cancel.focus();
  return {
    update(): void {
      if (disposed) return;
      const pads =
        typeof navigator.getGamepads === "function"
          ? navigator.getGamepads()
          : [];
      const pad =
        Array.from(pads).find(
          (candidate): candidate is Gamepad =>
            !!candidate &&
            candidate.connected !== false &&
            (session.id === null || candidate.id === session.id),
        ) ?? null;
      session.poll(pad);
      if (session.saveRequested) {
        session.saveRequested = false;
        saveSetup();
      }
      render();
    },
    dispose,
  };
}

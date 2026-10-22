import {
  isBindingPressed,
  resolveControllerProfile,
  type N64Profile,
} from "./gamepad";

export type InputState = {
  x: number;
  y: number;
  jump: boolean;
  jumpHeld: boolean;
  crouch: boolean;
  interact: boolean;
  cameraX: number;
  cameraY: number;
  cameraZoom: number;
  recenter: boolean;
  pause: boolean;
};

type Action =
  | "jump"
  | "crouch"
  | "interact"
  | "recenter"
  | "pause"
  | "cLeft"
  | "cRight"
  | "cUp"
  | "cDown";
const DEADZONE = 0.14;
function stick(value: number): number {
  if (Math.abs(value) < DEADZONE) return 0;
  return (Math.sign(value) * (Math.abs(value) - DEADZONE)) / (1 - DEADZONE);
}

function activeGamepad(profile?: N64Profile | null): Gamepad | undefined {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.getGamepads !== "function"
  )
    return undefined;
  const pads = Array.from(navigator.getGamepads()).filter(
    (pad): pad is Gamepad => !!pad && pad.connected !== false,
  );
  return (
    pads.find(
      (pad) =>
        (!!profile && profile.id === pad.id) ||
        resolveControllerProfile(pad) !== null,
    ) ?? pads[0]
  );
}

export class Input {
  private keys = new Set<string>();
  private edges = new Set<Action>();
  private previousButtons = new Set<Action>();
  private controllerProfile: N64Profile | null = null;
  private controllerProfileOverride = false;
  private lastGamepadId: string | null = null;
  private lastTouch = false;
  private suppressGamepadEdges = false;
  private touchButtons = new Set<Action>();
  private buttonPointers = new Map<number, Action>();
  private crouchButton: Element | null = null;
  private stickPointer: number | null = null;
  private stickRegion: Element | null = null;
  private lookPointer: number | null = null;
  private stickX = 0;
  private stickY = 0;
  private lookX = 0;
  private lookY = 0;
  private lastLookX = 0;
  private lastLookY = 0;
  private readonly target: EventTarget;

  constructor(target?: EventTarget) {
    this.target = target ?? document;
    this.target.addEventListener("keydown", this.onKeyDown);
    this.target.addEventListener("keyup", this.onKeyUp);
    this.target.addEventListener("pointerdown", this.onPointerDown);
    this.target.addEventListener("pointermove", this.onPointerMove);
    this.target.addEventListener("pointerup", this.onPointerUp);
    this.target.addEventListener("pointercancel", this.onPointerUp);
    this.target.addEventListener("lostpointercapture", this.onPointerUp);
    this.target.addEventListener("blur", this.onBlur);
    if (typeof window !== "undefined")
      window.addEventListener("blur", this.onBlur);
  }

  private onKeyDown = (event: Event) => {
    const key = event as KeyboardEvent;
    this.lastTouch = false;
    if (
      (key.code === "Space" || key.code === "Enter") &&
      typeof Element !== "undefined" &&
      key.target instanceof Element &&
      key.target.closest("#modal button")
    )
      return;
    if (
      ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
        key.code,
      )
    )
      key.preventDefault();
    if (!key.repeat && !this.keys.has(key.code)) {
      const action: Record<string, Action> = {
        Space: "jump",
        KeyE: "interact",
        KeyR: "recenter",
        Escape: "pause",
        KeyP: "pause",
      };
      if (action[key.code]) this.edges.add(action[key.code]);
    }
    this.keys.add(key.code);
  };
  private onKeyUp = (event: Event) => {
    this.keys.delete((event as KeyboardEvent).code);
  };
  private onBlur = () => {
    this.reset();
  };

  private onPointerDown = (event: Event) => {
    const pointer = event as PointerEvent;
    if (pointer.pointerType === "touch") this.lastTouch = true;
    else if (pointer.pointerType) this.lastTouch = false;
    const element =
      typeof Element !== "undefined" && pointer.target instanceof Element
        ? pointer.target
        : null;
    const actionButton = element?.closest(
      "[data-jump], [data-crouch], [data-action], [data-recenter], [data-pause]",
    );
    const action: Action | null = actionButton?.hasAttribute("data-jump")
      ? "jump"
      : actionButton?.hasAttribute("data-crouch")
        ? "crouch"
        : actionButton?.hasAttribute("data-action")
          ? "interact"
          : actionButton?.hasAttribute("data-recenter")
            ? "recenter"
            : actionButton?.hasAttribute("data-pause")
              ? "pause"
              : null;
    if (action) {
      if (action === "crouch") {
        if (!this.buttonPointers.has(pointer.pointerId)) {
          this.crouchButton = actionButton ?? null;
          this.setTouchCrouch(!this.touchButtons.has("crouch"));
          this.buttonPointers.set(pointer.pointerId, action);
        }
        actionButton?.setPointerCapture?.(pointer.pointerId);
        return;
      }
      if (!this.touchButtons.has(action)) this.edges.add(action);
      this.touchButtons.add(action);
      this.buttonPointers.set(pointer.pointerId, action);
      actionButton?.setPointerCapture?.(pointer.pointerId);
      return;
    }
    const region = element?.closest("[data-stick], [data-look]");
    if (!region) return;
    if (region.hasAttribute("data-stick") && this.stickPointer === null) {
      this.stickPointer = pointer.pointerId;
      this.stickRegion = region;
      this.updateStick(pointer, region);
    } else if (region.hasAttribute("data-look") && this.lookPointer === null) {
      this.lookPointer = pointer.pointerId;
      this.lastLookX = pointer.clientX;
      this.lastLookY = pointer.clientY;
    }
    region.setPointerCapture?.(pointer.pointerId);
    pointer.preventDefault();
  };
  private updateStick(pointer: PointerEvent, region: Element) {
    const rect = region.getBoundingClientRect();
    const range = Math.min(rect.width, rect.height) * 0.34 || 1;
    const x = (pointer.clientX - (rect.left + rect.width / 2)) / range;
    const y = (rect.top + rect.height / 2 - pointer.clientY) / range;
    const scale = Math.max(1, Math.hypot(x, y));
    this.stickX = x / scale;
    this.stickY = y / scale;
    const thumb = region.querySelector<HTMLElement>("i");
    if (thumb)
      thumb.style.transform = `translate(${this.stickX * range}px, ${-this.stickY * range}px)`;
  }
  private centerStick() {
    const thumb = this.stickRegion?.querySelector<HTMLElement>("i");
    if (thumb) thumb.style.transform = "";
    this.stickRegion = null;
    this.stickPointer = null;
    this.stickX = 0;
    this.stickY = 0;
  }
  private onPointerMove = (event: Event) => {
    const pointer = event as PointerEvent;
    if (pointer.pointerId === this.stickPointer) {
      const region =
        pointer.target instanceof Element
          ? pointer.target.closest("[data-stick]")
          : null;
      if (region) this.updateStick(pointer, region);
    }
    if (pointer.pointerId === this.lookPointer) {
      this.lookX += (pointer.clientX - this.lastLookX) * 0.005;
      this.lookY += (this.lastLookY - pointer.clientY) * 0.005;
      this.lastLookX = pointer.clientX;
      this.lastLookY = pointer.clientY;
    }
  };
  private onPointerUp = (event: Event) => {
    const pointer = event as PointerEvent;
    if (pointer.pointerId === this.stickPointer) {
      this.centerStick();
    }
    if (pointer.pointerId === this.lookPointer) {
      this.lookPointer = null;
      this.lookX = 0;
      this.lookY = 0;
    }
    const action = this.buttonPointers.get(pointer.pointerId);
    this.buttonPointers.delete(pointer.pointerId);
    if (action === "crouch") {
      if (pointer.type !== "pointerup") this.setTouchCrouch(false);
      return;
    }
    if (action && !Array.from(this.buttonPointers.values()).includes(action))
      this.touchButtons.delete(action);
  };

  private setTouchCrouch(pressed: boolean) {
    if (pressed) this.touchButtons.add("crouch");
    else this.touchButtons.delete("crouch");
    this.crouchButton?.setAttribute("aria-pressed", String(pressed));
  }

  setControllerProfile(profile: N64Profile | null) {
    this.controllerProfile = profile;
    this.controllerProfileOverride = profile !== null;
    this.previousButtons.clear();
    this.suppressGamepadEdges = true;
  }

  get device(): "keyboard" | "n64" | "gamepad" | "touch" {
    const gamepad = activeGamepad(
      this.controllerProfileOverride ? this.controllerProfile : null,
    );
    if (gamepad)
      return (this.controllerProfileOverride &&
        this.controllerProfile?.id === gamepad.id) ||
        resolveControllerProfile(gamepad)
        ? "n64"
        : "gamepad";
    if (
      this.lastTouch ||
      (typeof matchMedia === "function" &&
        matchMedia("(pointer: coarse)").matches)
    )
      return "touch";
    return "keyboard";
  }

  latest(dt = 1 / 60): InputState {
    const gamepad = activeGamepad(
      this.controllerProfileOverride ? this.controllerProfile : null,
    );
    const gamepadId = gamepad?.id ?? null;
    if (gamepadId !== this.lastGamepadId) {
      this.previousButtons.clear();
      this.lastGamepadId = gamepadId;
    }
    const profile =
      gamepad &&
      (this.controllerProfileOverride
        ? this.controllerProfile?.id === gamepad.id
          ? this.controllerProfile
          : resolveControllerProfile(gamepad)
        : resolveControllerProfile(gamepad));
    const bindings = profile?.id === gamepadId ? profile.bindings : null;
    const buttons: Record<Action, boolean> = {
      jump:
        !!gamepad &&
        (bindings
          ? isBindingPressed(gamepad, bindings.a)
          : !!gamepad.buttons[0]?.pressed),
      crouch:
        !!gamepad &&
        (bindings
          ? isBindingPressed(gamepad, bindings.z)
          : !!(gamepad.buttons[6]?.pressed || gamepad.buttons[2]?.pressed)),
      interact:
        !!gamepad &&
        (bindings
          ? isBindingPressed(gamepad, bindings.b)
          : !!gamepad.buttons[1]?.pressed),
      recenter:
        !!gamepad &&
        (bindings
          ? isBindingPressed(gamepad, bindings.r)
          : !!gamepad.buttons[4]?.pressed),
      pause:
        !!gamepad &&
        (bindings
          ? isBindingPressed(gamepad, bindings.start)
          : !!gamepad.buttons[9]?.pressed),
      cLeft:
        !!gamepad && !!bindings && isBindingPressed(gamepad, bindings.cLeft),
      cRight:
        !!gamepad && !!bindings && isBindingPressed(gamepad, bindings.cRight),
      cUp: !!gamepad && !!bindings && isBindingPressed(gamepad, bindings.cUp),
      cDown:
        !!gamepad && !!bindings && isBindingPressed(gamepad, bindings.cDown),
    };
    for (const action of Object.keys(buttons) as Action[]) {
      if (
        buttons[action] &&
        !this.previousButtons.has(action) &&
        !this.suppressGamepadEdges
      )
        this.edges.add(action);
      if (buttons[action]) this.previousButtons.add(action);
      else this.previousButtons.delete(action);
    }
    this.suppressGamepadEdges = false;
    const kx =
      Number(this.keys.has("KeyD") || this.keys.has("ArrowRight")) -
      Number(this.keys.has("KeyA") || this.keys.has("ArrowLeft"));
    const ky =
      Number(this.keys.has("KeyW") || this.keys.has("ArrowUp")) -
      Number(this.keys.has("KeyS") || this.keys.has("ArrowDown"));
    const rawX =
      this.stickPointer !== null
        ? this.stickX
        : Math.abs(stick(gamepad?.axes[0] ?? 0)) > 0
          ? stick(gamepad!.axes[0])
          : kx;
    const rawY =
      this.stickPointer !== null
        ? this.stickY
        : Math.abs(stick(gamepad?.axes[1] ?? 0)) > 0
          ? -stick(gamepad!.axes[1])
          : ky;
    const scale = Math.max(1, Math.hypot(rawX, rawY));
    const orbit = Math.max(0, Math.min(dt, 0.05)) * 1.8;
    const keyOrbitX =
      Number(this.keys.has("KeyC")) - Number(this.keys.has("KeyQ"));
    const result: InputState = {
      x: rawX / scale,
      y: rawY / scale,
      jump: this.edges.has("jump"),
      jumpHeld:
        this.keys.has("Space") || this.touchButtons.has("jump") || buttons.jump,
      crouch:
        this.keys.has("ShiftLeft") ||
        this.keys.has("ShiftRight") ||
        this.keys.has("KeyZ") ||
        this.touchButtons.has("crouch") ||
        buttons.crouch,
      interact: this.edges.has("interact"),
      cameraX:
        this.lookX +
        ((bindings ? 0 : stick(gamepad?.axes[2] ?? 0)) + keyOrbitX) * orbit +
        ((Number(this.edges.has("cRight")) - Number(this.edges.has("cLeft"))) *
          Math.PI) /
          4,
      cameraY:
        this.lookY - (bindings ? 0 : stick(gamepad?.axes[3] ?? 0)) * orbit,
      cameraZoom:
        Number(this.edges.has("cDown")) - Number(this.edges.has("cUp")),
      recenter: this.edges.has("recenter"),
      pause: this.edges.has("pause"),
    };
    this.edges.clear();
    this.lookX = 0;
    this.lookY = 0;
    return result;
  }

  reset() {
    this.keys.clear();
    this.edges.clear();
    this.previousButtons.clear();
    this.suppressGamepadEdges = true;
    this.setTouchCrouch(false);
    this.touchButtons.clear();
    this.buttonPointers.clear();
    this.centerStick();
    this.lookPointer = null;
    this.lookX = 0;
    this.lookY = 0;
  }
  dispose() {
    this.target.removeEventListener("keydown", this.onKeyDown);
    this.target.removeEventListener("keyup", this.onKeyUp);
    this.target.removeEventListener("pointerdown", this.onPointerDown);
    this.target.removeEventListener("pointermove", this.onPointerMove);
    this.target.removeEventListener("pointerup", this.onPointerUp);
    this.target.removeEventListener("pointercancel", this.onPointerUp);
    this.target.removeEventListener("lostpointercapture", this.onPointerUp);
    this.target.removeEventListener("blur", this.onBlur);
    if (typeof window !== "undefined")
      window.removeEventListener("blur", this.onBlur);
    this.reset();
  }
}

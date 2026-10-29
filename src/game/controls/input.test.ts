import assert from "node:assert/strict";
import test from "node:test";
import { Input } from "./input.ts";
import type { N64Profile } from "./gamepad.ts";

function key(type: string, code: string) {
  const event = new Event(type);
  Object.defineProperty(event, "code", { value: code });
  return event;
}

test("held action remains active after its edge and releases or resets", () => {
  const target = new EventTarget();
  const input = new Input(target);
  target.dispatchEvent(key("keydown", "KeyE"));
  assert.equal(input.latest().interact, true);
  assert.equal(input.latest().interactHeld, true);
  assert.equal(input.latest().interact, false);
  target.dispatchEvent(key("keyup", "KeyE"));
  assert.equal(input.latest().interactHeld, false);
  target.dispatchEvent(key("keydown", "KeyE"));
  input.reset();
  assert.equal(input.latest().interactHeld, false);
  input.dispose();
});

test("device follows connected N64, generic pad, touch, and keyboard presence", () => {
  const priorNavigator = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator",
  );
  const priorMatchMedia = Object.getOwnPropertyDescriptor(
    globalThis,
    "matchMedia",
  );
  const pads: Array<Record<string, unknown> | null> = [];
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { getGamepads: () => pads },
  });
  Object.defineProperty(globalThis, "matchMedia", {
    configurable: true,
    value: () => ({ matches: false }),
  });
  try {
    const target = new EventTarget();
    const input = new Input(target);
    assert.equal(input.device, "keyboard");
    pads.push({ buttons: [], axes: [] });
    assert.equal(input.device, "gamepad");
    pads.push({
      id: "usb gamepad            (Vendor: 0810 Product: e501)",
      buttons: Array.from({ length: 10 }, () => ({ pressed: false })),
      axes: [0, 0],
    });
    assert.equal(input.device, "n64");
    target.dispatchEvent(key("keydown", "KeyW"));
    assert.equal(input.device, "n64");
    pads[1]!.connected = false;
    assert.equal(input.device, "gamepad");
    pads.length = 0;
    assert.equal(input.device, "keyboard");
    const touch = new Event("pointerdown");
    Object.defineProperty(touch, "pointerType", { value: "touch" });
    target.dispatchEvent(touch);
    assert.equal(input.device, "touch");
    target.dispatchEvent(key("keydown", "KeyW"));
    assert.equal(input.device, "keyboard");
    input.dispose();
  } finally {
    if (priorNavigator)
      Object.defineProperty(globalThis, "navigator", priorNavigator);
    else Reflect.deleteProperty(globalThis, "navigator");
    if (priorMatchMedia)
      Object.defineProperty(globalThis, "matchMedia", priorMatchMedia);
    else Reflect.deleteProperty(globalThis, "matchMedia");
  }
});

test("known adapter uses N64 button map and a stale override cannot mask it", () => {
  const prior = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const buttons = Array.from({ length: 10 }, () => ({ pressed: false }));
  const pad = {
    id: "usb gamepad            (Vendor: 0810 Product: e501)",
    buttons,
    axes: [0, 0],
  };
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { getGamepads: () => [pad] },
  });
  try {
    const input = new Input(new EventTarget());
    const stale: N64Profile = {
      version: 1,
      id: "different controller",
      bindings: {
        a: { type: "button", index: 0 },
        b: { type: "button", index: 1 },
        z: { type: "button", index: 2 },
        start: { type: "button", index: 3 },
        r: { type: "button", index: 4 },
        cLeft: { type: "button", index: 5 },
        cRight: { type: "button", index: 6 },
        cUp: { type: "button", index: 7 },
        cDown: { type: "button", index: 8 },
      },
    };
    input.setControllerProfile(stale);
    input.latest();
    buttons[5].pressed = true;
    assert.equal(input.latest().jump, true);
    buttons[5].pressed = false;
    buttons[0].pressed = true;
    assert.equal(input.latest().cameraZoom, -1);
    assert.equal(input.device, "n64");
    input.dispose();
  } finally {
    if (prior) Object.defineProperty(globalThis, "navigator", prior);
    else Reflect.deleteProperty(globalThis, "navigator");
  }
});

test("keyboard movement and one shot actions reset correctly", () => {
  const target = new EventTarget();
  const input = new Input(target);
  target.dispatchEvent(key("keydown", "KeyW"));
  target.dispatchEvent(key("keydown", "KeyD"));
  target.dispatchEvent(key("keydown", "Space"));
  let state = input.latest();
  assert.ok(state.x > 0 && state.y > 0);
  assert.ok(Math.hypot(state.x, state.y) <= 1);
  assert.equal(state.jump, true);
  assert.equal(state.jumpHeld, true);
  assert.equal(input.latest().jump, false);
  target.dispatchEvent(key("keyup", "Space"));
  target.dispatchEvent(key("keydown", "Space"));
  state = input.latest();
  assert.equal(state.jump, true);
  input.reset();
  assert.equal(input.latest().jumpHeld, false);
  assert.equal(input.latest().x, 0);
  input.dispose();
});

test("gamepad analog axes, button edges and camera stick are exposed", () => {
  const target = new EventTarget();
  const old = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  let pressed = true;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      getGamepads: () => [
        {
          axes: [0.5, -0.8, 0.4, -0.3],
          buttons: [
            { pressed },
            { pressed: false },
            {},
            {},
            { pressed: false },
            {},
            {},
            {},
            {},
            { pressed: false },
          ],
        },
      ],
    },
  });
  try {
    const input = new Input(target);
    const first = input.latest();
    assert.ok(first.x > 0.4 && first.y > 0.7);
    assert.ok(first.cameraX > 0.008 && first.cameraY > 0.005);
    assert.equal(first.jump, true);
    assert.equal(input.latest().jump, false);
    pressed = false;
    input.latest();
    pressed = true;
    assert.equal(input.latest().jump, true);
    input.dispose();
  } finally {
    if (old) Object.defineProperty(globalThis, "navigator", old);
    else Reflect.deleteProperty(globalThis, "navigator");
  }
});

test("continuous orbit uses frame time and Q/C camera keys", () => {
  const target = new EventTarget();
  const input = new Input(target);
  target.dispatchEvent(key("keydown", "KeyQ"));
  const half = input.latest(1 / 120).cameraX;
  const full = input.latest(1 / 60).cameraX;
  assert.ok(half < 0);
  assert.ok(Math.abs(full - 2 * half) < 0.00001);
  target.dispatchEvent(key("keyup", "KeyQ"));
  target.dispatchEvent(key("keydown", "KeyC"));
  assert.ok(input.latest(1 / 60).cameraX > 0);
  input.dispose();
});

test("repeated keydown after reset does not recreate a one shot action", () => {
  const target = new EventTarget();
  const input = new Input(target);
  target.dispatchEvent(key("keydown", "Escape"));
  assert.equal(input.latest().pause, true);
  input.reset();
  const repeated = key("keydown", "Escape");
  Object.defineProperty(repeated, "repeat", { value: true });
  target.dispatchEvent(repeated);
  assert.equal(input.latest().pause, false);
  target.dispatchEvent(key("keyup", "Escape"));
  target.dispatchEvent(key("keydown", "Escape"));
  assert.equal(input.latest().pause, true);
  input.dispose();
});

test("Space on a focused modal button keeps native button activation", () => {
  class ModalButton extends EventTarget {
    closest(selector: string) {
      return selector === "#modal button" ? this : null;
    }
  }
  const prior = Object.getOwnPropertyDescriptor(globalThis, "Element");
  Object.defineProperty(globalThis, "Element", {
    configurable: true,
    value: ModalButton,
  });
  try {
    const target = new ModalButton();
    const input = new Input(target);
    const space = new Event("keydown", { cancelable: true });
    Object.defineProperty(space, "code", { value: "Space" });
    target.dispatchEvent(space);
    assert.equal(space.defaultPrevented, false);
    assert.equal(input.latest().jump, false);
    assert.equal(input.latest().jumpHeld, false);
    input.dispose();
  } finally {
    if (prior) Object.defineProperty(globalThis, "Element", prior);
    else Reflect.deleteProperty(globalThis, "Element");
  }
});

test("lost pointer capture releases a held touch jump", () => {
  class FakeElement extends EventTarget {
    hasAttribute(name: string) {
      return name === "data-jump";
    }
    closest() {
      return this;
    }
    setPointerCapture() {}
  }
  const prior = Object.getOwnPropertyDescriptor(globalThis, "Element");
  Object.defineProperty(globalThis, "Element", {
    configurable: true,
    value: FakeElement,
  });
  try {
    const target = new FakeElement();
    const input = new Input(target);
    const down = new Event("pointerdown");
    Object.defineProperty(down, "pointerId", { value: 7 });
    target.dispatchEvent(down);
    assert.equal(input.latest().jumpHeld, true);
    const lost = new Event("lostpointercapture");
    Object.defineProperty(lost, "pointerId", { value: 7 });
    target.dispatchEvent(lost);
    assert.equal(input.latest().jumpHeld, false);
    input.dispose();
  } finally {
    if (prior) Object.defineProperty(globalThis, "Element", prior);
    else Reflect.deleteProperty(globalThis, "Element");
  }
});

test("lost pointer capture recenters the virtual joystick", () => {
  class FakeElement extends EventTarget {
    thumb = { style: { transform: "" } };
    hasAttribute(name: string) {
      return name === "data-stick";
    }
    closest() {
      return this;
    }
    querySelector() {
      return this.thumb;
    }
    setPointerCapture() {}
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 100, height: 100 };
    }
  }
  const prior = Object.getOwnPropertyDescriptor(globalThis, "Element");
  Object.defineProperty(globalThis, "Element", {
    configurable: true,
    value: FakeElement,
  });
  try {
    const target = new FakeElement();
    const input = new Input(target);
    const down = new Event("pointerdown");
    Object.defineProperties(down, {
      pointerId: { value: 3 },
      clientX: { value: 80 },
      clientY: { value: 50 },
    });
    target.dispatchEvent(down);
    assert.ok(input.latest().x > 0.5);
    assert.match(target.thumb.style.transform, /translate\(/);
    const lost = new Event("lostpointercapture");
    Object.defineProperty(lost, "pointerId", { value: 3 });
    target.dispatchEvent(lost);
    assert.equal(input.latest().x, 0);
    assert.equal(target.thumb.style.transform, "");
    input.dispose();
  } finally {
    if (prior) Object.defineProperty(globalThis, "Element", prior);
    else Reflect.deleteProperty(globalThis, "Element");
  }
});

test("crouch stays held across keyboard frames and clears on release or reset", () => {
  const target = new EventTarget();
  const input = new Input(target);
  target.dispatchEvent(key("keydown", "ShiftLeft"));
  assert.equal(input.latest().crouch, true);
  assert.equal(input.latest().crouch, true);
  target.dispatchEvent(key("keydown", "KeyZ"));
  target.dispatchEvent(key("keyup", "ShiftLeft"));
  assert.equal(input.latest().crouch, true);
  target.dispatchEvent(key("keyup", "KeyZ"));
  assert.equal(input.latest().crouch, false);
  target.dispatchEvent(key("keydown", "ShiftRight"));
  assert.equal(input.latest().crouch, true);
  input.reset();
  assert.equal(input.latest().crouch, false);
  input.dispose();
});

test("gamepad trigger or face button holds crouch independently", () => {
  const target = new EventTarget();
  const prior = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const buttons = Array.from({ length: 10 }, () => ({ pressed: false }));
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { getGamepads: () => [{ axes: [0, 0, 0, 0], buttons }] },
  });
  try {
    const input = new Input(target);
    buttons[6].pressed = true;
    assert.equal(input.latest().crouch, true);
    buttons[2].pressed = true;
    buttons[6].pressed = false;
    assert.equal(input.latest().crouch, true);
    buttons[2].pressed = false;
    assert.equal(input.latest().crouch, false);
    input.dispose();
  } finally {
    if (prior) Object.defineProperty(globalThis, "navigator", prior);
    else Reflect.deleteProperty(globalThis, "navigator");
  }
});

test("touch crouch toggles on taps and keeps its pressed state after pointerup", () => {
  class CrouchButton extends EventTarget {
    attributes = new Map<string, string>();
    hasAttribute(name: string) {
      return name === "data-crouch";
    }
    closest(selector: string) {
      return selector.includes("[data-crouch]") ? this : null;
    }
    setPointerCapture() {}
    setAttribute(name: string, value: string) {
      this.attributes.set(name, value);
    }
    getAttribute(name: string) {
      return this.attributes.get(name);
    }
  }
  const prior = Object.getOwnPropertyDescriptor(globalThis, "Element");
  Object.defineProperty(globalThis, "Element", {
    configurable: true,
    value: CrouchButton,
  });
  try {
    const target = new CrouchButton();
    const input = new Input(target);
    const pointer = (type: string, id: number) => {
      const event = new Event(type);
      Object.defineProperty(event, "pointerId", { value: id });
      target.dispatchEvent(event);
    };
    pointer("pointerdown", 1);
    assert.equal(input.latest().crouch, true);
    assert.equal(target.getAttribute("aria-pressed"), "true");
    pointer("pointerup", 1);
    pointer("lostpointercapture", 1);
    assert.equal(input.latest().crouch, true);
    pointer("pointerdown", 2);
    assert.equal(input.latest().crouch, false);
    assert.equal(target.getAttribute("aria-pressed"), "false");
    pointer("pointerup", 2);
    input.dispose();
  } finally {
    if (prior) Object.defineProperty(globalThis, "Element", prior);
    else Reflect.deleteProperty(globalThis, "Element");
  }
});

test("cancel, lost capture during a touch, and blur clear touch crouch", () => {
  class CrouchButton extends EventTarget {
    attributes = new Map<string, string>();
    hasAttribute(name: string) {
      return name === "data-crouch";
    }
    closest(selector: string) {
      return selector.includes("[data-crouch]") ? this : null;
    }
    setPointerCapture() {}
    setAttribute(name: string, value: string) {
      this.attributes.set(name, value);
    }
    getAttribute(name: string) {
      return this.attributes.get(name);
    }
  }
  const prior = Object.getOwnPropertyDescriptor(globalThis, "Element");
  Object.defineProperty(globalThis, "Element", {
    configurable: true,
    value: CrouchButton,
  });
  try {
    const target = new CrouchButton();
    const input = new Input(target);
    const pointer = (type: string, id: number) => {
      const event = new Event(type);
      Object.defineProperty(event, "pointerId", { value: id });
      target.dispatchEvent(event);
    };
    pointer("pointerdown", 1);
    pointer("pointercancel", 1);
    assert.equal(input.latest().crouch, false);
    assert.equal(target.getAttribute("aria-pressed"), "false");
    pointer("pointerdown", 2);
    pointer("lostpointercapture", 2);
    assert.equal(input.latest().crouch, false);
    pointer("pointerdown", 3);
    target.dispatchEvent(new Event("blur"));
    assert.equal(input.latest().crouch, false);
    assert.equal(target.getAttribute("aria-pressed"), "false");
    pointer("pointerdown", 4);
    input.reset();
    assert.equal(input.latest().crouch, false);
    assert.equal(target.getAttribute("aria-pressed"), "false");
    input.dispose();
  } finally {
    if (prior) Object.defineProperty(globalThis, "Element", prior);
    else Reflect.deleteProperty(globalThis, "Element");
  }
});

test("touch action buttons suppress native long-press selection and context menus", () => {
  class Button extends EventTarget {
    hasAttribute(name: string) {
      return name === "data-action";
    }
    closest() {
      return this;
    }
    setPointerCapture() {}
  }
  const prior = Object.getOwnPropertyDescriptor(globalThis, "Element");
  Object.defineProperty(globalThis, "Element", {
    configurable: true,
    value: Button,
  });
  try {
    const target = new Button(),
      input = new Input(target);
    const down = new Event("pointerdown", { cancelable: true });
    Object.defineProperty(down, "pointerId", { value: 9 });
    target.dispatchEvent(down);
    assert.equal(down.defaultPrevented, true);
    assert.equal(input.latest().interact, true);
    assert.equal(input.latest().interactHeld, true);
    const menu = new Event("contextmenu", { cancelable: true });
    target.dispatchEvent(menu);
    assert.equal(menu.defaultPrevented, true);
    input.dispose();
    const after = new Event("contextmenu", { cancelable: true });
    target.dispatchEvent(after);
    assert.equal(after.defaultPrevented, false);
  } finally {
    if (prior) Object.defineProperty(globalThis, "Element", prior);
    else Reflect.deleteProperty(globalThis, "Element");
  }
});

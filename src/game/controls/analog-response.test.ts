import assert from "node:assert/strict";
import test from "node:test";
import { Input } from "./input";
function withPad(run: (axes: number[], input: Input) => void) {
  const old = Object.getOwnPropertyDescriptor(globalThis, "navigator"),
    axes = [0, 0, 0, 0];
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      getGamepads: () => [
        {
          id: "Standard test controller",
          mapping: "standard",
          connected: true,
          axes,
          buttons: [],
        },
      ],
    },
  });
  const input = new Input(new EventTarget());
  try {
    run(axes, input);
  } finally {
    input.dispose();
    if (old) Object.defineProperty(globalThis, "navigator", old);
    else Reflect.deleteProperty(globalThis, "navigator");
  }
}
test("half-deflected analog movement gives quarter speed after the deadzone", () =>
  withPad((axes, input) => {
    axes[1] = -0.57;
    const state = input.latest();
    assert.ok(
      Math.abs(state.y - 0.25) < 1e-8,
      `half stick produced ${state.y}`,
    );
    assert.equal(state.x, 0);
  }));
test("analog response preserves diagonal direction and caps full diagonal speed", () =>
  withPad((axes, input) => {
    axes[0] = 0.57;
    axes[1] = -0.57;
    let state = input.latest();
    assert.ok(Math.abs(Math.hypot(state.x, state.y) - 0.5) < 1e-8);
    assert.ok(Math.abs(state.x - state.y) < 1e-8);
    axes[0] = 1;
    axes[1] = -1;
    state = input.latest();
    assert.ok(Math.abs(Math.hypot(state.x, state.y) - 1) < 1e-8);
  }));
test("full keyboard input retains full speed and releases immediately", () => {
  const target = new EventTarget(),
    input = new Input(target);
  for (const type of ["keydown", "keyup"]) {
    const e = new Event(type);
    Object.defineProperty(e, "code", { value: "KeyW" });
    target.dispatchEvent(e);
    assert.equal(input.latest().y, type === "keydown" ? 1 : 0);
  }
  input.dispose();
});

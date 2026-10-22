import assert from "node:assert/strict";
import test from "node:test";
import { Input } from "../src/super/input.ts";
import {
  isBindingPressed,
  readProfile,
  resolveControllerProfile,
  saveProfile,
  type N64Profile,
} from "../src/super/gamepad.ts";

const measuredId = "usb gamepad            (Vendor: 0810 Product: e501)";
function measuredPad(id = measuredId, buttons = 10, axes = 2): Gamepad {
  return {
    id,
    buttons: Array.from({ length: buttons }, () => ({ pressed: false })),
    axes: Array.from({ length: axes }, () => 0),
  } as unknown as Gamepad;
}

test("known N64 adapter resolves only for its normalized id and measured shape", () => {
  const pad = measuredPad();
  const resolved = resolveControllerProfile(pad);
  assert.equal(resolved?.id, measuredId);
  assert.deepEqual(resolved?.bindings, {
    a: { type: "button", index: 5 },
    b: { type: "button", index: 4 },
    z: { type: "button", index: 8 },
    start: { type: "button", index: 9 },
    r: { type: "button", index: 7 },
    cLeft: { type: "button", index: 3 },
    cRight: { type: "button", index: 1 },
    cUp: { type: "button", index: 0 },
    cDown: { type: "button", index: 2 },
  });
  assert.ok(
    resolveControllerProfile(
      measuredPad("  USB   GAMEPAD (vendor: 0810   product: E501) "),
    ),
  );
  assert.equal(
    resolveControllerProfile(measuredPad("Other USB Gamepad")),
    null,
  );
  assert.equal(resolveControllerProfile(measuredPad(measuredId, 12)), null);
  assert.equal(resolveControllerProfile(measuredPad(measuredId, 10, 4)), null);
});

test("saved calibration overrides the known N64 adapter default", () => {
  const prior = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    },
  });
  try {
    const saved: N64Profile = { ...profile, id: measuredId };
    saveProfile(saved);
    assert.deepEqual(resolveControllerProfile(measuredPad()), saved);
  } finally {
    if (prior) Object.defineProperty(globalThis, "localStorage", prior);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});

const profile: N64Profile = {
  version: 1,
  id: "USB N64 Controller",
  bindings: {
    a: { type: "button", index: 7 },
    b: { type: "button", index: 3 },
    z: { type: "button", index: 8 },
    start: { type: "button", index: 2 },
    r: { type: "button", index: 5 },
    cLeft: { type: "axis", index: 2, rest: 0, active: -1 },
    cRight: { type: "axis", index: 2, rest: 0, active: 1 },
    cUp: { type: "axis", index: 3, rest: 0, active: -1 },
    cDown: { type: "axis", index: 3, rest: 0, active: 1 },
  },
};

function withPad(
  run: (pad: {
    id: string;
    axes: number[];
    buttons: { pressed: boolean }[];
  }) => void,
) {
  const old = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const pad = {
    id: profile.id,
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 10 }, () => ({ pressed: false })),
  };
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { getGamepads: () => [pad] },
  });
  try {
    run(pad);
  } finally {
    if (old) Object.defineProperty(globalThis, "navigator", old);
    else Reflect.deleteProperty(globalThis, "navigator");
  }
}

test("calibrated N64 face, trigger and start bindings use the measured device controls", () => {
  withPad((pad) => {
    const input = new Input(new EventTarget());
    input.setControllerProfile(profile);
    input.latest();
    pad.buttons[7].pressed = true;
    let state = input.latest();
    assert.equal(state.jump, true);
    assert.equal(state.jumpHeld, true);
    assert.equal(state.interact, false);
    assert.equal(state.crouch, false);
    assert.equal(input.latest().jump, false);
    pad.buttons[7].pressed = false;
    pad.buttons[3].pressed = true;
    pad.buttons[8].pressed = true;
    pad.buttons[2].pressed = true;
    pad.buttons[5].pressed = true;
    state = input.latest();
    assert.equal(state.jumpHeld, false);
    assert.equal(state.interact, true);
    assert.equal(state.crouch, true);
    assert.equal(state.pause, true);
    assert.equal(state.recenter, true);
    input.dispose();
  });
});

test("calibrated C axes activate by direction once and never orbit at rest", () => {
  withPad((pad) => {
    const input = new Input(new EventTarget());
    input.setControllerProfile(profile);
    assert.equal(input.latest().cameraX, 0);
    pad.axes[2] = -1;
    assert.equal(input.latest().cameraX, -Math.PI / 4);
    assert.equal(input.latest().cameraX, 0);
    pad.axes[2] = 0;
    input.latest();
    pad.axes[2] = 1;
    assert.equal(input.latest().cameraX, Math.PI / 4);
    pad.axes[3] = -1;
    assert.equal(input.latest().cameraZoom, -1);
    assert.equal(input.latest().cameraZoom, 0);
    pad.axes[3] = 1;
    assert.equal(input.latest().cameraZoom, 1);
    input.dispose();
  });
});

test("switching to a calibrated profile does not fire an action from a button already held", () => {
  withPad((pad) => {
    const input = new Input(new EventTarget());
    pad.buttons[7].pressed = true;
    input.setControllerProfile(profile);
    assert.equal(input.latest().jump, false);
    assert.equal(input.latest().jumpHeld, true);
    pad.buttons[7].pressed = false;
    input.latest();
    pad.buttons[7].pressed = true;
    assert.equal(input.latest().jump, true);
    input.dispose();
  });
});

test("reset suppresses a held controller action until release and press again", () => {
  withPad((pad) => {
    const input = new Input(new EventTarget());
    input.setControllerProfile(profile);
    input.latest();
    pad.buttons[7].pressed = true;
    assert.equal(input.latest().jump, true);
    input.reset();
    assert.equal(input.latest().jump, false);
    pad.buttons[7].pressed = false;
    input.latest();
    pad.buttons[7].pressed = true;
    assert.equal(input.latest().jump, true);
    input.dispose();
  });
});

test("axis binding compares active direction with measured rest", () => {
  const pad = { axes: [0, -1], buttons: [] } as unknown as Gamepad;
  const binding = { type: "axis", index: 1, rest: -1, active: 1 } as const;
  assert.equal(isBindingPressed(pad, binding), false);
  (pad.axes as number[])[1] = 0;
  assert.equal(isBindingPressed(pad, binding), true);
  (pad.axes as number[])[1] = Number.NaN;
  assert.equal(isBindingPressed(pad, binding), false);
});

test("saved profiles round trip by device id and malformed profiles are ignored", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
  saveProfile(profile, storage);
  assert.deepEqual(readProfile(profile.id, storage), profile);
  assert.equal(readProfile("another controller", storage), null);
  const key = [...values.keys()][0];
  values.set(
    key,
    JSON.stringify({
      ...profile,
      bindings: { ...profile.bindings, a: { type: "button", index: 999999 } },
    }),
  );
  assert.equal(readProfile(profile.id, storage), null);
  values.set(
    key,
    JSON.stringify({
      ...profile,
      bindings: {
        ...profile.bindings,
        cUp: { type: "axis", index: 2, rest: 0, active: "oops" },
      },
    }),
  );
  assert.equal(readProfile(profile.id, storage), null);
});

import assert from "node:assert/strict";
import test from "node:test";
import { CaptureSession } from "../src/super/controller-setup.ts";

function pad() {
  return {
    id: "N64 USB pad",
    buttons: Array.from({ length: 12 }, () => ({ pressed: false })),
    axes: [0, 0, 0, 0],
  };
}

function press(
  session: CaptureSession,
  controller: ReturnType<typeof pad>,
  index: number,
): void {
  controller.buttons[index].pressed = true;
  session.poll(controller);
}

function release(
  session: CaptureSession,
  controller: ReturnType<typeof pad>,
  index: number,
): void {
  controller.buttons[index].pressed = false;
  session.poll(controller);
}

test("a held press maps one step and saving is possible only after nine releases", () => {
  const controller = pad();
  const session = new CaptureSession();
  press(session, controller, 0);
  assert.equal(session.step, 0);
  release(session, controller, 0);
  press(session, controller, 1);
  assert.equal(session.step, 0);
  assert.equal(session.waitingForRelease, true);
  assert.equal(session.profile(), null);
  session.poll(controller);
  assert.equal(session.step, 0);
  release(session, controller, 1);
  assert.equal(session.step, 1);
  for (let index = 2; index <= 9; index++) {
    press(session, controller, index);
    assert.equal(session.step, index - 1);
    release(session, controller, index);
  }
  assert.equal(session.complete, true);
  assert.deepEqual(session.profile()?.bindings.cDown, {
    type: "button",
    index: 9,
  });
  assert.equal(session.profile()?.id, "N64 USB pad");
  press(session, controller, 1);
  assert.equal(session.saveRequested, true);
});

test("duplicate button requires a different fresh press", () => {
  const controller = pad();
  const session = new CaptureSession();
  session.poll(controller);
  press(session, controller, 1);
  release(session, controller, 1);
  press(session, controller, 1);
  assert.match(session.message, /already mapped/);
  assert.equal(session.step, 1);
  assert.equal(session.mapped.b, undefined);
  release(session, controller, 1);
  press(session, controller, 2);
  assert.deepEqual(session.mapped.b, { type: "button", index: 2 });
});

test("C axes ignore movement sticks, use measured rest, and permit opposite directions", () => {
  const controller = pad();
  controller.axes[2] = -1;
  const session = new CaptureSession();
  session.poll(controller);
  for (let index = 0; index < 5; index++) {
    press(session, controller, index);
    release(session, controller, index);
  }
  controller.axes[0] = 1;
  controller.axes[1] = -1;
  session.poll(controller);
  assert.equal(session.mapped.cLeft, undefined);
  controller.axes[2] = 1;
  session.poll(controller);
  assert.deepEqual(session.mapped.cLeft, {
    type: "axis",
    index: 2,
    rest: -1,
    active: 1,
  });
  controller.axes[2] = -1;
  session.poll(controller);
  assert.equal(session.step, 6);
  controller.axes[2] = 1;
  session.poll(controller);
  assert.match(session.message, /already mapped/);
  controller.axes[2] = -1;
  session.poll(controller);
  press(session, controller, 6);
  assert.deepEqual(session.mapped.cRight, { type: "button", index: 6 });
});

test("back and retry discard the recent capture, and another device cannot take over", () => {
  const controller = pad();
  const other = { ...pad(), id: "Different pad" };
  const session = new CaptureSession();
  session.poll(controller);
  press(session, controller, 0);
  session.retry();
  assert.equal(session.mapped.a, undefined);
  session.poll(controller);
  release(session, controller, 0);
  press(session, controller, 1);
  release(session, controller, 1);
  assert.equal(session.step, 1);
  session.poll(other);
  assert.match(session.message, /Reconnect the same controller/);
  press(session, other, 2);
  assert.equal(session.step, 1);
  session.poll(controller);
  session.back();
  assert.equal(session.step, 0);
  assert.equal(session.mapped.a, undefined);
});

test("a disconnected controller cannot be captured", () => {
  const controller = pad();
  const session = new CaptureSession();
  session.poll({ ...controller, connected: false });
  assert.equal(session.id, null);
  session.poll(controller);
  assert.equal(session.connected, true);
  session.poll({ ...controller, connected: false });
  assert.equal(session.connected, false);
});

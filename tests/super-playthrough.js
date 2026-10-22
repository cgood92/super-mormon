// In the Vite browser: const qa = await import('/tests/super-playthrough.js'); qa.install();
// This driver uses the public controller input and read-only scene snapshots. It never teleports or changes game state.
let pad, original;
const tick = () => new Promise((r) => setTimeout(r, 30));
export function install() {
  original = navigator.getGamepads;
  pad = {
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 16 }, () => ({ pressed: false })),
    connected: true,
    index: 0,
  };
  Object.defineProperty(navigator, "getGamepads", {
    configurable: true,
    value: () => [pad],
  });
}
export function restore() {
  stop();
  Object.defineProperty(navigator, "getGamepads", {
    configurable: true,
    value: original,
  });
}
export function stop() {
  if (pad) {
    pad.axes.fill(0);
    pad.buttons.forEach((b) => (b.pressed = false));
  }
}
export function snapshot() {
  return window.superMormon.snapshot();
}
export async function press(index = 1) {
  pad.buttons[index].pressed = true;
  await new Promise((r) => setTimeout(r, 120));
  pad.buttons[index].pressed = false;
  await new Promise((r) => setTimeout(r, 120));
}
export async function go(x, z, tolerance = 0.4, timeout = 12000) {
  const start = performance.now();
  let best = Infinity,
    stalled = 0;
  while (performance.now() - start < timeout) {
    const s = snapshot();
    if (s.paused || s.transition) {
      stop();
      return s;
    }
    const dx = x - s.player.x,
      dz = z - s.player.z,
      d = Math.hypot(dx, dz);
    if (d < tolerance) {
      stop();
      await new Promise((r) => setTimeout(r, 130));
      return snapshot();
    }
    const right = -Math.cos(s.cameraYaw) * dx + Math.sin(s.cameraYaw) * dz,
      forward = Math.sin(s.cameraYaw) * dx + Math.cos(s.cameraYaw) * dz;
    const speed = Math.min(0.92, Math.max(0.28, d * 0.6));
    const axis = (v) =>
      Math.abs(v) < 0.04
        ? 0
        : Math.sign(v) * (0.14 + 0.86 * Math.abs(v) * speed);
    pad.axes[0] = axis(right / d);
    pad.axes[1] = -axis(forward / d);
    await tick();
    if (d < best - 0.035) {
      best = d;
      stalled = 0;
    } else if (++stalled > 80) {
      stop();
      throw Error(`Blocked toward ${x},${z} at ${JSON.stringify(s.player)}`);
    }
  }
  stop();
  throw Error(`Timed out toward ${x},${z}: ${JSON.stringify(snapshot())}`);
}
export async function enter(id) {
  document.querySelector("#home").click();
  await new Promise((r) => setTimeout(r, 750));
  const p = snapshot().portals.find((p) => p.id === id);
  const side = id === "trade" || id === "night";
  if (side) {
    await go(14, 17, 0.3);
    await go(p.x - 1.8, p.z, 0.25);
  } else await go(p.x, p.z + 1.8, 0.25);
  const yaw = snapshot().cameraYaw;
  const dx = side ? 1 : 0,
    dz = side ? 0 : -1;
  pad.axes[0] = -Math.cos(yaw) * dx + Math.sin(yaw) * dz;
  pad.axes[1] = -(Math.sin(yaw) * dx + Math.cos(yaw) * dz);
  pad.buttons[0].pressed = true;
  await new Promise((r) => setTimeout(r, 650));
  stop();
  await new Promise((r) => setTimeout(r, 500));
  if (snapshot().world !== id) throw Error(`Painting did not enter ${id}`);
  return snapshot();
}
export async function houseLower() {
  await go(-6, 16);
  await go(-6.2, 10, 0.2);
  await press();
  await go(2, 10);
  await go(2, -8);
  await go(-9, -8.2, 0.2);
  await press();
  await go(-12.1, -8, 0.2);
  await go(-12.1, -11.6, 0.15);
  await go(-10.2, -11.6, 0.15);
  await go(-10.2, -15.6, 0.15);
  await go(-10.65, -15.6, 0.12);
  await press();
  await go(-3, -14);
  await go(1, -9.2, 0.2);
  await press();
  return snapshot();
}
export async function houseUpper() {
  await go(2, -8);
  await go(2, 16.5);
  await go(6.5, 16.5);
  await go(6.5, 7.2, 0.2);
  await go(9, 2);
  await go(9, -4.2);
  await go(10.9, -4.8, 0.2);
  await press();
  return snapshot();
}
export async function houseReturn() {
  await go(9, -4);
  await go(6.5, 7.2);
  await go(6.5, 16.5);
  await go(0, 16.5);
  return snapshot();
}
export async function streets() {
  await go(0, -8, 0.15);
  await go(-20, -8, 0.2);
  await go(-21.5, -15, 0.4);
  return snapshot();
}
export async function palaceApproach() {
  await go(-8, 22, 0.3);
  await go(-8, -7, 0.3);
  await go(0, -17, 0.6);
  await press();
  return snapshot();
}
export async function palaceEscape() {
  document.querySelector("#modal-buttons button")?.click();
  for (const z of [0.5, 10.4, 21.5]) {
    await go(0, z, 0.2);
    pad.axes[1] = -1;
    pad.buttons[0].pressed = true;
    await new Promise((r) => setTimeout(r, 700));
    pad.buttons[0].pressed = false;
    stop();
    await new Promise((r) => setTimeout(r, 150));
  }
  await go(0, 38, 0.6, 20000);
  return snapshot();
}

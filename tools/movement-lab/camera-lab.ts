import * as T from "three";
import { Input } from "../../src/game/controls/input";
import { FollowCamera } from "../../src/game/camera/camera";
import { markScenery } from "../../src/game/worlds/shared/scenery";
import { createSculptedCharacterRig } from "./rig";
import { createPlayer, stepPlayer } from "./physics";
import { TrailingCamera, shapeStick } from "./trailing-camera";
const stage = document.querySelector<HTMLDivElement>("#stage")!;
const renderer = new T.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFShadowMap;
stage.append(renderer.domElement);
const scene = new T.Scene();
scene.background = new T.Color(0x95c8d0);
scene.fog = new T.Fog(0x95c8d0, 55, 150);
scene.add(new T.HemisphereLight(0xf6fcff, 0x87966d, 2.8));
const sun = new T.DirectionalLight(0xffedcc, 3.1);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -14;
sun.shadow.camera.right = 14;
sun.shadow.camera.top = 14;
sun.shadow.camera.bottom = -14;
scene.add(sun, sun.target);
const floor = new T.Mesh(
  new T.PlaneGeometry(2000, 2000),
  new T.MeshStandardMaterial({ color: 0x768f69, roughness: 1 }),
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.015;
floor.receiveShadow = true;
markScenery(floor, {
  kind: "decoration",
  reason:
    "Visual skin for the physics solver’s implicit y=0 ground; no second support surface.",
});
scene.add(floor);
const grid = new T.GridHelper(1200, 600, 0xb1c49b, 0x8da47d);
grid.position.y = 0.002;
markScenery(grid, {
  kind: "decoration",
  reason:
    "Thin painted ground-reference lines for perceiving movement and depth.",
});
scene.add(grid);
// Single line primitive per ring: painted floor markings, never solid obstacles.
for (const radius of [5, 10, 20, 35]) {
  const points = Array.from(
    { length: 129 },
    (_, i) =>
      new T.Vector3(
        Math.sin((i / 128) * Math.PI * 2) * radius,
        0.009,
        Math.cos((i / 128) * Math.PI * 2) * radius,
      ),
  );
  const line = new T.Line(
    new T.BufferGeometry().setFromPoints(points),
    new T.LineBasicMaterial({ color: radius === 10 ? 0xe6d292 : 0xc2d3a7 }),
  );
  markScenery(line, {
    kind: "decoration",
    reason: "Painted distance ring on the single ground surface.",
  });
  scene.add(line);
}
const actor = createSculptedCharacterRig("nephi", {
  quality: "hero",
  travelLean: true,
});
scene.add(actor.group);
actor.group.traverse((o) => {
  if (o instanceof T.Mesh) o.castShadow = true;
});
const camera = new T.PerspectiveCamera(58, innerWidth / innerHeight, 0.08, 240);
const trailing = new TrailingCamera(camera),
  current = new FollowCamera(camera),
  input = new Input();
let p = createPlayer(),
  cameraMode = "trailing",
  paused = false,
  demo: "circle" | "straight" | null = null,
  time = 0,
  frame = 0,
  last = 0,
  accumulator = 0;
let trace: { x: number; z: number; cx: number; cz: number }[] = [];
const modeSelect = document.querySelector<HTMLSelectElement>("#camera")!;
const circleButton = document.querySelector<HTMLButtonElement>("#circle")!;
const straightButton = document.querySelector<HTMLButtonElement>("#straight")!;
const pauseButton = document.querySelector<HTMLButtonElement>("#pause")!;
const status = document.querySelector<HTMLDivElement>("#status")!;
function syncDemo() {
  circleButton.classList.toggle("active", demo === "circle");
  straightButton.classList.toggle("active", demo === "straight");
}
function reset() {
  p = createPlayer();
  time = 0;
  accumulator = 0;
  trace = [];
  input.reset();
  trailing.reset(p);
  if (cameraMode === "current") current.reset(p, 0, "hub");
  actor.update(0, p);
  syncDemo();
  draw();
}
modeSelect.onchange = () => {
  cameraMode = modeSelect.value;
  if (cameraMode === "trailing") trailing.reset(p);
  else current.reset(p, p.yaw, "hub");
};
circleButton.onclick = () => {
  demo = demo === "circle" ? null : "circle";
  syncDemo();
};
straightButton.onclick = () => {
  demo = demo === "straight" ? null : "straight";
  syncDemo();
};
document.querySelector<HTMLButtonElement>("#reset")!.onclick = reset;
pauseButton.onclick = () => {
  paused = !paused;
  pauseButton.textContent = paused ? "Resume" : "Pause";
  input.reset();
};
// Actual user movement always takes over from either demonstration.
addEventListener("keydown", (e) => {
  if (
    [
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Space",
    ].includes(e.code)
  ) {
    demo = null;
    syncDemo();
  }
});
document.querySelector("#stick")!.addEventListener("pointerdown", () => {
  demo = null;
  syncDemo();
});
const map = document.querySelector<HTMLCanvasElement>("#map")!,
  ctx = map.getContext("2d")!;
function drawMap() {
  ctx.clearRect(0, 0, 360, 360);
  const positions = trace.length
    ? trace
    : [{ x: p.x, z: p.z, cx: camera.position.x, cz: camera.position.z }];
  const xs = positions.flatMap((v) => [v.x, v.cx]),
    zs = positions.flatMap((v) => [v.z, v.cz]);
  const minX = Math.min(...xs) - 3,
    maxX = Math.max(...xs) + 3,
    minZ = Math.min(...zs) - 3,
    maxZ = Math.max(...zs) + 3;
  const scale = 310 / Math.max(maxX - minX, maxZ - minZ, 20);
  const cx = (minX + maxX) / 2,
    cz = (minZ + maxZ) / 2;
  const project = (x: number, z: number) => [
    180 + (x - cx) * scale,
    180 - (z - cz) * scale,
  ];
  for (const isCamera of [true, false]) {
    ctx.strokeStyle = isCamera ? "#edc786" : "#d1ffca";
    ctx.lineWidth = isCamera ? 2 : 3;
    ctx.beginPath();
    positions.forEach((v, i) => {
      const [x, y] = project(isCamera ? v.cx : v.x, isCamera ? v.cz : v.z);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
  for (const [x, z, color] of [
    [p.x, p.z, "#d1ffca"],
    [camera.position.x, camera.position.z, "#edc786"],
  ] as const) {
    const point = project(x, z);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(point[0], point[1], 6, 0, Math.PI * 2);
    ctx.fill();
  }
}
function advance(dt: number) {
  const raw = input.latest(dt);
  if (raw.pause) {
    paused = !paused;
    pauseButton.textContent = paused ? "Resume" : "Pause";
  }
  if (paused) return;
  if (Math.hypot(raw.x, raw.y) > 0.03) {
    demo = null;
    syncDemo();
  }
  let x = demo === "circle" ? -1 : demo === "straight" ? 0 : raw.x,
    y = demo === "straight" ? 1 : demo === "circle" ? 0 : raw.y;
  const stick = shapeStick(
    x,
    y,
    document.querySelector<HTMLInputElement>("#curve")!.checked,
  );
  accumulator += Math.min(dt, 0.05);
  let first = true;
  while (accumulator >= 1 / 120) {
    const subdt = 1 / 120;
    stepPlayer(
      p,
      {
        x: stick.x,
        y: stick.y,
        jump: first && raw.jump,
        jumpHeld: raw.jumpHeld,
        crouch: raw.crouch,
      },
      subdt,
      cameraMode === "trailing" ? trailing.yaw : current.yaw,
      [],
      [],
      [],
      1,
    );
    const orbit = {
      orbitX: (raw.cameraX * subdt) / Math.max(dt, subdt),
      orbitY: (raw.cameraY * subdt) / Math.max(dt, subdt),
      recenter: first && raw.recenter,
    };
    if (cameraMode === "trailing") trailing.update(subdt, p, orbit);
    else current.update(subdt, p, [], orbit, "hub");
    actor.update(subdt, p);
    time += subdt;
    accumulator -= subdt;
    first = false;
  }
  trace.push({ x: p.x, z: p.z, cx: camera.position.x, cz: camera.position.z });
  if (trace.length > 1800) trace.shift();
  status.textContent = `${cameraMode === "trailing" ? "Trailing camera" : "Current game camera"} · ${p.runSpeed.toFixed(1)} m/s · stick ${Math.round(stick.magnitude * 100)}% → ${Math.round(stick.response * 100)}% · ${demo ? (demo === "circle" ? "holding left" : "holding forward") : input.device}`;
}
function draw() {
  renderer.setSize(stage.clientWidth, stage.clientHeight, false);
  camera.aspect = stage.clientWidth / stage.clientHeight;
  camera.updateProjectionMatrix();
  sun.position.set(p.x + 8, 16, p.z + 9);
  sun.target.position.set(p.x, 0, p.z);
  renderer.render(scene, camera);
  drawMap();
}
function tick(now: number) {
  frame = 0;
  if (document.hidden) return;
  const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
  last = now;
  advance(dt);
  draw();
  frame = requestAnimationFrame(tick);
}
document.addEventListener("visibilitychange", () => {
  cancelAnimationFrame(frame);
  frame = 0;
  last = 0;
  accumulator = 0;
  input.reset();
  if (!document.hidden) frame = requestAnimationFrame(tick);
});
addEventListener("resize", draw);
addEventListener("pagehide", () => {
  cancelAnimationFrame(frame);
  input.dispose();
  actor.dispose();
  const geometries = new Set<T.BufferGeometry>(),
    materials = new Set<T.Material>();
  scene.traverse((o) => {
    if (o instanceof T.Mesh || o instanceof T.Line) {
      geometries.add(o.geometry);
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
        materials.add(m),
      );
    }
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  sun.shadow.dispose();
  renderer.dispose();
});
Object.assign(window, {
  cameraLab: {
    get player() {
      return p;
    },
    camera,
    trailing,
    current,
    scene,
    actor,
    get trace() {
      return trace;
    },
    get time() {
      return time;
    },
    get frame() {
      return frame;
    },
    get mode() {
      return cameraMode;
    },
  },
});
reset();
frame = requestAnimationFrame(tick);

import * as T from "three";
import { createCharacter } from "../../src/game/characters/character";
import { createSculptedCharacterRig } from "./rig";
import { createPlayer, stepPlayer } from "./physics";
const stage = document.querySelector<HTMLDivElement>(".stage")!;
const renderer = new T.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
renderer.setScissorTest(true);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFShadowMap;
stage.prepend(renderer.domElement);
const cameraVectors = {
  quarter: new T.Vector3(4, 2.4, 5),
  side: new T.Vector3(6, 1.8, 0),
  front: new T.Vector3(0, 1.8, 6),
};
let angle: keyof typeof cameraVectors = "quarter";
const panes = [0, 1, 2].map((i) => {
  const scene = new T.Scene();
  scene.background = new T.Color(0x263c43);
  scene.fog = new T.Fog(0x263c43, 24, 65);
  scene.add(new T.HemisphereLight(0xe9f6ff, 0xa5a58a, 2.6));
  const light = new T.DirectionalLight(0xffedcf, 3.5);
  light.position.set(6, 12, 7);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.camera.left = -18;
  light.shadow.camera.right = 18;
  light.shadow.camera.top = 18;
  light.shadow.camera.bottom = -18;
  scene.add(light, light.target);
  const floor = new T.Mesh(
    new T.PlaneGeometry(200, 200),
    new T.MeshStandardMaterial({ color: 0x6c8076, roughness: 1 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.position.y = -0.015;
  scene.add(floor);
  const grid = new T.GridHelper(200, 100, 0x9aaca0, 0x7d9286);
  grid.position.y = -0.01;
  scene.add(grid);
  const actor =
    i === 0
      ? createCharacter("nephi", { quality: "hero" })
      : createSculptedCharacterRig("nephi", {
          quality: "hero",
          travelLean: i === 1,
        });
  scene.add(actor.group);
  actor.group.traverse((o) => {
    if (o instanceof T.Mesh) {
      o.castShadow = true;
    }
  });
  const camera = new T.PerspectiveCamera(35, 1, 0.1, 130);
  const trailGeometry = new T.BufferGeometry();
  const points = new Float32Array(600 * 3);
  trailGeometry.setAttribute("position", new T.BufferAttribute(points, 3));
  trailGeometry.setDrawRange(0, 0);
  const trail = new T.Line(
    trailGeometry,
    new T.LineBasicMaterial({
      color: i === 0 ? 0xd3d9cf : i === 1 ? 0xc8f6ac : 0xffd1a0,
    }),
  );
  trail.frustumCulled = false;
  scene.add(trail);
  return {
    scene,
    actor,
    camera,
    p: createPlayer(),
    points,
    trailGeometry,
    trailCount: 0,
    light,
  };
});
let autoplay = true,
  slow = false,
  paused = false,
  time = 0,
  accumulator = 0,
  last = 0,
  frame = 0,
  jumpWas = false;
const keys = new Set<string>();
const cue = document.querySelector<HTMLDivElement>("#cue")!;
const autoButton = document.querySelector<HTMLButtonElement>("#auto")!;
const playButton = document.querySelector<HTMLButtonElement>("#play")!;
function reset() {
  time = 0;
  accumulator = 0;
  jumpWas = false;
  for (const pane of panes) {
    pane.p = createPlayer();
    pane.trailCount = 0;
    pane.trailGeometry.setDrawRange(0, 0);
    pane.actor.update(0, pane.p);
  }
  draw();
}
function mode(auto: boolean) {
  autoplay = auto;
  autoButton.classList.toggle("active", auto);
  playButton.classList.toggle("active", !auto);
  keys.clear();
  reset();
}
autoButton.onclick = () => mode(true);
playButton.onclick = () => mode(false);
document.querySelector<HTMLButtonElement>("#reset")!.onclick = reset;
document.querySelector<HTMLSelectElement>("#view")!.onchange = (e) => {
  angle = (e.target as HTMLSelectElement).value as keyof typeof cameraVectors;
  draw();
};
document.querySelector<HTMLButtonElement>("#slow")!.onclick = (e) => {
  slow = !slow;
  (e.target as HTMLElement).classList.toggle("active", slow);
};
document.querySelector<HTMLButtonElement>("#pause")!.onclick = (e) => {
  paused = !paused;
  (e.target as HTMLElement).textContent = paused ? "Resume" : "Pause";
};
addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLSelectElement) return;
  if (
    [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Space",
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "KeyR",
    ].includes(e.code)
  ) {
    e.preventDefault();
    keys.add(e.code);
    if (e.code === "KeyR") reset();
  }
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", () => keys.clear());
document.querySelectorAll<HTMLButtonElement>("[data-key]").forEach((button) => {
  button.style.touchAction = "none";
  button.onpointerdown = (e) => {
    e.preventDefault();
    button.setPointerCapture(e.pointerId);
    keys.add(button.dataset.key!);
  };
  button.onpointerup = button.onpointercancel = () =>
    keys.delete(button.dataset.key!);
});
const sequence = [
  { duration: 0.7, x: 0, y: 0, label: "Ready…" },
  { duration: 1.25, x: 0, y: 1, label: "Start → accelerate" },
  { duration: 0.65, x: 0, y: 0, label: "Release → brake" },
  { duration: 1.05, x: 0, y: 1, label: "Build speed again" },
  { duration: 0.95, x: 0, y: -1, label: "Reverse → pivot" },
  { duration: 1.1, x: 1, y: 0, label: "Turn a corner" },
  { duration: 0.8, x: -1, y: 0, label: "Sharp reversal" },
  { duration: 0.8, x: 0, y: 1, label: "Jump in motion", jump: true },
  { duration: 0.9, x: 0, y: 0, label: "Land → settle" },
];
const total = sequence.reduce((a, s) => a + s.duration, 0);
function simulate(dt: number) {
  time += dt;
  let x = 0,
    y = 0,
    jumpHeld = false;
  if (autoplay) {
    let t = time % total;
    const part = sequence.find((s) => {
      if (t < s.duration) return true;
      t -= s.duration;
      return false;
    })!;
    x = part.x;
    y = part.y;
    jumpHeld = !!part.jump && t < 0.28;
    cue.textContent = part.label;
    if (time >= total) {
      reset();
      return;
    }
  } else {
    x =
      Number(keys.has("ArrowRight") || keys.has("KeyD")) -
      Number(keys.has("ArrowLeft") || keys.has("KeyA"));
    y =
      Number(keys.has("ArrowUp") || keys.has("KeyW")) -
      Number(keys.has("ArrowDown") || keys.has("KeyS"));
    jumpHeld = keys.has("Space");
    cue.textContent = "Your input → all three characters";
  }
  for (let i = 0; i < panes.length; i++) {
    const pane = panes[i];
    stepPlayer(
      pane.p,
      {
        x:
          x * Number(document.querySelector<HTMLSelectElement>("#pace")!.value),
        y:
          y * Number(document.querySelector<HTMLSelectElement>("#pace")!.value),
        jump: jumpHeld && !jumpWas,
        jumpHeld,
      },
      dt,
      0,
      [],
      [],
      [],
      i,
    );
    pane.actor.update(dt, pane.p);
    if (pane.p.runSpeed > 0.12) {
      if (pane.trailCount >= 600) {
        pane.points.copyWithin(0, 3);
        pane.trailCount = 599;
      }
      const offset = pane.trailCount++ * 3;
      pane.points.set([pane.p.x, 0.012, pane.p.z], offset);
      pane.trailGeometry.attributes.position.needsUpdate = true;
      pane.trailGeometry.setDrawRange(0, pane.trailCount);
    }
  }
  jumpWas = jumpHeld;
}
function draw() {
  const w = stage.clientWidth,
    h = stage.clientHeight;
  renderer.setSize(w, h, false);
  panes.forEach((pane, i) => {
    const pw = w / 3;
    renderer.setViewport(i * pw, 0, pw, h);
    renderer.setScissor(i * pw, 0, pw, h);
    const target = new T.Vector3(pane.p.x, 0.85, pane.p.z);
    pane.camera.position.copy(target).add(cameraVectors[angle]);
    pane.camera.lookAt(target);
    pane.camera.aspect = pw / h;
    pane.camera.updateProjectionMatrix();
    pane.light.position.set(pane.p.x + 6, 12, pane.p.z + 7);
    pane.light.target.position.set(pane.p.x, 0, pane.p.z);
    renderer.render(pane.scene, pane.camera);
    document.querySelectorAll(".metrics span")[i].textContent =
      `${pane.p.runSpeed.toFixed(1)} m/s · ${pane.p.grounded ? "grounded" : "airborne"}`;
  });
}
function tick(now: number) {
  frame = 0;
  if (document.hidden) return;
  const dt = last ? Math.min((now - last) / 1000, 0.06) : 0;
  last = now;
  if (!paused) {
    accumulator += dt * (slow ? 0.35 : 1);
    while (accumulator >= 1 / 120) {
      simulate(1 / 120);
      accumulator -= 1 / 120;
    }
  }
  draw();
  frame = requestAnimationFrame(tick);
}
document.addEventListener("visibilitychange", () => {
  cancelAnimationFrame(frame);
  frame = 0;
  last = 0;
  accumulator = 0;
  keys.clear();
  if (!document.hidden) frame = requestAnimationFrame(tick);
});
addEventListener("resize", draw);
addEventListener("pagehide", () => {
  cancelAnimationFrame(frame);
  for (const pane of panes) {
    pane.actor.dispose();
    pane.scene.traverse((o) => {
      if (o instanceof T.Mesh || o instanceof T.Line) {
        o.geometry.dispose();
        const materials = Array.isArray(o.material) ? o.material : [o.material];
        materials.forEach((m) => m.dispose());
      }
    });
  }
  renderer.dispose();
});
// Read-only diagnostics for manual browser verification.
Object.assign(window, {
  movementLab: {
    panes,
    get time() {
      return time;
    },
    get paused() {
      return paused;
    },
    get autoplay() {
      return autoplay;
    },
    get frame() {
      return frame;
    },
  },
});
reset();
frame = requestAnimationFrame(tick);

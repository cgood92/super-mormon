// Static developer QA: renders posed rigs once, with no hidden-page animation loop.
import * as T from "three";
import { createCharacter } from "../../src/game/characters/character";
const renderer = new T.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setScissorTest(true);
renderer.setPixelRatio(1);
document.body.prepend(renderer.domElement);
const panels = [
  ["hero", Math.PI / 2, "run"],
  ["npc", Math.PI * 0.75, "run"],
  ["hero", Math.PI * 1.25, "run"],
  ["hero", Math.PI / 2, "crawl"],
  ["npc", Math.PI * 0.75, "crawl"],
  ["hero", Math.PI, "idle"],
] as const;
const actors: ReturnType<typeof createCharacter>[] = [];
panels.forEach(([quality, view, move], index) => {
  const actor = createCharacter(index < 3 ? "lehi" : "nephi", { quality });
  actors.push(actor);
  const scene = new T.Scene();
  scene.background = new T.Color(0xe4e0d5);
  scene.add(new T.HemisphereLight(0xffffff, 0x797b70, 2));
  const light = new T.DirectionalLight(0xfff4e2, 3);
  light.position.set(-3, 5, 5);
  scene.add(light, actor.group);
  let x = 0,
    z = 0;
  const runSpeed = move === "run" ? 6.5 : 2.8;
  for (let i = 0; i < 90; i++) {
    // Final samples include facing/velocity lag on a sharp turn or reversal.
    const yaw = i < 84 ? 0 : index === 2 ? Math.PI : -Math.PI / 2;
    const velocityYaw = i < 88 ? 0 : yaw;
    const vx = Math.sin(velocityYaw) * runSpeed;
    const vz = Math.cos(velocityYaw) * runSpeed;
    x += vx / 60;
    z += vz / 60;
    actor.update(1 / 60, {
      x,
      y: 0,
      z,
      vx,
      vy: 0,
      vz,
      yaw,
      grounded: true,
      runSpeed,
      move: move === "idle" ? "crawl" : move,
      crouching: move !== "run",
    });
  }
  if (move === "idle")
    actor.update(1 / 60, {
      x,
      y: 0,
      z,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: -Math.PI / 2,
      grounded: true,
      runSpeed: 0,
      move: "idle",
    });
  // Recenter the finished pose for inspection, without changing joint transforms.
  actor.group.position.set(0, 0, 0);
  const w = innerWidth / 3,
    h = innerHeight / 2,
    camera = new T.PerspectiveCamera(34, w / h, 0.1, 20);
  camera.position.set(Math.sin(view) * 3.8, 1.2, Math.cos(view) * 3.8);
  camera.lookAt(0, 0.72, 0);
  const text = document.createElement("span");
  text.textContent = `${index < 3 ? "Lehi" : "Nephi"} · ${quality} · ${move} · ${move === "run" ? "6.5 m/s turn/reversal" : "crawl/stand seam"}`;
  document.querySelector("#labels")!.append(text);
  renderer.setViewport(
    (index % 3) * w,
    innerHeight - (Math.floor(index / 3) + 1) * h,
    w,
    h,
  );
  renderer.setScissor(
    (index % 3) * w,
    innerHeight - (Math.floor(index / 3) + 1) * h,
    w,
    h,
  );
  renderer.render(scene, camera);
});
addEventListener("pagehide", () => {
  actors.forEach((a) => a.dispose());
  renderer.dispose();
});

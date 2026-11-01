// Static pose inspection: no animation loop or saved story state.
import * as T from "three";
import { createCharacter } from "../../src/game/characters/character";
const renderer = new T.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight);
renderer.setScissorTest(true);
document.body.prepend(renderer.domElement);
const actors: ReturnType<typeof createCharacter>[] = [];
for (const [index, role] of [
  "nephi",
  "lehi",
  "mormon",
  "nephi",
  "lehi",
  "mormon",
].entries()) {
  const quality = index < 3 ? "hero" : "npc";
  const actor = createCharacter(role as "nephi" | "lehi" | "mormon", {
    quality,
  });
  actors.push(actor);
  const scene = new T.Scene();
  scene.background = new T.Color(0xd9d9d0);
  scene.add(new T.HemisphereLight(0xffffff, 0x6f7865, 2.2));
  const light = new T.DirectionalLight(0xffedce, 3);
  light.position.set(2, 5, 5);
  scene.add(light, actor.group);
  for (let i = 0; i < 120; i++)
    actor.update(1 / 60, {
      x: 0,
      y: 0,
      z: (i * 6.5) / 60,
      vx: 0,
      vy: 0,
      vz: 6.5,
      yaw: 0,
      grounded: true,
      runSpeed: 6.5,
      move: "run",
    });
  actor.group.position.set(0, 0, 0);
  const w = innerWidth / 3,
    h = innerHeight / 2,
    camera = new T.PerspectiveCamera(28, w / h, 0.03, 30);
  camera.position.set(index < 3 ? 0 : 0.65, 1.55, 3.8);
  camera.lookAt(0, 0.8, 0);
  const text = document.createElement("span");
  text.textContent = `${role} · ${quality} · camera-facing 17° lean`;
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
}
addEventListener("pagehide", () => {
  actors.forEach((a) => a.dispose());
  renderer.dispose();
});

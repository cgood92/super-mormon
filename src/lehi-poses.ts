import * as T from "three";
import { createPlayableLehi } from "./super/playable-lehi";
const renderer = new T.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.setScissorTest(true);
renderer.toneMapping = T.ACESFilmicToneMapping;
document.body.prepend(renderer.domElement);
const configs = [
  ["Standing · front", 0, "idle", 0],
  ["Standing · side", Math.PI / 2, "idle", 0],
  ["Standing · back", Math.PI, "idle", 0],
  ["Walking · front", 0, "run", 0.08],
  ["Walking · back", Math.PI, "run", 0.08],
  ["Crouching · side", Math.PI / 2, "crouch", 0.4],
] as const;
const actors = configs.map(([label, yaw, move, duration]) => {
  const scene = new T.Scene();
  scene.background = new T.Color(0xe4e0d5);
  scene.add(new T.HemisphereLight(0xffffff, 0x797b70, 2));
  const light = new T.DirectionalLight(0xfff4e2, 3);
  light.position.set(-3, 5, 5);
  scene.add(light);
  const actor = createPlayableLehi();
  scene.add(actor.group);
  for (let i = 0; i <= Math.ceil(duration * 60); i++)
    actor.update(1 / 60, {
      x: 0,
      y: 0,
      z: i * 0.06,
      vx: 0,
      vy: 0,
      vz: move === "run" ? 4 : 0,
      yaw,
      grounded: true,
      runSpeed: move === "run" ? 4 : 0,
      move,
      crouching: move === "crouch",
    });
  actor.group.position.set(0, 0, 0);
  const camera = new T.PerspectiveCamera(
    34,
    innerWidth / 3 / (innerHeight / 2),
    0.1,
    20,
  );
  camera.position.set(0, 1.1, 3.9);
  camera.lookAt(0, 0.83, 0);
  const text = document.createElement("span");
  text.textContent = label;
  document.getElementById("labels")!.append(text);
  return { scene, camera, actor };
});
function render() {
  renderer.setSize(innerWidth, innerHeight);
  const w = innerWidth / 3,
    h = innerHeight / 2;
  actors.forEach(({ scene, camera }, i) => {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setViewport(
      (i % 3) * w,
      innerHeight - (Math.floor(i / 3) + 1) * h,
      w,
      h,
    );
    renderer.setScissor(
      (i % 3) * w,
      innerHeight - (Math.floor(i / 3) + 1) * h,
      w,
      h,
    );
    renderer.render(scene, camera);
  });
}
render();
addEventListener("resize", render);
addEventListener("pagehide", () => {
  actors.forEach((a) => a.actor.dispose());
  renderer.dispose();
});

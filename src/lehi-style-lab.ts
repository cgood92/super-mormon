import * as T from "three";
import { buildLehiVariant } from "./super/lehi-style-models";
import { buildSculptedLehi } from "./super/lehi-sculpted-models";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import "./lehi-style-lab.css";

const originalStyles = [
  {
    title: "Current game",
    tag: "The reference",
    description: "Today's Lehi: angular surfaces and a simple game silhouette.",
  },
  {
    title: "Smooth familiar",
    tag: "Same shape, softer surface",
    description:
      "The familiar proportions with smooth skin, fabric, and rounded contours.",
  },
  {
    title: "Round adventurer",
    tag: "Playful & expressive",
    description:
      "A bigger head, softer features, and a compact, friendly platformer silhouette.",
  },
  {
    title: "Storybook Lehi",
    tag: "Warm & balanced",
    description:
      "A taller figure, flowing robe, and a longer beard. Gentle and illustrative.",
  },
  {
    title: "Sculpted clay",
    tag: "Soft & tactile",
    description:
      "A rounded, sculpted figure with generous shapes and a fuller, soft beard.",
  },
  {
    title: "Natural stylized",
    tag: "More adult proportions",
    description:
      "A smaller head, longer body, and subtler features while staying approachable.",
  },
];
const sculptedStyles = [
  {
    title: "Cinematic adventurer",
    tag: "Sculpted & expressive",
    description:
      "A flowing, connected silhouette with a strong face and fitted adventure clothing.",
  },
  {
    title: "Illustrated epic",
    tag: "Bold & graphic",
    description:
      "Sweeping cloth, sculpted facial planes, and a distinctive elongated beard.",
  },
  {
    title: "Soft animation",
    tag: "Appealing & polished",
    description:
      "Broad, expressive features and continuous soft forms, with a playful silhouette.",
  },
  {
    title: "Heroic guardian",
    tag: "Strong & grounded",
    description:
      "A broad chest, substantial beard, and confident proportions with sculpted clothing.",
  },
  {
    title: "Quiet wanderer",
    tag: "Graceful & flowing",
    description:
      "A leaner silhouette, wrapped cloth, and a gentler, contemplative character.",
  },
  {
    title: "Stylized film",
    tag: "Elegant & characterful",
    description:
      "Refined facial shapes, layered fabric, and a unified animated-film silhouette.",
  },
];
const originalSet =
  new URLSearchParams(location.search).get("set") === "original";
const styles = originalSet ? originalStyles : sculptedStyles;
const optionNumber = (i: number) => i + (originalSet ? 1 : 7);
const setLink = document.createElement("a");
setLink.className = "set-link";
setLink.href = originalSet
  ? "./lehi-styles.html"
  : "./lehi-styles.html?set=original";
setLink.textContent = originalSet
  ? "See the new sculpted set →"
  : "Compare with the first six →";
document.querySelector(".description")!.append(" ", setLink);
if (!originalSet)
  document.querySelector(".description")!.firstChild!.textContent =
    "Six new sculpted directions. Drag to turn, or enlarge one to inspect. ";
const get = <E extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as E;
const grid = get("grid");
const inspector = get<HTMLDialogElement>("inspector");
const renderer = new T.WebGLRenderer({
  alpha: true,
  antialias: true,
  powerPreference: "low-power",
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const environmentScene = new RoomEnvironment();
const pmrem = new T.PMREMGenerator(renderer);
const environment = pmrem.fromScene(environmentScene, 0.04);
environmentScene.dispose();
pmrem.dispose();
renderer.domElement.className = "models";
renderer.domElement.setAttribute("aria-hidden", "true");
document.body.append(renderer.domElement);
const models = styles.map((style, i) => {
  const card = document.createElement("article");
  card.className = "card";
  card.innerHTML = `<div class="card-head"><span class="number">${optionNumber(i)}</span><div><h2>${style.title}</h2><p class="tagline">${style.tag}</p></div></div><div class="viewer" tabindex="0" role="img" aria-label="Style ${optionNumber(i)}: ${style.title}. Drag or use arrow keys to rotate."><span class="rotate-hint">DRAG TO TURN · ↔</span></div><div class="card-foot"><p>${style.description}</p><div class="card-actions"><button class="choose" type="button" aria-pressed="false">Choose ${optionNumber(i)}</button><button class="inspect" type="button" aria-label="Enlarge ${style.title}">Enlarge ↗</button></div></div>`;
  grid.append(card);
  const viewer = card.querySelector<HTMLElement>(".viewer")!;
  const model = originalSet ? buildLehiVariant(i) : buildSculptedLehi(i);
  const scene = new T.Scene();
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.35;
  scene.add(model.group);
  scene.add(new T.HemisphereLight(0xfff9e9, 0x686d78, 0.7));
  const key = new T.DirectionalLight(0xffe9d0, 2.5);
  key.position.set(-3.5, 5, 5);
  scene.add(key);
  const fill = new T.DirectionalLight(0xc5dcf1, 1.4);
  fill.position.set(3, 2, -3);
  scene.add(fill);
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = shadowCanvas.height = 64;
  const ctx = shadowCanvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
  gradient.addColorStop(0, "rgba(44, 43, 28, .26)");
  gradient.addColorStop(1, "rgba(44, 43, 28, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const shadowTexture = new T.CanvasTexture(shadowCanvas);
  const shadow = new T.Mesh(
    new T.PlaneGeometry(1.7, 1.2),
    new T.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.002;
  scene.add(shadow);
  const camera = new T.PerspectiveCamera(32, 1, 0.05, 30);
  const item = {
    card,
    viewer,
    model,
    scene,
    camera,
    shadow,
    shadowTexture,
    yaw: 0,
    pitch: 0.13,
  };
  card.querySelector(".choose")!.addEventListener("click", () => {
    models.forEach((m, index) => {
      m.card.classList.toggle("selected", index === i);
      m.card
        .querySelector(".choose")!
        .setAttribute("aria-pressed", String(index === i));
    });
    get("selection").textContent =
      `Selected ${optionNumber(i)} · ${style.title}. Tell me what you like about it.`;
  });
  card.querySelector(".inspect")!.addEventListener("click", () => inspect(i));
  addRotation(viewer, () => i);
  return item;
});
let rotating = true;
let closeup = false;
let inspected: number | null = null;
let frameRequest: number | null = null;
let dirty = true;
let previous = 0;
let lastDraw = 0;
let disposed = false;

function setRotating(value: boolean) {
  rotating = value;
  get("rotation").textContent = value ? "Pause rotation" : "Resume rotation";
  get("inspect-rotation").textContent = value
    ? "Pause rotation"
    : "Resume rotation";
  invalidate();
}
function invalidate() {
  dirty = true;
  if (!disposed && !document.hidden && frameRequest === null)
    frameRequest = requestAnimationFrame(frame);
}
function inspect(index: number) {
  inspected = (index + models.length) % models.length;
  get("inspect-title").textContent =
    `${optionNumber(inspected)} · ${styles[inspected].title}`;
  if (!inspector.open) inspector.showModal();
  inspector.append(renderer.domElement);
  invalidate();
}
function closeInspector() {
  inspector.close();
}
inspector.addEventListener("close", () => {
  inspected = null;
  document.body.append(renderer.domElement);
  invalidate();
});
get("close-inspector").addEventListener("click", closeInspector);
get("previous").addEventListener("click", () => inspect((inspected ?? 0) - 1));
get("next").addEventListener("click", () => inspect((inspected ?? 0) + 1));
addRotation(get("inspect-stage"), () => inspected);
get("rotation").addEventListener("click", () => setRotating(!rotating));
get("inspect-rotation").addEventListener("click", () => setRotating(!rotating));
for (const button of document.querySelectorAll<HTMLButtonElement>(
  "[data-lab-control]",
))
  button.addEventListener("click", () =>
    get(button.dataset.labControl!).click(),
  );
for (const [id, yaw] of [
  ["front", 0],
  ["back", Math.PI],
] as const) {
  get(id).addEventListener("click", () => {
    models.forEach((m) => (m.yaw = yaw));
    setRotating(false);
  });
}
get("closeup").addEventListener("click", () => {
  closeup = !closeup;
  get("closeup").setAttribute("aria-pressed", String(closeup));
  invalidate();
});
function addRotation(target: HTMLElement, index: () => number | null) {
  let drag: { x: number; y: number; pointer: number; moved: boolean } | null =
    null;
  target.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    drag = {
      x: event.clientX,
      y: event.clientY,
      pointer: event.pointerId,
      moved: false,
    };
    target.setPointerCapture(event.pointerId);
  });
  target.addEventListener("pointermove", (event) => {
    const i = index();
    if (!drag || i === null || event.pointerId !== drag.pointer) return;
    const dx = event.clientX - drag.x,
      dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 3) return;
    drag.moved = true;
    setRotating(false);
    models[i].yaw += dx * 0.012;
    models[i].pitch = T.MathUtils.clamp(
      models[i].pitch + dy * 0.004,
      -0.05,
      0.6,
    );
    drag.x = event.clientX;
    drag.y = event.clientY;
    invalidate();
  });
  for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"])
    target.addEventListener(eventName, () => {
      drag = null;
    });
  target.addEventListener("keydown", (event) => {
    const i = index();
    if (i === null) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      models[i].yaw += event.key === "ArrowLeft" ? -0.22 : 0.22;
      setRotating(false);
    }
  });
}
function draw() {
  const width = innerWidth,
    height = innerHeight;
  const pixel = renderer.getPixelRatio();
  if (
    renderer.domElement.width !== Math.floor(width * pixel) ||
    renderer.domElement.height !== Math.floor(height * pixel)
  )
    renderer.setSize(width, height);
  renderer.setScissorTest(false);
  renderer.clear();
  renderer.setScissorTest(true);
  for (const [i, item] of models.entries()) {
    if (inspected !== null && i !== inspected) continue;
    const bounds = (
      inspected === i ? get("inspect-stage") : item.viewer
    ).getBoundingClientRect();
    if (
      bounds.bottom < 0 ||
      bounds.top > height ||
      bounds.width < 1 ||
      bounds.height < 1
    )
      continue;
    renderer.setViewport(
      bounds.left,
      height - bounds.bottom,
      bounds.width,
      bounds.height,
    );
    renderer.setScissor(
      Math.max(0, bounds.left),
      Math.max(0, height - bounds.bottom),
      Math.min(bounds.width, width - bounds.left),
      Math.min(bounds.height, height - Math.max(0, bounds.top)),
    );
    item.camera.aspect = bounds.width / bounds.height;
    const targetY = closeup ? 1.55 : 1.02;
    const distance = closeup ? 2.35 : Math.max(4.35, 2.75 / item.camera.aspect);
    item.camera.position.set(
      0,
      targetY + Math.sin(item.pitch) * distance,
      Math.cos(item.pitch) * distance,
    );
    item.camera.lookAt(0, targetY, 0);
    item.camera.updateProjectionMatrix();
    item.model.group.rotation.y = item.yaw;
    renderer.render(item.scene, item.camera);
  }
}
function frame(now: number) {
  frameRequest = null;
  if (disposed || document.hidden) return;
  const dt = previous ? Math.min((now - previous) / 1000, 0.1) : 0;
  previous = now;
  if (rotating) {
    models.forEach((m) => (m.yaw += dt * 0.38));
    dirty = true;
  }
  if (dirty && now - lastDraw >= 1000 / 30) {
    draw();
    dirty = false;
    lastDraw = now;
  }
  if (rotating || dirty) frameRequest = requestAnimationFrame(frame);
}
window.addEventListener("resize", invalidate);
window.addEventListener("scroll", invalidate, { passive: true });
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (frameRequest !== null) cancelAnimationFrame(frameRequest);
    frameRequest = null;
    previous = 0;
  } else invalidate();
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    previous = 0;
    invalidate();
  }
});
window.addEventListener("pagehide", (event) => {
  if (event.persisted) {
    if (frameRequest !== null) cancelAnimationFrame(frameRequest);
    frameRequest = null;
    previous = 0;
    return;
  }
  disposed = true;
  if (frameRequest !== null) cancelAnimationFrame(frameRequest);
  for (const item of models) {
    item.model.dispose();
    item.shadow.geometry.dispose();
    (item.shadow.material as T.Material).dispose();
    item.shadowTexture.dispose();
  }
  environment.dispose();
  renderer.dispose();
});
invalidate();

Object.assign(window, {
  lehiStyleLab: {
    snapshot: () => ({
      originalSet,
      rotating,
      inspected,
      models: models.map((m, i) => ({
        option: optionNumber(i),
        yaw: m.yaw,
        renderedYaw: m.model.group.rotation.y,
        height: new T.Box3()
          .setFromObject(m.model.group)
          .getSize(new T.Vector3()).y,
      })),
    }),
  },
});

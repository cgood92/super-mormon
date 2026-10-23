import * as T from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import {
  NEPHI_FACE_VARIANTS,
  buildNephiFaceVariant,
} from "./super/nephi-face-variants";
const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.setScissorTest(true);
document.body.append(renderer.domElement);
const pmrem = new T.PMREMGenerator(renderer),
  room = new RoomEnvironment(),
  environment = pmrem.fromScene(room);
room.dispose();
pmrem.dispose();
let rotating = false,
  selected = -1,
  inspected: number | null = null,
  request: number | null = null,
  previous = 0,
  disposed = false;
const inspector = document.getElementById("inspector") as HTMLDialogElement;
const inspectView = document.getElementById("inspect-view")!;
const cards = NEPHI_FACE_VARIANTS.map((variant, index) => {
  const article = document.createElement("article"),
    view = document.createElement("div"),
    caption = document.createElement("div"),
    heading = document.createElement("h2"),
    description = document.createElement("p"),
    actions = document.createElement("div"),
    choose = document.createElement("button"),
    enlarge = document.createElement("button");
  view.className = "view";
  caption.className = "caption";
  actions.className = "actions";
  heading.textContent = `${variant.id}. ${variant.name}`;
  description.textContent = variant.description;
  choose.textContent = `Choose ${variant.id}`;
  choose.setAttribute("aria-pressed", "false");
  enlarge.textContent = "Enlarge ↗";
  actions.append(choose, enlarge);
  caption.append(heading, description, actions);
  article.append(view, caption);
  document.getElementById("grid")!.append(article);
  const model = buildNephiFaceVariant(index),
    scene = new T.Scene();
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.35;
  scene.add(model.group, new T.HemisphereLight(0xfff6e9, 0x8b8f80, 1.0));
  const key = new T.DirectionalLight(0xfff4e2, 2.5);
  key.position.set(-3, 5, 5);
  scene.add(key);
  const rim = new T.DirectionalLight(0xdae8ff, 0.7);
  rim.position.set(3, 3, -2);
  scene.add(rim);
  const camera = new T.PerspectiveCamera(31, 1, 0.1, 20);
  camera.position.set(0, 1.72, 1.75);
  camera.lookAt(0, 1.68, 0);
  const card = { article, view, model, scene, camera, yaw: 0, choose };
  choose.onclick = () => {
    selected = index;
    cards.forEach((c, i) => {
      c.article.classList.toggle("selected", i === index);
      c.choose.setAttribute("aria-pressed", String(i === index));
    });
    document.getElementById("selection")!.textContent =
      `Selected ${variant.id}: ${variant.name}. Tell me the number, or which features you would combine.`;
  };
  enlarge.onclick = () => openInspector(index);
  bindDrag(view, () => index);
  return card;
});
function bindDrag(target: HTMLElement, getIndex: () => number) {
  let x: number | null = null;
  target.onpointerdown = (e) => {
    x = e.clientX;
    target.setPointerCapture(e.pointerId);
  };
  target.onpointermove = (e) => {
    if (x === null) return;
    setRotating(false);
    cards[getIndex()].yaw += (e.clientX - x) * 0.012;
    x = e.clientX;
    invalidate();
  };
  target.onpointerup = target.onpointercancel = () => (x = null);
}
bindDrag(inspectView, () => inspected ?? 0);
function setRotating(value: boolean) {
  rotating = value;
  const button = document.getElementById("rotate")!;
  button.setAttribute("aria-pressed", String(value));
  button.textContent = value ? "Pause rotation" : "Rotate";
  invalidate();
}
function openInspector(index: number) {
  inspected = (index + cards.length) % cards.length;
  document.getElementById("inspect-title")!.textContent =
    `${NEPHI_FACE_VARIANTS[inspected].id}. ${NEPHI_FACE_VARIANTS[inspected].name}`;
  if (!inspector.open) inspector.showModal();
  inspector.append(renderer.domElement);
  invalidate();
}
function closeInspector() {
  inspected = null;
  document.body.append(renderer.domElement);
  if (inspector.open) inspector.close();
  invalidate();
}
document.getElementById("close")!.onclick = closeInspector;
inspector.addEventListener("cancel", (e) => {
  e.preventDefault();
  closeInspector();
});
document.getElementById("previous")!.onclick = () =>
  openInspector((inspected ?? 0) - 1);
document.getElementById("next")!.onclick = () =>
  openInspector((inspected ?? 0) + 1);
document.getElementById("rotate")!.onclick = () => setRotating(!rotating);
for (const [id, yaw] of [
  ["front", 0],
  ["three-quarter", Math.PI / 4],
  ["side", Math.PI / 2],
] as const)
  document.getElementById(id)!.onclick = () => {
    setRotating(false);
    cards.forEach((c) => (c.yaw = yaw));
    invalidate();
  };
function render(now: number) {
  request = null;
  if (disposed || document.hidden) return;
  if (rotating && now - previous < 1000 / 30) {
    invalidate();
    return;
  }
  const dt = Math.min(0.05, (now - previous) / 1000);
  previous = now;
  renderer.setSize(innerWidth, innerHeight);
  renderer.setScissorTest(false);
  renderer.clear();
  renderer.setScissorTest(true);
  cards.forEach((card, index) => {
    if (inspected !== null && index !== inspected) return;
    const rect = (
      inspected === null ? card.view : inspectView
    ).getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= innerHeight) return;
    if (rotating) card.yaw += dt * 0.34;
    card.model.group.rotation.y = card.yaw;
    card.camera.aspect = rect.width / rect.height;
    card.camera.updateProjectionMatrix();
    renderer.setViewport(
      rect.left,
      innerHeight - rect.bottom,
      rect.width,
      rect.height,
    );
    renderer.setScissor(
      rect.left,
      Math.max(0, innerHeight - rect.bottom),
      rect.width,
      Math.min(innerHeight, rect.bottom) - Math.max(0, rect.top),
    );
    renderer.render(card.scene, card.camera);
  });
  if (rotating) invalidate();
}
function invalidate() {
  if (request === null && !disposed && !document.hidden)
    request = requestAnimationFrame(render);
}
for (const event of ["resize", "scroll", "pageshow"])
  addEventListener(event, invalidate, { passive: true });
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (request !== null) cancelAnimationFrame(request);
    request = null;
  } else {
    previous = performance.now();
    invalidate();
  }
});
addEventListener("pagehide", (e) => {
  if (request !== null) cancelAnimationFrame(request);
  request = null;
  if (e.persisted) return;
  disposed = true;
  cards.forEach((c) => c.model.dispose());
  environment.dispose();
  renderer.dispose();
});
Object.assign(window, {
  nephiFaces: {
    snapshot: () => ({
      selected: selected < 0 ? null : selected + 1,
      inspected: inspected === null ? null : inspected + 1,
      rotating,
      count: cards.length,
    }),
  },
});
invalidate();

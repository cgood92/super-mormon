import * as T from "three";
import {
  createCharacter,
  type CharacterRole,
  type CharacterState,
} from "../../src/game/characters/character";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
const cast: [CharacterRole, string, string][] = [
  [
    "peace-builder",
    "Community artisan",
    "Imagined adult artisan, wavy hair, short beard and belt mallet.",
  ],
  [
    "mormon",
    "Mormon",
    "Adult record keeper with broad jaw, cropped graying hair and stylus case.",
  ],
  [
    "ammaron",
    "Ammaron",
    "Elder custodian with receding silver hair, long beard and wide record case.",
  ],
  ["jared", "Jared", "Swept hair, square jaw, trimmed beard and travel rope."],
  [
    "jared-brother",
    "The brother of Jared",
    "Wavy hair, full beard and an imagined builder's tool pouch.",
  ],
  [
    "ether",
    "Ether",
    "Narrow face, receding hair, short beard and compact record case.",
  ],
  [
    "moroni-keeper",
    "Moroni, son of Mormon",
    "Record keeper with swept hair and trimmed beard; distinct from Captain Moroni.",
  ],
  ["moroni", "Captain Moroni", "Blue cloak, armor and determined expression."],
  ["teancum", "Teancum", "Lean veteran with teal clothing and cropped hair."],
  ["morianton", "Morianton", "Rust mantle and an impatient expression."],
  ["amalickiah", "Amalickiah", "Tall commander in plum and bronze."],
  ["lehonti", "Lehonti", "Ochre mantle and a trimmed beard."],
  [
    "lamanite-laman",
    "Laman of Gid",
    "The descendant of Laman who helps free the prisoners.",
  ],
  ["nephi", "Nephi", "Young, clean-shaven, and confident."],
  ["lehi", "Lehi", "The approved elder, with his long robe and coat."],
  ["sariah", "Sariah", "Mature face, linen head covering, sage clothing."],
  ["sam", "Sam", "Gentle expression and a distinct olive mantle."],
  [
    "samuel",
    "Samuel the Lamanite",
    "Calm prophet in an imagined rust mantle and ochre tunic.",
  ],
  ["laman", "Laman", "Civilian clothes, scruff, a reserved expression."],
  ["lemuel", "Lemuel", "A different face and hairline, with scruff."],
  ["laban", "Laban", "Regal robes, bronze headband, and formal bearing."],
  ["zoram", "Zoram", "The treasury keeper, in his own civilian palette."],
  ["jacob", "Jacob", "A mature teacher with a blue mantle and trimmed beard."],
  ["sherem", "Sherem", "A distinct civilian face and plum mantle."],
  ["alma", "Alma", "A teacher beside the Waters of Mormon."],
  ["ammon", "Ammon", "A strong young servant with a cord sling."],
  ["lamoni", "King Lamoni", "Regal green and gold clothing."],
  ["wife", "Family camp wife", "Adult family member in long travel clothing."],
  ["lamans-wife", "Laman’s wife", "An imagined purple festive dress."],
  ["lemuels-wife", "Lemuel’s wife", "An imagined coral festive dress."],
  [
    "convert",
    "Alma’s potential convert",
    "The civilian player in Noah’s city.",
  ],
  ["spy", "Noah’s spy", "Dark clothing and a visibly scanning gaze."],
  ["guard", "Palace servant / guard", "Helmet, armor, and clear pursuer cues."],
  [
    "child",
    "Nephi’s child",
    "A smaller, youthful character with a distinct rust-orange coat.",
  ],
  [
    "nephi-disguised",
    "Nephi in Laban’s clothes",
    "Nephi’s clean-shaven face in the official garments.",
  ],
  [
    "laban-undressed",
    "Laban after the disguise",
    "Plain linen covering after his outer clothes are taken.",
  ],
];
const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.setScissorTest(true);
document.body.append(renderer.domElement);
const room = new RoomEnvironment(),
  pmrem = new T.PMREMGenerator(renderer),
  environment = pmrem.fromScene(room);
room.dispose();
pmrem.dispose();
const state: CharacterState = {
  x: 0,
  y: 0,
  z: 0,
  yaw: 0,
  vx: 0,
  vy: 0,
  vz: 0,
  grounded: true,
  runSpeed: 0,
  move: "idle",
};
let pose = "idle",
  queued = false,
  disposed = false;
const cards = cast.map(([role, name, description]) => {
  const article = document.createElement("article"),
    view = document.createElement("div"),
    title = document.createElement("h2"),
    caption = document.createElement("p");
  view.className = "view";
  title.textContent = name;
  caption.textContent = description;
  article.append(view, title, caption);
  document.getElementById("grid")!.append(article);
  const scene = new T.Scene();
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.4;
  scene.add(new T.HemisphereLight(0xfff7e8, 0x888d7a, 1.1));
  const light = new T.DirectionalLight(0xfff6df, 2.6);
  light.position.set(-3, 5, 5);
  scene.add(light);
  const actor = createCharacter(role);
  scene.add(actor.group);
  actor.update(0, state);
  const camera = new T.PerspectiveCamera(34, 1, 0.1, 20);
  camera.position.set(0, 1, 3.5);
  camera.lookAt(0, 0.85, 0);
  const item = { view, scene, camera, actor, yaw: 0 };
  let dragX: number | null = null;
  view.onpointerdown = (e) => {
    dragX = e.clientX;
    view.setPointerCapture(e.pointerId);
  };
  view.onpointermove = (e) => {
    if (dragX === null) return;
    item.yaw += (e.clientX - dragX) * 0.012;
    dragX = e.clientX;
    requestRender();
  };
  view.onpointerup = view.onpointercancel = () => (dragX = null);
  return item;
});
function applyPose() {
  cards.forEach(({ actor }) => {
    for (let i = 0; i < 14; i++) {
      const walking = pose === "run";
      actor.update(1 / 60, {
        ...state,
        z: walking ? i * 0.06 : 0,
        vz: walking ? 4 : 0,
        runSpeed: walking ? 4 : 0,
        move: walking ? "run" : pose === "crouch" ? "crouch" : "idle",
        crouching: pose === "crouch",
        carrying: pose === "carry",
        wave: pose === "wave",
      });
    }
    actor.group.position.set(0, 0, 0);
  });
  requestRender();
}
function render() {
  queued = false;
  if (disposed || document.hidden) return;
  renderer.setSize(innerWidth, innerHeight);
  renderer.setScissorTest(false);
  renderer.clear();
  renderer.setScissorTest(true);
  for (const { view, actor, scene, camera, yaw } of cards) {
    const rect = view.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > innerHeight) continue;
    actor.group.rotation.y = yaw;
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
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
    renderer.render(scene, camera);
  }
}
function requestRender() {
  if (!queued && !disposed) {
    queued = true;
    requestAnimationFrame(render);
  }
}
(document.getElementById("pose") as HTMLSelectElement).onchange = (e) => {
  pose = (e.target as HTMLSelectElement).value;
  applyPose();
};
for (const [id, yaw] of [
  ["front", 0],
  ["side", Math.PI / 2],
  ["back", Math.PI],
] as const)
  document.getElementById(id)!.onclick = () => {
    cards.forEach((c) => (c.yaw = yaw));
    requestRender();
  };
addEventListener("resize", requestRender);
addEventListener("scroll", requestRender, { passive: true });
document.addEventListener("visibilitychange", requestRender);
addEventListener("pagehide", (e) => {
  if (e.persisted) return;
  disposed = true;
  cards.forEach((c) => c.actor.dispose());
  environment.dispose();
  renderer.dispose();
});
addEventListener("pageshow", requestRender);
requestRender();

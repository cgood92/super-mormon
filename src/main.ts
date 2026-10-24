import { StoryCinematic, type StoryShot } from "./super/cinematic";
import type { AdventureRuntime } from "./super/adventure";
import * as T from "three";
import "./style.css";
import { Input } from "./super/input";
import { createControllerSetup } from "./super/controller-setup";
import { resolveControllerProfile } from "./super/gamepad";
import { MenuNavigation } from "./super/menu";
import type { createStoryScene } from "./super/story-scenes";
import type { createTreeOfLifeScene } from "./super/tree-of-life";
import { canJumpIntoPainting } from "./super/gallery-entry";
import {
  renderControlText,
  renderControlLegend,
  type ControlDevice,
} from "./super/controls";
import { hasLineOfSight } from "./super/interactions";
import {
  createCarryObject,
  nearestCarryObject,
  pickUp,
  throwObject,
  dropObject,
  resetCarryObject,
  stepCarryObjects,
  objectInTarget,
  type CarryObject,
} from "./super/objects";
import {
  createPlayer,
  stepPlayer,
  type PlayerState,
  type Solid,
} from "./super/physics";
import { createCharacter } from "./super/character";
import { FollowCamera } from "./super/camera";
import type { WorldData, WorldId } from "./super/worlds";
import { prepareWorld } from "./super/world-loading";
import { createPerformanceDiagnostics } from "./super/performance";
import { conferenceLocation } from "./super/conference-location";
import { label } from "./super/art";
import {
  canEnter,
  isStoryId,
  nextStory,
  prerequisite,
  readCompleted,
  STORY_TITLES,
  STORY_ORDER,
  type StoryId,
} from "./super/progression";

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `<div id="viewport" data-look></div><div class="vignette"></div>
<header class="hud"><button class="gallery-home" id="home" aria-label="Return to the gallery" title="Return to gallery">⌂</button><div class="world-title"><span id="chapter-label">THE CONFERENCE CENTER</span><h1 id="world-name">The Gallery</h1></div><div class="hud-actions"><span id="seal-count" title="Stories completed">Stories 0 / 6</span><button id="pause" aria-label="Pause game">Ⅱ</button></div></header>
<div class="objective"><span class="objective-dot"></span><span id="objective">Find a painting. Take a running jump.</span></div>
<div id="collect-count" class="collect-count" hidden></div><div id="prompt" class="prompt" aria-live="polite"></div><div id="toast" class="toast" role="status"></div>
<div class="touch-controls"><div class="stick" data-stick aria-label="Movement thumbstick"><i></i><span>MOVE</span></div><div class="touch-actions"><button class="crouch" data-crouch aria-pressed="false" aria-label="Toggle crouch or crawl">Z<small>CROUCH</small></button><button class="action" data-action aria-label="Talk, search, pick up or throw">B<small>ACTION</small></button><button class="jump" data-jump aria-label="Jump">A<small>JUMP</small></button></div><button class="camera-button" data-recenter aria-label="Center camera">↻</button></div>
<div class="desktop-controls" aria-label="Controls"></div>
<aside id="practice-lesson" class="practice-lesson" hidden><span class="eyebrow">MOVEMENT STUDIO</span><h3 id="lesson-title"></h3><p id="lesson-body"></p><small id="lesson-progress"></small></aside>
<div class="orientation-hint">↻ Best played with your phone sideways</div><div id="curtain"></div>
<div id="caught-overlay" class="caught-overlay" aria-live="assertive" aria-atomic="true" hidden><div class="caught-wipe"></div><div class="caught-card"><span class="caught-symbol" aria-hidden="true">↺</span><strong id="caught-heading">Caught!</strong><span id="caught-detail">Let’s try again.</span></div></div>
<section id="title-screen" class="screen splash-screen" aria-label="Super Mormon"><div class="splash-logo">SUPER<br><em>MORMON</em><small>STEP INTO THE STORY</small></div></section>
<section id="modal" class="screen modal-screen" hidden><div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title"><span class="eyebrow" id="modal-kicker"></span><h2 id="modal-title"></h2><p id="modal-body"></p><div id="modal-hint" class="modal-hint"></div><div id="modal-buttons"></div></div></section>
<section id="load-error" class="screen modal-screen" hidden><div class="modal-card" role="alertdialog" aria-modal="true" aria-labelledby="load-error-title"><h2 id="load-error-title">The gallery could not load.</h2><p>Check your connection, then try again.</p><div><button class="primary" id="load-retry">Try again</button></div></div></section>`;
const el = <E extends HTMLElement>(id: string) =>
  document.getElementById(id) as E;
const renderer = new T.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.outputColorSpace = T.SRGBColorSpace;
el("viewport").append(renderer.domElement);
const camera = new T.PerspectiveCamera(58, 1, 0.08, 320),
  follow = new FollowCamera(camera),
  input = new Input(document);
const diagnostics = createPerformanceDiagnostics(renderer, {
  enabled:
    import.meta.env.DEV &&
    new URLSearchParams(location.search).has("performance"),
});
let scene = new T.Scene(),
  world: WorldData,
  worldId: WorldId = "hub",
  player = createPlayer(),
  avatar: ReturnType<typeof createCharacter>;
let started = false,
  paused = false,
  transition = false,
  caughtTransition = 0,
  caughtPhase: "none" | "caught" | "wipe" | "safe" = "none",
  time = 0,
  levelTime = 0,
  guardsActive = false,
  caughtGrace = 0,
  modalAction: (() => void) | null = null;
let modalSince = 0;
let cinematic: StoryCinematic | null = null;
let cinematicContinue: (() => void) | null = null;
let audio: AudioContext | undefined,
  soundOn = true,
  previous = performance.now(),
  toastUntil = 0;
const completed = readProgress();
let controllerSetup: ReturnType<typeof createControllerSetup> | null = null;
let waitForControllerRelease = false;
const offeredControllers = new Set<string>();
const menuNavigation = new MenuNavigation();
let pauseMenuOpen = false,
  splashTime = 0;
let storyScene: ReturnType<typeof createStoryScene> | null = null;
let adventure: AdventureRuntime | null = null;
let treeScene: ReturnType<typeof createTreeOfLifeScene> | null = null;
let storyCheckpoint: { x: number; y: number; z: number; yaw?: number } | null =
  null;
let storyObjective = "";
let learnedMoves = new Set<string>();
let practiceVisible = false;
let hubLocation = "";
let wavingExtras: {
  actor: ReturnType<typeof createCharacter>;
  state: PlayerState;
}[] = [];
let controlsDevice: ControlDevice | null = null;
let modalText = "",
  toastText = "",
  promptText = "",
  objectiveText = "";
function refreshControlHints() {
  const device = input.device;
  if (device === controlsDevice) return;
  controlsDevice = device;
  app.dataset.controls = device;
  renderControlLegend(
    document.querySelector<HTMLElement>(".desktop-controls")!,
    device,
  );
  renderControlText(el("modal-body"), modalText, device);
  renderControlText(el("toast"), toastText, device);
  renderControlText(el("prompt"), promptText, device);
  renderControlText(el("objective"), objectiveText, device);
  renderControlText(el("modal-hint"), "{move} Choose · {jump} Select", device);
  for (const confirm of document.querySelectorAll<HTMLElement>(".menu-confirm"))
    renderControlText(confirm, "{jump}", device);
}
type Guard = {
  state: PlayerState;
  actor: ReturnType<typeof createCharacter>;
  path: { x: number; z: number }[];
  timer: number;
};
let guards: Guard[] = [],
  extras: ReturnType<typeof createCharacter>[] = [],
  treasureMeshes = new Map<string, T.Group>(),
  collected = new Set<string>();
let goalMarker: T.Group | null = null;
let organSeated = false;
let carryObjects: CarryObject[] = [],
  carryMeshes = new Map<string, T.Group>(),
  tokenMeshes = new Map<string, T.Mesh>(),
  bonusCollected = new Set<string>(),
  deliveryDone = false;
function readProgress(): Set<StoryId> {
  try {
    return readCompleted(
      JSON.parse(localStorage.getItem("super-mormon-v1") || "[]"),
    );
  } catch {
    return new Set();
  }
}
function saveProgress() {
  try {
    localStorage.setItem("super-mormon-v1", JSON.stringify([...completed]));
  } catch {
    /* optional */
  }
}
function sound(kind: "jump" | "collect" | "caught" | "portal" | "win") {
  if (!soundOn || worldId === "tree") return;
  try {
    audio ??= new AudioContext();
    void audio.resume();
    const o = audio.createOscillator(),
      g = audio.createGain(),
      t = audio.currentTime;
    o.connect(g);
    g.connect(audio.destination);
    o.type = kind === "collect" ? "sine" : "triangle";
    o.frequency.setValueAtTime(
      { jump: 250, collect: 740, caught: 190, portal: 220, win: 520 }[kind],
      t,
    );
    o.frequency.exponentialRampToValueAtTime(
      kind === "caught" ? 90 : kind === "jump" ? 430 : 1100,
      t + 0.18,
    );
    g.gain.setValueAtTime(0.045, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    o.start(t);
    o.stop(t + 0.33);
  } catch {
    /* sound optional */
  }
}
function message(text: string, duration = 3) {
  toastText = text;
  renderControlText(el("toast"), text, input.device);
  toastUntil = time + duration;
  el("toast").classList.add("visible");
}
function modal(
  kicker: string,
  title: string,
  body: string,
  buttons: { label: string; run: () => void; secondary?: boolean }[],
) {
  el("modal").classList.remove("story-subtitles");
  paused = true;
  pauseMenuOpen = false;
  modalSince = performance.now();
  input.reset();
  el("modal-kicker").textContent = kicker;
  el("modal-title").textContent = title;
  modalText = body;
  renderControlText(el("modal-body"), body, input.device);
  const box = el("modal-buttons");
  box.replaceChildren();
  for (const [index, data] of buttons.entries()) {
    const b = document.createElement("button");
    b.className = data.secondary ? "secondary" : "primary";
    const name = document.createElement("span");
    name.textContent = data.label;
    const confirm = document.createElement("span");
    confirm.className = "menu-confirm";
    renderControlText(confirm, "{jump}", input.device);
    b.append(name, confirm);
    b.addEventListener("focus", () => {
      menuNavigation.index = index;
      updateMenuSelection();
    });
    b.onclick = () => {
      el("modal").hidden = true;
      paused = false;
      input.reset();
      data.run();
    };
    box.append(b);
  }
  menuNavigation.reset(buttons.length);
  updateMenuSelection();
  renderControlText(
    el("modal-hint"),
    "{move} Choose · {jump} Select",
    input.device,
  );
  el("modal").hidden = false;
  modalAction = buttons[0]?.run ?? null;
  setTimeout(() => {
    if (!el("modal").hidden) box.querySelector("button")?.focus();
  }, 20);
}
function storyDialog(
  kicker: string,
  title: string,
  body: string,
  next: () => void,
  shot?: StoryShot,
) {
  cinematic?.dispose();
  const actors = shot?.actors?.length
    ? shot.actors
    : [{ group: avatar.group, gesture: "talk" as const, speaker: true }];
  cinematic = new StoryCinematic(
    camera,
    {
      ...shot,
      actors: [
        {
          group: avatar.group,
          gesture:
            shot?.playerGesture ??
            actors.find((a) => a.group === avatar.group)?.gesture ??
            "talk",
          speaker:
            actors.find((a) => a.group === avatar.group)?.speaker ?? false,
        },
        ...actors.filter((a) => a.group !== avatar.group),
      ],
    },
    world.solids,
    scene,
  );
  modal(kicker, title, body, [{ label: "Continue", run: () => {} }]);
  el("modal").classList.add("story-subtitles");
  const button =
    el("modal-buttons").querySelector<HTMLButtonElement>("button")!;
  button.disabled = true;
  cinematicContinue = next;
  button.onclick = () => {
    if (!cinematic?.finish()) return;
    el("modal").hidden = true;
    input.reset();
  };
  renderControlText(el("modal-hint"), "Watch the scene", input.device);
}
function closeModalFirst() {
  const b =
    el("modal-buttons").querySelectorAll<HTMLButtonElement>("button")[
      menuNavigation.index
    ];
  b?.click();
}
function updateMenuSelection() {
  el("modal-buttons")
    .querySelectorAll("button")
    .forEach((button, index) =>
      button.classList.toggle("menu-selected", index === menuNavigation.index),
    );
}
function pause() {
  if (!started || transition) return;
  if (!el("modal").hidden) {
    if (pauseMenuOpen) {
      el("modal").hidden = true;
      paused = false;
      pauseMenuOpen = false;
      input.reset();
    }
    return;
  }
  modal(
    "TAKE YOUR TIME",
    "A little pause.",
    "Move with {move}. Use {camera} to look around. Hold {jump} to leap higher.",
    [
      { label: "Keep exploring", run: () => {} },
      {
        label: "Moves & practice",
        run: () => showMoves(),
        secondary: true,
      },
      {
        label: "Set up N64 controller",
        run: () => openControllerSetup(),
        secondary: true,
      },
      {
        label: "Restart this scene",
        run: () => load(worldId),
        secondary: true,
      },
      {
        label: "Return to the gallery",
        run: () => load("hub"),
        secondary: true,
      },
      {
        label: soundOn ? "Turn sound off" : "Turn sound on",
        run: () => {
          soundOn = !soundOn;
        },
        secondary: true,
      },
      {
        label: document.fullscreenElement ? "Leave full screen" : "Full screen",
        run: () => {
          if (document.fullscreenElement) void document.exitFullscreen();
          else void requestFullScreen();
        },
        secondary: true,
      },
    ],
  );
  pauseMenuOpen = true;
}
function openControllerSetup() {
  if (transition || controllerSetup) return;
  paused = true;
  el("modal").hidden = true;
  input.reset();
  controllerSetup = createControllerSetup(app, (profile) => {
    controllerSetup?.dispose();
    controllerSetup = null;
    if (profile) {
      input.setControllerProfile(profile);
      offeredControllers.add(profile.id);
      message(
        "N64 controls saved. {jump} jumps · {action} acts · {crouch} crouches.",
        5,
      );
    }
    paused = false;
    waitForControllerRelease = true;
    input.reset();
  });
}
function connectedController() {
  return Array.from(navigator.getGamepads?.() ?? []).find(
    (pad) => pad?.connected,
  );
}
function showMoves(page = 0) {
  const pages = [
    [
      "RUN & JUMP",
      "Try a new move.",
      "Use {crouch} to crouch. Move to crawl. Run + {crouch} + {jump} for a long jump. Stand still + {crouch} + {jump} for a backflip.",
    ],
    [
      "JUMP COMBINATIONS",
      "Keep the rhythm.",
      "Press {jump} again as you land for a double jump. Keep running and chain another for a triple jump. Reverse direction + {jump} for a side somersault. Jump against a wall, then press {jump} again to kick away.",
    ],
    [
      "CLIMB & EXPLORE",
      "Find another route.",
      "Jump toward a ledge to catch it. Move toward it or press {jump} to pull up; {crouch} drops. Jump toward a tree or pole, then use {up} / {down} to climb. Press {jump} to jump away or {crouch} to let go.",
    ],
    [
      "CARRY & DISCOVER",
      "Give it a try.",
      "{action} picks up a nearby bundle. Press again to throw; {crouch} + {action} sets it down. Find six gold tokens in the gallery garden. Carry the practice bundle to the gold ring. These challenges are optional.",
    ],
  ];
  const [kicker, title, body] = pages[page];
  // modal() normally resumes before invoking its action; this new modal pauses again.
  modal(kicker, title, body, [
    ...(page < pages.length - 1
      ? [{ label: "Next moves", run: () => showMoves(page + 1) }]
      : []),
    { label: "Try it", run: () => {}, secondary: page < pages.length - 1 },
  ]);
}
async function requestFullScreen() {
  try {
    if (!document.fullscreenElement) await app.requestFullscreen();
    await (
      window.screen.orientation as ScreenOrientation & {
        lock?: (s: string) => Promise<void>;
      }
    ).lock?.("landscape");
  } catch {
    /* Browser chrome/orientation remains under device control. */
  }
}
function marker(x: number, y: number, z: number): T.Group {
  const g = new T.Group();
  g.position.set(x, y + 0.04, z);
  const ring = new T.Mesh(
    new T.TorusGeometry(0.85, 0.055, 8, 48),
    new T.MeshBasicMaterial({
      color: "#9bd5ff",
      transparent: true,
      opacity: 0.7,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  g.add(ring);
  const beam = new T.Mesh(
    new T.ConeGeometry(0.22, 0.4, 5),
    new T.MeshStandardMaterial({
      color: "#62b7ff",
      emissive: "#245e9d",
      emissiveIntensity: 0.25,
    }),
  );
  beam.position.y = 2.6;
  beam.rotation.z = Math.PI;
  g.add(beam);
  scene.add(g);
  return g;
}
function decorateGalleryProgress() {
  for (const portal of world.portals ?? []) {
    if (!isStoryId(portal.id)) continue;
    const prior = prerequisite(portal.id, completed);
    if (!prior) continue;
    const badge = new T.Group();
    const plaque = label(
      badge,
      "LOCKED",
      portal.facing === "east" ? portal.x - 0.17 : portal.x + 0.75,
      (portal.y ?? 0.59) + 3.96,
      portal.facing === "east" ? portal.z : portal.z + 0.07,
      1.55,
      0.5,
    );
    plaque.renderOrder = 2;
    if (portal.facing === "east") plaque.rotation.y = -Math.PI / 2;
    scene.add(badge);
  }
}
function setupDiscoveries() {
  bonusCollected = new Set();
  deliveryDone = false;
  tokenMeshes.clear();
  carryMeshes.clear();
  carryObjects = (world.carryables ?? []).map((p) =>
    createCarryObject(p.id, p.x, p.y, p.z),
  );
  for (const token of world.tokens ?? []) {
    const mesh = new T.Mesh(
      new T.TorusGeometry(0.22, 0.065, 8, 16),
      new T.MeshStandardMaterial({
        color: 0xf4cf70,
        emissive: 0xc28728,
        emissiveIntensity: 0.4,
        metalness: 0.45,
        roughness: 0.35,
      }),
    );
    mesh.position.set(token.x, token.y, token.z);
    scene.add(mesh);
    tokenMeshes.set(token.id, mesh);
  }
  for (const object of carryObjects) {
    const group = new T.Group();
    const bundle = new T.Mesh(
      new T.BoxGeometry(0.5, 0.4, 0.46),
      new T.MeshStandardMaterial({
        color: 0x88734e,
        roughness: 1,
        flatShading: true,
      }),
    );
    const strap = new T.Mesh(
      new T.BoxGeometry(0.09, 0.43, 0.49),
      new T.MeshStandardMaterial({ color: 0xc3ae79, roughness: 1 }),
    );
    group.add(bundle, strap);
    group.position.set(object.x, object.y, object.z);
    scene.add(group);
    carryMeshes.set(object.id, group);
  }
}
function updateCollectionHud() {
  const parts: string[] = [];
  if (worldId === "house") parts.push(`Treasures ${collected.size} / 5`);
  if (world.tokens?.length && (worldId !== "hub" || practiceVisible))
    parts.push(`Tokens ${bonusCollected.size} / ${world.tokens.length}`);
  if (world.delivery && practiceVisible)
    parts.push(deliveryDone ? "Bundle delivered" : "Bundle to deliver");
  el("collect-count").hidden = parts.length === 0;
  el("collect-count").textContent = parts.join(" · ");
}
function updatePracticeLesson() {
  const b = world.practiceBounds;
  const inside =
    !!b &&
    player.y < 8 &&
    player.x > b.minX &&
    player.x < b.maxX &&
    player.z > b.minZ &&
    player.z < b.maxZ;
  el("practice-lesson").hidden = !inside;
  if (practiceVisible !== inside) {
    practiceVisible = inside;
    updateCollectionHud();
    updateObjective();
  }
  if (!inside) return;
  const lessons = world.tutorials ?? [];
  const lesson = [...lessons].sort(
    (a, b) =>
      Math.hypot(player.x - a.x, player.z - a.z) -
      Math.hypot(player.x - b.x, player.z - b.z),
  )[0];
  if (!lesson) return;
  const moves: Record<string, string> = {
    crawl: "Crawling",
    longJump: "Long jump",
    backflip: "Backflip",
    sideflip: "Side somersault",
    doubleJump: "Double jump",
    tripleJump: "Triple jump",
    wallKick: "Wall kick",
    ledgeHang: "Ledge grab",
    climb: "Climbing",
  };
  const held = carryObjects.some((object) => object.held);
  const move = held ? "carry" : player.move;
  if ((moves[move] || held) && !learnedMoves.has(move)) {
    learnedMoves.add(move);
    message(`${moves[move] ?? "Carrying"} · Nice work!`, 1.5);
  }
  el("lesson-title").textContent = lesson.title;
  renderControlText(el("lesson-body"), lesson.instruction, input.device);
  el("lesson-progress").textContent =
    `Tokens ${bonusCollected.size} / ${world.tokens?.length ?? 0} · ${learnedMoves.size} moves tried`;
}
function disposeScene() {
  adventure?.dispose();
  adventure = null;
  treeScene?.dispose();
  treeScene = null;
  storyScene?.dispose();
  storyScene = null;
  wavingExtras = [];
  avatar?.dispose();
  for (const e of extras) e.dispose();
  for (const g of guards) g.actor.dispose();
  extras = [];
  guards = [];
  world.dispose?.();
  scene.traverse((o) => {
    if (o instanceof T.Mesh) {
      o.geometry.dispose();
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        for (const v of Object.values(m))
          if (v instanceof T.Texture) v.dispose();
        m.dispose();
      }
    }
  });
  scene.clear();
}
let loadGeneration = 0;
async function load(id: WorldId) {
  if (isStoryId(id) && !canEnter(id, completed)) {
    id = "hub";
  }
  const generation = ++loadGeneration;
  transition = true;
  input.reset();
  el("load-error").hidden = true;
  el("curtain").classList.add("closed");
  let prepared: Awaited<ReturnType<typeof prepareWorld>>;
  try {
    prepared = await prepareWorld(id);
  } catch (error) {
    if (generation !== loadGeneration) return;
    transition = !world;
    el("curtain").classList.remove("closed");
    el("load-error").hidden = !!world;
    if (!world) {
      el("load-retry").onclick = () => void load(id);
      el("load-retry").focus();
    } else {
      message("This scene could not load. Please try again.", 6);
    }
    console.error(error);
    return;
  }
  if (generation !== loadGeneration) return;
  const { buildWorld, createStoryScene, createTreeOfLifeScene } = prepared;
  cinematic?.dispose();
  cinematic = null;
  cinematicContinue = null;
  clearCaughtTransition();
  paused = false;
  el("modal").hidden = true;
  if (world) disposeScene();
  worldId = id;
  completionSceneSeen = false;
  organSeated = false;
  storyCheckpoint = null;
  storyObjective = "";
  learnedMoves = new Set();
  practiceVisible = false;
  hubLocation = "";
  el("practice-lesson").hidden = true;
  el("app").classList.remove("chapter-faded");
  scene = new T.Scene();
  world = buildWorld(id, scene);
  storyObjective = world.initialObjective ?? "";
  if (id === "hub") decorateGalleryProgress();
  player = createPlayer(world.spawn.x, world.spawn.y, world.spawn.z);
  player.yaw = world.spawn.yaw ?? Math.PI;
  avatar = createCharacter(
    id === "streets" || id === "tree"
      ? "lehi"
      : id === "palace"
        ? "laman"
        : id === "voyage"
          ? "child"
          : "nephi",
    { quality: "hero" },
  );
  (world.actorParent ?? scene).add(avatar.group);
  avatar.update(0, player);
  follow.reset(
    player,
    player.yaw,
    id === "tree" ||
      id === "bountiful" ||
      id === "voyage" ||
      id === "promised" ||
      id === "vineyard"
      ? "streets"
      : id === "hub"
        ? "conference"
        : id,
  );
  levelTime = 0;
  guardsActive = id === "streets";
  caughtGrace = 3;
  collected = new Set();
  treasureMeshes.clear();
  setupDiscoveries();
  goalMarker = null;
  input.reset();
  for (const t of world.treasures ?? []) {
    const g = new T.Group();
    g.position.set(t.x, t.y + 0.25, t.z);
    const material = new T.MeshStandardMaterial({
      color: t.id === "silver" ? "#d9e2e1" : "#e1bc64",
      metalness: 0.6,
      roughness: 0.3,
      emissive: "#c79236",
      emissiveIntensity: 0.22,
    });
    const mesh = new T.Mesh(
      t.id.includes("cup")
        ? new T.CylinderGeometry(0.19, 0.13, 0.3, 12)
        : new T.TorusGeometry(0.18, 0.055, 8, 16),
      material,
    );
    g.add(mesh);
    const halo = new T.Mesh(
      new T.TorusGeometry(0.36, 0.022, 8, 24),
      new T.MeshBasicMaterial({
        color: "#ffeab1",
        transparent: true,
        opacity: 0.65,
      }),
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.y = -0.15;
    g.add(halo);
    scene.add(g);
    treasureMeshes.set(t.id, g);
  }
  if (id !== "hub" && id !== "tree" && !world.adventure)
    goalMarker = marker(world.goal.x, world.goal.y, world.goal.z);
  const spawnGuards =
    id === "trade" || id === "night"
      ? []
      : (world.pursuers ??
        (id === "streets"
          ? [
              { x: -4, y: 0, z: 15 },
              { x: 4, y: 0, z: 3 },
            ]
          : []));
  for (const p of spawnGuards) {
    const state = createPlayer(p.x, p.y, p.z),
      actor = createCharacter("guard");
    scene.add(actor.group);
    actor.update(0, state);
    guards.push({ state, actor, path: [], timer: 0 });
    actor.group.visible = id !== "palace";
  }
  if (id === "palace") {
    const laban = createCharacter("laban");
    const audience = world.story!.laban;
    laban.group.position.set(audience.x, audience.y, audience.z);
    laban.group.scale.setScalar(1);
    scene.add(laban.group);
    extras.push(laban);
    const end = world.escapeGoal ?? world.goal;
    for (let i = 0; i < 3; i++) {
      const brother = createCharacter(
        i === 0 ? "nephi" : i === 1 ? "lemuel" : "sam",
      );
      brother.group.position.set(end.x - 2 + i * 2, end.y, end.z + 1.2);
      const state = createPlayer(end.x - 2 + i * 2, end.y, end.z + 1.2);
      state.yaw = Math.PI;
      brother.update(0, state);
      wavingExtras.push({ actor: brother, state });
      scene.add(brother.group);
      extras.push(brother);
    }
  }
  el("world-name").textContent = world.name;
  el("chapter-label").textContent =
    id === "hub"
      ? "SALT LAKE CITY · THE CONFERENCE CENTER"
      : id === "streets"
        ? "1 NEPHI 1–2 · ABOUT 600 BC"
        : id === "tree"
          ? "1 NEPHI 8 · LEHI’S VISION"
          : id === "bountiful"
            ? "1 NEPHI 17 · BUILDING THE SHIP"
            : id === "voyage"
              ? "1 NEPHI 18 · THE OCEAN VOYAGE"
              : id === "promised"
                ? "1 NEPHI 18 · 2 NEPHI 1–5"
                : id === "vineyard"
                  ? "JACOB 5 · THE OLIVE VINEYARD"
                  : id === "night"
                    ? "1 NEPHI 4 · ABOUT 600 BC"
                    : "1 NEPHI 3 · ABOUT 600 BC";
  el("seal-count").textContent =
    `Stories ${completed.size} / ${STORY_ORDER.length}`;
  if (id === "trade" || id === "night") {
    storyObjective =
      id === "trade"
        ? "Bring the family’s treasures to Laban."
        : "Search Jerusalem for Laban.";
    storyScene = createStoryScene!(id, scene, world, {
      dialog: storyDialog,
      toast: (text) => message(text, 3),
      complete,
      checkpoint: (point) => {
        storyCheckpoint = { ...point };
      },
      setMarker: (point) => {
        if (goalMarker)
          goalMarker.position.set(point.x, point.y + 0.04, point.z);
      },
      setDisguise: (enabled) => {
        avatar.dispose();
        avatar = createCharacter(enabled ? "nephi-disguised" : "nephi", {
          quality: "hero",
        });
        scene.add(avatar.group);
        avatar.update(0, player);
      },
      caught: beginCaughtTransition,
    });
  }
  if (id === "tree") {
    storyObjective = "Find the iron rod beside the narrow path.";
    treeScene = createTreeOfLifeScene!(scene, world, {
      dialog: storyDialog,
      toast: (text) => message(text, 4),
      complete,
      checkpoint: (point) => {
        storyCheckpoint = { ...point };
      },
      setMarker: () => {},
    });
  }
  adventure =
    world.adventure?.({
      dialog: storyDialog,
      toast: (text) => message(text, 4),
      complete,
      setAvatar: (role) => {
        avatar.dispose();
        avatar = createCharacter(role, { quality: "hero" });
        (world.actorParent ?? scene).add(avatar.group);
        avatar.update(0, player);
      },
    }) ?? null;
  diagnostics.recordScene(id);
  transition = false;
  el("curtain").classList.remove("closed");
  updateCollectionHud();
  updateObjective();
  if (started)
    message(
      id === "hub"
        ? nextStory(completed)
          ? `Next story: ${STORY_TITLES[nextStory(completed)!]}. Jump into its painting.`
          : "All stories complete. Jump into any painting to replay."
        : id === "house"
          ? "Five treasures. Every room has a story."
          : id === "palace"
            ? "Find Laban at the far end of the courtyard."
            : id === "trade"
              ? "Your brothers will follow. Bring the treasures to Laban."
              : id === "promised"
                ? "Help the family settle, then follow the journey to a new home."
                : id === "vineyard"
                  ? "Explore the vineyard in Jacob’s retelling. Care for the trees."
                  : id === "night"
                    ? "Enter the city and search its moonlit streets."
                    : id === "tree"
                      ? "Take your time. Follow the path toward the tree."
                      : id === "bountiful"
                        ? "Climb the mountain trail and pray. Then help build the ship."
                        : id === "voyage"
                          ? "Explore the ship and meet the family aboard."
                          : "Find the blue door. Watch the streets.",
      4,
    );
}
function updateObjective() {
  objectiveText =
    storyObjective ||
    (practiceVisible
      ? "Movement Studio · Learn at your own pace."
      : worldId === "hub"
        ? conferenceLocation(player).name !== "Story Gallery"
          ? conferenceLocation(player).hint
          : nextStory(completed)
            ? `Next: ${STORY_TITLES[nextStory(completed)!]} · {jump} into the painting.`
            : "All stories complete · {jump} into any painting to replay."
        : worldId === "streets"
          ? "Help Lehi reach his home safely."
          : worldId === "house"
            ? collected.size === 5
              ? "Return to the courtyard entrance."
              : `Find the family’s treasures · ${collected.size} of 5`
            : guardsActive
              ? "Run through the gate. Your brothers are outside."
              : "Find Laban and ask for the brass plates.");
  renderControlText(el("objective"), objectiveText, input.device);
}
function near(
  p: { x: number; y: number; z: number },
  radius = 1.6,
  vertical = 1.8,
) {
  return (
    Math.hypot(player.x - p.x, player.z - p.z) < radius &&
    Math.abs(player.y - p.y) < vertical
  );
}
let completionSceneSeen = false;
function complete() {
  if (paused || transition || !isStoryId(worldId)) return;
  if (
    !completionSceneSeen &&
    (worldId === "streets" || worldId === "house" || worldId === "palace")
  ) {
    completionSceneSeen = true;
    // The palace reunion already has the three brothers in the world.
    const family =
      worldId === "palace"
        ? []
        : [
            createCharacter(worldId === "streets" ? "sariah" : "laman"),
            createCharacter(worldId === "streets" ? "nephi" : "sam"),
          ];
    family.forEach((actor, i) => {
      const state = createPlayer(
        player.x + (worldId === "streets" ? 0 : i ? 1.7 : -1.7),
        player.y,
        player.z + (worldId === "streets" ? (i ? 1.5 : -1.5) : 1.8),
      );
      state.yaw = Math.PI;
      actor.update(0, state);
      scene.add(actor.group);
    });
    storyDialog(
      "1 NEPHI 1–3",
      worldId === "streets"
        ? "Home, safely"
        : worldId === "house"
          ? "The family’s treasures"
          : "Together again",
      worldId === "streets"
        ? "Lehi: Gather the family. The Lord has warned us to leave Jerusalem."
        : worldId === "house"
          ? "Nephi: We will offer these treasures for the brass plates."
          : "Nephi: Do not give up. The Lord will prepare a way.",
      () => {
        family.forEach((actor) => actor.dispose());
        complete();
      },
      {
        actors: [
          {
            group: avatar.group,
            gesture: "point",
            speaker: worldId !== "palace",
          },
          ...(worldId === "palace"
            ? wavingExtras.map((entry) => entry.actor)
            : family
          ).map((actor, i) => ({
            group: actor.group,
            gesture: "talk" as const,
            speaker: worldId === "palace" && i === 0,
          })),
        ],
      },
    );
    return;
  }
  completed.add(worldId);
  saveProgress();
  el("seal-count").textContent =
    `Stories ${completed.size} / ${STORY_ORDER.length}`;
  sound("win");
  // The story scene is the ending. Completed adventures return directly to
  // the gallery; replay remains available by entering the painting again.
  warp("hub");
}

function warp(id: WorldId) {
  if (transition) return;
  transition = true;
  input.reset();
  sound("portal");
  el("curtain").classList.add("closed");
  setTimeout(() => {
    void load(id);
  }, 330);
}
function clearCaughtTransition() {
  caughtTransition = 0;
  caughtPhase = "none";
  const overlay = el("caught-overlay");
  overlay.hidden = true;
  overlay.removeAttribute("data-phase");
}
function setCaughtPhase(phase: "caught" | "wipe" | "safe") {
  caughtPhase = phase;
  const overlay = el("caught-overlay");
  overlay.dataset.phase = phase;
  if (phase === "safe") {
    el("caught-heading").textContent = "Back at a safe spot";
    el("caught-detail").textContent = "Keep going!";
    promptText = "";
    renderControlText(el("prompt"), "", input.device);
    el("prompt").classList.remove("visible");
  }
}
function beginCaughtTransition() {
  transition = true;
  caughtTransition = 0;
  input.reset();
  sound("caught");
  el("toast").classList.remove("visible");
  el("prompt").classList.remove("visible");
  el("caught-heading").textContent = "Caught!";
  el("caught-detail").textContent = "Let’s try again.";
  el("caught-overlay").hidden = false;
  setCaughtPhase("caught");
}
function resetCaughtCheckpoint() {
  const checkpoint = storyCheckpoint ?? world.spawn;
  player = createPlayer(checkpoint.x, checkpoint.y, checkpoint.z);
  player.yaw = checkpoint.yaw ?? Math.PI;
  if (worldId === "palace") {
    player.x = 0;
    player.z = -14;
    player.yaw = 0;
  }
  for (let i = 0; i < guards.length; i++) {
    const p = world.pursuers?.[i] ?? { x: i ? -4 : 4, y: 0, z: 12 };
    guards[i].state = createPlayer(p.x, p.y, p.z);
    guards[i].path = [];
    guards[i].timer = 0;
    guards[i].actor.update(0, guards[i].state);
  }
  storyScene?.respawn(player);
  avatar.update(0, player);
  treeScene?.respawn(player);
  follow.reset(
    player,
    player.yaw,
    worldId === "tree" ||
      worldId === "bountiful" ||
      worldId === "voyage" ||
      worldId === "promised" ||
      worldId === "vineyard"
      ? "streets"
      : worldId === "hub"
        ? "conference"
        : worldId,
  );
  for (const object of carryObjects) if (object.held) resetCarryObject(object);
  caughtGrace = 3.4;
}
function advanceCaughtTransition(dt: number) {
  caughtTransition += dt;
  if (caughtPhase === "caught" && caughtTransition >= 0.5)
    setCaughtPhase("wipe");
  if (caughtPhase === "wipe" && caughtTransition >= 0.76) {
    resetCaughtCheckpoint();
    setCaughtPhase("safe");
  }
  if (caughtTransition >= 1.3) {
    clearCaughtTransition();
    transition = false;
    input.reset();
  }
}
function navigate(
  start: PlayerState,
  target: PlayerState,
  solids: Solid[],
): { x: number; z: number }[] {
  const size = 1.5,
    b = world.bounds ?? { minX: -40, maxX: 40, minZ: -40, maxZ: 45 };
  const key = (x: number, z: number) => `${x},${z}`,
    sx = Math.round(start.x / size),
    sz = Math.round(start.z / size),
    tx = Math.round(target.x / size),
    tz = Math.round(target.z / size);
  const queue = [[sx, sz]],
    parent = new Map<string, string | null>([[key(sx, sz), null]]);
  let end = "";
  for (let i = 0; i < queue.length && i < 4000; i++) {
    const [x, z] = queue[i];
    if (Math.abs(x - tx) + Math.abs(z - tz) < 2) {
      end = key(x, z);
      break;
    }
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        nz = z + dz,
        k = key(nx, nz),
        wx = nx * size,
        wz = nz * size;
      if (
        parent.has(k) ||
        wx < b.minX ||
        wx > b.maxX ||
        wz < b.minZ ||
        wz > b.maxZ
      )
        continue;
      if (
        solids.some(
          (s) =>
            s.y < 1.65 &&
            s.y + s.h > 0.44 &&
            Math.abs(wx - s.x) < s.w / 2 + 0.4 &&
            Math.abs(wz - s.z) < s.d / 2 + 0.4,
        )
      )
        continue;
      parent.set(k, key(x, z));
      queue.push([nx, nz]);
    }
  }
  if (!end) return [{ x: target.x, z: target.z }];
  const path = [];
  for (let k: string | null = end; k; k = parent.get(k) ?? null) {
    const [x, z] = k.split(",").map(Number);
    path.push({ x: x * size, z: z * size });
  }
  return path.reverse().slice(1);
}
function update(dt: number) {
  refreshControlHints();
  if (controllerSetup) {
    controllerSetup.update();
    return;
  }
  if (waitForControllerRelease) {
    const pad = connectedController();
    if (pad?.buttons.some((button) => button.pressed)) return;
    waitForControllerRelease = false;
    input.reset();
  }
  if (started && !paused && !transition) {
    const pad = connectedController();
    if (
      pad &&
      typeof pad.id === "string" &&
      pad.id.length > 0 &&
      pad.mapping !== "standard" &&
      !resolveControllerProfile(pad) &&
      !offeredControllers.has(pad.id)
    ) {
      offeredControllers.add(pad.id);
      modal(
        "CONTROLLER CONNECTED",
        "Make the buttons feel familiar.",
        "Set up your N64 controller once: press the buttons shown, and we’ll remember them.",
        [
          { label: "Set up N64 controls", run: () => openControllerSetup() },
          { label: "Keep current controls", run: () => {}, secondary: true },
        ],
      );
      return;
    }
  }
  const state = input.latest(dt);
  if (!started) {
    splashTime += dt;
    if (splashTime >= 2.6 || state.jump || state.interact) startGame();
    return;
  }
  if (caughtPhase !== "none") {
    advanceCaughtTransition(dt);
    return;
  }
  if (transition) return;
  if (state.pause && performance.now() - modalSince > 450) {
    pause();
    return;
  }
  if (cinematic) {
    if (cinematic.update(dt)) {
      cinematic = null;
      const next = cinematicContinue;
      cinematicContinue = null;
      paused = false;
      input.reset();
      next?.();
      return;
    }
    if (cinematic.ready && !cinematic.restoring) {
      const button =
        el("modal-buttons").querySelector<HTMLButtonElement>("button");
      if (button) button.disabled = false;
      renderControlText(el("modal-hint"), "{jump} Continue", input.device);
      if (state.jump || state.interact) closeModalFirst();
    }
    return;
  }
  if (paused) {
    if (performance.now() - modalSince > 300) {
      const index = menuNavigation.update(state.y, dt);
      if (index !== null) {
        el("modal-buttons")
          .querySelectorAll<HTMLButtonElement>("button")
          [index]?.focus();
        updateMenuSelection();
      }
    }
    if (performance.now() - modalSince > 450 && (state.interact || state.jump))
      closeModalFirst();
    return;
  }
  time += dt;
  levelTime += dt;
  app.classList.toggle("chapter-faded", levelTime >= 10);
  caughtGrace = Math.max(0, caughtGrace - dt);
  if (
    organSeated &&
    (!world.organ?.playing() || state.interact || state.jump)
  ) {
    world.organ?.stop();
    organSeated = false;
    player.z = -91.7;
    player.y = 4.5;
    input.reset();
    state.interact = state.jump = false;
  }
  const movementLocked = organSeated || !!adventure?.movementLocked?.();
  if (movementLocked) player.vx = player.vz = 0;
  const events = stepPlayer(
    player,
    movementLocked
      ? { ...state, x: 0, y: 0, jump: false, jumpHeld: false }
      : state,
    dt,
    follow.yaw,
    world.solids,
    world.climbables,
  );
  if (organSeated && world.organ) {
    Object.assign(player, world.organ.seat, {
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: Math.PI,
    });
  }
  world.update?.(dt, player);
  if (events.jumped) sound("jump");
  const b = world.bounds;
  if (b) {
    player.x = T.MathUtils.clamp(player.x, b.minX + 0.35, b.maxX - 0.35);
    player.z = T.MathUtils.clamp(player.z, b.minZ + 0.35, b.maxZ - 0.35);
  }
  let adventureCarrying = false;
  let treePrompt = "";
  if (adventure) {
    const result = adventure.update(dt, player, state);
    treePrompt =
      result.prompt && worldId === "bountiful"
        ? `{action} · ${result.prompt}`
        : result.prompt;
    adventureCarrying = !!result.carrying;
    if (storyObjective !== result.objective) {
      storyObjective = result.objective;
      updateObjective();
    }
    if (paused || transition) return;
  }
  if (treeScene) {
    const result = treeScene.update(dt, player, {
      interact: state.interact,
      holdRod: state.interactHeld,
      crouch: state.crouch,
    });
    treePrompt = result.prompt;
    if (storyObjective !== result.objective) {
      storyObjective = result.objective;
      updateObjective();
    }
    if (paused || transition) return;
  }
  stepCarryObjects(carryObjects, player, dt, world.solids);
  const held = carryObjects.find((object) => object.held);
  if (held && state.interact) {
    if (state.crouch) dropObject(held, player);
    else if (!throwObject(held, player, world.solids))
      message("A little more room to throw.", 1.5);
    state.interact = false;
  }
  avatar.update(dt, {
    ...player,
    crouching: organSeated || player.crouching,
    carrying:
      adventureCarrying ||
      carryObjects.some((object) => object.held) ||
      !!(storyScene?.snapshot() as { treasureHeld?: boolean } | undefined)
        ?.treasureHeld ||
      (worldId === "night" &&
        !!(storyScene?.snapshot() as { plates?: boolean } | undefined)?.plates),
  });
  follow.update(
    dt,
    player,
    world.solids,
    {
      orbitX: state.cameraX,
      orbitY: state.cameraY,
      recenter: state.recenter,
      zoom: state.cameraZoom,
    },
    worldId === "tree" ||
      worldId === "bountiful" ||
      worldId === "voyage" ||
      worldId === "promised" ||
      worldId === "vineyard"
      ? "streets"
      : worldId === "hub"
        ? "conference"
        : worldId,
  );
  const adventureCamera = adventure?.camera?.();
  if (adventureCamera) {
    const blend = 1 - Math.exp(-5 * dt);
    camera.position.lerp(
      new T.Vector3(
        adventureCamera.position.x,
        adventureCamera.position.y,
        adventureCamera.position.z,
      ),
      blend,
    );
    camera.lookAt(
      adventureCamera.focus.x,
      adventureCamera.focus.y,
      adventureCamera.focus.z,
    );
  }
  if (organSeated) {
    camera.position.lerp(new T.Vector3(33, 8, -89), 1 - Math.exp(-5 * dt));
    camera.lookAt(30, 6, -94);
  }
  app.classList.toggle("camera-obstructed", follow.obstructed);
  for (const entry of wavingExtras)
    entry.actor.update(dt, {
      ...entry.state,
      wave: Math.hypot(player.x - entry.state.x, player.z - entry.state.z) < 23,
    });
  const distCam = camera.position.distanceTo(
    new T.Vector3(player.x, player.y + 1.05, player.z),
  );
  avatar.group.visible = distCam > 0.7;
  let prompt = treePrompt;
  for (const object of carryObjects) {
    const mesh = carryMeshes.get(object.id)!;
    mesh.position.set(object.x, object.y, object.z);
    mesh.rotation.y = object.held ? player.yaw : object.vx * time * 0.03;
    const bounds = world.bounds;
    if (
      bounds &&
      (object.x < bounds.minX ||
        object.x > bounds.maxX ||
        object.z < bounds.minZ ||
        object.z > bounds.maxZ)
    )
      resetCarryObject(object);
  }
  for (const token of world.tokens ?? []) {
    const mesh = tokenMeshes.get(token.id)!;
    if (bonusCollected.has(token.id)) continue;
    mesh.rotation.y += dt * 1.5;
    mesh.position.y = token.y + Math.sin(time * 2.2) * 0.07;
    if (
      Math.hypot(
        player.x - token.x,
        player.y + (player.crouching ? 0.5 : 0.8) - token.y,
        player.z - token.z,
      ) < 0.85 &&
      hasLineOfSight(
        { ...player, y: player.y - (player.crouching ? 0.8 : 0) },
        token,
        world.solids,
      )
    ) {
      bonusCollected.add(token.id);
      mesh.visible = false;
      sound("collect");
      updateCollectionHud();
      message(
        bonusCollected.size === world.tokens!.length
          ? "Every discovery token found!"
          : `Discovery token · ${bonusCollected.size} / ${world.tokens!.length}`,
        2,
      );
    }
  }
  if (
    !deliveryDone &&
    world.delivery &&
    carryObjects.some((object) => objectInTarget(object, world.delivery!))
  ) {
    deliveryDone = true;
    updateCollectionHud();
    sound("win");
    message("Bundle delivered! Pick it up again to keep practicing.", 3);
  }
  if (worldId === "hub") {
    const location = conferenceLocation(player);
    if (location.name !== hubLocation) {
      hubLocation = location.name;
      el("world-name").textContent = location.name;
      updateObjective();
    }
    if (world.organ && (organSeated || near(world.organ.point, 3, 2))) {
      prompt = organSeated
        ? "{action} Stand up · We Thank Thee, O God, for a Prophet"
        : "{action} Sit at the organ and play";
      if (state.interact && !organSeated) {
        try {
          audio ??= new AudioContext();
          world.organ.start(audio);
          organSeated = true;
          input.reset();
          message(
            "We Thank Thee, O God, for a Prophet · {action} to stand up",
            5,
          );
        } catch {
          message("Organ audio is unavailable in this browser.", 3);
        }
      }
    }
    const p = world.portals?.find((p) => near(p, 2.2, 4));
    if (p && isStoryId(p.id)) {
      const prior = prerequisite(p.id, completed);
      prompt = prior
        ? `${p.title} locked · Finish ${STORY_TITLES[prior]} first`
        : completed.has(p.id)
          ? `${p.title} · {jump} to replay`
          : `${p.title} · {jump} into the painting`;
      if (canJumpIntoPainting(player, p)) {
        if (canEnter(p.id, completed)) warp(p.id);
        else message(`Finish ${STORY_TITLES[prior!]} to unlock ${p.title}.`, 3);
        return;
      }
    }
  }
  if (worldId === "streets" && near(world.goal, world.goal.radius ?? 2)) {
    complete();
    return;
  }
  if (worldId === "house") {
    for (const t of world.treasures ?? []) {
      const mesh = treasureMeshes.get(t.id);
      if (!mesh || collected.has(t.id)) continue;
      mesh.rotation.y += dt * 0.7;
      mesh.position.y = t.y + 0.3 + Math.sin(time * 2.4 + Number(t.x)) * 0.055;
      if (near(t, 2.05, 1.7) && hasLineOfSight(player, t, world.solids)) {
        prompt = `${t.name} · {action} to gather`;
        if (state.interact || near(t, 0.65, 0.65)) {
          collected.add(t.id);
          mesh.visible = false;
          sound("collect");
          message(`${t.name} · ${collected.size} / 5`, 2);
          updateCollectionHud();
          updateObjective();
          break;
        }
      }
    }
    if (collected.size === 5 && near(world.goal, 2.1)) {
      complete();
      return;
    }
  }
  if (worldId === "palace") {
    if (
      !guardsActive &&
      near(world.goal, 3.7, 2) &&
      hasLineOfSight(player, world.story!.laban, world.solids)
    ) {
      prompt = "Laban · {action} to speak";
      if (state.interact) {
        storyDialog(
          "1 NEPHI 3:11–14",
          "Laman asks for the plates.",
          "Laman asks for his family’s records. Laban refuses and threatens him. Laman flees.",
          () => {
            guardsActive = true;
            caughtGrace = 3.8;
            for (const g of guards) {
              g.actor.group.visible = true;
              const p = world.pursuers![guards.indexOf(g)];
              g.state.x = p.x;
              g.state.y = p.y;
              g.state.z = p.z;
            }
            if (goalMarker) {
              goalMarker.position.set(
                world.escapeGoal!.x,
                world.escapeGoal!.y + 0.04,
                world.escapeGoal!.z,
              );
            }
            updateObjective();
            message("Through the gate! Keep running.", 3);
          },
          {
            actors: [
              { group: extras[0].group, gesture: "point", speaker: true },
              { group: avatar.group, gesture: "recoil" },
            ],
            focus: world.story!.laban,
          },
        );
        return;
      }
    }
    if (
      guardsActive &&
      near(world.escapeGoal ?? world.goal, 3.1) &&
      player.z > world.story!.gate.z + 1
    ) {
      complete();
      return;
    }
  }
  if (storyScene) {
    const result = storyScene.update(dt, player, { interact: state.interact });
    if (storyObjective !== result.objective) {
      storyObjective = result.objective;
      updateObjective();
    }
    if (result.prompt)
      prompt = result.prompt.startsWith("Wait")
        ? result.prompt
        : `{action} · ${result.prompt}`;
    if (paused || transition) return;
  }
  if (guardsActive && levelTime > 1.5) {
    for (const guard of guards) {
      guard.timer -= dt;
      if (guard.timer <= 0) {
        guard.path = navigate(guard.state, player, world.solids);
        guard.timer = 0.8;
      }
      let target = guard.path[0] ?? player;
      if (
        Math.hypot(guard.state.x - target.x, guard.state.z - target.z) < 0.7
      ) {
        guard.path.shift();
        target = guard.path[0] ?? player;
      }
      const dx = target.x - guard.state.x,
        dz = target.z - guard.state.z,
        d = Math.hypot(dx, dz) || 1;
      stepPlayer(
        guard.state,
        {
          x: (-dx / d) * 0.58,
          y: (dz / d) * 0.58,
          jump: false,
          jumpHeld: false,
          traversal: false,
        },
        dt,
        0,
        world.solids,
      );
      guard.actor.update(dt, guard.state);
      if (
        caughtGrace === 0 &&
        Math.hypot(player.x - guard.state.x, player.z - guard.state.z) < 0.73 &&
        Math.abs(player.y - guard.state.y) < 1.2
      ) {
        beginCaughtTransition();
        return;
      }
    }
  }
  if (goalMarker) {
    goalMarker.children[1].position.y = 2.6 + Math.sin(time * 2) * 0.12;
    goalMarker.children[0].rotation.z += dt * 0.25;
  }
  const carrying = carryObjects.find((object) => object.held);
  const loose = nearestCarryObject(player, carryObjects, world.solids);
  if (!prompt && carrying)
    prompt = "{action} throw · {crouch} + {action} set down";
  else if (!prompt && loose) {
    prompt = "Supply bundle · {action} pick up";
    if (state.interact && pickUp(loose, player, world.solids))
      message("{action} throws · {crouch} + {action} sets down", 2.5);
  }
  if (!prompt && player.move === "ledgeHang")
    prompt = "{up} or {jump} to pull up · {crouch} to drop";
  if (!prompt && player.move === "climb")
    prompt = "{up} / {down} to climb · {jump} away · {crouch} to drop";
  updatePracticeLesson();
  promptText = prompt;
  renderControlText(el("prompt"), prompt, input.device);
  el("prompt").classList.toggle("visible", !!prompt);
  if (time > toastUntil) el("toast").classList.remove("visible");
}
function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();
refreshControlHints();
load("hub");
function startGame() {
  if (started || !world) return;
  started = true;
  el("title-screen").hidden = true;
  input.reset();
  const mobileScreen = matchMedia(
    "(max-width: 800px), (pointer: coarse) and (max-height: 600px)",
  ).matches;
  if (mobileScreen)
    modal(
      "READY TO EXPLORE",
      "A bigger adventure.",
      "Play full screen and sideways for the best view.",
      [
        {
          label: "Enter Full Screen (recommended)",
          run: () => {
            void requestFullScreen();
          },
        },
        { label: "Continue", run: () => {}, secondary: true },
      ],
    );
  else if (document.fullscreenElement || navigator.userActivation?.isActive)
    void requestFullScreen();
  message(
    "Run toward a painting, then press {jump}. {pause} → Moves for practice.",
    6,
  );
}
document.addEventListener("keydown", (e) => {
  if (
    !started &&
    !controllerSetup &&
    (e.code === "Enter" || e.code === "Space")
  )
    startGame();
});
el("pause").onclick = pause;
el("home").onclick = () => {
  if (started && !transition) warp("hub");
};
let frameRequest: number | null = null;
function queueFrame() {
  if (!document.hidden && frameRequest === null)
    frameRequest = requestAnimationFrame(frame);
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    world?.organ?.stop();
    if (frameRequest !== null) cancelAnimationFrame(frameRequest);
    frameRequest = null;
    if (started && !paused) pause();
  } else {
    previous = performance.now();
    queueFrame();
  }
});
function frame(now: number) {
  frameRequest = null;
  if (document.hidden) return;
  const dt = Math.min((now - previous) / 1000, 0.04);
  previous = now;
  update(dt);
  if (!started && world)
    follow.update(
      dt,
      player,
      world.solids,
      { orbitX: 0, orbitY: 0, recenter: false },
      "conference",
    );
  renderer.render(scene, camera);
  diagnostics.sampleFrame(now);
  queueFrame();
}
queueFrame();
if (import.meta.env.DEV || new URLSearchParams(location.search).has("playtest"))
  Object.assign(window, {
    superMormon: {
      performance: () => diagnostics.snapshot(),
      snapshot: () => ({
        performance: diagnostics.snapshot(),
        world: worldId,
        player: { ...player },
        cameraYaw: follow.yaw,
        cameraObstructed: follow.obstructed,
        story: storyScene?.snapshot(),
        vision: treeScene?.snapshot(),
        cinematic: cinematic?.snapshot() ?? { active: false },
        adventure: adventure?.snapshot(),
        tutorials: world.tutorials,
        practiceBounds: world.practiceBounds,
        learnedMoves: [...learnedMoves],
        cameraPosition: {
          x: camera.position.x,
          y: camera.position.y,
          z: camera.position.z,
        },
        paused,
        transition,
        collected: [...collected],
        completed: [...completed],
        guards: guards.map((g) => ({ ...g.state })),
        goal: world.goal,
        escapeGoal: world.escapeGoal,
        treasures: world.treasures,
        portals: world.portals,
        landmarks: world.landmarks,
        climbables: world.climbables,
        tokens: world.tokens,
        bonusCollected: [...bonusCollected],
        carryObjects: carryObjects.map((object) => ({ ...object })),
        delivery: world.delivery,
        deliveryDone,
      }),
    },
  });

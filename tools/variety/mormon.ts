import * as T from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createCharacter } from "../../src/game/characters/character";
import type { CharacterState } from "../../src/game/characters/character-types";

// ============================================================================
// DATA STRUCTURES
// ============================================================================

export interface MormonVariation {
  id: string;
  number: number;
  title: string;
  tag: string;
  subtitle: string;
  description: string;
  scriptureRef: string;
  defaultCam: {
    yaw: number;
    pitch: number;
    zoom: number;
    targetY: number;
  };
  defaultMotion?: "idle" | "run" | "kneel";
  features: {
    chest: string;
    shoulders: string;
    weapon: string;
    mantle: string;
    vibe: string;
  };
}

// 6 INSPECTION VIEWS OF THE ADOPTED BATTLE VANGUARD DESIGN
export const MORMON_VARIATIONS: MormonVariation[] = [
  {
    id: "view-hero",
    number: 1,
    title: "Battle Vanguard (Hero 3/4)",
    tag: "★ ADOPTED DESIGN",
    subtitle:
      "Form-fitted leather cuirass, diagonal baldric, side broadsword & pauldron",
    description:
      "The adopted design for Mormon: an athletic, formidable commander. Features a curved dark hardened leather cuirass with bronze structural dome rivets, a prominent diagonal leather-and-bronze baldric with a golden central medallion, an arched left-shoulder battle pauldron with gold trim, and a sheathed commander broadsword on his hip.",
    scriptureRef: "Mormon 2:1-2",
    defaultCam: { yaw: 0.42, pitch: 0.12, zoom: 2.45, targetY: 1.06 },
    defaultMotion: "idle",
    features: {
      chest:
        "Curved dark leather cuirass with bronze rivets & diagonal baldric strap",
      shoulders:
        "Asymmetrical left-shoulder battle pauldron with gold trim bead",
      weapon:
        "Sheathed commander broadsword on left hip with bronze crossguard & pommel",
      mantle:
        "Royal navy wool cloak pinned at right shoulder with bronze brooch",
      vibe: "Heroic, athletic, sovereign commander of the Nephite armies",
    },
  },
  {
    id: "view-front",
    number: 2,
    title: "Front View: Cuirass & Baldric",
    tag: "ANATOMY & HARNESS",
    subtitle:
      "Direct front inspection of chest harness, waist belt, and rivets",
    description:
      "Direct front view showcasing the proportional symmetry of the armor harness: the diagonal strap crossing from the right shoulder down to the left waist, the gold medallion at the sternum, the waist belt, and the athletic broad-shouldered silhouette.",
    scriptureRef: "Mormon 2:2; 2:24",
    defaultCam: { yaw: 0.0, pitch: 0.05, zoom: 2.5, targetY: 1.05 },
    defaultMotion: "idle",
    features: {
      chest: "Cross-body baldric cleanly anchored over the fitted cuirass",
      shoulders: "Left pauldron crest visible on the leading shield side",
      weapon: "Hilt and guard clearly accessible at the left waist",
      mantle: "Deep navy coat framing the linen tunic insert",
      vibe: "Disciplined, regal, alert military stance",
    },
  },
  {
    id: "view-sword",
    number: 3,
    title: "Sword & Pauldron Profile",
    tag: "WEAPONRY & DEFENSE",
    subtitle:
      "Left side profile: sheathed broadsword, scabbard chape, and shoulder lames",
    description:
      "Side angle displaying the commander broadsword suspended at the hip. The scabbard is crafted in dark leather with polished bronze chape (tip) and locket (throat), fitted with a cruciform guard and leather-wrapped grip. The tiered pauldron arches over the deltoid above it.",
    scriptureRef: "Mormon 3:1; 4:10",
    defaultCam: { yaw: -1.35, pitch: 0.06, zoom: 2.35, targetY: 1.04 },
    defaultMotion: "idle",
    features: {
      chest: "Side flank of the hardened leather cuirass wrapping the ribs",
      shoulders:
        "Tiered curved bronze lames protecting the deltoid and upper arm",
      weapon:
        "Full length of the sheathed broadsword hanging along the outer thigh",
      mantle: "Clean side coat opening with no fabric clipping",
      vibe: "Ready for combat, veteran swordmaster",
    },
  },
  {
    id: "view-torso-close",
    number: 4,
    title: "Close-Up: Armor Details & Head",
    tag: "TEXTURE & CHISELED FACE",
    subtitle:
      "High-magnification view of dome rivets, collar rim, and chiseled jaw",
    description:
      "Zoomed-in portrait highlighting the sculpted chiseled jawline, resolute brow, and dark swept hair. Shows the subtle sheen of the oiled leather cuirass, the embedded bronze dome rivets along the seam edges, and the gold circular buckle.",
    scriptureRef: "Mormon 1:2 ('sober mind')",
    defaultCam: { yaw: 0.28, pitch: 0.08, zoom: 1.45, targetY: 1.25 },
    defaultMotion: "idle",
    features: {
      chest:
        "High-detail leather grain sheen with individual bronze dome studs",
      shoulders: "Gilded collar rim following the neckline curvature",
      weapon: "Crossguard and gold-banded wire hilt detail",
      mantle: "Embroidered navy coat lapel texture",
      vibe: "Sober-minded, thoughtful, and spiritually resolute general",
    },
  },
  {
    id: "view-cape-back",
    number: 5,
    title: "Back View: Rear Armor & Broadsword",
    tag: "ARMOR & POSTURE",
    subtitle:
      "Rear angle showing the clean fitted cuirass, rear harness, and side sheath",
    description:
      "The rear perspective shows the athletic warrior build in full effect: the form-fitted hardened leather cuirass wraps the ribs cleanly, contrasting with the armored left shoulder pauldron and the sheathed broadsword on the hip.",
    scriptureRef: "Mormon 2:8; 6:6",
    defaultCam: { yaw: 3.14, pitch: 0.08, zoom: 2.5, targetY: 1.05 },
    defaultMotion: "idle",
    features: {
      chest: "Full shoulder breadth and tapered warrior back silhouette",
      shoulders: "Layered bronze pauldron guarding the left shield shoulder",
      weapon: "Scabbard tip and pommel visible from behind the hip",
      mantle: "Clean unencumbered military silhouette",
      vibe: "Imposing presence from all camera angles",
    },
  },
  {
    id: "view-run-action",
    number: 6,
    title: "Battle Charge Motion",
    tag: "ANIMATED CHARGE",
    subtitle:
      "Live running cycle demonstrating movement, swing, and garment physics",
    description:
      "Watch the Battle Vanguard design in full motion. The athletic rig drives a powerful forward running charge: the legs drive forward cleanly, the sheathed sword stays secure at the hip, and the armor plates flex naturally with the character's movement.",
    scriptureRef: "Mormon 4:18-20 ('they did beat them')",
    defaultCam: { yaw: 0.65, pitch: 0.14, zoom: 2.65, targetY: 1.08 },
    defaultMotion: "run",
    features: {
      chest:
        "Cuirass moves rigidly with the spine through all animated strides",
      shoulders:
        "Pauldron tracks the shoulder root naturally without intersection",
      weapon:
        "Hip sword remains securely tethered to the belt during running strides",
      mantle: "Coat panels billow naturally with velocity lag",
      vibe: "Fierce, unstoppable charge of the Nephite general",
    },
  },
];

// ============================================================================
// CARD ENGINE & SCISSOR VIEWER
// ============================================================================

export interface CardInstance {
  config: MormonVariation;
  article: HTMLElement;
  viewContainer: HTMLElement;
  scene: T.Scene;
  camera: T.PerspectiveCamera;
  rig: ReturnType<typeof createCharacter>;
  yaw: number;
  pitch: number;
  zoom: number;
  targetY: number;
  isDragging: boolean;
  lastMouseX: number;
  lastMouseY: number;
  selected: boolean;
  motion: "idle" | "run" | "kneel";
}

const cards: CardInstance[] = [];
let gridRenderer: T.WebGLRenderer;
let lastCanvasWidth = 0;
let lastCanvasHeight = 0;
let queued = false;
let disposed = false;
let isPlaying = true;
let animSpeed = 1.0;
let globalMotionOverride: "auto" | "idle" | "run" | "kneel" = "auto";
let syncAllCameras = false; // Default to independent views so all 6 camera angles show immediately!

// Shared scene lighting template
function setupLighting(scene: T.Scene) {
  const hemi = new T.HemisphereLight(0xfff6e8, 0x444b58, 1.25);
  hemi.position.set(0, 5, 0);
  scene.add(hemi);

  const keyLight = new T.DirectionalLight(0xfff5e6, 2.3);
  keyLight.position.set(2.5, 4.0, 3.5);
  scene.add(keyLight);

  const fillLight = new T.DirectionalLight(0xd0e0f8, 1.15);
  fillLight.position.set(-2.5, 2.0, 2.0);
  scene.add(fillLight);

  const rimLight = new T.DirectionalLight(0xffddaa, 1.85);
  rimLight.position.set(0, 3.0, -3.5);
  scene.add(rimLight);

  // Subtle floor pedestal
  const pedestalGeo = new T.CylinderGeometry(0.55, 0.58, 0.04, 32);
  const pedestalMat = new T.MeshStandardMaterial({
    color: 0xd6cbb5,
    roughness: 0.85,
    metalness: 0.1,
  });
  const pedestal = new T.Mesh(pedestalGeo, pedestalMat);
  pedestal.position.set(0, 0.02, 0);
  scene.add(pedestal);

  const ringGeo = new T.RingGeometry(0.54, 0.58, 32);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new T.MeshBasicMaterial({ color: 0xb89548 });
  const ring = new T.Mesh(ringGeo, ringMat);
  ring.position.set(0, 0.041, 0);
  scene.add(ring);
}

// Build one variation card
function createCardElement(variation: MormonVariation): HTMLElement {
  const article = document.createElement("article");
  article.className = "variety-card";
  article.dataset.variationId = variation.id;

  article.innerHTML = `
    <div class="card-header">
      <div class="card-title-group">
        <div class="card-meta-row">
          <span class="badge badge-number">VIEW #${variation.number}</span>
          <span class="badge badge-tag">${variation.tag}</span>
        </div>
        <h2>${variation.title}</h2>
        <div class="card-subtitle">${variation.subtitle}</div>
      </div>
      <button type="button" class="btn-pick" data-pick-id="${variation.id}" title="Inspect this perspective">
        <span>★</span> Adopted
      </button>
    </div>

    <div class="view-container" id="view-${variation.id}">
      <div class="view-controls-overlay">
        <button type="button" class="btn-view-snap" data-cam="front">Front</button>
        <button type="button" class="btn-view-snap" data-cam="hero">3/4 Hero</button>
        <button type="button" class="btn-view-snap" data-cam="side">Sword</button>
        <button type="button" class="btn-view-snap" data-cam="close">Close-Up</button>
      </div>
      <div class="view-hints">
        <span>Drag to Orbit · Scroll to Zoom</span>
        <span class="scripture-badge">📖 ${variation.scriptureRef}</span>
      </div>
    </div>

    <div class="card-body">
      <p class="variation-desc">${variation.description}</p>
      
      <div class="specs-grid">
        <div class="spec-row"><strong class="spec-label">Chest Armor:</strong> <span>${variation.features.chest}</span></div>
        <div class="spec-row"><strong class="spec-label">Shoulders:</strong> <span>${variation.features.shoulders}</span></div>
        <div class="spec-row"><strong class="spec-label">Side Weapon:</strong> <span>${variation.features.weapon}</span></div>
        <div class="spec-row"><strong class="spec-label">Mantle/Coat:</strong> <span>${variation.features.mantle}</span></div>
        <div class="spec-row"><strong class="spec-label">Warrior Vibe:</strong> <span class="vibe-text">${variation.features.vibe}</span></div>
      </div>
    </div>
  `;

  return article;
}

// Scissor rendering loop
function render() {
  queued = false;
  if (disposed || document.hidden) return;

  const width = window.innerWidth;
  const height = window.innerHeight;
  if (width !== lastCanvasWidth || height !== lastCanvasHeight) {
    lastCanvasWidth = width;
    lastCanvasHeight = height;
    gridRenderer.setSize(width, height, false);
  }

  gridRenderer.setScissorTest(false);
  gridRenderer.clear();
  gridRenderer.setScissorTest(true);

  for (const card of cards) {
    const rect = card.viewContainer.getBoundingClientRect();
    if (
      rect.bottom < 0 ||
      rect.top > height ||
      rect.right < 0 ||
      rect.left > width
    ) {
      continue;
    }

    const dist = card.zoom;
    const cy = card.targetY + Math.sin(card.pitch) * dist;
    const horizDist = Math.cos(card.pitch) * dist;
    const cx = Math.sin(card.yaw) * horizDist;
    const cz = Math.cos(card.yaw) * horizDist;

    card.camera.position.set(cx, cy, cz);
    card.camera.lookAt(0, card.targetY, 0);
    card.camera.aspect = rect.width / rect.height;
    card.camera.updateProjectionMatrix();

    gridRenderer.setViewport(
      rect.left,
      height - rect.bottom,
      rect.width,
      rect.height,
    );
    gridRenderer.setScissor(
      rect.left,
      Math.max(0, height - rect.bottom),
      rect.width,
      Math.min(height, rect.bottom) - Math.max(0, rect.top),
    );

    gridRenderer.render(card.scene, card.camera);
  }
}

function requestRender() {
  if (!queued && !disposed) {
    queued = true;
    requestAnimationFrame(render);
  }
}

// Continuous Animation Tick
const clock = new T.Clock();
let simTime = 0;
function tick() {
  if (disposed) return;
  const delta = clock.getDelta();

  if (isPlaying && !document.hidden) {
    simTime += delta * animSpeed;

    for (const card of cards) {
      const activeMotion =
        globalMotionOverride === "auto" ? card.motion : globalMotionOverride;

      const isRunning = activeMotion === "run";
      const isKneeling = activeMotion === "kneel";

      const state: CharacterState = {
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: isRunning ? 4.5 * animSpeed : 0,
        yaw: 0,
        grounded: true,
        runSpeed: isRunning ? 4.5 * animSpeed : 0,
        move: (isRunning ? "run" : isKneeling ? "kneel" : "idle") as any,
        moveTime: simTime,
      };

      card.rig.update(delta * animSpeed, state);
    }
    requestRender();
  }

  requestAnimationFrame(tick);
}

// Set camera presets
function applyCameraPreset(
  card: CardInstance,
  preset: "front" | "hero" | "side" | "back" | "close",
) {
  if (preset === "front") {
    card.yaw = 0;
    card.pitch = 0.05;
    card.zoom = 2.5;
    card.targetY = 1.05;
  } else if (preset === "hero") {
    card.yaw = 0.42;
    card.pitch = 0.12;
    card.zoom = 2.45;
    card.targetY = 1.06;
  } else if (preset === "side") {
    card.yaw = -1.35;
    card.pitch = 0.06;
    card.zoom = 2.35;
    card.targetY = 1.04;
  } else if (preset === "back") {
    card.yaw = Math.PI;
    card.pitch = 0.08;
    card.zoom = 2.5;
    card.targetY = 1.05;
  } else if (preset === "close") {
    card.yaw = 0.28;
    card.pitch = 0.08;
    card.zoom = 1.45;
    card.targetY = 1.25;
  }
  requestRender();
}

// ============================================================================
// INITIALIZATION
// ============================================================================

export function initMormonPage() {
  const canvas = document.getElementById("grid-canvas") as HTMLCanvasElement;
  if (!canvas) throw new Error("Missing #grid-canvas");

  gridRenderer = new T.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  gridRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  gridRenderer.toneMapping = T.ACESFilmicToneMapping;
  gridRenderer.toneMappingExposure = 1.12;

  const pmremGenerator = new T.PMREMGenerator(gridRenderer);
  pmremGenerator.compileEquirectangularShader();
  const roomEnv = new RoomEnvironment();
  const envMap = pmremGenerator.fromScene(roomEnv, 0.04).texture;

  const gridContainer = document.getElementById("grid");
  if (!gridContainer) throw new Error("Missing #grid container");

  // Build each card with native Vanguard Mormon
  for (const variation of MORMON_VARIATIONS) {
    const article = createCardElement(variation);
    gridContainer.appendChild(article);

    const viewContainer = article.querySelector(
      ".view-container",
    ) as HTMLElement;

    // Create unique Three.js scene
    const scene = new T.Scene();
    scene.environment = envMap;
    setupLighting(scene);

    const camera = new T.PerspectiveCamera(36, 1, 0.1, 20);

    // Build the hero character rig (natively adopts Vanguard)
    const rig = createCharacter("mormon", { quality: "hero" });
    scene.add(rig.group);

    const card: CardInstance = {
      config: variation,
      article,
      viewContainer,
      scene,
      camera,
      rig,
      yaw: variation.defaultCam.yaw,
      pitch: variation.defaultCam.pitch,
      zoom: variation.defaultCam.zoom,
      targetY: variation.defaultCam.targetY,
      isDragging: false,
      lastMouseX: 0,
      lastMouseY: 0,
      selected: variation.id === "view-hero",
      motion: variation.defaultMotion || "idle",
    };

    if (card.selected) {
      article.classList.add("selected-card");
      article.querySelector(".btn-pick")?.classList.add("picked");
    }

    // Pointer events for orbit & zoom
    viewContainer.addEventListener("pointerdown", (e) => {
      card.isDragging = true;
      card.lastMouseX = e.clientX;
      card.lastMouseY = e.clientY;
      viewContainer.setPointerCapture(e.pointerId);
    });

    viewContainer.addEventListener("pointermove", (e) => {
      if (!card.isDragging) return;
      const dx = e.clientX - card.lastMouseX;
      const dy = e.clientY - card.lastMouseY;
      card.lastMouseX = e.clientX;
      card.lastMouseY = e.clientY;

      const dyaw = -dx * 0.008;
      const dpitch = dy * 0.008;

      if (syncAllCameras) {
        for (const c of cards) {
          c.yaw += dyaw;
          c.pitch = Math.max(-0.45, Math.min(0.85, c.pitch + dpitch));
        }
      } else {
        card.yaw += dyaw;
        card.pitch = Math.max(-0.45, Math.min(0.85, card.pitch + dpitch));
      }
      requestRender();
    });

    const stopDrag = (e: PointerEvent) => {
      if (card.isDragging) {
        card.isDragging = false;
        try {
          viewContainer.releasePointerCapture(e.pointerId);
        } catch {}
      }
    };
    viewContainer.addEventListener("pointerup", stopDrag);
    viewContainer.addEventListener("pointercancel", stopDrag);

    viewContainer.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const dzoom = e.deltaY * 0.0025;
        if (syncAllCameras) {
          for (const c of cards) {
            c.zoom = Math.max(1.1, Math.min(4.5, c.zoom + dzoom));
          }
        } else {
          card.zoom = Math.max(1.1, Math.min(4.5, card.zoom + dzoom));
        }
        requestRender();
      },
      { passive: false },
    );

    // Camera preset snap buttons
    article.querySelectorAll(".btn-view-snap").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const preset = (btn as HTMLElement).dataset.cam as any;
        applyCameraPreset(card, preset);
      });
    });

    // Pick button
    const pickBtn = article.querySelector(".btn-pick") as HTMLButtonElement;
    pickBtn.addEventListener("click", () => {
      for (const c of cards) {
        c.selected = c === card;
        c.article.classList.toggle("selected-card", c === card);
        c.article
          .querySelector(".btn-pick")
          ?.classList.toggle("picked", c === card);
      }
      updateSelectionBanner(variation);
    });

    cards.push(card);
  }

  // Update selection banner initially
  updateSelectionBanner(MORMON_VARIATIONS[0]);

  // Wire up Global Toolbar
  setupToolbar();

  // Resize handler
  window.addEventListener("resize", requestRender);
  window.addEventListener("scroll", requestRender, { passive: true });

  // Start tick loop
  tick();
  requestRender();
}

function updateSelectionBanner(v: MormonVariation) {
  const banner = document.getElementById("selection-banner");
  if (!banner) return;
  banner.innerHTML = `
    <div class="banner-inner">
      <div class="banner-badge">★ ADOPTED AS OFFICIAL DESIGN · BATTLE VANGUARD (VARIATION #3)</div>
      <div class="banner-text">
        <strong>${v.title}</strong> — ${v.features.chest} with ${v.features.weapon}.
      </div>
    </div>
  `;
}

function setupToolbar() {
  // Motion selector
  const motionSel = document.getElementById(
    "select-motion",
  ) as HTMLSelectElement;
  if (motionSel) {
    motionSel.addEventListener("change", () => {
      globalMotionOverride = motionSel.value as any;
      requestRender();
    });
  }

  // Play/Pause
  const playPauseBtn = document.getElementById(
    "btn-play-pause",
  ) as HTMLButtonElement;
  if (playPauseBtn) {
    playPauseBtn.addEventListener("click", () => {
      isPlaying = !isPlaying;
      playPauseBtn.textContent = isPlaying ? "⏸ Pause" : "▶ Play";
    });
  }

  // Speed
  const speedSel = document.getElementById("select-speed") as HTMLSelectElement;
  if (speedSel) {
    speedSel.addEventListener("change", () => {
      animSpeed = parseFloat(speedSel.value) || 1.0;
    });
  }

  // Global Presets
  document.querySelectorAll(".btn-global-cam").forEach((btn) => {
    btn.addEventListener("click", () => {
      const preset = (btn as HTMLElement).dataset.cam as any;
      for (const card of cards) {
        applyCameraPreset(card, preset);
      }
    });
  });

  // Sync Checkbox
  const syncCheck = document.getElementById("check-sync") as HTMLInputElement;
  if (syncCheck) {
    syncCheck.checked = syncAllCameras;
    syncCheck.addEventListener("change", () => {
      syncAllCameras = syncCheck.checked;
    });
  }

  // Contrast theme
  const contrastSel = document.getElementById(
    "select-contrast",
  ) as HTMLSelectElement;
  if (contrastSel) {
    contrastSel.addEventListener("change", () => {
      document.body.className = contrastSel.value;
    });
  }
}

// Auto-run on DOM ready
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMormonPage);
  } else {
    initMormonPage();
  }
}

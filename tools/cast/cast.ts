import * as T from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import {
  createCharacter,
  type CharacterRole,
  type CharacterState,
  type CharacterMove,
} from "../../src/game/characters/character";
import {
  CHARACTER_ROSTER,
  createCarriedProp,
  analyzeCharacterMesh,
  type CarriedPropType,
  type CharacterDiagnosticReport,
  type RosterEntry,
} from "../../src/game/characters/roster-data";

// Type definitions for card state
interface CardItem {
  entry: RosterEntry;
  article: HTMLElement;
  viewContainer: HTMLElement;
  diagPill: HTMLElement;
  scene: T.Scene;
  camera: T.PerspectiveCamera;
  actor: ReturnType<typeof createCharacter>;
  carriedPropGroup: T.Group | null;
  yaw: number;
  pitch: number;
  zoom: number;
  report: CharacterDiagnosticReport;
}

// Global UI and animation state
let activeQuality: "hero" | "npc" | "crowd" = "hero";
let activeMotion = "run";
let activeCarriedProp: CarriedPropType = "plates";
let activeRenderMode = "shaded";
let isPlaying = true;
let playbackSpeed = 1.0;
let reversalLag = false;
let syncOrbit = false;
let globalYaw = 0;
let globalPitch = 0;
let globalZoom = 3.4;
let animTime = 0;
let disposed = false;
let queued = false;

// Shared renderer for grid cards (Scissor Test)
const gridCanvas = document.getElementById("grid-canvas") as HTMLCanvasElement;
const gridRenderer = new T.WebGLRenderer({
  canvas: gridCanvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});
gridRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
gridRenderer.toneMapping = T.ACESFilmicToneMapping;
gridRenderer.toneMappingExposure = 1.05;
gridRenderer.setScissorTest(true);

// Environment lighting
const pmremGenerator = new T.PMREMGenerator(gridRenderer);
const roomEnvironment = new RoomEnvironment();
const envTexture = pmremGenerator.fromScene(roomEnvironment).texture;
roomEnvironment.dispose();
pmremGenerator.dispose();

const cards: CardItem[] = [];

// Base animation state template
const animState: CharacterState = {
  x: 0,
  y: 0,
  z: 0,
  vx: 0,
  vy: 0,
  vz: 0,
  yaw: 0,
  grounded: true,
  runSpeed: 0,
  move: "idle",
};

// Builds individual card for a character entry
function buildCard(entry: RosterEntry): CardItem {
  const article = document.createElement("article");
  article.className = "character-card";
  article.dataset.role = entry.role;
  article.dataset.faction = entry.faction;
  article.dataset.archetype = entry.archetype;
  article.dataset.name = entry.name.toLowerCase();

  // Card Header
  const header = document.createElement("div");
  header.className = "card-header";
  const titleGroup = document.createElement("div");
  titleGroup.className = "card-title-group";
  const title = document.createElement("h2");
  title.textContent = entry.name;
  const roleKey = document.createElement("div");
  roleKey.className = "card-role-key";
  roleKey.textContent = `${entry.role} · ${entry.gender}`;
  titleGroup.append(title, roleKey);

  const diagPill = document.createElement("span");
  diagPill.className = "badge badge-success";
  diagPill.textContent = "…";
  diagPill.title = "Click to inspect mesh diagnostics";
  header.append(titleGroup, diagPill);

  // 3D Viewport container
  const viewContainer = document.createElement("div");
  viewContainer.className = "view-container";

  const hints = document.createElement("div");
  hints.className = "view-hints";
  hints.innerHTML = `<span>Drag 3D · Scroll zoom</span>`;

  const overlay = document.createElement("div");
  overlay.className = "view-controls-overlay";
  const inspectBtn = document.createElement("button");
  inspectBtn.className = "view-btn";
  inspectBtn.textContent = "🔍 Inspect";
  inspectBtn.title = "Open full 3D inspector";

  const resetBtn = document.createElement("button");
  resetBtn.className = "view-btn";
  resetBtn.textContent = "↺ Reset";
  resetBtn.title = "Reset camera angle";

  overlay.append(inspectBtn, resetBtn);
  viewContainer.append(hints, overlay);

  // Card Content & Description
  const content = document.createElement("div");
  content.className = "card-content";
  const desc = document.createElement("p");
  desc.className = "card-description";
  desc.textContent = entry.description;

  const footer = document.createElement("div");
  footer.className = "card-footer";
  const tags = document.createElement("div");
  tags.className = "card-tags";
  const factionBadge = document.createElement("span");
  factionBadge.className = "badge";
  factionBadge.textContent = entry.faction;
  const archBadge = document.createElement("span");
  archBadge.className = "badge";
  archBadge.textContent = entry.archetype;
  tags.append(factionBadge, archBadge);

  footer.append(tags);
  if (entry.scriptureRef) {
    const scrip = document.createElement("div");
    scrip.className = "card-scripture";
    scrip.textContent = `📖 ${entry.scriptureRef}`;
    content.append(desc, scrip, footer);
  } else {
    content.append(desc, footer);
  }

  article.append(header, viewContainer, content);
  document.getElementById("grid")!.append(article);

  // Three.js Scene Setup for Card
  const scene = new T.Scene();
  scene.environment = envTexture;
  scene.environmentIntensity = 0.45;

  const hemiLight = new T.HemisphereLight(0xfff8ea, 0x768072, 1.25);
  const dirLight = new T.DirectionalLight(0xfff2dc, 2.7);
  dirLight.position.set(-2.5, 4.5, 4.5);
  scene.add(hemiLight, dirLight);

  const actor = createCharacter(entry.role, { quality: activeQuality });
  scene.add(actor.group);
  actor.update(0, animState);

  // Attach default carried prop if needed
  let carriedPropGroup: T.Group | null = null;
  if (activeMotion === "carry") {
    carriedPropGroup = createCarriedProp(activeCarriedProp);
    if (carriedPropGroup) {
      if (activeCarriedProp === "banner") {
        actor.sockets.rightHand.add(carriedPropGroup);
      } else {
        carriedPropGroup.position.set(0, 0.88, 0.38);
        actor.group.add(carriedPropGroup);
      }
    }
  }

  // Camera
  const camera = new T.PerspectiveCamera(34, 1, 0.1, 20);
  camera.position.set(0, 0.9, 3.4);
  camera.lookAt(0, 0.8, 0);

  // Initial diagnostics report
  const report = analyzeCharacterMesh(actor);
  updateDiagBadge(diagPill, report);

  const cardItem: CardItem = {
    entry,
    article,
    viewContainer,
    diagPill,
    scene,
    camera,
    actor,
    carriedPropGroup,
    yaw: 0,
    pitch: 0,
    zoom: 3.4,
    report,
  };

  // Interactive Orbit Event Handlers
  let dragStart: {
    x: number;
    y: number;
    startYaw: number;
    startPitch: number;
  } | null = null;
  viewContainer.onpointerdown = (e) => {
    dragStart = {
      x: e.clientX,
      y: e.clientY,
      startYaw: cardItem.yaw,
      startPitch: cardItem.pitch,
    };
    viewContainer.setPointerCapture(e.pointerId);
  };

  viewContainer.onpointermove = (e) => {
    if (!dragStart) return;
    const deltaX = (e.clientX - dragStart.x) * 0.012;
    const deltaY = (e.clientY - dragStart.y) * 0.008;

    if (syncOrbit) {
      globalYaw = dragStart.startYaw + deltaX;
      globalPitch = Math.max(
        -0.75,
        Math.min(0.75, dragStart.startPitch - deltaY),
      );
      cards.forEach((c) => {
        c.yaw = globalYaw;
        c.pitch = globalPitch;
      });
    } else {
      cardItem.yaw = dragStart.startYaw + deltaX;
      cardItem.pitch = Math.max(
        -0.75,
        Math.min(0.75, dragStart.startPitch - deltaY),
      );
    }
    requestRender();
  };

  viewContainer.onpointerup = viewContainer.onpointercancel = () => {
    dragStart = null;
  };

  viewContainer.onwheel = (e) => {
    e.preventDefault();
    const zoomDelta = e.deltaY * 0.003;
    if (syncOrbit) {
      globalZoom = Math.max(1.8, Math.min(5.5, globalZoom + zoomDelta));
      cards.forEach((c) => (c.zoom = globalZoom));
    } else {
      cardItem.zoom = Math.max(1.8, Math.min(5.5, cardItem.zoom + zoomDelta));
    }
    requestRender();
  };

  resetBtn.onclick = (e) => {
    e.stopPropagation();
    cardItem.yaw = 0;
    cardItem.pitch = 0;
    cardItem.zoom = 3.4;
    requestRender();
  };

  inspectBtn.onclick = (e) => {
    e.stopPropagation();
    openInspector(cardItem);
  };

  diagPill.onclick = (e) => {
    e.stopPropagation();
    openInspector(cardItem);
  };

  return cardItem;
}

function updateDiagBadge(
  badge: HTMLElement,
  report: CharacterDiagnosticReport,
) {
  if (
    report.warnings.length === 0 &&
    report.shoesClosed &&
    report.normalsValid
  ) {
    badge.className = "badge badge-success";
    badge.textContent = `✓ ${report.totalTriangles} tris`;
    badge.title = `${report.totalVertices} verts, ${report.totalTriangles} triangles, closed shoes, valid normals.`;
  } else {
    badge.className = "badge badge-warning";
    badge.textContent = `⚠ ${report.warnings.length || 1} note`;
    badge.title =
      report.warnings.join("\n") || "Potential mesh anomaly detected.";
  }
}

// Applies display modes (wireframe, silhouette, xray, shaded)
function applyRenderModeToActor(group: T.Group, mode: string) {
  group.traverse((obj) => {
    if (!(obj instanceof T.Mesh)) return;
    const mat = obj.material as T.MeshStandardMaterial;
    if (!mat) return;

    if (!obj.userData.origWireframe) {
      obj.userData.origWireframe = mat.wireframe;
      obj.userData.origOpacity = mat.opacity;
      obj.userData.origTransparent = mat.transparent;
    }

    if (mode === "wireframe" || mode === "shaded-wire") {
      mat.wireframe = true;
    } else {
      mat.wireframe = false;
    }

    const isCoat =
      obj.name.includes("mantle") ||
      obj.name.includes("coat") ||
      obj.name.includes("shawl");

    if (mode === "xray" && isCoat) {
      mat.transparent = true;
      mat.opacity = 0.32;
    } else {
      mat.transparent = obj.userData.origTransparent ?? false;
      mat.opacity = obj.userData.origOpacity ?? 1.0;
    }
  });
}

// Re-creates actors when Quality changes
function rebuildAllActors(quality: "hero" | "npc" | "crowd") {
  activeQuality = quality;
  cards.forEach((card) => {
    card.scene.remove(card.actor.group);
    card.actor.dispose();
    card.actor = createCharacter(card.entry.role, { quality: activeQuality });
    card.scene.add(card.actor.group);

    // Reattach carried prop if needed
    if (card.carriedPropGroup) {
      card.carriedPropGroup.removeFromParent();
      card.carriedPropGroup = null;
    }
    if (activeMotion === "carry") {
      card.carriedPropGroup = createCarriedProp(activeCarriedProp);
      if (card.carriedPropGroup) {
        if (activeCarriedProp === "banner") {
          card.actor.sockets.rightHand.add(card.carriedPropGroup);
        } else {
          card.carriedPropGroup.position.set(0, 0.88, 0.38);
          card.actor.group.add(card.carriedPropGroup);
        }
      }
    }

    card.report = analyzeCharacterMesh(card.actor);
    updateDiagBadge(card.diagPill, card.report);
    applyRenderModeToActor(card.actor.group, activeRenderMode);
  });
  requestRender();
}

// Updates animation and poses on all actors
function updateActorsAnimation(dt: number) {
  const motion = activeMotion;
  const speed = 4.8;

  // Reversal simulation computation
  let runYaw = 0;
  if (reversalLag && motion === "run") {
    runYaw = Math.sin(animTime * 0.9) > 0 ? 0 : Math.PI;
  }

  // Pre-calculate kinematics for active motion
  let posX = 0;
  let posZ = 0;
  let posY = 0;
  let velZ = 0;
  let velY = 0;
  let isGrounded = true;
  let currentMove: CharacterMove = "idle";
  let jumpStage = 1;

  if (motion === "run") {
    currentMove = "run";
    posZ = (animTime * speed) % 20;
    velZ = speed;
    isGrounded = true;
  } else if (motion === "kneel") {
    currentMove = "kneel";
    isGrounded = true;
  } else if (motion === "jump") {
    // 1.2s smooth jump loop with squash takeoff & land
    const period = 1.2;
    const progress = (animTime % period) / period;
    if (progress < 0.12) {
      currentMove = "crouch";
      posY = 0;
      isGrounded = true;
    } else if (progress > 0.88) {
      currentMove = "poundLand";
      posY = 0;
      isGrounded = true;
    } else {
      const airProgress = (progress - 0.12) / 0.76;
      posY = Math.sin(airProgress * Math.PI) * 1.35;
      velY = Math.cos(airProgress * Math.PI) * 4.2;
      isGrounded = false;
      currentMove = "jump";
      jumpStage = 1;
    }
  } else if (motion === "crawl") {
    currentMove = "crawl";
    posZ = (animTime * 1.6) % 15;
    velZ = 1.6;
    isGrounded = true;
  } else if (motion === "groundPound") {
    currentMove = "groundPound";
  } else {
    currentMove = "idle";
  }

  const isCarrying = motion === "carry";
  const isWaving = motion === "wave";
  const isPointing = motion === "point";
  const isDancing = motion === "dance";
  const holdingBanner = isCarrying && activeCarriedProp === "banner";

  cards.forEach(({ actor, carriedPropGroup, article }) => {
    // Skip updating hidden cards to save CPU
    if (article.style.display === "none") return;

    actor.update(dt, {
      ...animState,
      x: posX,
      y: posY,
      z: posZ,
      vx: 0,
      vy: velY,
      vz: velZ,
      yaw: runYaw,
      grounded: isGrounded,
      runSpeed: velZ,
      move: currentMove,
      jumpStage,
      crouching: currentMove === "crouch" || currentMove === "crawl",
      carrying: isCarrying,
      holdingBanner,
      wave: isWaving,
      pointing: isPointing,
      dancing: isDancing,
      danceTime: animTime,
      moveTime: animTime,
    });

    // Keep character centered in card viewport
    actor.group.position.set(0, posY, 0);

    // Update carried prop visibility
    if (carriedPropGroup) {
      carriedPropGroup.visible = isCarrying;
    }
  });
}

// Scissor rendering loop
let lastCanvasWidth = 0;
let lastCanvasHeight = 0;

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
    if (card.article.style.display === "none") continue;
    const rect = card.viewContainer.getBoundingClientRect();
    if (
      rect.bottom < 0 ||
      rect.top > height ||
      rect.right < 0 ||
      rect.left > width
    )
      continue;

    // Calculate orbital camera position around character target (0, 0.8, 0)
    const dist = card.zoom;
    const cy = 0.85 + Math.sin(card.pitch) * dist;
    const horizDist = Math.cos(card.pitch) * dist;
    const cx = Math.sin(card.yaw) * horizDist;
    const cz = Math.cos(card.yaw) * horizDist;

    card.camera.position.set(cx, cy, cz);
    card.camera.lookAt(0, 0.8, 0);
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

// Animation Clock & Tick Loop
const clock = new T.Clock();
function tick() {
  if (disposed) return;
  const delta = clock.getDelta();
  if (isPlaying && !document.hidden) {
    const dt = Math.min(0.1, delta) * playbackSpeed;
    animTime += dt;
    updateActorsAnimation(dt);
    render();
  }
  requestAnimationFrame(tick);
}

// Filters execution
function applyFilters() {
  const searchInput = (
    document.getElementById("search-input") as HTMLInputElement
  ).value
    .toLowerCase()
    .trim();
  const factionVal = (
    document.getElementById("faction-filter") as HTMLSelectElement
  ).value;
  const archetypeVal = (
    document.getElementById("archetype-filter") as HTMLSelectElement
  ).value;

  let visibleCount = 0;
  cards.forEach(({ entry, article }) => {
    const matchesSearch =
      !searchInput ||
      entry.name.toLowerCase().includes(searchInput) ||
      entry.role.toLowerCase().includes(searchInput) ||
      entry.description.toLowerCase().includes(searchInput);

    const matchesFaction = factionVal === "all" || entry.faction === factionVal;
    const matchesArchetype =
      archetypeVal === "all" || entry.archetype === archetypeVal;

    if (matchesSearch && matchesFaction && matchesArchetype) {
      article.style.display = "flex";
      visibleCount++;
    } else {
      article.style.display = "none";
    }
  });

  const counter = document.getElementById("counter-display")!;
  counter.textContent = `Showing ${visibleCount} of ${cards.length} characters`;
  requestRender();
}

// ==========================================
// DETAILED SINGLE-CHARACTER INSPECTOR MODAL
// ==========================================
const inspectorModal = document.getElementById("inspector-modal")!;
const modalViewport = document.getElementById("inspector-viewport")!;
let inspectorCard: CardItem | null = null;
let inspectorActor: ReturnType<typeof createCharacter> | null = null;
let inspectorPropGroup: T.Group | null = null;
let inspectorRenderer: T.WebGLRenderer | null = null;
let inspectorScene: T.Scene | null = null;
let inspectorCamera: T.PerspectiveCamera | null = null;
let inspectorYaw = 0;
let inspectorPitch = 0.05;
let inspectorZoom = 3.2;
let inspectorTargetY = 0.8;
let inspectorLight: T.DirectionalLight | null = null;

function initInspector() {
  inspectorRenderer = new T.WebGLRenderer({ antialias: true, alpha: true });
  inspectorRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  inspectorRenderer.toneMapping = T.ACESFilmicToneMapping;
  inspectorRenderer.domElement.className = "inspector-canvas";
  modalViewport.append(inspectorRenderer.domElement);

  inspectorScene = new T.Scene();
  inspectorScene.environment = envTexture;
  inspectorScene.environmentIntensity = 0.45;

  const hemi = new T.HemisphereLight(0xfff8ea, 0x768072, 1.3);
  inspectorLight = new T.DirectionalLight(0xfff2dc, 2.6);
  inspectorLight.position.set(-2.5, 4.5, 4.5);
  inspectorScene.add(hemi, inspectorLight);

  inspectorCamera = new T.PerspectiveCamera(34, 1, 0.05, 25);

  let isDragging = false;
  let isPanning = false;
  let lastX = 0;
  let lastY = 0;

  modalViewport.onpointerdown = (e) => {
    isDragging = e.button === 0;
    isPanning = e.button === 2;
    lastX = e.clientX;
    lastY = e.clientY;
    modalViewport.setPointerCapture(e.pointerId);
  };

  modalViewport.onpointermove = (e) => {
    if (!isDragging && !isPanning) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    if (isDragging) {
      inspectorYaw += dx * 0.01;
      inspectorPitch = Math.max(
        -1.1,
        Math.min(1.1, inspectorPitch - dy * 0.008),
      );
    } else if (isPanning) {
      inspectorTargetY += dy * 0.003;
    }
    renderInspector();
  };

  modalViewport.onpointerup = modalViewport.onpointercancel = () => {
    isDragging = false;
    isPanning = false;
  };

  modalViewport.oncontextmenu = (e) => e.preventDefault();

  modalViewport.onwheel = (e) => {
    e.preventDefault();
    inspectorZoom = Math.max(
      1.1,
      Math.min(6.5, inspectorZoom + e.deltaY * 0.003),
    );
    renderInspector();
  };

  // Preset Angle Buttons
  document.getElementById("modal-cam-front")!.onclick = () => {
    inspectorYaw = 0;
    inspectorPitch = 0;
    inspectorTargetY = 0.8;
    inspectorZoom = 3.2;
    renderInspector();
  };
  document.getElementById("modal-cam-quarter")!.onclick = () => {
    inspectorYaw = Math.PI / 4;
    inspectorPitch = 0.05;
    inspectorTargetY = 0.8;
    inspectorZoom = 3.2;
    renderInspector();
  };
  document.getElementById("modal-cam-side")!.onclick = () => {
    inspectorYaw = Math.PI / 2;
    inspectorPitch = 0;
    inspectorTargetY = 0.8;
    inspectorZoom = 3.2;
    renderInspector();
  };
  document.getElementById("modal-cam-back")!.onclick = () => {
    inspectorYaw = Math.PI;
    inspectorPitch = 0;
    inspectorTargetY = 0.8;
    inspectorZoom = 3.2;
    renderInspector();
  };
  document.getElementById("modal-cam-face")!.onclick = () => {
    inspectorYaw = 0.15;
    inspectorPitch = 0.05;
    inspectorTargetY = 1.25;
    inspectorZoom = 1.4;
    renderInspector();
  };
  document.getElementById("modal-cam-feet")!.onclick = () => {
    inspectorYaw = 0.25;
    inspectorPitch = -0.3;
    inspectorTargetY = 0.25;
    inspectorZoom = 1.6;
    renderInspector();
  };
  document.getElementById("modal-cam-reset")!.onclick = () => {
    inspectorYaw = 0;
    inspectorPitch = 0.05;
    inspectorTargetY = 0.8;
    inspectorZoom = 3.2;
    renderInspector();
  };

  // Layer Checkboxes
  const hookLayerToggle = (
    id: string,
    nameFilter: (name: string) => boolean,
  ) => {
    const input = document.getElementById(id) as HTMLInputElement;
    input.onchange = () => {
      if (!inspectorActor) return;
      inspectorActor.group.traverse((obj) => {
        if (obj instanceof T.Mesh && nameFilter(obj.name.toLowerCase())) {
          obj.visible = input.checked;
        }
      });
      renderInspector();
    };
  };

  hookLayerToggle(
    "layer-coat",
    (n) => n.includes("mantle") || n.includes("coat") || n.includes("shawl"),
  );
  hookLayerToggle(
    "layer-tunic",
    (n) => n.includes("tunic") || n.includes("robe"),
  );
  hookLayerToggle(
    "layer-shirt",
    (n) => n.includes("shirt") || n.includes("sleeve"),
  );
  hookLayerToggle(
    "layer-trousers",
    (n) => n.includes("trouser") || n.includes("leg"),
  );
  hookLayerToggle(
    "layer-sandals",
    (n) => n.includes("sandal") || n.includes("boot") || n.includes("shoe"),
  );
  hookLayerToggle(
    "layer-head",
    (n) =>
      n.includes("head") ||
      n.includes("hair") ||
      n.includes("beard") ||
      n.includes("cap") ||
      n.includes("helm"),
  );
  (document.getElementById("layer-prop") as HTMLInputElement).onchange = (
    e,
  ) => {
    if (inspectorPropGroup) {
      inspectorPropGroup.visible = (e.target as HTMLInputElement).checked;
      renderInspector();
    }
  };

  // Lighting sliders
  const lightRot = document.getElementById(
    "modal-light-rot",
  ) as HTMLInputElement;
  const lightInt = document.getElementById(
    "modal-light-int",
  ) as HTMLInputElement;
  lightRot.oninput = () => {
    const angle = parseFloat(lightRot.value);
    inspectorLight?.position.set(Math.sin(angle) * 5, 4.5, Math.cos(angle) * 5);
    renderInspector();
  };
  lightInt.oninput = () => {
    if (inspectorLight) inspectorLight.intensity = parseFloat(lightInt.value);
    renderInspector();
  };

  // Scrubber controls
  const scrubber = document.getElementById(
    "modal-scrubber",
  ) as HTMLInputElement;
  scrubber.oninput = () => {
    const timeNorm = parseFloat(scrubber.value);
    document.getElementById("modal-time-label")!.textContent =
      `${timeNorm.toFixed(2)}s`;
    if (inspectorActor) {
      inspectorActor.update(1 / 60, {
        ...animState,
        move: activeMotion as CharacterMove,
        z: timeNorm * 4,
        runSpeed: 4,
        moveTime: timeNorm,
        crouching: activeMotion === "crouch" || activeMotion === "crawl",
        carrying: activeMotion === "carry",
      });
      renderInspector();
    }
  };

  // Modal Close
  const closeModal = () => {
    inspectorModal.classList.remove("open");
    if (inspectorActor) {
      inspectorScene?.remove(inspectorActor.group);
      inspectorActor.dispose();
      inspectorActor = null;
    }
    if (inspectorPropGroup) {
      inspectorPropGroup.removeFromParent();
      inspectorPropGroup = null;
    }
  };

  document.getElementById("modal-close-btn")!.onclick = closeModal;
  inspectorModal.onclick = (e) => {
    if (e.target === inspectorModal) closeModal();
  };
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && inspectorModal.classList.contains("open")) {
      closeModal();
    }
  });
}

function openInspector(card: CardItem) {
  inspectorCard = card;
  inspectorModal.classList.add("open");

  document.getElementById("modal-char-name")!.textContent = card.entry.name;
  document.getElementById("modal-char-role")!.textContent =
    `${card.entry.role} · ${card.entry.faction}`;
  document.getElementById("modal-char-desc")!.textContent =
    card.entry.description;
  document.getElementById("modal-char-scripture")!.textContent = card.entry
    .scriptureRef
    ? `📖 ${card.entry.scriptureRef}`
    : "";

  // Reset layer checkboxes
  (document.getElementById("layer-coat") as HTMLInputElement).checked = true;
  (document.getElementById("layer-tunic") as HTMLInputElement).checked = true;
  (document.getElementById("layer-shirt") as HTMLInputElement).checked = true;
  (document.getElementById("layer-trousers") as HTMLInputElement).checked =
    true;
  (document.getElementById("layer-sandals") as HTMLInputElement).checked = true;
  (document.getElementById("layer-head") as HTMLInputElement).checked = true;
  (document.getElementById("layer-prop") as HTMLInputElement).checked = true;

  if (inspectorActor) {
    inspectorScene?.remove(inspectorActor.group);
    inspectorActor.dispose();
  }
  if (inspectorPropGroup) {
    inspectorPropGroup.removeFromParent();
    inspectorPropGroup = null;
  }

  // Create isolated actor for inspector
  inspectorActor = createCharacter(card.entry.role, { quality: activeQuality });
  inspectorScene!.add(inspectorActor.group);
  inspectorActor.update(0, animState);

  // Attached prop
  if (activeMotion === "carry") {
    inspectorPropGroup = createCarriedProp(activeCarriedProp);
    if (inspectorPropGroup) {
      if (activeCarriedProp === "banner") {
        inspectorActor.sockets.rightHand.add(inspectorPropGroup);
      } else {
        inspectorPropGroup.position.set(0, 0.88, 0.38);
        inspectorActor.group.add(inspectorPropGroup);
      }
    }
  }

  // Populate diagnostic stats
  const rep = card.report;
  document.getElementById("modal-stat-verts")!.textContent =
    rep.totalVertices.toLocaleString();
  document.getElementById("modal-stat-tris")!.textContent =
    rep.totalTriangles.toLocaleString();
  document.getElementById("modal-stat-meshes")!.textContent =
    rep.meshCount.toString();
  document.getElementById("modal-stat-height")!.textContent =
    `${rep.boundingBox.height}m`;

  const diagBox = document.getElementById("modal-diag-box")!;
  const diagTitle = document.getElementById("modal-diag-title")!;
  const diagDetails = document.getElementById("modal-diag-details")!;

  if (rep.warnings.length === 0 && rep.shoesClosed && rep.normalsValid) {
    diagBox.className = "diagnostics-box diag-clean";
    diagTitle.textContent = "✓ Topology & Seams Valid";
    diagDetails.textContent = `Shoes fully closed & manifold (${rep.totalTriangles} triangles, ${rep.totalVertices} vertices). All mesh surface normals normalized.`;
  } else {
    diagBox.className = "diagnostics-box diag-warn";
    diagTitle.textContent = "⚠ Diagnostic Attention";
    diagDetails.textContent =
      rep.warnings.join("\n") || "Potential seam or normal discrepancy.";
  }

  // Match initial camera orientation
  inspectorYaw = card.yaw;
  inspectorPitch = card.pitch;
  inspectorZoom = 3.2;
  inspectorTargetY = 0.8;

  renderInspector();
}

function renderInspector() {
  if (
    !inspectorRenderer ||
    !inspectorScene ||
    !inspectorCamera ||
    !inspectorModal.classList.contains("open")
  )
    return;
  const rect = modalViewport.getBoundingClientRect();
  inspectorRenderer.setSize(rect.width, rect.height);
  inspectorCamera.aspect = rect.width / rect.height;
  inspectorCamera.updateProjectionMatrix();

  const dist = inspectorZoom;
  const cy = inspectorTargetY + Math.sin(inspectorPitch) * dist;
  const horizDist = Math.cos(inspectorPitch) * dist;
  const cx = Math.sin(inspectorYaw) * horizDist;
  const cz = Math.cos(inspectorYaw) * horizDist;

  inspectorCamera.position.set(cx, cy, cz);
  inspectorCamera.lookAt(0, inspectorTargetY, 0);

  inspectorRenderer.render(inspectorScene, inspectorCamera);
}

// ==========================================
// TOOLBAR AND CONTROLS BINDINGS
// ==========================================

// Motion Selector
(document.getElementById("motion-selector") as HTMLSelectElement).onchange = (
  e,
) => {
  activeMotion = (e.target as HTMLSelectElement).value;
  const propGroup = document.getElementById("carry-prop-group")!;
  propGroup.style.display = activeMotion === "carry" ? "flex" : "none";

  // Attach / detach props on cards
  cards.forEach((card) => {
    if (card.carriedPropGroup) {
      card.carriedPropGroup.removeFromParent();
      card.carriedPropGroup = null;
    }
    if (activeMotion === "carry") {
      card.carriedPropGroup = createCarriedProp(activeCarriedProp);
      if (card.carriedPropGroup) {
        if (activeCarriedProp === "banner") {
          card.actor.sockets.rightHand.add(card.carriedPropGroup);
        } else {
          card.carriedPropGroup.position.set(0, 0.88, 0.38);
          card.actor.group.add(card.carriedPropGroup);
        }
      }
    }
  });

  requestRender();
};

// Carried Prop Selector
(document.getElementById("carried-prop") as HTMLSelectElement).onchange = (
  e,
) => {
  activeCarriedProp = (e.target as HTMLSelectElement).value as CarriedPropType;
  cards.forEach((card) => {
    if (card.carriedPropGroup) {
      card.carriedPropGroup.removeFromParent();
      card.carriedPropGroup = null;
    }
    if (activeMotion === "carry") {
      card.carriedPropGroup = createCarriedProp(activeCarriedProp);
      if (card.carriedPropGroup) {
        if (activeCarriedProp === "banner") {
          card.actor.sockets.rightHand.add(card.carriedPropGroup);
        } else {
          card.carriedPropGroup.position.set(0, 0.88, 0.38);
          card.actor.group.add(card.carriedPropGroup);
        }
      }
    }
  });
  requestRender();
};

// Quality Selector
(document.getElementById("quality-selector") as HTMLSelectElement).onchange = (
  e,
) => {
  rebuildAllActors(
    (e.target as HTMLSelectElement).value as "hero" | "npc" | "crowd",
  );
};

// Camera Presets
const setGlobalCameraAngle = (yaw: number, pitch = 0) => {
  globalYaw = yaw;
  globalPitch = pitch;
  cards.forEach((c) => {
    c.yaw = yaw;
    c.pitch = pitch;
  });
  requestRender();
};

document.getElementById("cam-front")!.onclick = () =>
  setGlobalCameraAngle(0, 0);
document.getElementById("cam-quarter")!.onclick = () =>
  setGlobalCameraAngle(Math.PI / 4, 0.05);
document.getElementById("cam-side")!.onclick = () =>
  setGlobalCameraAngle(Math.PI / 2, 0);
document.getElementById("cam-back")!.onclick = () =>
  setGlobalCameraAngle(Math.PI, 0);
document.getElementById("cam-low")!.onclick = () =>
  setGlobalCameraAngle(0, -0.38);
document.getElementById("cam-high")!.onclick = () =>
  setGlobalCameraAngle(0, 0.38);

// Sync Orbit Toggle
(document.getElementById("sync-orbit") as HTMLInputElement).onchange = (e) => {
  syncOrbit = (e.target as HTMLInputElement).checked;
};

// Play / Pause Toggle
const playPauseBtn = document.getElementById("play-pause-btn")!;
const playPauseIcon = document.getElementById("play-pause-icon")!;
playPauseBtn.onclick = () => {
  isPlaying = !isPlaying;
  playPauseIcon.textContent = isPlaying ? "⏸" : "▶";
  playPauseBtn.childNodes[2].textContent = isPlaying ? " Pause" : " Play";
};

// Playback Speed
(document.getElementById("playback-speed") as HTMLSelectElement).onchange = (
  e,
) => {
  playbackSpeed = parseFloat((e.target as HTMLSelectElement).value);
};

// Turn Reversals Toggle
(document.getElementById("reversal-lag") as HTMLInputElement).onchange = (
  e,
) => {
  reversalLag = (e.target as HTMLInputElement).checked;
};

// Search & Filter Listeners
document
  .getElementById("search-input")!
  .addEventListener("input", applyFilters);
document
  .getElementById("faction-filter")!
  .addEventListener("change", applyFilters);
document
  .getElementById("archetype-filter")!
  .addEventListener("change", applyFilters);

// Contrast Theme
(document.getElementById("bg-theme") as HTMLSelectElement).onchange = (e) => {
  const theme = (e.target as HTMLSelectElement).value;
  document.body.className = theme === "default" ? "" : `bg-${theme}`;
};

// Render Display Mode (Wireframe, Silhouette, X-Ray)
(document.getElementById("render-mode") as HTMLSelectElement).onchange = (
  e,
) => {
  activeRenderMode = (e.target as HTMLSelectElement).value;
  cards.forEach((c) => applyRenderModeToActor(c.actor.group, activeRenderMode));
  if (inspectorActor)
    applyRenderModeToActor(inspectorActor.group, activeRenderMode);
  requestRender();
};

// Run Seam Diagnostics across all characters button
document.getElementById("run-all-diag-btn")!.onclick = () => {
  let cleanCount = 0;
  let warnCount = 0;
  const issues: string[] = [];

  cards.forEach((card) => {
    card.report = analyzeCharacterMesh(card.actor);
    updateDiagBadge(card.diagPill, card.report);
    if (
      card.report.warnings.length === 0 &&
      card.report.shoesClosed &&
      card.report.normalsValid
    ) {
      cleanCount++;
    } else {
      warnCount++;
      issues.push(`${card.entry.name}: ${card.report.warnings.join(", ")}`);
    }
  });

  const overallBadge = document.getElementById("overall-status-badge")!;
  overallBadge.textContent = `${cleanCount} / ${cards.length} Clean`;
  overallBadge.className =
    warnCount === 0 ? "badge badge-success" : "badge badge-warning";

  alert(
    `Seam & Geometry Diagnostics Summary:\n\n` +
      `✓ Fully Clean: ${cleanCount} characters\n` +
      `⚠ Diagnostic Notes: ${warnCount} characters\n\n` +
      (issues.length > 0
        ? `Details:\n${issues.join("\n")}`
        : "All footwear closed and manifold!"),
  );
};

// Window & Page Lifecycle Events
window.addEventListener("resize", () => {
  requestRender();
  renderInspector();
});
window.addEventListener("scroll", requestRender, { passive: true });
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) requestRender();
});

window.addEventListener("pagehide", (e) => {
  if (e.persisted) return;
  disposed = true;
  cards.forEach((c) => {
    c.actor.dispose();
    if (c.carriedPropGroup) c.carriedPropGroup.removeFromParent();
  });
  if (inspectorActor) inspectorActor.dispose();
  envTexture.dispose();
  gridRenderer.dispose();
  inspectorRenderer?.dispose();
});

window.addEventListener("pageshow", requestRender);

// ==========================================
// INITIALIZATION
// ==========================================
function init() {
  initInspector();

  // Populate all 41 characters in grid
  CHARACTER_ROSTER.forEach((entry) => {
    const card = buildCard(entry);
    cards.push(card);
  });

  const urlParams = new URLSearchParams(window.location.search);
  const q = urlParams.get("q");
  if (q) {
    (document.getElementById("search-input") as HTMLInputElement).value = q;
  }
  const m = urlParams.get("motion");
  if (m) {
    activeMotion = m;
    const motionSelect = document.getElementById(
      "motion-selector",
    ) as HTMLSelectElement;
    if (motionSelect) motionSelect.value = m;
  }
  const roleParam = urlParams.get("role");
  if (roleParam) {
    const roleCard = cards.find((c) => c.entry.role === roleParam);
    if (roleCard) {
      setTimeout(() => openInspector(roleCard), 100);
    }
  }

  applyFilters();
  requestRender();
  tick();
}

// Start application
init();

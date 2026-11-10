import * as THREE from "three";
import {
  APOSTLE_ROSTER,
  type ApostleRacer,
  createApostleFaceCanvas,
} from "./roster";
import { KartVisualModel } from "./models";
import { KartPhysics } from "./physics";

const gridEl = document.getElementById("roster-grid")!;
const filterPills =
  document.querySelectorAll<HTMLButtonElement>(".filter-pill");

// Modal Elements
const inspectModal = document.getElementById("inspect-modal")!;
const modalClose = document.getElementById("modal-close")!;
const modalCanvasContainer = document.getElementById("modal-canvas-container")!;
const modalRacerName = document.getElementById("modal-racer-name")!;
const modalRacerKart = document.getElementById("modal-racer-kart")!;
const modalDesc = document.getElementById("modal-desc")!;
const modalStats = document.getElementById("modal-stats")!;
const modalFeatures = document.getElementById("modal-features")!;
const modalRaceBtn = document.getElementById(
  "modal-race-btn",
) as HTMLAnchorElement;

let currentFilter = "all";

// Three.js 3D Inspector variables
let modalRenderer: THREE.WebGLRenderer | null = null;
let modalScene: THREE.Scene | null = null;
let modalCamera: THREE.PerspectiveCamera | null = null;
let currentKartModel: KartVisualModel | null = null;
let dummyPhysics: KartPhysics | null = null;
let animId: number | null = null;
let isDragging = false;
let prevMouseX = 0;
let prevMouseY = 0;
let cameraYaw = 0.6;
let cameraPitch = 0.35;
let cameraDistance = 5.2;

function renderRoster() {
  gridEl.innerHTML = "";

  const filtered = APOSTLE_ROSTER.filter((r) => {
    if (currentFilter === "first-presidency") {
      return r.id === "oaks" || r.id === "eyring" || r.id === "christofferson";
    }
    if (currentFilter === "quorum") {
      return r.id !== "oaks" && r.id !== "eyring" && r.id !== "christofferson";
    }
    return true;
  });

  filtered.forEach((racer) => {
    const card = document.createElement("div");
    card.className = "card";

    // Top color strip
    const colorBar = document.createElement("div");
    colorBar.className = "card-header-bar";
    colorBar.style.backgroundColor = `#${racer.kartColor.toString(16).padStart(6, "0")}`;
    card.appendChild(colorBar);

    // Portrait
    const portraitWrap = document.createElement("div");
    portraitWrap.className = "portrait-wrapper";

    const badge = document.createElement("div");
    badge.className = "racer-number-badge";
    badge.textContent = `#${racer.number}`;
    portraitWrap.appendChild(badge);

    const canvas = createApostleFaceCanvas(racer);
    canvas.className = "portrait-canvas";
    portraitWrap.appendChild(canvas);
    card.appendChild(portraitWrap);

    // Body
    const body = document.createElement("div");
    body.className = "card-body";

    const nameRow = document.createElement("div");
    nameRow.className = "name-row";
    nameRow.innerHTML = `
      <h2>${racer.name}</h2>
      <span class="official-title">${racer.title}</span>
    `;
    body.appendChild(nameRow);

    const kartRow = document.createElement("div");
    kartRow.className = "kart-row";
    kartRow.innerHTML = `
      <span style="color:#94a3b8;">🏎️ Kart</span>
      <span class="kart-name-val">${racer.kartName}</span>
    `;
    body.appendChild(kartRow);

    // Stat bars
    const statsList = document.createElement("div");
    statsList.className = "stat-list";
    const statConfigs = [
      { label: "Top Speed", val: racer.stats.topSpeed },
      { label: "Acceleration", val: racer.stats.acceleration },
      { label: "Weight", val: racer.stats.weight },
      { label: "Handling", val: racer.stats.handling },
      { label: "Drift Turbo", val: racer.stats.miniTurbo },
    ];
    statConfigs.forEach((sc) => {
      const pct = Math.round(((sc.val - 0.7) / (1.3 - 0.7)) * 100);
      const row = document.createElement("div");
      row.className = "stat-row";
      row.innerHTML = `
        <span class="stat-label">${sc.label}</span>
        <div class="stat-bar-track">
          <div class="stat-bar-fill" style="width: ${Math.max(15, Math.min(100, pct))}%;"></div>
        </div>
      `;
      statsList.appendChild(row);
    });
    body.appendChild(statsList);

    // Features
    const featBox = document.createElement("div");
    featBox.className = "features-box";
    racer.features.forEach((feat) => {
      const tag = document.createElement("span");
      tag.className = "feature-tag";
      tag.textContent = feat;
      featBox.appendChild(tag);
    });
    body.appendChild(featBox);

    // Quote
    const quoteBox = document.createElement("div");
    quoteBox.className = "quote-box";
    quoteBox.textContent = `"${racer.catchphrases[0]}"`;
    body.appendChild(quoteBox);

    // Buttons
    const actions = document.createElement("div");
    actions.className = "card-actions";

    const raceBtn = document.createElement("a");
    raceBtn.className = "btn btn-primary";
    raceBtn.href = `/?kart&apostle=${racer.id}`;
    raceBtn.innerHTML = "🏎️ Race";
    actions.appendChild(raceBtn);

    const inspectBtn = document.createElement("button");
    inspectBtn.className = "btn";
    inspectBtn.innerHTML = "🔍 3D Kart";
    inspectBtn.onclick = () => open3DInspector(racer);
    actions.appendChild(inspectBtn);

    body.appendChild(actions);
    card.appendChild(body);
    gridEl.appendChild(card);
  });
}

filterPills.forEach((pill) => {
  pill.addEventListener("click", () => {
    filterPills.forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    currentFilter = pill.dataset.filter || "all";
    renderRoster();
  });
});

// 3D Inspector Modal Logic
function open3DInspector(racer: ApostleRacer) {
  modalRacerName.textContent = `${racer.name} (#${racer.number})`;
  modalRacerKart.textContent = `Driving: ${racer.kartName}`;
  modalDesc.textContent = `${racer.title}. Known for: ${racer.features.join(", ")}.`;
  modalRaceBtn.href = `/?kart&apostle=${racer.id}`;
  modalRaceBtn.textContent = `🏎️ Race as ${racer.shortName}`;

  // Populate features
  modalFeatures.innerHTML = "";
  racer.features.forEach((f) => {
    const span = document.createElement("span");
    span.className = "feature-tag";
    span.textContent = f;
    modalFeatures.appendChild(span);
  });

  // Populate stats
  modalStats.innerHTML = "";
  [
    { label: "Top Speed", val: racer.stats.topSpeed },
    { label: "Acceleration", val: racer.stats.acceleration },
    { label: "Weight", val: racer.stats.weight },
    { label: "Handling", val: racer.stats.handling },
    { label: "Drift Turbo", val: racer.stats.miniTurbo },
  ].forEach((sc) => {
    const pct = Math.round(((sc.val - 0.7) / (1.3 - 0.7)) * 100);
    const row = document.createElement("div");
    row.className = "stat-row";
    row.innerHTML = `
      <span class="stat-label">${sc.label}</span>
      <div class="stat-bar-track">
        <div class="stat-bar-fill" style="width: ${Math.max(15, Math.min(100, pct))}%;"></div>
      </div>
    `;
    modalStats.appendChild(row);
  });

  inspectModal.style.display = "flex";
  init3DScene(racer);
}

function init3DScene(racer: ApostleRacer) {
  if (modalRenderer) {
    clean3DScene();
  }

  const width = modalCanvasContainer.clientWidth || 550;
  const height = modalCanvasContainer.clientHeight || 550;

  modalScene = new THREE.Scene();
  modalScene.background = new THREE.Color(0x111927);

  modalCamera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);

  modalRenderer = new THREE.WebGLRenderer({ antialias: true });
  modalRenderer.setSize(width, height);
  modalRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
  modalRenderer.shadowMap.enabled = true;
  modalCanvasContainer.appendChild(modalRenderer.domElement);

  // Lighting
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444455, 1.2);
  modalScene.add(hemi);

  const dirLight = new THREE.DirectionalLight(0xfffaed, 2.0);
  dirLight.position.set(5, 10, 7);
  dirLight.castShadow = true;
  modalScene.add(dirLight);

  const backLight = new THREE.DirectionalLight(0x38bdf8, 1.0);
  backLight.position.set(-6, 4, -6);
  modalScene.add(backLight);

  // Platform
  const platGeo = new THREE.CylinderGeometry(2.8, 3.0, 0.25, 32);
  const platMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.7,
    metalness: 0.3,
  });
  const platform = new THREE.Mesh(platGeo, platMat);
  platform.position.y = -0.12;
  platform.receiveShadow = true;
  modalScene.add(platform);

  // Kart Model
  currentKartModel = new KartVisualModel(racer);
  dummyPhysics = new KartPhysics(racer, new THREE.Vector3(0, 0, 0), 0);
  modalScene.add(currentKartModel.group);

  // Setup Mouse Drag Orbit Controls
  const canvas = modalRenderer.domElement;
  canvas.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("wheel", onWheel, { passive: true });

  cameraYaw = 0.7;
  cameraPitch = 0.32;
  cameraDistance = 5.4;

  let lastT = performance.now();
  const loop = (t: number) => {
    const dt = Math.min((t - lastT) * 0.001, 0.05);
    lastT = t;

    if (!isDragging) {
      cameraYaw += dt * 0.45; // gentle auto-turntable rotation
    }

    // Camera Orbit Position
    const x = Math.sin(cameraYaw) * Math.cos(cameraPitch) * cameraDistance;
    const y = Math.sin(cameraPitch) * cameraDistance + 0.6;
    const z = Math.cos(cameraYaw) * Math.cos(cameraPitch) * cameraDistance;

    if (modalCamera) {
      modalCamera.position.set(x, y, z);
      modalCamera.lookAt(0, 0.8, 0);
    }

    if (currentKartModel && dummyPhysics) {
      currentKartModel.update(dt, dummyPhysics);
    }

    if (modalRenderer && modalScene && modalCamera) {
      modalRenderer.render(modalScene, modalCamera);
    }
    animId = requestAnimationFrame(loop);
  };
  animId = requestAnimationFrame(loop);
}

function onPointerDown(e: PointerEvent) {
  isDragging = true;
  prevMouseX = e.clientX;
  prevMouseY = e.clientY;
}

function onPointerMove(e: PointerEvent) {
  if (!isDragging) return;
  const dx = e.clientX - prevMouseX;
  const dy = e.clientY - prevMouseY;
  prevMouseX = e.clientX;
  prevMouseY = e.clientY;

  cameraYaw -= dx * 0.01;
  cameraPitch = Math.max(0.05, Math.min(1.2, cameraPitch + dy * 0.01));
}

function onPointerUp() {
  isDragging = false;
}

function onWheel(e: WheelEvent) {
  cameraDistance = Math.max(
    3.0,
    Math.min(9.0, cameraDistance + e.deltaY * 0.005),
  );
}

function clean3DScene() {
  if (animId !== null) {
    cancelAnimationFrame(animId);
    animId = null;
  }
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup", onPointerUp);

  if (currentKartModel) {
    currentKartModel.dispose();
    currentKartModel = null;
  }
  if (modalRenderer) {
    modalRenderer.dispose();
    modalRenderer.domElement.remove();
    modalRenderer = null;
  }
  modalScene = null;
  modalCamera = null;
}

modalClose.addEventListener("click", () => {
  inspectModal.style.display = "none";
  clean3DScene();
});

inspectModal.addEventListener("click", (e) => {
  if (e.target === inspectModal) {
    inspectModal.style.display = "none";
    clean3DScene();
  }
});

// Initial Render
renderRoster();

import * as T from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { Input } from "./super/input";
import { FollowCamera } from "./super/camera";
import { createPlayer, stepPlayer } from "./super/physics";
import { renderControlText, renderControlLegend } from "./super/controls";
import { MenuNavigation } from "./super/menu";
import {
  createCarryObject,
  nearestCarryObject,
  pickUp,
  dropObject,
  throwObject,
  resetCarryObject,
  stepCarryObjects,
  objectInTarget,
} from "./super/objects";
import { buildLehiPlayground } from "./super/lehi-playground-world";
import { createPlayableLehi } from "./super/playable-lehi";
import "./lehi-play.css";

const el = (id: string) => document.getElementById(id)!;
const renderer = new T.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
el("play-view").append(renderer.domElement);
const scene = new T.Scene();
const room = new RoomEnvironment();
const pmrem = new T.PMREMGenerator(renderer);
const environment = pmrem.fromScene(room);
room.dispose();
pmrem.dispose();
scene.environment = environment.texture;
scene.environmentIntensity = 0.35;
const world = buildLehiPlayground(scene);
scene.traverse((object) => {
  if (object instanceof T.DirectionalLight) {
    object.castShadow = true;
    object.shadow.mapSize.set(1024, 1024);
    Object.assign(object.shadow.camera, {
      left: -24,
      right: 24,
      top: 26,
      bottom: -26,
      near: 0.5,
      far: 70,
    });
    object.shadow.bias = -0.0003;
    object.shadow.normalBias = 0.025;
  }
  if (object instanceof T.Mesh) {
    object.receiveShadow = true;
    object.castShadow = true;
  }
});
const avatar = createPlayableLehi();
scene.add(avatar.group);
const camera = new T.PerspectiveCamera(50, 1, 0.1, 150);
const follow = new FollowCamera(camera);
const input = new Input();
const navigation = new MenuNavigation();
const menu = el("pause-menu") as HTMLDialogElement;
const buttons = Array.from(el("pause-buttons").children) as HTMLElement[];
let player = createPlayer(world.spawn.x, world.spawn.y, world.spawn.z);
player.yaw = world.spawn.yaw ?? Math.PI;
follow.reset(player, player.yaw, "streets");
const objects = (world.carryables ?? []).map((o) =>
  createCarryObject(o.id, o.x, o.y, o.z),
);
const extras = new T.Group();
scene.add(extras);
const sacks = objects.map(() => {
  const sack = new T.Mesh(
    new T.SphereGeometry(0.28, 20, 14),
    new T.MeshStandardMaterial({ color: 0xa67c49, roughness: 0.9 }),
  );
  sack.scale.y = 1.1;
  extras.add(sack);
  return sack;
});
const collected = new Set<string>();
const tokens = (world.tokens ?? []).map((t) => {
  const mesh = new T.Mesh(
    new T.SphereGeometry(0.18, 16, 12),
    new T.MeshStandardMaterial({
      color: 0xb5edff,
      emissive: 0x4facc9,
      emissiveIntensity: 0.6,
    }),
  );
  mesh.position.set(t.x, t.y, t.z);
  extras.add(mesh);
  return { ...t, mesh };
});
let paused = false,
  walking = false,
  pauseAge = 0,
  disposed = false;
let previous = performance.now(),
  frameId: number | null = null;
function restart() {
  player = createPlayer(world.spawn.x, world.spawn.y, world.spawn.z);
  player.yaw = world.spawn.yaw ?? Math.PI;
  follow.reset(player, player.yaw, "streets");
  objects.forEach(resetCarryObject);
  collected.clear();
  tokens.forEach((t) => (t.mesh.visible = true));
}
function pause(value: boolean) {
  paused = value;
  input.reset();
  pauseAge = 0;
  if (value) {
    navigation.reset(buttons.length);
    menu.showModal();
    buttons[0].focus();
  } else {
    menu.close();
    el("moves-list").hidden = true;
  }
}
el("resume").onclick = () => pause(false);
el("reset").onclick = () => {
  restart();
  pause(false);
};
el("moves").onclick = () => {
  el("moves-list").hidden = !el("moves-list").hidden;
};
menu.addEventListener("cancel", (e) => {
  e.preventDefault();
  pause(false);
});
el("pace").onclick = () => {
  walking = !walking;
  el("pace").setAttribute("aria-pressed", String(walking));
  el("pace").textContent = walking ? "Pace: walk" : "Pace: run";
};
el("fullscreen").onclick = async () => {
  try {
    if (!document.fullscreenElement)
      await document.documentElement.requestFullscreen();
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (orientation: string) => Promise<void>;
    };
    await orientation.lock?.("landscape");
  } catch {
    /* Continue normally when the browser does not support fullscreen. */
  }
};
const lessons: Record<string, [string, string]> = {
  "Crawl arch": [
    "A little lower.",
    "Hold {crouch} and use {move} to crawl beneath the arch.",
  ],
  "Ledge platform": [
    "Reach for the edge.",
    "{jump} toward the ledge. Use {up} to pull up; {crouch} to let go.",
  ],
  "Climbing pole": [
    "A different view.",
    "Jump onto the pole, use {up} or {down} to climb, then {jump} away.",
  ],
  "Wall kick nook": [
    "Push away from the wall.",
    "Jump toward a wall, then press {jump} as you touch it.",
  ],
  "Garden steps": [
    "Find your rhythm.",
    "Jump again as you land for a double jump, then a triple jump.",
  ],
  "Long jump": [
    "Across the gap.",
    "Run toward the gap, hold {crouch}, then press {jump}.",
  ],
};
function updateHud() {
  let title = "Make yourself at home.";
  let body =
    "Use {move} to walk or run. Turn sharply, then release to feel the stop. Hold {crouch} and {jump} for a backflip.";
  const landmark = [...(world.landmarks ?? [])].sort(
    (a, b) =>
      Math.hypot(player.x - a.x, player.z - a.z) -
      Math.hypot(player.x - b.x, player.z - b.z),
  )[0];
  if (landmark && Math.hypot(player.x - landmark.x, player.z - landmark.z) < 5)
    [title, body] = lessons[landmark.name] ?? [title, body];
  const held = objects.find((o) => o.held);
  const nearby = nearestCarryObject(player, objects, world.solids);
  if (held || nearby) {
    title = "Pick it up. Try a throw.";
    body =
      "{action} picks up or throws the bundle. Hold {crouch} with {action} to put it down. Try the golden delivery ring.";
  }
  el("lesson-title").textContent = title;
  renderControlText(el("lesson-body"), body, input.device);
  renderControlLegend(el("legend"), input.device);
  renderControlText(
    el("moves-list"),
    "{move} Walk / run · {jump} Jump (repeat on landing for double / triple) · {crouch} Crouch / crawl · Run + {crouch} + {jump} Long jump · Still + {crouch} + {jump} Backflip · Reverse direction + {jump} Side somersault · Touch wall + {jump} Wall kick · {up} Pull up / climb · {action} Pick up / throw · {crouch} + {action} Put down · {camera} Camera · {recenter} Recenter",
    input.device,
  );
  renderControlText(el("resume"), "{jump} Keep exploring", input.device);
  renderControlText(
    el("prompt"),
    held
      ? "{action} Throw · {crouch} + {action} Put down"
      : nearby
        ? "{action} Pick up the bundle"
        : world.delivery &&
            objects.some((o) => objectInTarget(o, world.delivery!))
          ? "A careful delivery. Nicely done."
          : "",
    input.device,
  );
  el("practice-count").textContent =
    `Practice lights · ${collected.size} / ${tokens.length}`;
  el("move-state").textContent = player.move.replace(/([A-Z])/g, " $1");
}
function frame(now: number) {
  frameId = null;
  if (disposed || document.hidden) return;
  const dt = Math.min(0.05, Math.max(0, (now - previous) / 1000));
  previous = now;
  const state = input.latest(dt);
  if (state.pause) pause(!paused);
  if (paused) {
    pauseAge += dt;
    const index = navigation.update(state.y, dt);
    if (index !== null) buttons[index].focus();
    if (pauseAge > 0.25 && (state.jump || state.interact))
      buttons[navigation.index].click();
  } else {
    stepPlayer(
      player,
      walking ? { ...state, x: state.x * 0.42, y: state.y * 0.42 } : state,
      dt,
      follow.yaw,
      world.solids,
      world.climbables,
    );
    const bounds = world.bounds!;
    player.x = T.MathUtils.clamp(
      player.x,
      bounds.minX + 0.35,
      bounds.maxX - 0.35,
    );
    player.z = T.MathUtils.clamp(
      player.z,
      bounds.minZ + 0.35,
      bounds.maxZ - 0.35,
    );
    if (player.y < -5) restart();
    if (state.interact) {
      const held = objects.find((o) => o.held);
      if (held) {
        if (state.crouch) dropObject(held, player);
        else throwObject(held, player, world.solids);
      } else {
        const near = nearestCarryObject(player, objects, world.solids);
        if (near) pickUp(near, player, world.solids);
      }
    }
    stepCarryObjects(objects, player, dt, world.solids);
    objects.forEach((o, i) => {
      if (o.y < -5) resetCarryObject(o);
      sacks[i].position.set(o.x, o.y, o.z);
    });
    for (const t of tokens)
      if (
        !collected.has(t.id) &&
        Math.hypot(player.x - t.x, player.z - t.z) < 0.75 &&
        Math.abs(player.y + 0.5 - t.y) < 0.9
      ) {
        collected.add(t.id);
        t.mesh.visible = false;
      }
    avatar.update(dt, { ...player, carrying: objects.some((o) => o.held) });
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
      "streets",
    );
  }
  updateHud();
  renderer.render(scene, camera);
  frameId = requestAnimationFrame(frame);
}
function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
resize();
addEventListener("resize", resize);
function suspend() {
  if (frameId !== null) cancelAnimationFrame(frameId);
  frameId = null;
  input.reset();
}
function resume() {
  if (!disposed && !document.hidden && frameId === null) {
    previous = performance.now();
    frameId = requestAnimationFrame(frame);
  }
}
document.addEventListener("visibilitychange", () =>
  document.hidden ? suspend() : resume(),
);
addEventListener("pagehide", (e) => {
  suspend();
  if (e.persisted) return;
  disposed = true;
  input.dispose();
  avatar.dispose();
  world.dispose?.();
  extras.traverse((o) => {
    if (o instanceof T.Mesh) {
      o.geometry.dispose();
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
        m.dispose(),
      );
    }
  });
  environment.dispose();
  renderer.dispose();
});
addEventListener("pageshow", resume);
const snapshot = () => ({
  model: 9,
  player: { ...player },
  cameraYaw: follow.yaw,
  cameraPosition: camera.position.toArray(),
  world: "lehi-playground",
  paused,
  transition: false,
  collected: [...collected],
  carrying: objects.some((o) => o.held),
  rendering: frameId !== null,
});
Object.assign(window, { lehiPlay: { snapshot }, superMormon: { snapshot } });
resume();

import * as T from "three";
import { FollowCamera } from "../camera/camera";
import type { WorldId } from "../runtime/worlds";
import { createPerformanceDiagnostics } from "./performance";
import {
  FramePacer,
  RenderQuality,
  GRAPHICS_MODES,
  readGraphicsMode,
  renderScale,
  type GraphicsMode,
} from "./render-policy";

export interface GameViewCallbacks {
  update(dt: number, activeElapsed: number): void;
  updatePreview(dt: number): void;
  state(): {
    paused: boolean;
    cinematic: boolean;
    transition: boolean;
    scene: T.Scene;
  };
}

/** Rendering policy and the browser frame lifecycle, independent of gameplay. */
export class GameView {
  readonly renderer = new T.WebGLRenderer({ antialias: true });
  readonly camera = new T.PerspectiveCamera(58, 1, 0.08, 320);
  readonly follow = new FollowCamera(this.camera);
  graphicsMode: GraphicsMode = "balanced";
  readonly framePacer = new FramePacer();
  readonly renderQuality = new RenderQuality();
  renderDirty = true;
  renderedFrames = 0;
  readonly diagnostics;
  private previous = performance.now();
  private frameRequest: number | null = null;
  private callbacks: GameViewCallbacks | null = null;

  constructor(viewport: HTMLElement) {
    try {
      this.graphicsMode = readGraphicsMode(
        localStorage.getItem("super-mormon-graphics"),
      );
    } catch {
      /* storage is optional */
    }
    // Painting textures can finish loading while a static menu is open.
    T.DefaultLoadingManager.onProgress = () => {
      this.renderDirty = true;
    };
    T.DefaultLoadingManager.onLoad = () => {
      this.renderDirty = true;
    };
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    viewport.append(this.renderer.domElement);
    this.diagnostics = createPerformanceDiagnostics(this.renderer, {
      enabled:
        import.meta.env.DEV &&
        new URLSearchParams(location.search).has("performance"),
    });
  }

  resize() {
    const scale = renderScale(
      innerWidth,
      innerHeight,
      devicePixelRatio,
      this.graphicsMode,
      this.renderQuality.factor,
    );
    if (Math.abs(this.renderer.getPixelRatio() - scale) > 0.001)
      this.renderer.setPixelRatio(scale);
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderDirty = true;
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
  }

  setGraphicsMode(mode: GraphicsMode) {
    this.graphicsMode = mode;
    try {
      localStorage.setItem("super-mormon-graphics", mode);
    } catch {
      /* optional */
    }
    this.framePacer.reset();
    this.renderQuality.reset();
    this.previous = performance.now();
    this.resize();
  }

  resetScene(id: WorldId) {
    this.renderQuality.reset();
    this.resize();
    this.diagnostics.recordScene(id);
  }

  start(callbacks: GameViewCallbacks) {
    this.callbacks = callbacks;
    this.queueFrame();
  }

  suspend() {
    if (this.frameRequest !== null) cancelAnimationFrame(this.frameRequest);
    this.frameRequest = null;
  }

  resume() {
    this.previous = performance.now();
    this.framePacer.reset();
    this.renderDirty = true;
    this.queueFrame();
  }

  snapshot() {
    return {
      ...this.diagnostics.snapshot(),
      graphics: {
        mode: this.graphicsMode,
        fpsLimit: GRAPHICS_MODES[this.graphicsMode].fps,
        renderScale: this.renderer.getPixelRatio(),
        adaptiveFactor: this.renderQuality.factor,
        bufferWidth: this.renderer.domElement.width,
        bufferHeight: this.renderer.domElement.height,
        renderedFrames: this.renderedFrames,
      },
    };
  }

  private queueFrame() {
    if (!document.hidden && this.frameRequest === null && this.callbacks)
      this.frameRequest = requestAnimationFrame(this.frame);
  }

  private readonly frame = (now: number) => {
    this.frameRequest = null;
    if (document.hidden || !this.callbacks) return;
    const before = this.callbacks.state();
    const fps = GRAPHICS_MODES[this.graphicsMode].fps;
    // Menu input stays responsive without continuing the expensive world render.
    if (
      !this.framePacer.due(now, before.paused && !before.cinematic ? 30 : fps)
    ) {
      this.queueFrame();
      return;
    }
    const wasStatic = before.paused && !before.cinematic;
    const activeElapsed = Math.max(0, (now - this.previous) / 1000);
    const dt = Math.min(activeElapsed, 0.04);
    this.previous = now;
    this.callbacks.update(dt, activeElapsed);
    this.callbacks.updatePreview(dt);
    const after = this.callbacks.state();
    const staticMenu = after.paused && !after.cinematic;
    if (!staticMenu || this.renderDirty) {
      if (
        !staticMenu &&
        !wasStatic &&
        !after.transition &&
        this.renderQuality.sample(activeElapsed * 1000, fps)
      )
        this.resize();
      this.renderer.render(after.scene, this.camera);
      this.renderedFrames++;
      this.renderDirty = false;
      this.diagnostics.sampleFrame(now);
    } else this.diagnostics.suspend();
    this.queueFrame();
  };
}

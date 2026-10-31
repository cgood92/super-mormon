import type { PlayerState, StepEvents } from "../physics/physics";

type Params = Record<string, string | number | boolean>;
type EventPayloads = {
  level_start: { entry_reason: string };
  play_time: { active_seconds: number };
  level_end: { success: true; total_active_seconds: number };
  level_exit: {
    exit_reason: string;
    story_phase: string;
    total_active_seconds: number;
  };
  level_retry: { retry_reason: string };
  move_used: { move_name: string };
  camera_used: { camera_action: "rotate" | "recenter" };
  story_step: { story_phase: string };
  secret_found: { secret_id: string };
  activity_used: { activity_id: string };
  fullscreen_changed: undefined;
};
// A tuple union keeps event names paired with their own required payloads.
type AnalyticsEvent = {
  [Name in keyof EventPayloads]: EventPayloads[Name] extends undefined
    ? [name: Name]
    : [name: Name, params: EventPayloads[Name]];
}[keyof EventPayloads];
export type AnalyticsTransport = (name: string, params: Params) => void;
const GAME_URL = "https://cgood92.github.io/super-mormon/";

/** Development, copies of the build, tools and all query-based testing stay silent. */
export function analyticsAllowed(
  production: boolean,
  href: string,
  id: string,
): boolean {
  if (!production || !/^G-[A-Z0-9]+$/.test(id)) return false;
  try {
    const url = new URL(href);
    return (
      url.origin === "https://cgood92.github.io" &&
      ["/super-mormon/", "/super-mormon/index.html"].includes(url.pathname) &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

/** Load only on the public game. No local persistence and no unbounded blocked-tag queue. */
export function browserAnalytics(
  production: boolean,
  measurementId = "",
): AnalyticsTransport {
  if (!analyticsAllowed(production, location.href, measurementId))
    return () => {};
  type TagWindow = Window & {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  };
  const w = window as TagWindow;
  let ready = false,
    failed = false;
  let pending: { name: string; params: Params }[] = [];
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  const fail = () => {
    failed = true;
    pending = [];
    script.remove();
  };
  const timeout = window.setTimeout(fail, 8000);
  script.onerror = () => {
    clearTimeout(timeout);
    fail();
  };
  script.onload = () => {
    clearTimeout(timeout);
    if (failed) return;
    w.dataLayer ??= [];
    // gtag expects an arguments object rather than a plain array.
    w.gtag = function () {
      w.dataLayer!.push(arguments);
    };
    w.gtag("consent", "default", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "granted",
    });
    w.gtag("js", new Date());
    w.gtag("config", measurementId, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: GAME_URL,
      page_referrer: "",
      page_title: "Super Mormon",
    });
    ready = true;
    w.gtag("event", "page_view", {
      page_location: GAME_URL,
      page_referrer: "",
      page_title: "Super Mormon",
    });
    for (const e of pending) w.gtag("event", e.name, e.params);
    pending = [];
  };
  document.head.append(script);
  return (name, params) => {
    if (failed) return;
    if (ready) w.gtag?.("event", name, params);
    else if (pending.length < 64) pending.push({ name, params });
  };
}

const moveNames: Partial<Record<PlayerState["move"], string>> = {
  jump: "jump",
  doubleJump: "double_jump",
  tripleJump: "triple_jump",
  longJump: "long_jump",
  backflip: "backflip",
  sideflip: "sideflip",
  wallKick: "wall_kick",
  groundPound: "ground_pound",
  ledgeHang: "ledge_grab",
  swim: "swim",
  crouch: "crouch",
};
export function movementActions(
  before: Pick<PlayerState, "move" | "climbId">,
  player: PlayerState,
  events: StepEvents,
): string[] {
  const actions: string[] = [];
  if (events.jumped) actions.push(moveNames[player.move] ?? "jump");
  if (events.pounded) actions.push("pound_land");
  if (player.move !== before.move && !events.jumped) {
    if (player.move === "crawl" && player.grounded && player.runSpeed > 0.25)
      actions.push("crawl");
    else if (moveNames[player.move]) actions.push(moveNames[player.move]!);
  }
  if (player.climbId && player.climbId !== before.climbId)
    actions.push(
      /tree|olive|palm|acacia/i.test(player.climbId) ? "tree_climb" : "climb",
    );
  return actions;
}

/** Runtime passes active foreground time only; pause/hidden/cinematics do not tick. */
export class GameplayAnalytics {
  private level: string | undefined;
  private device = "keyboard";
  private fullscreenMode = "windowed";
  private active = 0;
  private unreported = 0;
  private ended = true;
  private phase = "";
  private cameraIdle = 1;
  private recenterHeld = false;
  private discoveries = new Set<string>();
  constructor(private readonly transport: AnalyticsTransport) {}
  private send(...[name, params]: AnalyticsEvent) {
    try {
      this.transport(name, {
        level_id: this.level ?? "hub",
        input_device: this.device,
        ...params,
        fullscreen_mode: this.fullscreenMode,
      });
    } catch {
      /* Analytics never owns game control flow. */
    }
  }
  start(level: string, reason: string, device: string) {
    if (!this.ended) this.exit("scene_change");
    this.level = level;
    this.device = device;
    this.active = 0;
    this.unreported = 0;
    this.ended = false;
    this.phase = "";
    this.cameraIdle = 1;
    this.recenterHeld = false;
    this.send("level_start", { entry_reason: reason });
  }
  setDevice(device: string) {
    this.device = device;
  }
  setFullscreen(fullscreen: boolean) {
    const mode = fullscreen ? "fullscreen" : "windowed";
    if (mode === this.fullscreenMode) return;
    if (!this.ended) this.flush();
    this.fullscreenMode = mode;
    if (!this.ended) this.send("fullscreen_changed");
  }
  tick(dt: number) {
    if (this.ended || !Number.isFinite(dt) || dt <= 0) return;
    this.active += dt;
    this.unreported += dt;
    if (this.unreported >= 30) this.flush();
  }
  flush() {
    if (this.unreported <= 0) return;
    this.send("play_time", { active_seconds: this.unreported });
    this.unreported = 0;
  }
  finish() {
    if (this.ended) return;
    this.flush();
    this.send("level_end", {
      success: true,
      total_active_seconds: this.active,
    });
    this.ended = true;
  }
  exit(reason: string) {
    if (this.ended) return;
    this.flush();
    this.send("level_exit", {
      exit_reason: reason,
      story_phase: this.phase,
      total_active_seconds: this.active,
    });
    this.ended = true;
  }
  retry(reason: string) {
    if (!this.ended) {
      this.flush();
      this.send("level_retry", { retry_reason: reason });
    }
  }
  move(action: string) {
    if (!this.ended) this.send("move_used", { move_name: action });
  }
  camera(rotating: boolean, recenter: boolean, dt: number) {
    if (this.ended) return;
    if (rotating) {
      if (this.cameraIdle >= 0.25)
        this.send("camera_used", { camera_action: "rotate" });
      this.cameraIdle = 0;
    } else this.cameraIdle += dt;
    if (recenter && !this.recenterHeld)
      this.send("camera_used", { camera_action: "recenter" });
    this.recenterHeld = recenter;
  }
  storyStep(phase: string) {
    if (this.ended || !phase || phase === this.phase) return;
    this.phase = phase;
    this.send("story_step", { story_phase: phase });
  }
  discover(id: string) {
    if (this.ended || this.discoveries.has(id)) return;
    this.discoveries.add(id);
    this.send("secret_found", { secret_id: id });
  }
  activity(id: string) {
    if (!this.ended) this.send("activity_used", { activity_id: id });
  }
}

/** Ignore suspended/blocked frames rather than treating machine sleep as play. */
export function activeFrameSeconds(elapsed: number): number {
  return Number.isFinite(elapsed) && elapsed > 0 && elapsed <= 1 ? elapsed : 0;
}

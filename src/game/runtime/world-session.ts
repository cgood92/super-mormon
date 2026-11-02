import * as T from "three";
import { createCharacter } from "../characters/character";
import type { StoryShot } from "../camera/cinematic";
import { createPlayer, type PlayerState } from "../physics/physics";
import { createPoundImpact } from "../rendering/pound-impact";
import { label } from "../rendering/art";
import { galleryReturnSpawn } from "../worlds/conference/gallery-entry";
import type { createStoryScene } from "../worlds/jerusalem/story-scenes";
import type { createTreeOfLifeScene } from "../worlds/nephi/tree-of-life";
import type { AdventureRuntime } from "./adventure";
import type { WorldData, WorldId } from "./worlds";
import type { prepareWorld } from "./world-loading";
import { isStoryId, prerequisite, type StoryId } from "./progression";

type PreparedWorld = Awaited<ReturnType<typeof prepareWorld>>;
type Character = ReturnType<typeof createCharacter>;
export type Guard = {
  state: PlayerState;
  actor: Character;
  path: { x: number; z: number }[];
  timer: number;
};
export interface WorldSessionHooks {
  dialog: (
    kicker: string,
    title: string,
    body: string,
    next: () => void,
    shot?: StoryShot,
  ) => void;
  toast: (text: string, duration?: number) => void;
  complete: () => void;
  caught: (reset?: () => void) => void;
  viewAspect: () => number;
}

/** Owns the active world's actors, story runtimes and rendered resources. */
export class WorldSession {
  scene = new T.Scene();
  world!: WorldData;
  worldId: WorldId = "hub";
  player = createPlayer();
  avatar!: Character;
  storyScene: ReturnType<typeof createStoryScene> | null = null;
  treeScene: ReturnType<typeof createTreeOfLifeScene> | null = null;
  adventure: AdventureRuntime | null = null;
  storyCheckpoint: { x: number; y: number; z: number; yaw?: number } | null =
    null;
  storyObjective = "";
  guards: Guard[] = [];
  extras: Character[] = [];
  wavingExtras: { actor: Character; state: PlayerState }[] = [];
  collected = new Set<string>();
  treasureMeshes = new Map<string, T.Group>();
  goalMarker: T.Group | null = null;
  poundImpact: ReturnType<typeof createPoundImpact> | null = null;

  build(
    id: WorldId,
    prepared: PreparedWorld,
    returnFrom: WorldId | undefined,
    completed: Set<StoryId>,
  ) {
    this.worldId = id;
    this.storyCheckpoint = null;
    this.scene = new T.Scene();
    this.world = prepared.buildWorld(id, this.scene);
    this.poundImpact = createPoundImpact(this.scene);
    this.storyObjective = this.world.initialObjective ?? "";
    if (id === "hub") this.decorateGalleryProgress(completed);
    const spawn =
      id === "hub"
        ? galleryReturnSpawn(this.world, returnFrom)
        : this.world.spawn;
    this.player = createPlayer(spawn.x, spawn.y, spawn.z);
    this.player.yaw = spawn.yaw ?? Math.PI;
    this.avatar = createCharacter(
      id === "streets" || id === "tree"
        ? "lehi"
        : id === "palace"
          ? "laman"
          : id === "voyage"
            ? "child"
            : "nephi",
      { quality: "hero" },
    );
    (this.world.actorParent ?? this.scene).add(this.avatar.group);
    this.avatar.update(0, this.player);
    this.collected = new Set();
    this.treasureMeshes.clear();
    this.goalMarker = null;
    for (const t of this.world.treasures ?? []) {
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
      this.scene.add(g);
      this.treasureMeshes.set(t.id, g);
    }
    if (
      id !== "hub" &&
      id !== "tree" &&
      (!this.world.adventure || id === "streets")
    )
      this.goalMarker = this.marker(
        this.world.goal.x,
        this.world.goal.y,
        this.world.goal.z,
      );
    const spawnGuards =
      id === "trade" || id === "night"
        ? []
        : (this.world.pursuers ??
          (id === "streets"
            ? [
                { x: -4, y: 0, z: 15 },
                { x: 4, y: 0, z: 3 },
              ]
            : []));
    for (const p of spawnGuards) {
      const state = createPlayer(p.x, p.y, p.z),
        actor = createCharacter(
          id === "streets" ? (this.guards.length ? "spy" : "convert") : "guard",
        );
      this.scene.add(actor.group);
      actor.update(0, state);
      this.guards.push({ state, actor, path: [], timer: 0 });
      actor.group.visible = id !== "palace";
    }
    if (id === "palace") {
      const laban = createCharacter("laban");
      const audience = this.world.story!.laban;
      laban.group.position.set(audience.x, audience.y, audience.z);
      laban.group.scale.setScalar(1);
      this.scene.add(laban.group);
      this.extras.push(laban);
      const end = this.world.escapeGoal ?? this.world.goal;
      for (let i = 0; i < 3; i++) {
        const brother = createCharacter(
          i === 0 ? "nephi" : i === 1 ? "lemuel" : "sam",
        );
        brother.group.position.set(end.x - 2 + i * 2, end.y, end.z + 1.2);
        const state = createPlayer(end.x - 2 + i * 2, end.y, end.z + 1.2);
        state.yaw = Math.PI;
        brother.update(0, state);
        this.wavingExtras.push({ actor: brother, state });
        this.scene.add(brother.group);
        this.extras.push(brother);
      }
    }
  }

  startStories(prepared: PreparedWorld, hooks: WorldSessionHooks) {
    const id = this.worldId;
    const { createStoryScene, createTreeOfLifeScene } = prepared;
    if (id === "trade" || id === "night") {
      this.storyObjective =
        id === "trade"
          ? "Bring the family’s treasures to Laban."
          : "Search Jerusalem for Laban.";
      this.storyScene = createStoryScene!(id, this.scene, this.world, {
        dialog: hooks.dialog,
        toast: (text) => hooks.toast(text, 3),
        complete: hooks.complete,
        checkpoint: (point) => {
          this.storyCheckpoint = { ...point };
        },
        setMarker: (point) => {
          if (this.goalMarker)
            this.goalMarker.position.set(point.x, point.y + 0.04, point.z);
        },
        setDisguise: (enabled) =>
          this.setAvatar(enabled ? "nephi-disguised" : "nephi", this.scene),
        caught: () => hooks.caught(),
      });
    }
    if (id === "tree") {
      this.storyObjective = "Find the iron rod beside the narrow path.";
      this.treeScene = createTreeOfLifeScene!(this.scene, this.world, {
        dialog: hooks.dialog,
        toast: (text) => hooks.toast(text, 4),
        complete: hooks.complete,
        checkpoint: (point) => {
          this.storyCheckpoint = { ...point };
        },
        setMarker: () => {},
      });
    }
    this.adventure =
      this.world.adventure?.({
        avatar: this.avatar.group,
        viewAspect: hooks.viewAspect,
        dialog: hooks.dialog,
        toast: (text) => hooks.toast(text, 4),
        complete: hooks.complete,
        caught: (reset) => hooks.caught(reset),
        attachEquipment: (slot, object) => {
          this.avatar.sockets[slot].add(object);
          this.avatar.group.updateMatrixWorld(true);
        },
        setAvatar: (role) => this.setAvatar(role),
      }) ?? null;
  }

  setAvatar(
    role: Parameters<typeof createCharacter>[0],
    parent: T.Object3D = this.world.actorParent ?? this.scene,
  ) {
    this.avatar.dispose();
    this.avatar = createCharacter(role, { quality: "hero" });
    parent.add(this.avatar.group);
    this.avatar.update(0, this.player);
  }

  private marker(x: number, y: number, z: number): T.Group {
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
    this.scene.add(g);
    return g;
  }
  private decorateGalleryProgress(completed: Set<StoryId>) {
    for (const portal of this.world.portals ?? []) {
      if (!isStoryId(portal.id)) continue;
      const prior = prerequisite(portal.id, completed);
      if (!prior) continue;
      const badge = new T.Group();
      const side = portal.facing === "east" || portal.facing === "west";
      const normal = portal.facing === "east" ? -1 : 1;
      const plaque = label(
        badge,
        "LOCKED",
        side ? portal.x + normal * 0.17 : portal.x + 0.75,
        (portal.y ?? 0.59) + 3.96,
        side ? portal.z : portal.z + 0.07,
        1.55,
        0.5,
      );
      plaque.renderOrder = 2;
      if (side) plaque.rotation.y = (normal * Math.PI) / 2;
      this.scene.add(badge);
    }
  }
  dispose() {
    this.poundImpact?.dispose();
    this.poundImpact = null;
    this.adventure?.dispose();
    this.adventure = null;
    this.treeScene?.dispose();
    this.treeScene = null;
    this.storyScene?.dispose();
    this.storyScene = null;
    this.wavingExtras = [];
    this.avatar?.dispose();
    for (const e of this.extras) e.dispose();
    for (const g of this.guards) g.actor.dispose();
    this.extras = [];
    this.guards = [];
    this.world.dispose?.();
    this.scene.traverse((o) => {
      if (o instanceof T.Mesh) {
        o.geometry.dispose();
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          for (const v of Object.values(m))
            if (v instanceof T.Texture) v.dispose();
          m.dispose();
        }
      }
    });
    this.scene.clear();
  }
}

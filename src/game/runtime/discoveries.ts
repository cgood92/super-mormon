import * as T from "three";
import { el } from "../ui/game-shell";
import {
  createCarryObject,
  resetCarryObject,
  objectInTarget,
  type CarryObject,
} from "../physics/objects";
import { hasLineOfSight } from "../physics/interactions";
import { renderControlText } from "../controls/controls";
import type { WorldSession } from "./world-session";
import type { GameUI } from "../ui/game-ui";
import type { GameplayAnalytics } from "./analytics";
import type { SoundKind } from "../audio/sound-effects";

/** Optional collectibles, carrying props, and the movement studio. */
export class Discoveries {
  carryObjects: CarryObject[] = [];
  readonly carryMeshes = new Map<string, T.Group>();
  readonly tokenMeshes = new Map<string, T.Mesh>();
  bonusCollected = new Set<string>();
  deliveryDone = false;
  learnedMoves = new Set<string>();
  practiceVisible = false;
  constructor(
    private readonly session: WorldSession,
    private readonly ui: GameUI,
    private readonly analytics: GameplayAnalytics,
    private readonly hooks: {
      sound(kind: SoundKind): void;
      updateObjective(): void;
    },
  ) {}
  setup() {
    this.learnedMoves = new Set();
    this.practiceVisible = false;
    el("practice-lesson").hidden = true;
    this.bonusCollected = new Set();
    this.deliveryDone = false;
    this.tokenMeshes.clear();
    this.carryMeshes.clear();
    this.carryObjects = (this.session.world.carryables ?? []).map((p) =>
      createCarryObject(p.id, p.x, p.y, p.z),
    );
    for (const token of this.session.world.tokens ?? []) {
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
      this.session.scene.add(mesh);
      this.tokenMeshes.set(token.id, mesh);
    }
    for (const object of this.carryObjects) {
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
      this.session.scene.add(group);
      this.carryMeshes.set(object.id, group);
    }
  }
  updateCollectionHud = () => {
    const parts: string[] = [];
    if (this.session.worldId === "house")
      parts.push(`Treasures ${this.session.collected.size} / 5`);
    if (
      this.session.world.tokens?.length &&
      (this.session.worldId !== "hub" || this.practiceVisible)
    )
      parts.push(
        `Tokens ${this.bonusCollected.size} / ${this.session.world.tokens.length}`,
      );
    if (this.session.world.delivery && this.practiceVisible)
      parts.push(this.deliveryDone ? "Bundle delivered" : "Bundle to deliver");
    el("collect-count").hidden = parts.length === 0;
    el("collect-count").textContent = parts.join(" · ");
  };

  updatePracticeLesson = () => {
    const b = this.session.world.practiceBounds;
    const inside =
      !!b &&
      this.session.player.y < 8 &&
      this.session.player.x > b.minX &&
      this.session.player.x < b.maxX &&
      this.session.player.z > b.minZ &&
      this.session.player.z < b.maxZ;
    el("practice-lesson").hidden = !inside;
    if (this.practiceVisible !== inside) {
      this.practiceVisible = inside;
      this.updateCollectionHud();
      this.hooks.updateObjective();
    }
    if (!inside) return;
    const lessons = this.session.world.tutorials ?? [];
    const lesson = [...lessons].sort(
      (a, b) =>
        Math.hypot(this.session.player.x - a.x, this.session.player.z - a.z) -
        Math.hypot(this.session.player.x - b.x, this.session.player.z - b.z),
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
    const held = this.carryObjects.some((object) => object.held);
    const move = held ? "carry" : this.session.player.move;
    if ((moves[move] || held) && !this.learnedMoves.has(move)) {
      this.learnedMoves.add(move);
      this.ui.message(`${moves[move] ?? "Carrying"} · Nice work!`, 1.5);
    }
    el("lesson-title").textContent = lesson.title;
    renderControlText(
      el("lesson-body"),
      lesson.instruction,
      this.ui.input.device,
    );
    el("lesson-progress").textContent =
      `Tokens ${this.bonusCollected.size} / ${this.session.world.tokens?.length ?? 0} · ${this.learnedMoves.size} moves tried`;
  };

  updatePickups(dt: number, time: number) {
    for (const object of this.carryObjects) {
      const mesh = this.carryMeshes.get(object.id)!;
      mesh.position.set(object.x, object.y, object.z);
      mesh.rotation.y = object.held
        ? this.session.player.yaw
        : object.vx * time * 0.03;
      const bounds = this.session.world.bounds;
      if (
        bounds &&
        (object.x < bounds.minX ||
          object.x > bounds.maxX ||
          object.z < bounds.minZ ||
          object.z > bounds.maxZ)
      )
        resetCarryObject(object);
    }
    for (const token of this.session.world.tokens ?? []) {
      const mesh = this.tokenMeshes.get(token.id)!;
      if (this.bonusCollected.has(token.id)) continue;
      mesh.rotation.y += dt * 1.5;
      mesh.position.y = token.y + Math.sin(time * 2.2) * 0.07;
      if (
        Math.hypot(
          this.session.player.x - token.x,
          this.session.player.y +
            (this.session.player.crouching ? 0.5 : 0.8) -
            token.y,
          this.session.player.z - token.z,
        ) < 0.85 &&
        hasLineOfSight(
          {
            ...this.session.player,
            y:
              this.session.player.y - (this.session.player.crouching ? 0.8 : 0),
          },
          token,
          this.session.world.solids,
        )
      ) {
        this.bonusCollected.add(token.id);
        this.analytics.discover(token.id);
        mesh.visible = false;
        this.hooks.sound("collect");
        this.updateCollectionHud();
        this.ui.message(
          this.bonusCollected.size === this.session.world.tokens!.length
            ? "Every discovery token found!"
            : `Discovery token · ${this.bonusCollected.size} / ${this.session.world.tokens!.length}`,
          2,
        );
      }
    }
    if (
      !this.deliveryDone &&
      this.session.world.delivery &&
      this.carryObjects.some((object) =>
        objectInTarget(object, this.session.world.delivery!),
      )
    ) {
      this.deliveryDone = true;
      this.analytics.discover("bundle_delivery");
      this.analytics.activity("bundle_delivery");
      this.updateCollectionHud();
      this.hooks.sound("win");
      this.ui.message(
        "Bundle delivered! Pick it up again to keep practicing.",
        3,
      );
    }
  }
}

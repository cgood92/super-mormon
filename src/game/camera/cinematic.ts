import * as T from "three";
import { cameraSegmentClear } from "./camera";
import type { Solid } from "../physics/physics";

export type StoryActor = {
  group: T.Object3D;
  gesture?: "talk" | "point" | "pray" | "recoil" | "work" | "bound";
  speaker?: boolean;
};
export type StoryShot = {
  /** An edited scene at a distant actor; enter and leave with a safe camera cut. */
  cutaway?: boolean;
  playerGesture?: StoryActor["gesture"];
  props?: { object: T.Object3D; to: { x: number; y: number; z: number } }[];
  actors?: StoryActor[];
  focus?: T.Object3D | { x: number; y: number; z: number };
  wide?: number;
};
const smooth = (t: number) => {
  const v = T.MathUtils.clamp(t, 0, 1);
  return v * v * (3 - 2 * v);
};
/** Render geometry is an additional constraint: decorative canopies and sails need no physics AABB. */
export class StoryMeshObstacles {
  private meshes: { mesh: T.Mesh; bounds: T.Box3; matrix: T.Matrix4 }[] = [];
  private raycaster = new T.Raycaster();
  constructor(root: T.Object3D | undefined, actors: readonly StoryActor[]) {
    if (!root) return;
    root.updateWorldMatrix(true, true);
    root.traverse((object) => {
      if (!(object instanceof T.Mesh)) return;
      for (
        let ancestor: T.Object3D | null = object;
        ancestor;
        ancestor = ancestor.parent
      ) {
        // LOD levels change as the shot moves. Cache every potential level so
        // a detailed surface cannot appear inside an already planned camera path.
        const lodLevel =
          ancestor.parent instanceof T.LOD &&
          ancestor.parent.levels.some((level) => level.object === ancestor);
        if (
          (!ancestor.visible && !lodLevel) ||
          actors.some((a) => a.group === ancestor)
        )
          return;
      }
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      if (
        materials.every(
          (m) => m.opacity < 0.95 || !m.depthWrite || m.side === T.BackSide,
        )
      )
        return;
      this.meshes.push({
        mesh: object,
        matrix: object.matrixWorld.clone(),
        bounds: new T.Box3().setFromObject(object),
      });
    });
  }
  private hit(mesh: T.Mesh, start: T.Vector3, end: T.Vector3): boolean {
    const delta = end.clone().sub(start),
      length = delta.length();
    if (length < 1e-7) return false;
    this.raycaster.set(start, delta.multiplyScalar(1 / length));
    this.raycaster.near = 0;
    this.raycaster.far = length;
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    const sides = materials.map((m) => m.side);
    materials.forEach((m) => (m.side = T.DoubleSide));
    const hits: T.Intersection[] = [];
    mesh.raycast(this.raycaster, hits);
    materials.forEach((m, i) => (m.side = sides[i]));
    return hits.some((hit) => hit.distance < length - 1e-5);
  }
  clear(start: T.Vector3, end: T.Vector3, radius = 0): boolean {
    const corridor = new T.Box3()
      .setFromPoints([start, end])
      .expandByScalar(radius + 0.001);
    for (const entry of this.meshes) {
      const { mesh, bounds } = entry;
      if (!entry.matrix.equals(mesh.matrixWorld)) {
        bounds.setFromObject(mesh);
        entry.matrix.copy(mesh.matrixWorld);
      }
      if (!bounds.intersectsBox(corridor)) continue;
      const shifts = [new T.Vector3()];
      if (radius > 0)
        for (const axis of [0, 1, 2])
          for (const sign of [-1, 1])
            shifts.push(new T.Vector3().setComponent(axis, radius * sign));
      for (const shift of shifts)
        if (this.hit(mesh, start.clone().add(shift), end.clone().add(shift)))
          return false;
      // A closed opaque mesh can contain an endpoint without crossing the travel segment.
      for (const position of [start, end])
        if (bounds.containsPoint(position)) {
          const extent = bounds.getSize(new T.Vector3()).length() + 1;
          if (
            this.hit(
              mesh,
              position,
              position.clone().add(new T.Vector3(extent, 0, 0)),
            ) &&
            this.hit(
              mesh,
              position,
              position.clone().add(new T.Vector3(-extent, 0, 0)),
            )
          )
            return false;
        }
      if (
        radius > 0 &&
        this.hit(
          mesh,
          end.clone().add(new T.Vector3(-radius, 0, 0)),
          end.clone().add(new T.Vector3(radius, 0, 0)),
        )
      )
        return false;
    }
    return true;
  }
}

export type StoryCameraPlan = {
  focus: T.Vector3;
  wide: T.Vector3;
  close: T.Vector3;
  radius: number;
  fallback: boolean;
  recovery?: T.Vector3;
};

/** Actors own the composition. A prop's origin may be buried inside its solid. */
export function planStoryCamera(
  camera: T.PerspectiveCamera,
  shot: StoryShot,
  solids: readonly Solid[],
  meshes = new StoryMeshObstacles(undefined, []),
): StoryCameraPlan {
  const actors = (shot.actors ?? []).filter((a) => a.group.visible);
  const anchor =
    actors[0]?.group.getWorldPosition(new T.Vector3()) ??
    camera.position.clone().add(new T.Vector3(0, -1, -5));
  const scale = actors[0]?.group.getWorldScale(new T.Vector3()).y ?? 1;
  const chest = anchor.clone().add(new T.Vector3(0, 1.05 * scale, 0));
  const focus = chest.clone();
  const others = actors
    .slice(1)
    .map((a) => a.group.getWorldPosition(new T.Vector3()))
    .filter((p) => p.distanceTo(anchor) < 9);
  if (others.length) {
    const center = others
      .reduce((sum, p) => sum.add(p), new T.Vector3())
      .multiplyScalar(1 / others.length)
      .add(new T.Vector3(0, 1.05 * scale, 0));
    focus.lerp(center, 0.25);
  }
  // A sphere enclosing the entire near plane also protects tilted shots and corners.
  const halfHeight =
    camera.near * Math.tan(T.MathUtils.degToRad(camera.fov / 2));
  const radius = Math.max(
    0.28,
    Math.hypot(halfHeight * camera.aspect, halfHeight, camera.near) + 0.12,
  );
  const targets = [
    chest,
    anchor.clone().add(new T.Vector3(0, 1.65 * scale, 0)),
    anchor.clone().add(new T.Vector3(0, 0.3 * scale, 0)),
  ];
  const probe = new T.PerspectiveCamera(
    camera.fov,
    camera.aspect,
    camera.near,
    camera.far,
  );
  const clear = (position: T.Vector3) => {
    if (
      position.distanceTo(chest) < 2.7 ||
      !cameraSegmentClear(position, position, solids, radius) ||
      !meshes.clear(position, position, radius)
    )
      return false;
    if (
      !targets.every(
        (target) =>
          cameraSegmentClear(position, target, solids, 0.035) &&
          meshes.clear(position, target),
      )
    )
      return false;
    probe.position.copy(position);
    probe.lookAt(focus);
    probe.updateMatrixWorld();
    const body = chest.clone().project(probe),
      head = targets[1].clone().project(probe),
      feet = targets[2].clone().project(probe);
    const height = Math.abs(head.y - feet.y);
    return (
      Math.abs(body.x) < 0.78 &&
      body.y > -0.4 &&
      body.y < 0.7 &&
      height > 0.1 &&
      height < 1.35 &&
      head.z < 1
    );
  };
  const routeClear = (a: T.Vector3, b: T.Vector3) => {
    if (
      !cameraSegmentClear(a, b, solids, radius) ||
      !meshes.clear(a, b, radius)
    )
      return false;
    for (let i = 1; i <= 8; i++)
      if (!clear(a.clone().lerp(b, i / 8))) return false;
    return true;
  };
  const relative = camera.position.clone().sub(chest);
  const heading = Math.atan2(relative.x, relative.z);
  const preferred = Math.max(5.5, Math.min(10, shot.wide ?? 6.5));
  const candidates: { position: T.Vector3; score: number }[] = [];
  for (const turn of [
    0,
    0.26,
    -0.26,
    0.52,
    -0.52,
    0.79,
    -0.79,
    1.05,
    -1.05,
    1.57,
    -1.57,
    2.1,
    -2.1,
    Math.PI,
  ])
    for (const elevation of [0.3, 0.55, 0.85])
      for (const distance of [
        preferred,
        preferred * 0.8,
        preferred * 1.25,
        3.5,
      ]) {
        const position = focus
          .clone()
          .add(
            new T.Vector3(
              Math.sin(heading + turn) * distance,
              Math.max(1.1, distance * elevation),
              Math.cos(heading + turn) * distance,
            ),
          );
        candidates.push({
          position,
          score:
            Math.abs(turn) * 4 +
            Math.abs(distance - preferred) +
            Math.abs(elevation - 0.4) * 2 +
            position.distanceTo(camera.position) * 0.1,
        });
      }
  candidates.sort((a, b) => a.score - b.score);
  const initialSafe =
    cameraSegmentClear(camera.position, camera.position, solids, radius) &&
    meshes.clear(camera.position, camera.position, radius) &&
    targets.every(
      (t) =>
        cameraSegmentClear(camera.position, t, solids, 0.035) &&
        meshes.clear(camera.position, t),
    );
  const recovery = !initialSafe
    ? candidates.find((c) => clear(c.position))?.position.clone()
    : undefined;
  const start = recovery ?? camera.position;
  const wide =
    candidates
      .find((c) => clear(c.position) && routeClear(start, c.position))
      ?.position.clone() ?? start.clone();
  // A second, smaller move provides a push-in without ever squeezing toward a wall.
  const closeCandidate = focus.clone().lerp(wide, 0.84);
  const close =
    clear(closeCandidate) && routeClear(wide, closeCandidate)
      ? closeCandidate
      : wide.clone();
  return { focus, wide, close, radius, fallback: wide.equals(start), recovery };
}

/** Owns temporary poses and camera transforms only; narrative state stays with its scene. */
export class StoryCinematic {
  private elapsed = 0;
  private returning = false;
  private returnElapsed = 0;
  private originalPosition: T.Vector3;
  private originalRotation: T.Quaternion;
  private returnPosition = new T.Vector3();
  private returnRotation = new T.Quaternion();
  private poses: {
    object: T.Object3D;
    position: T.Vector3;
    rotation: T.Euler;
  }[] = [];
  private focus = new T.Vector3();
  private wide = new T.Vector3();
  private close = new T.Vector3();
  private speaker: StoryActor | undefined;
  private radius = 0.28;
  private meshes: StoryMeshObstacles;
  private fallback = false;
  private solids: readonly Solid[];
  private returnVia = new T.Vector3();
  private returnFirstLength = 0;
  private returnTotalLength = 0;
  private cutaway = false;
  private entrancePosition = new T.Vector3();
  private entranceRotation = new T.Quaternion();
  constructor(
    private camera: T.PerspectiveCamera,
    private shot: StoryShot,
    solids: readonly Solid[] = [],
    environment?: T.Object3D,
  ) {
    this.originalPosition = camera.position.clone();
    this.originalRotation = camera.quaternion.clone();
    this.speaker =
      (shot.actors ?? []).find((a) => a.speaker) ?? shot.actors?.[0];
    this.solids = solids;
    this.meshes = new StoryMeshObstacles(environment, shot.actors ?? []);
    const actor = shot.actors?.[0]?.group;
    let plan: StoryCameraPlan;
    if (shot.cutaway && actor) {
      const radius = Math.max(
        0.28,
        Math.hypot(
          camera.near *
            Math.tan(T.MathUtils.degToRad(camera.fov / 2)) *
            camera.aspect,
          camera.near * Math.tan(T.MathUtils.degToRad(camera.fov / 2)),
          camera.near,
        ) + 0.12,
      );
      const safe = (point: T.Vector3) =>
        cameraSegmentClear(point, point, solids, radius) &&
        this.meshes.clear(point, point, radius);
      if (!safe(this.originalPosition)) {
        const origin = this.originalPosition.clone();
        for (const offset of [
          ...Array.from(
            { length: 48 },
            (_, i) => new T.Vector3(0, (i + 1) * 0.3, 0),
          ),
          ...[1, 2, 3, 5].flatMap((distance) =>
            [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map(
              (angle) =>
                new T.Vector3(
                  Math.sin(angle) * distance,
                  distance,
                  Math.cos(angle) * distance,
                ),
            ),
          ),
        ]) {
          const candidate = origin.clone().add(offset);
          if (safe(candidate)) {
            this.originalPosition.copy(candidate);
            break;
          }
        }
      }
      const anchor = actor.getWorldPosition(new T.Vector3());
      const seeds = [
        new T.Vector3(0, 3, 6),
        new T.Vector3(6, 3, 0),
        new T.Vector3(-6, 3, 0),
        new T.Vector3(0, 3, -6),
        new T.Vector3(0, 5, 8),
        new T.Vector3(8, 5, 0),
        new T.Vector3(-8, 5, 0),
        new T.Vector3(0, 5, -8),
      ];
      const planned = seeds.map((offset) => {
        const probe = camera.clone();
        probe.position.copy(anchor).add(offset);
        probe.lookAt(anchor.clone().add(new T.Vector3(0, 1, 0)));
        return planStoryCamera(probe, shot, solids, this.meshes);
      });
      plan = planned.find((candidate) => !candidate.fallback) ?? planned[0];
      this.cutaway = safe(plan.wide) && !plan.fallback;
      if (this.cutaway) {
        camera.position.copy(plan.wide);
        camera.lookAt(plan.focus);
      } else plan = planStoryCamera(camera, shot, solids, this.meshes);
    } else plan = planStoryCamera(camera, shot, solids, this.meshes);
    this.fallback = plan.fallback;
    if (plan.recovery && !this.cutaway) {
      camera.position.copy(plan.recovery);
      camera.lookAt(plan.focus);
      this.originalPosition.copy(camera.position);
      this.originalRotation.copy(camera.quaternion);
    }
    this.focus.copy(plan.focus);
    this.wide.copy(plan.wide);
    this.close.copy(plan.close);
    this.radius = plan.radius;
    this.entrancePosition.copy(camera.position);
    this.entranceRotation.copy(camera.quaternion);
    for (const prop of shot.props ?? [])
      this.poses.push({
        object: prop.object,
        position: prop.object.position.clone(),
        rotation: prop.object.rotation.clone(),
      });
    for (const actor of shot.actors ?? [])
      actor.group.traverse((object) => {
        if (
          object === actor.group ||
          /^(left-arm|right-arm|head)$/.test(object.name)
        )
          this.poses.push({
            object,
            position: object.position.clone(),
            rotation: object.rotation.clone(),
          });
      });
  }
  get ready() {
    return this.elapsed >= 1.6;
  }
  get restoring() {
    return this.returning;
  }
  finish() {
    if (this.returning || !this.ready) return false;
    this.returning = true;
    if (this.cutaway) {
      this.restoreActors();
      return true;
    }
    this.returnPosition.copy(this.camera.position);
    this.returnRotation.copy(this.camera.quaternion);
    this.returnVia.copy(
      this.elapsed < 1.15 ? this.originalPosition : this.wide,
    );
    this.returnFirstLength = this.returnPosition.distanceTo(this.returnVia);
    this.returnTotalLength =
      this.returnFirstLength + this.returnVia.distanceTo(this.originalPosition);
    this.restoreActors();
    return true;
  }
  update(dt: number): boolean {
    dt = Math.max(0, Math.min(dt, 0.1));
    if (this.returning) {
      if (this.cutaway) {
        this.camera.position.copy(this.originalPosition);
        this.camera.quaternion.copy(this.originalRotation);
        return true;
      }
      this.returnElapsed += dt;
      const t = smooth(this.returnElapsed / 0.65);
      const travel = t * this.returnTotalLength;
      const desired =
        travel <= this.returnFirstLength
          ? this.returnPosition
              .clone()
              .lerp(
                this.returnVia,
                this.returnFirstLength > 0
                  ? travel / this.returnFirstLength
                  : 1,
              )
          : this.returnVia
              .clone()
              .lerp(
                this.originalPosition,
                this.returnTotalLength > this.returnFirstLength
                  ? (travel - this.returnFirstLength) /
                      (this.returnTotalLength - this.returnFirstLength)
                  : 1,
              );
      this.moveSafely(desired);
      this.camera.quaternion.slerpQuaternions(
        this.returnRotation,
        this.originalRotation,
        t,
      );
      return t >= 1;
    }
    this.elapsed += dt;
    for (const prop of this.shot.props ?? []) {
      const saved = this.poses.find((p) => p.object === prop.object)!;
      prop.object.position.lerpVectors(
        saved.position,
        new T.Vector3(prop.to.x, prop.to.y, prop.to.z),
        smooth((this.elapsed - 0.45) / 1.5),
      );
      prop.object.updateWorldMatrix(true, true);
    }
    const diagnostic =
      (this.shot.props?.length ?? 0) > 0 ? this.snapshot() : null;
    if (
      diagnostic &&
      (!diagnostic.clear || diagnostic.actorVisible === false)
    ) {
      const replacement = planStoryCamera(
        this.camera,
        this.shot,
        this.solids,
        this.meshes,
      );
      if (replacement.recovery) {
        this.camera.position.copy(replacement.recovery);
        this.camera.lookAt(replacement.focus);
      }
    }
    const target = this.wide
      .clone()
      .lerp(this.close, smooth((this.elapsed - 1) / 2.8));
    this.moveSafely(
      this.entrancePosition.clone().lerp(target, smooth(this.elapsed / 1.15)),
    );
    const rotation = new T.Matrix4().lookAt(
      this.camera.position,
      this.focus,
      this.camera.up,
    );
    const wanted = new T.Quaternion().setFromRotationMatrix(rotation);
    this.camera.quaternion.slerpQuaternions(
      this.entranceRotation,
      wanted,
      smooth(this.elapsed / 1.15),
    );
    const strength = smooth(this.elapsed / 0.55);
    for (const [i, actor] of (this.shot.actors ?? []).entries()) {
      const group = actor.group;
      const saved = this.poses.find((p) => p.object === group)!;
      const pulse = Math.sin(this.elapsed * 3.3 + i * 1.7);
      const partner =
        actor === this.speaker
          ? this.shot.actors?.find((a) => a !== actor)
          : this.speaker;
      if (partner && Math.abs(saved.rotation.x) < 0.6) {
        const here = group.getWorldPosition(new T.Vector3());
        const there = partner.group.getWorldPosition(new T.Vector3());
        const desired = Math.atan2(there.x - here.x, there.z - here.z);
        const parentRotation = group.parent?.getWorldQuaternion(
          new T.Quaternion(),
        );
        const parentYaw = parentRotation
          ? new T.Euler().setFromQuaternion(parentRotation, "YXZ").y
          : 0;
        const bodyYaw = group.getObjectByName("body")?.rotation.y ?? 0;
        const delta = Math.atan2(
          Math.sin(desired - parentYaw - saved.rotation.y - bodyYaw),
          Math.cos(desired - parentYaw - saved.rotation.y - bodyYaw),
        );
        group.rotation.y = saved.rotation.y + delta * strength;
      }
      group.position.y =
        saved.position.y + Math.sin(this.elapsed * 2 + i) * 0.018 * strength;
      const right = group.getObjectByName("right-arm"),
        left = group.getObjectByName("left-arm");
      const gesture = actor.gesture ?? "talk";
      if (right)
        right.rotation.x =
          gesture === "pray"
            ? -1.1
            : gesture === "bound"
              ? -0.6
              : gesture === "work"
                ? -1.1 + pulse * 0.6
                : -0.5 + pulse * 0.25;
      if (right)
        right.rotation.z =
          gesture === "point" ? -0.8 : gesture === "recoil" ? -0.7 : -0.18;
      if (
        left &&
        (gesture === "pray" || gesture === "bound" || gesture === "recoil")
      )
        left.rotation.x = -1.05 + pulse * 0.05;
      const head = group.getObjectByName("head");
      if (head) head.rotation.x = gesture === "pray" ? 0.3 : pulse * 0.06;
    }
    return false;
  }
  private moveSafely(position: T.Vector3) {
    const actor = this.shot.actors?.[0]?.group;
    const anchor = actor?.getWorldPosition(new T.Vector3());
    const scale = actor?.getWorldScale(new T.Vector3()).y ?? 1;
    const actorClear =
      !anchor ||
      [0.3, 1.05, 1.65].every((height) => {
        const target = anchor.clone().add(new T.Vector3(0, height * scale, 0));
        return (
          position.distanceTo(target) > 2.2 &&
          cameraSegmentClear(position, target, this.solids, 0.035) &&
          this.meshes.clear(position, target)
        );
      });
    if (
      actorClear &&
      cameraSegmentClear(
        this.camera.position,
        position,
        this.solids,
        this.radius,
      ) &&
      this.meshes.clear(this.camera.position, position, this.radius)
    )
      this.camera.position.copy(position);
  }
  snapshot() {
    const actor = this.shot.actors?.[0]?.group;
    const chest = actor?.getWorldPosition(new T.Vector3());
    if (chest) chest.y += 1.05 * actor!.getWorldScale(new T.Vector3()).y;
    this.camera.updateMatrixWorld();
    const projected = chest?.clone().project(this.camera);
    return {
      active: true,
      ready: this.ready,
      returning: this.returning,
      fallback: this.fallback,
      cutaway: this.cutaway,
      view: this.camera.position.toArray(),
      wide: this.wide.toArray(),
      close: this.close.toArray(),
      actorDistance: chest?.distanceTo(this.camera.position),
      clear:
        cameraSegmentClear(
          this.camera.position,
          this.camera.position,
          this.solids,
          this.radius,
        ) &&
        this.meshes.clear(
          this.camera.position,
          this.camera.position,
          this.radius,
        ),
      actorVisible: chest
        ? cameraSegmentClear(this.camera.position, chest, this.solids, 0.035) &&
          this.meshes.clear(this.camera.position, chest)
        : undefined,
      actorFrame: projected?.toArray(),
    };
  }
  private restoreActors() {
    for (const p of this.poses) {
      p.object.position.copy(p.position);
      p.object.rotation.copy(p.rotation);
    }
    for (const prop of this.shot.props ?? [])
      prop.object.updateWorldMatrix(true, true);
  }
  dispose() {
    this.restoreActors();
    this.camera.position.copy(this.originalPosition);
    this.camera.quaternion.copy(this.originalRotation);
  }
}

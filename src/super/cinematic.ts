import * as T from "three";
import { resolveCameraPosition } from "./camera";
import type { Solid } from "./physics";

export type StoryActor = {
  group: T.Object3D;
  gesture?: "talk" | "point" | "pray" | "recoil" | "work" | "bound";
  speaker?: boolean;
};
export type StoryShot = {
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
  constructor(
    private camera: T.PerspectiveCamera,
    private shot: StoryShot,
    solids: readonly Solid[] = [],
  ) {
    this.originalPosition = camera.position.clone();
    this.originalRotation = camera.quaternion.clone();
    this.speaker =
      (shot.actors ?? []).find((a) => a.speaker) ?? shot.actors?.[0];
    const points = (shot.actors ?? [])
      .filter((a) => a.group.visible)
      .map((a) => a.group.getWorldPosition(new T.Vector3()));
    if (shot.focus instanceof T.Object3D)
      this.focus.copy(shot.focus.getWorldPosition(new T.Vector3()));
    else if (shot.focus)
      this.focus.set(shot.focus.x, shot.focus.y, shot.focus.z);
    else if (points.length)
      points.forEach((p) => this.focus.addScaledVector(p, 1 / points.length));
    this.focus.y += 1.05;
    const offset = camera.position.clone().sub(this.focus);
    offset.y = 0;
    if (offset.lengthSq() < 0.1) offset.set(0.7, 0, 1);
    offset.normalize();
    const spread = points.reduce(
      (v, p) => Math.max(v, p.distanceTo(this.focus)),
      0,
    );
    const distance = Math.min(15, Math.max(5.5, spread * 1.65, shot.wide ?? 0));
    this.wide.copy(
      resolveCameraPosition(
        this.focus,
        this.focus
          .clone()
          .addScaledVector(offset, distance)
          .add(new T.Vector3(0, distance * 0.4, 0)),
        solids,
      ),
    );
    this.close.copy(
      resolveCameraPosition(
        this.focus,
        this.focus
          .clone()
          .addScaledVector(offset, distance * 0.78)
          .add(new T.Vector3(0, distance * 0.25, 0)),
        solids,
      ),
    );
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
    this.returnPosition.copy(this.camera.position);
    this.returnRotation.copy(this.camera.quaternion);
    this.restoreActors();
    return true;
  }
  update(dt: number): boolean {
    dt = Math.max(0, Math.min(dt, 0.1));
    if (this.returning) {
      this.returnElapsed += dt;
      const t = smooth(this.returnElapsed / 0.65);
      this.camera.position.lerpVectors(
        this.returnPosition,
        this.originalPosition,
        t,
      );
      this.camera.quaternion.slerpQuaternions(
        this.returnRotation,
        this.originalRotation,
        t,
      );
      return t >= 1;
    }
    this.elapsed += dt;
    const target = this.wide
      .clone()
      .lerp(this.close, smooth((this.elapsed - 1) / 2.8));
    this.camera.position.lerpVectors(
      this.originalPosition,
      target,
      smooth(this.elapsed / 1.15),
    );
    const rotation = new T.Matrix4().lookAt(
      this.camera.position,
      this.focus,
      this.camera.up,
    );
    const wanted = new T.Quaternion().setFromRotationMatrix(rotation);
    this.camera.quaternion.slerpQuaternions(
      this.originalRotation,
      wanted,
      smooth(this.elapsed / 1.15),
    );
    const strength = smooth(this.elapsed / 0.55);
    for (const prop of this.shot.props ?? []) {
      const saved = this.poses.find((p) => p.object === prop.object)!;
      prop.object.position.lerpVectors(
        saved.position,
        new T.Vector3(prop.to.x, prop.to.y, prop.to.z),
        smooth((this.elapsed - 0.45) / 1.5),
      );
    }
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
        const delta = Math.atan2(
          Math.sin(desired - parentYaw - saved.rotation.y),
          Math.cos(desired - parentYaw - saved.rotation.y),
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
  private restoreActors() {
    for (const p of this.poses) {
      p.object.position.copy(p.position);
      p.object.rotation.copy(p.rotation);
    }
  }
  dispose() {
    this.restoreActors();
    this.camera.position.copy(this.originalPosition);
    this.camera.quaternion.copy(this.originalRotation);
  }
}

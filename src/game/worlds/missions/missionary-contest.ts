/** A fictional, friendly neighborhood color game, not a claim about religious beliefs. */
export const HOUSE_DOORS = Array.from({ length: 16 }, (_, i) => {
  const row = Math.floor(i / 4),
    column = row % 2 ? 3 - (i % 4) : i % 4;
  return { x: -27 + column * 18, z: -27 + row * 18 + 4 };
});
export function createContest() {
  return {
    houses: Array.from(
      { length: 16 },
      () => "neutral" as "neutral" | "blue" | "red",
    ),
    protectedUntil: Array(16).fill(0) as number[],
    elapsed: 0,
    started: false,
    won: false,
    visitors: [0, 8].map((index) => ({
      index,
      x: HOUSE_DOORS[index].x,
      z: HOUSE_DOORS[index].z + 5,
      speed: 1.15,
      wait: 12,
      stage: 2,
    })),
  };
}
export type Contest = ReturnType<typeof createContest>;
export function tagHouse(game: Contest, index: number) {
  if (game.won || index < 0 || index >= 16) return;
  game.started = true;
  game.houses[index] = "blue";
  game.protectedUntil[index] = game.elapsed + 48;
  game.won = game.houses.every((color) => color === "blue");
}
export function visitHouse(game: Contest, index: number) {
  if (!game.won && game.elapsed >= game.protectedUntil[index])
    game.houses[index] = "red";
}
export function advanceContest(game: Contest, dt: number) {
  if (!game.started || game.won || !Number.isFinite(dt) || dt <= 0) return;
  dt = Math.min(dt, 1);
  game.elapsed += dt;
  for (const v of game.visitors) {
    if (v.wait > 0) {
      v.wait -= dt;
      continue;
    }
    const door = HOUSE_DOORS[v.index];
    // Each visit approaches from the open sidewalk. Row changes use the outside lane.
    const previous = HOUSE_DOORS[(v.index + 15) % 16];
    const rowChange = Math.abs(previous.z - door.z) > 1;
    const outside = previous.x < 0 ? -36 : 36;
    const points = rowChange
      ? [
          { x: outside, z: previous.z + 5 },
          { x: outside, z: door.z + 5 },
          { x: door.x, z: door.z + 5 },
          door,
        ]
      : [{ x: door.x, z: door.z + 5 }, door];
    const target = points[Math.min(v.stage, points.length - 1)];
    const dx = target.x - v.x,
      dz = target.z - v.z,
      d = Math.hypot(dx, dz),
      step = v.speed * dt;
    if (d <= step) {
      v.x = target.x;
      v.z = target.z;
      v.stage++;
      if (v.stage >= points.length) {
        visitHouse(game, v.index);
        v.index = (v.index + 1) % 16;
        v.stage = 0;
        v.wait = 9;
      }
    } else {
      v.x += (dx / d) * step;
      v.z += (dz / d) * step;
    }
  }
}

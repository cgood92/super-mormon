export type CameraRoom = {
  id: string;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  distance: number;
  elevation: number;
  targetHeight: number;
  entryEyes: { x: number; y: number; z: number }[];
  exitEyes: { x: number; y: number; z: number }[];
};
export function selectCameraRoom(
  rooms: readonly CameraRoom[],
  player: { x: number; z: number },
  activeId?: string,
): CameraRoom | undefined {
  const contains = (room: CameraRoom, margin: number) =>
    player.x >= room.bounds.minX - margin &&
    player.x <= room.bounds.maxX + margin &&
    player.z >= room.bounds.minZ - margin &&
    player.z <= room.bounds.maxZ + margin;
  // Doorway jitter keeps the existing view, but a neighboring room core wins.
  const entered = rooms.find(
    (room) => room.id !== activeId && contains(room, -0.15),
  );
  if (entered) return entered;
  const active = rooms.find((room) => room.id === activeId);
  if (active && contains(active, 0.45)) return active;
  return rooms.find((room) => contains(room, -0.15));
}

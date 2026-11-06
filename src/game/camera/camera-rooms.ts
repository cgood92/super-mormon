export type CameraRoom = {
  id: string;
  bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    minY?: number;
    maxY?: number;
  };
  viewBounds?: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    minY?: number;
    maxY?: number;
  };
  distance: number;
  elevation: number;
  targetHeight: number;
  entryEyes: { x: number; y: number; z: number }[];
  exitEyes: { x: number; y: number; z: number }[];
};
export function selectCameraRoom(
  rooms: readonly CameraRoom[],
  player: { x: number; y?: number; z: number },
  activeId?: string,
): CameraRoom | undefined {
  const contains = (room: CameraRoom, margin: number) => {
    if (
      player.x < room.bounds.minX - margin ||
      player.x > room.bounds.maxX + margin ||
      player.z < room.bounds.minZ - margin ||
      player.z > room.bounds.maxZ + margin
    )
      return false;
    if (player.y !== undefined) {
      if (
        room.bounds.minY !== undefined &&
        player.y < room.bounds.minY - margin
      )
        return false;
      if (
        room.bounds.maxY !== undefined &&
        player.y > room.bounds.maxY + margin
      )
        return false;
    }
    return true;
  };
  // Doorway jitter keeps the existing view, but a neighboring room core wins.
  const entered = rooms.find(
    (room) => room.id !== activeId && contains(room, -0.15),
  );
  if (entered) return entered;
  const active = rooms.find((room) => room.id === activeId);
  if (active && contains(active, 0.45)) return active;
  return rooms.find((room) => contains(room, -0.15));
}

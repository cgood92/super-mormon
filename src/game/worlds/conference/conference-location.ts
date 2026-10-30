/** Public-area labels for the interpretive building layout. */
export function conferenceLocation(p: { x: number; y: number; z: number }) {
  if (p.y >= 35.5)
    return {
      name: "Roof Gardens",
      hint: "Explore the gardens, fountains and mountain views.",
    };
  if (Math.abs(p.x) < 66 && p.z < 0)
    return {
      name: "The Auditorium",
      hint: "Take your time. Explore the auditorium and its balconies.",
    };
  if (p.y < 3 && p.x >= -87 && p.x <= -69 && p.z >= 4 && p.z <= 39)
    return { name: "Movement Studio", hint: "Practice at your own pace." };
  if (p.y < 3 && Math.abs(p.x) < 26 && p.z >= 14)
    return {
      name: "Story Gallery",
      hint: "Find a painting. Take a running jump.",
    };
  const level = Math.min(3, Math.floor((Math.max(0, p.y) + 0.4) / 12) + 1);
  return {
    name: `Level ${level} · Art Hallways`,
    hint: "",
  };
}

/** Original gallery illustrations; symbolic scenes, not historical reconstructions. */
export function drawThirdNephiPainting(
  ctx: CanvasRenderingContext2D,
  id: "signs" | "gathering" | "christ-bountiful",
) {
  const signs = id === "signs";
  const gathering = id === "gathering";
  const sky = ctx.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, signs ? "#344c80" : gathering ? "#8ebbbd" : "#abcbd1");
  sky.addColorStop(1, signs ? "#f3d29b" : "#f0dfb3");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 384, 512);
  ctx.fillStyle = "#82977e";
  ctx.beginPath();
  ctx.moveTo(0, 300);
  ctx.lineTo(90, 190);
  ctx.lineTo(170, 295);
  ctx.lineTo(290, 175);
  ctx.lineTo(384, 295);
  ctx.lineTo(384, 512);
  ctx.lineTo(0, 512);
  ctx.fill();
  ctx.fillStyle = "#c5ab7e";
  ctx.fillRect(0, 355, 384, 157);
  if (signs) {
    ctx.fillStyle = "#fff8d6";
    ctx.beginPath();
    for (let n = 0; n < 8; n++) {
      const radius = n % 2 ? 7 : 27;
      const angle = (n * Math.PI) / 4 - Math.PI / 2;
      const x = 264 + Math.cos(angle) * radius;
      const y = 105 + Math.sin(angle) * radius;
      if (n) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#9d805d";
    for (const [x, y, w] of [
      [10, 320, 85],
      [115, 295, 100],
      [244, 336, 110],
    ]) {
      ctx.fillRect(x, y, w, 110);
      ctx.fillRect(x - 5, y - 9, w + 10, 12);
    }
    ctx.strokeStyle = "#f4d9a6";
    ctx.lineWidth = 5;
    ctx.strokeRect(145, 326, 28, 80);
    for (let y = 340; y < 405; y += 15) {
      ctx.beginPath();
      ctx.moveTo(145, y);
      ctx.lineTo(173, y);
      ctx.stroke();
    }
  } else if (gathering) {
    ctx.fillStyle = "#a08d71";
    ctx.fillRect(20, 260, 344, 95);
    for (let i = 0; i < 8; i++) ctx.fillRect(20 + i * 44, 244, 24, 25);
    ctx.fillStyle = "#5b6453";
    ctx.fillRect(166, 286, 52, 70);
    ctx.fillStyle = "#ead6a3";
    ctx.beginPath();
    ctx.moveTo(168, 355);
    ctx.lineTo(218, 355);
    ctx.lineTo(328, 512);
    ctx.lineTo(55, 512);
    ctx.fill();
    for (const [x, y] of [
      [65, 418],
      [277, 445],
      [308, 396],
    ]) {
      ctx.fillStyle = "#775a3f";
      ctx.fillRect(x, y, 43, 31);
      ctx.fillStyle = "#d1b67c";
      ctx.fillRect(x + 5, y - 13, 33, 16);
    }
  } else {
    ctx.fillStyle = "#e9d8b5";
    for (let i = 0; i < 4; i++)
      ctx.fillRect(50 + i * 15, 345 - i * 21, 284 - i * 30, 33);
    ctx.fillRect(104, 210, 176, 90);
    ctx.fillStyle = "#f5e9cd";
    ctx.fillRect(91, 197, 202, 18);
    for (const x of [114, 160, 207, 254]) ctx.fillRect(x, 221, 14, 80);
    ctx.fillStyle = "#bca47c";
    ctx.fillRect(180, 241, 27, 60);
    const glow = ctx.createRadialGradient(192, 155, 0, 192, 155, 125);
    glow.addColorStop(0, "rgba(255,253,228,0.94)");
    glow.addColorStop(1, "rgba(255,253,228,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(45, 15, 295, 290);
  }
  // Gathered people share varied warm clothing; appearance never signals allegiance.
  for (let i = 0; i < 7; i++) {
    const x = 50 + i * 46;
    const y = 455 + Math.sin(i * 1.8) * 19;
    ctx.fillStyle = ["#5a7182", "#a97553", "#657953", "#d7bd87"][i % 4];
    ctx.beginPath();
    ctx.moveTo(x - 9, y + 30);
    ctx.lineTo(x - 6, y);
    ctx.lineTo(x + 6, y);
    ctx.lineTo(x + 10, y + 30);
    ctx.fill();
    ctx.fillStyle = "#b58b68";
    ctx.beginPath();
    ctx.arc(x, y - 7, 7, 0, Math.PI * 2);
    ctx.fill();
  }
}

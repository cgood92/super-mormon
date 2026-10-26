/** A small scene illustration; not a claim about Zarahemla's exact architecture. */
export function drawSamuelPainting(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = "#a9cbd0";
  ctx.fillRect(0, 0, 384, 512);
  ctx.fillStyle = "#f9e5a9";
  ctx.beginPath();
  ctx.arc(295, 100, 45, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#778a66";
  ctx.beginPath();
  ctx.moveTo(0, 245);
  ctx.lineTo(85, 155);
  ctx.lineTo(180, 255);
  ctx.lineTo(305, 177);
  ctx.lineTo(384, 245);
  ctx.lineTo(384, 365);
  ctx.lineTo(0, 365);
  ctx.fill();
  ctx.fillStyle = "#b3956e";
  ctx.fillRect(0, 292, 384, 220);
  ctx.fillStyle = "#dcc5a1";
  ctx.fillRect(0, 279, 384, 22);
  ctx.strokeStyle = "#897556";
  ctx.lineWidth = 3;
  for (let row = 0; row < 5; row++) {
    const y = 310 + row * 43;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(384, y);
    for (let x = row % 2 ? 20 : 65; x < 384; x += 95) {
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 43);
    }
    ctx.stroke();
  }
  // Samuel's rust mantle and raised hand mirror his playable silhouette.
  ctx.fillStyle = "#d7c69e";
  ctx.fillRect(165, 176, 47, 102);
  ctx.fillStyle = "#a34f36";
  ctx.beginPath();
  ctx.moveTo(165, 175);
  ctx.lineTo(184, 183);
  ctx.lineTo(181, 279);
  ctx.lineTo(149, 279);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(199, 180);
  ctx.lineTo(215, 175);
  ctx.lineTo(227, 279);
  ctx.lineTo(200, 279);
  ctx.fill();
  ctx.strokeStyle = "#b98059";
  ctx.lineWidth = 15;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(210, 188);
  ctx.lineTo(241, 162);
  ctx.lineTo(250, 117);
  ctx.stroke();
  ctx.fillStyle = "#b98059";
  ctx.beginPath();
  ctx.ellipse(189, 156, 20, 25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#302c27";
  ctx.beginPath();
  ctx.ellipse(186, 143, 23, 17, -0.2, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(167, 140, 8, 35);
  ctx.strokeStyle = "#587078";
  ctx.lineWidth = 3;
  for (const [x, y] of [
    [60, 205],
    [310, 230],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 30, y - 35);
    ctx.moveTo(x + 30, y - 35);
    ctx.lineTo(x + 19, y - 31);
    ctx.moveTo(x + 30, y - 35);
    ctx.lineTo(x + 27, y - 23);
    ctx.stroke();
  }
}

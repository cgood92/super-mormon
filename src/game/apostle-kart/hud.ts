import type { ApostleRacer } from "./roster";
import type { KartPhysics } from "./physics";
import type { KartItemType } from "./items";

export class KartHUD {
  public readonly container: HTMLElement;
  private readonly positionEl: HTMLElement;
  private readonly lapEl: HTMLElement;
  private readonly timerEl: HTMLElement;
  private readonly speedEl: HTMLElement;
  private readonly itemSlotEl: HTMLElement;
  private readonly quoteBannerEl: HTMLElement;
  private readonly minimapCanvas: HTMLCanvasElement;
  private readonly minimapCtx: CanvasRenderingContext2D | null;
  private readonly resultsModalEl: HTMLElement;

  // Touch Control Buttons
  public touchSteer = 0;
  public touchThrottle = 0;
  public touchBrake = false;
  public touchDrift = false;
  public touchItem = false;

  private quoteTimer = 0;

  constructor(parent: HTMLElement) {
    this.container = document.createElement("div");
    this.container.id = "kart-hud";
    this.container.style.cssText = `
      position: absolute;
      inset: 0;
      pointer-events: none;
      font-family: system-ui, -apple-system, sans-serif;
      user-select: none;
      z-index: 1000;
      overflow: hidden;
    `;

    // 1. Position Indicator (Top Right)
    this.positionEl = document.createElement("div");
    this.positionEl.style.cssText = `
      position: absolute;
      top: 24px;
      right: 28px;
      font-size: 52px;
      font-weight: 900;
      font-style: italic;
      color: #ffd700;
      text-shadow: 3px 3px 0 #111, -2px -2px 0 #111, 2px -2px 0 #111, -2px 2px 0 #111, 0 4px 14px rgba(0,0,0,0.7);
      letter-spacing: -1px;
    `;
    this.positionEl.textContent = "1ST";
    this.container.appendChild(this.positionEl);

    // 2. Lap Counter & Timer (Top Center)
    const headerEl = document.createElement("div");
    headerEl.style.cssText = `
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(8px);
      padding: 8px 24px;
      border-radius: 28px;
      border: 2px solid rgba(255, 215, 0, 0.4);
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    `;

    this.lapEl = document.createElement("div");
    this.lapEl.style.cssText = `
      font-size: 22px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: 1px;
    `;
    this.lapEl.textContent = "LAP 1/3";
    headerEl.appendChild(this.lapEl);

    this.timerEl = document.createElement("div");
    this.timerEl.style.cssText = `
      font-size: 15px;
      font-weight: 700;
      color: #ffd700;
      font-variant-numeric: tabular-nums;
    `;
    this.timerEl.textContent = "TIME 00:00.00";
    headerEl.appendChild(this.timerEl);

    this.container.appendChild(headerEl);

    // 3. Item Slot (Top Left)
    this.itemSlotEl = document.createElement("div");
    this.itemSlotEl.style.cssText = `
      position: absolute;
      top: 24px;
      left: 28px;
      width: 76px;
      height: 76px;
      border-radius: 18px;
      background: radial-gradient(circle, #2c3e50 0%, #1a252f 100%);
      border: 3.5px solid #ffd700;
      box-shadow: 0 6px 18px rgba(0,0,0,0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 38px;
    `;
    this.itemSlotEl.textContent = "❓";
    this.container.appendChild(this.itemSlotEl);

    // 4. Speedometer (Bottom Left)
    this.speedEl = document.createElement("div");
    this.speedEl.style.cssText = `
      position: absolute;
      bottom: 24px;
      left: 28px;
      font-size: 26px;
      font-weight: 900;
      font-style: italic;
      color: #ffffff;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
      background: rgba(0,0,0,0.5);
      padding: 6px 16px;
      border-radius: 14px;
    `;
    this.speedEl.textContent = "0 MPH";
    this.container.appendChild(this.speedEl);

    // 5. Quote Banner (Middle Top)
    this.quoteBannerEl = document.createElement("div");
    this.quoteBannerEl.style.cssText = `
      position: absolute;
      top: 90px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(27, 54, 93, 0.9);
      border: 2px solid #ffd700;
      color: #ffffff;
      padding: 8px 24px;
      border-radius: 24px;
      font-size: 15px;
      font-weight: 700;
      box-shadow: 0 6px 20px rgba(0,0,0,0.6);
      opacity: 0;
      transition: opacity 0.3s ease;
      white-space: nowrap;
    `;
    this.container.appendChild(this.quoteBannerEl);

    // 6. Mini-Map (Bottom Right)
    this.minimapCanvas = document.createElement("canvas");
    this.minimapCanvas.width = 170;
    this.minimapCanvas.height = 170;
    this.minimapCanvas.style.cssText = `
      position: absolute;
      bottom: 24px;
      right: 28px;
      width: 170px;
      height: 170px;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(6px);
      border: 2px solid rgba(255, 215, 0, 0.35);
      border-radius: 50%;
      box-shadow: 0 6px 20px rgba(0,0,0,0.5);
    `;
    this.minimapCtx = this.minimapCanvas.getContext("2d");
    this.container.appendChild(this.minimapCanvas);

    // 7. Results Modal (Initially Hidden)
    this.resultsModalEl = document.createElement("div");
    this.resultsModalEl.style.cssText = `
      position: absolute;
      inset: 0;
      background: rgba(10, 15, 28, 0.92);
      backdrop-filter: blur(12px);
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      pointer-events: auto;
      z-index: 2000;
    `;
    this.container.appendChild(this.resultsModalEl);

    // 8. Mobile On-Screen Touch Controls
    this.buildTouchControls();

    parent.appendChild(this.container);
  }

  private buildTouchControls() {
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (!isTouch) return;

    const touchArea = document.createElement("div");
    touchArea.style.cssText = `
      position: absolute;
      inset: 0;
      pointer-events: auto;
      z-index: 100;
    `;

    // Left Side: Steer Buttons
    const steerGroup = document.createElement("div");
    steerGroup.style.cssText = `
      position: absolute;
      bottom: 30px;
      left: 20px;
      display: flex;
      gap: 16px;
    `;

    const leftBtn = this.createTouchBtn(
      "◀",
      () => (this.touchSteer = -1.0),
      () => (this.touchSteer = 0),
    );
    const rightBtn = this.createTouchBtn(
      "▶",
      () => (this.touchSteer = 1.0),
      () => (this.touchSteer = 0),
    );
    steerGroup.appendChild(leftBtn);
    steerGroup.appendChild(rightBtn);
    touchArea.appendChild(steerGroup);

    // Right Side: Gas, Brake, Drift, Item Buttons
    const actionGroup = document.createElement("div");
    actionGroup.style.cssText = `
      position: absolute;
      bottom: 30px;
      right: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: flex-end;
    `;

    const topRow = document.createElement("div");
    topRow.style.cssText = "display: flex; gap: 12px;";
    const itemBtn = this.createTouchBtn(
      "⚡ ITEM",
      () => (this.touchItem = true),
      () => (this.touchItem = false),
      "#9b59b6",
    );
    const driftBtn = this.createTouchBtn(
      "🌀 DRIFT",
      () => (this.touchDrift = true),
      () => (this.touchDrift = false),
      "#3498db",
    );
    topRow.appendChild(itemBtn);
    topRow.appendChild(driftBtn);

    const bottomRow = document.createElement("div");
    bottomRow.style.cssText = "display: flex; gap: 12px;";
    const brakeBtn = this.createTouchBtn(
      "🛑 BRAKE",
      () => (this.touchBrake = true),
      () => (this.touchBrake = false),
      "#e74c3c",
    );
    const gasBtn = this.createTouchBtn(
      "🏎️ GAS",
      () => (this.touchThrottle = 1.0),
      () => (this.touchThrottle = 0),
      "#2ecc71",
    );
    bottomRow.appendChild(brakeBtn);
    bottomRow.appendChild(gasBtn);

    actionGroup.appendChild(topRow);
    actionGroup.appendChild(bottomRow);
    touchArea.appendChild(actionGroup);

    this.container.appendChild(touchArea);
  }

  private createTouchBtn(
    label: string,
    onDown: () => void,
    onUp: () => void,
    bg = "#34495e",
  ): HTMLElement {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.style.cssText = `
      background: ${bg};
      color: #fff;
      border: 2px solid rgba(255,255,255,0.4);
      border-radius: 18px;
      padding: 14px 20px;
      font-size: 16px;
      font-weight: 800;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      user-select: none;
      touch-action: none;
    `;
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      onDown();
    });
    btn.addEventListener("pointerup", (e) => {
      e.preventDefault();
      onUp();
    });
    btn.addEventListener("pointercancel", (e) => {
      e.preventDefault();
      onUp();
    });
    return btn;
  }

  public showQuote(speaker: ApostleRacer, quote: string) {
    this.quoteBannerEl.textContent = `💬 ${speaker.shortName}: "${quote}"`;
    this.quoteBannerEl.style.opacity = "1";
    this.quoteTimer = 3.5;
  }

  public update(
    dt: number,
    playerPhysics: KartPhysics,
    allRacers: KartPhysics[],
    totalLaps: number,
    elapsedTime: number,
    heldItem: KartItemType | null,
    isRollingItem: boolean,
    trackWaypoints: { x: number; z: number }[],
  ): void {
    if (this.quoteTimer > 0) {
      this.quoteTimer -= dt;
      if (this.quoteTimer <= 0) {
        this.quoteBannerEl.style.opacity = "0";
      }
    }

    // 1. Calculate Player Rank
    const sortedRacers = [...allRacers].sort(
      (a, b) => b.totalDistanceTraveled - a.totalDistanceTraveled,
    );
    const rank = sortedRacers.indexOf(playerPhysics) + 1;
    const suffix =
      rank === 1 ? "ST" : rank === 2 ? "ND" : rank === 3 ? "RD" : "TH";
    this.positionEl.textContent = `${rank}${suffix}`;
    this.positionEl.style.color =
      rank === 1 ? "#ffd700" : rank <= 3 ? "#ecf0f1" : "#e67e22";

    // 2. Lap Display
    if (playerPhysics.currentLap >= totalLaps) {
      this.lapEl.textContent = "FINAL LAP!";
      this.lapEl.style.color = "#ff4757";
    } else {
      this.lapEl.textContent = `LAP ${playerPhysics.currentLap}/${totalLaps}`;
      this.lapEl.style.color = "#ffffff";
    }

    // 3. Race Timer
    const mins = Math.floor(elapsedTime / 60);
    const secs = Math.floor(elapsedTime % 60);
    const centis = Math.floor((elapsedTime * 100) % 100);
    this.timerEl.textContent = `TIME ${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${centis.toString().padStart(2, "0")}`;

    // 4. Speedometer (mph conversion)
    const mph = Math.round(playerPhysics.speed * 2.23694);
    this.speedEl.textContent = `${Math.max(0, mph)} MPH`;

    // 5. Item Slot Display
    if (isRollingItem) {
      const items: string[] = ["🟢", "🔴", "🎺", "🛡️", "🍪", "⭐", "⚡"];
      this.itemSlotEl.textContent =
        items[Math.floor(Date.now() / 80) % items.length];
    } else if (heldItem) {
      const icons: Record<KartItemType, string> = {
        "green-jello": "🟢",
        "funeral-potatoes": "🥔",
        "angel-moroni": "🎺",
        "ctr-ring": "🛡️",
        "swig-cookie": "🍪",
        "iron-rod": "⭐",
        "conference-chimes": "⚡",
      };
      this.itemSlotEl.textContent = icons[heldItem] ?? "❓";
    } else {
      this.itemSlotEl.textContent = "";
    }

    // 6. Draw Mini-Map
    this.drawMiniMap(trackWaypoints, playerPhysics, allRacers);
  }

  private drawMiniMap(
    waypoints: { x: number; z: number }[],
    player: KartPhysics,
    allRacers: KartPhysics[],
  ) {
    const ctx = this.minimapCtx;
    if (!ctx || waypoints.length === 0) return;

    ctx.clearRect(0, 0, 170, 170);

    // Compute bounds
    let minX = Infinity,
      maxX = -Infinity,
      minZ = Infinity,
      maxZ = -Infinity;
    waypoints.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    });

    const pad = 24;
    const mapW = maxX - minX || 1;
    const mapH = maxZ - minZ || 1;
    const scale = Math.min((170 - pad * 2) / mapW, (170 - pad * 2) / mapH);

    const toMapX = (wx: number) => 85 + (wx - (minX + mapW * 0.5)) * scale;
    const toMapY = (wz: number) => 85 + (wz - (minZ + mapH * 0.5)) * scale;

    // Draw Track Ribbon
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    waypoints.forEach((p, i) => {
      const mx = toMapX(p.x);
      const my = toMapY(p.z);
      if (i === 0) ctx.moveTo(mx, my);
      else ctx.lineTo(mx, my);
    });
    ctx.closePath();
    ctx.stroke();

    // Start / Finish Line
    const startX = toMapX(waypoints[0].x);
    const startY = toMapY(waypoints[0].z);
    ctx.fillStyle = "#ffd700";
    ctx.fillRect(startX - 4, startY - 4, 8, 8);

    // Draw Rival Racers Dots
    allRacers.forEach((racer) => {
      if (racer === player) return;
      const rx = toMapX(racer.position.x);
      const ry = toMapY(racer.position.z);
      ctx.fillStyle = `#${racer.racer.kartColor.toString(16).padStart(6, "0")}`;
      ctx.beginPath();
      ctx.arc(rx, ry, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw Player Dot (President Oaks) with Gold Crown Ring
    const px = toMapX(player.position.x);
    const py = toMapY(player.position.z);
    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.arc(px, py, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1b365d";
    ctx.beginPath();
    ctx.arc(px, py, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  public showRaceResults(
    allRacers: KartPhysics[],
    onRestart: () => void,
    onExit: () => void,
  ) {
    const sorted = [...allRacers].sort(
      (a, b) => b.totalDistanceTraveled - a.totalDistanceTraveled,
    );
    this.resultsModalEl.style.display = "flex";
    this.resultsModalEl.innerHTML = `
      <div style="background:#1e293b; border:3px solid #ffd700; border-radius:24px; max-width:620px; width:95%; padding:28px; box-shadow:0 12px 36px rgba(0,0,0,0.8); text-align:center;">
        <h1 style="color:#ffd700; font-size:32px; margin:0 0 8px 0; font-style:italic;">🏁 GENERAL CONFERENCE GRAND PRIX 🏁</h1>
        <p style="color:#94a3b8; font-size:15px; margin:0 0 20px 0;">Official Quorum of the Twelve Standings</p>
        
        <div style="max-height:320px; overflow-y:auto; border-radius:12px; background:#0f172a; padding:10px 14px; margin-bottom:24px; text-align:left;">
          ${sorted
            .map((r, i) => {
              const rankStr =
                i === 0
                  ? "🥇 1ST"
                  : i === 1
                    ? "🥈 2ND"
                    : i === 2
                      ? "🥉 3RD"
                      : `${i + 1}TH`;
              const isPlayer = r.racer.id === "oaks";
              return `
              <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; border-bottom:1px solid #1e293b; color:${isPlayer ? "#ffd700" : "#ffffff"}; font-weight:${isPlayer ? "800" : "600"}; font-size:14px;">
                <span><strong>${rankStr}</strong> ${r.racer.name}</span>
                <span style="color:#94a3b8; font-size:12px;">${r.racer.kartName}</span>
              </div>
            `;
            })
            .join("")}
        </div>

        <div style="display:flex; gap:16px; justify-content:center;">
          <button id="kart-retry-btn" style="background:#2ecc71; color:#fff; border:none; padding:12px 28px; border-radius:18px; font-size:16px; font-weight:800; cursor:pointer;">🔄 Race Again</button>
          <button id="kart-exit-btn" style="background:#475569; color:#fff; border:none; padding:12px 28px; border-radius:18px; font-size:16px; font-weight:800; cursor:pointer;">⌂ Return to Gallery</button>
        </div>
      </div>
    `;

    document.getElementById("kart-retry-btn")?.addEventListener("click", () => {
      this.resultsModalEl.style.display = "none";
      onRestart();
    });

    document.getElementById("kart-exit-btn")?.addEventListener("click", () => {
      this.resultsModalEl.style.display = "none";
      onExit();
    });
  }

  public dispose() {
    this.container.remove();
  }
}

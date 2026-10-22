export type ControlDevice = "keyboard" | "n64" | "gamepad" | "touch";

type ControlToken =
  | "jump"
  | "action"
  | "crouch"
  | "move"
  | "camera"
  | "recenter"
  | "pause"
  | "up"
  | "down"
  | "cLeft"
  | "cRight"
  | "cUp"
  | "cDown";

type Glyph = { text: string; label: string; kind: string };

const glyphs: Record<ControlDevice, Record<ControlToken, Glyph>> = {
  n64: {
    jump: { text: "A", label: "A button", kind: "n64-a" },
    action: { text: "B", label: "B button", kind: "n64-b" },
    crouch: { text: "Z", label: "Z trigger", kind: "n64-trigger" },
    move: { text: "", label: "Control stick", kind: "n64-stick" },
    camera: { text: "", label: "C buttons", kind: "n64-camera" },
    recenter: { text: "R", label: "R shoulder button", kind: "n64-shoulder" },
    pause: { text: "S", label: "Start button", kind: "n64-start" },
    up: {
      text: "↑",
      label: "Up direction on control stick",
      kind: "n64-stick",
    },
    down: {
      text: "↓",
      label: "Down direction on control stick",
      kind: "n64-stick",
    },
    cLeft: { text: "◀", label: "C-left button", kind: "n64-c" },
    cRight: { text: "▶", label: "C-right button", kind: "n64-c" },
    cUp: { text: "▲", label: "C-up button", kind: "n64-c" },
    cDown: { text: "▼", label: "C-down button", kind: "n64-c" },
  },
  keyboard: {
    jump: { text: "Space", label: "Space key", kind: "key" },
    action: { text: "E", label: "E key", kind: "key" },
    crouch: { text: "Shift", label: "Shift key", kind: "key" },
    move: { text: "WASD", label: "WASD or arrow keys", kind: "key" },
    camera: { text: "Q / C", label: "Q and C keys or drag", kind: "key" },
    recenter: { text: "R", label: "R key", kind: "key" },
    pause: { text: "Esc", label: "Escape key", kind: "key" },
    up: { text: "↑", label: "Up arrow key", kind: "key" },
    down: { text: "↓", label: "Down arrow key", kind: "key" },
    cLeft: { text: "Q", label: "Q key", kind: "key" },
    cRight: { text: "C", label: "C key", kind: "key" },
    cUp: { text: "Drag", label: "Drag to look up", kind: "key" },
    cDown: { text: "Drag", label: "Drag to look down", kind: "key" },
  },
  gamepad: {
    jump: { text: "A", label: "A button", kind: "pad-a" },
    action: { text: "B", label: "B button", kind: "pad-b" },
    crouch: { text: "LT", label: "LT button", kind: "pad-shoulder" },
    move: { text: "", label: "Left stick", kind: "pad-stick" },
    camera: { text: "", label: "Right stick", kind: "pad-stick" },
    recenter: { text: "LB", label: "LB button", kind: "pad-shoulder" },
    pause: { text: "Ⅱ", label: "Start button", kind: "pad-start" },
    up: { text: "↑", label: "Up direction on left stick", kind: "pad-stick" },
    down: {
      text: "↓",
      label: "Down direction on left stick",
      kind: "pad-stick",
    },
    cLeft: {
      text: "◀",
      label: "Look left with right stick",
      kind: "pad-stick",
    },
    cRight: {
      text: "▶",
      label: "Look right with right stick",
      kind: "pad-stick",
    },
    cUp: { text: "▲", label: "Look up with right stick", kind: "pad-stick" },
    cDown: {
      text: "▼",
      label: "Look down with right stick",
      kind: "pad-stick",
    },
  },
  touch: {
    jump: { text: "A", label: "A button", kind: "n64-a" },
    action: { text: "B", label: "B button", kind: "n64-b" },
    crouch: { text: "Z", label: "Z button", kind: "n64-trigger" },
    move: { text: "", label: "Virtual stick", kind: "pad-stick" },
    camera: {
      text: "↔",
      label: "Drag screen to look around",
      kind: "touch-gesture",
    },
    recenter: {
      text: "↻",
      label: "Recenter camera button",
      kind: "touch-gesture",
    },
    pause: { text: "Ⅱ", label: "Pause button", kind: "touch-gesture" },
    up: { text: "↑", label: "Up on virtual stick", kind: "touch-gesture" },
    down: { text: "↓", label: "Down on virtual stick", kind: "touch-gesture" },
    cLeft: {
      text: "←",
      label: "Drag left to look left",
      kind: "touch-gesture",
    },
    cRight: {
      text: "→",
      label: "Drag right to look right",
      kind: "touch-gesture",
    },
    cUp: { text: "↑", label: "Drag up to look up", kind: "touch-gesture" },
    cDown: {
      text: "↓",
      label: "Drag down to look down",
      kind: "touch-gesture",
    },
  },
};

const tokens = new Set<ControlToken>(Object.keys(glyphs.n64) as ControlToken[]);
const textCache = new WeakMap<
  HTMLElement,
  { template: string; device: ControlDevice }
>();
const legendCache = new WeakMap<HTMLElement, ControlDevice>();
const legendTokens: { token: ControlToken; title: string }[] = [
  { token: "move", title: "MOVE" },
  { token: "jump", title: "JUMP" },
  { token: "crouch", title: "CROUCH" },
  { token: "camera", title: "CAMERA" },
  { token: "action", title: "ACTION" },
  { token: "recenter", title: "RECENTER" },
  { token: "pause", title: "PAUSE" },
];

export function controlLabel(
  token: ControlToken,
  device: ControlDevice,
): string {
  return glyphs[device][token].label;
}

function glyph(token: ControlToken, device: ControlDevice): HTMLElement {
  const spec = glyphs[device][token];
  const span = document.createElement("span");
  span.className = `control-glyph control-glyph--${spec.kind}`;
  span.setAttribute("role", "img");
  span.setAttribute("aria-label", spec.label);
  if (token === "camera" && device === "n64") {
    const cluster = document.createElement("span");
    cluster.className = "control-c-cluster";
    cluster.setAttribute("aria-hidden", "true");
    for (const direction of ["cUp", "cLeft", "cRight", "cDown"] as const) {
      const small = document.createElement("span");
      small.className = `control-glyph control-glyph--n64-c control-c-cluster__${direction}`;
      small.textContent = glyphs.n64[direction].text;
      cluster.append(small);
    }
    span.append(cluster);
  } else {
    span.textContent = spec.text;
  }
  return span;
}

/** Replace only recognized control placeholders. All other text remains literal text. */
export function renderControlText(
  target: HTMLElement,
  template: string,
  device: ControlDevice,
): void {
  const cached = textCache.get(target);
  if (cached?.template === template && cached.device === device) return;
  const fragment = document.createDocumentFragment();
  const pattern = /\{([A-Za-z]+)\}/g;
  let cursor = 0;
  for (const match of template.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor)
      fragment.append(document.createTextNode(template.slice(cursor, index)));
    const token = match[1] as ControlToken;
    fragment.append(
      tokens.has(token)
        ? glyph(token, device)
        : document.createTextNode(match[0]),
    );
    cursor = index + match[0].length;
  }
  if (cursor < template.length)
    fragment.append(document.createTextNode(template.slice(cursor)));
  target.replaceChildren(fragment);
  textCache.set(target, { template, device });
}

export function renderControlLegend(
  target: HTMLElement,
  device: ControlDevice,
): void {
  if (legendCache.get(target) === device) return;
  const fragment = document.createDocumentFragment();
  for (const item of legendTokens) {
    const entry = document.createElement("span");
    entry.className = "control-legend-item";
    entry.append(glyph(item.token, device));
    const title = document.createElement("b");
    title.textContent = item.title;
    entry.append(title);
    fragment.append(entry);
  }
  target.replaceChildren(fragment);
  legendCache.set(target, device);
}

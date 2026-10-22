import assert from "node:assert/strict";
import test from "node:test";
import {
  controlLabel,
  renderControlLegend,
  renderControlText,
} from "../src/super/controls.ts";

class FakeNode {
  children: FakeNode[] = [];
  className = "";
  textContent = "";
  attributes = new Map<string, string>();
  constructor(readonly tag: string) {}
  append(...nodes: FakeNode[]) {
    this.children.push(...nodes);
  }
  replaceChildren(...nodes: FakeNode[]) {
    this.children = nodes.flatMap((node) =>
      node.tag === "#fragment" ? node.children : [node],
    );
  }
  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }
  get allText(): string {
    return (
      this.textContent + this.children.map((node) => node.allText).join("")
    );
  }
  descendants(): FakeNode[] {
    return this.children.flatMap((node) => [node, ...node.descendants()]);
  }
}

function withDocument(run: () => void) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      createElement: (tag: string) => new FakeNode(tag),
      createDocumentFragment: () => new FakeNode("#fragment"),
      createTextNode: (text: string) => {
        const node = new FakeNode("#text");
        node.textContent = text;
        return node;
      },
    },
  });
  try {
    run();
  } finally {
    if (previous) Object.defineProperty(globalThis, "document", previous);
    else Reflect.deleteProperty(globalThis, "document");
  }
}

test("device labels name the actual controller controls", () => {
  assert.equal(controlLabel("jump", "n64"), "A button");
  assert.equal(controlLabel("action", "n64"), "B button");
  assert.equal(controlLabel("crouch", "n64"), "Z trigger");
  assert.equal(controlLabel("cLeft", "n64"), "C-left button");
  assert.equal(controlLabel("camera", "n64"), "C buttons");
  assert.equal(controlLabel("action", "keyboard"), "E key");
  assert.equal(controlLabel("jump", "keyboard"), "Space key");
  assert.equal(controlLabel("crouch", "gamepad"), "LT button");
  assert.equal(controlLabel("move", "touch"), "Virtual stick");
});

test("control text keeps literal markup as text and caches a stable render", () => {
  withDocument(() => {
    const target = new FakeNode("p");
    const html = target as unknown as HTMLElement;
    renderControlText(html, "Use {action} <script>alert(1)</script>", "n64");
    assert.equal(target.allText, "Use B <script>alert(1)</script>");
    assert.equal(
      target.descendants().some((node) => node.tag === "script"),
      false,
    );
    const glyph = target
      .descendants()
      .find((node) => node.className.includes("control-glyph"));
    assert.equal(glyph?.attributes.get("aria-label"), "B button");
    const oldChildren = target.children;
    renderControlText(html, "Use {action} <script>alert(1)</script>", "n64");
    assert.equal(target.children, oldChildren);
    renderControlText(
      html,
      "Use {action} <script>alert(1)</script>",
      "keyboard",
    );
    assert.equal(target.allText, "Use E <script>alert(1)</script>");
  });
});

test("legend switches device glyphs and names every action", () => {
  withDocument(() => {
    const target = new FakeNode("div");
    const html = target as unknown as HTMLElement;
    renderControlLegend(html, "n64");
    assert.equal(target.children.length, 7);
    assert.deepEqual(
      target
        .descendants()
        .filter((node) => node.tag === "b")
        .map((node) => node.allText),
      ["MOVE", "JUMP", "CROUCH", "CAMERA", "ACTION", "RECENTER", "PAUSE"],
    );
    assert.equal(
      target
        .descendants()
        .some((node) => node.attributes.get("aria-label") === "E key"),
      false,
    );
    renderControlLegend(html, "keyboard");
    assert.equal(
      target
        .descendants()
        .some((node) => node.attributes.get("aria-label") === "E key"),
      true,
    );
  });
});

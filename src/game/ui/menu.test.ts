import assert from "node:assert/strict";
import test from "node:test";
import { MenuNavigation } from "./menu.ts";

test("waits for neutral after reset before accepting a new tilt", () => {
  const menu = new MenuNavigation();
  menu.reset(3);
  assert.equal(menu.update(-1, 1 / 60), null);
  assert.equal(menu.update(-1, 1 / 60), null);
  assert.equal(menu.index, 0);
  assert.equal(menu.update(0.1, 1 / 60), null);
  assert.equal(menu.update(-1, 1 / 60), 1);
});

test("moves down and up immediately on new tilts and wraps at both ends", () => {
  const menu = new MenuNavigation();
  menu.reset(3);
  menu.update(0, 0);
  assert.equal(menu.update(-1, 0), 1);
  assert.equal(menu.update(0, 0), null);
  assert.equal(menu.update(1, 0), 0);
  assert.equal(menu.update(0, 0), null);
  assert.equal(menu.update(1, 0), 2);
  assert.equal(menu.update(-1, 0), 0);
});

test("repeats a held direction after 0.35 seconds, then every 0.16 seconds", () => {
  const menu = new MenuNavigation();
  menu.reset(4);
  menu.update(0, 0);
  assert.equal(menu.update(-1, 0), 1);
  for (let i = 0; i < 6; i++) assert.equal(menu.update(-1, 0.05), null);
  assert.equal(menu.update(-1, 0.05), 2);
  for (let i = 0; i < 3; i++) assert.equal(menu.update(-1, 0.05), null);
  assert.equal(menu.update(-1, 0.01), 3);
});

test("neutral releases a held direction and small stick noise never moves", () => {
  const menu = new MenuNavigation();
  menu.reset(3);
  menu.update(0, 0);
  assert.equal(menu.update(-1, 0), 1);
  assert.equal(menu.update(-0.2, 0.5), null);
  assert.equal(menu.update(-1, 0), 2);
});

test("reset changes the option count and clears the previous selection", () => {
  const menu = new MenuNavigation();
  menu.reset(3);
  menu.update(0, 0);
  menu.update(-1, 0);
  menu.reset(2);
  assert.equal(menu.index, 0);
  assert.equal(menu.update(-1, 0), null);
  menu.update(0, 0);
  assert.equal(menu.update(1, 0), 1);
});

test("empty menus and nonfinite frame times stay stable", () => {
  const menu = new MenuNavigation();
  menu.reset(0);
  menu.update(0, 0);
  assert.equal(menu.update(-1, Number.POSITIVE_INFINITY), null);
  assert.equal(menu.index, 0);
  menu.reset(2);
  menu.update(0, 0);
  assert.equal(menu.update(-1, Number.NaN), 1);
  assert.equal(menu.update(-1, Number.POSITIVE_INFINITY), null);
  assert.equal(menu.update(-1, -100), null);
});

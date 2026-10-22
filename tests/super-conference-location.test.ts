import test from "node:test";
import assert from "node:assert/strict";
import { conferenceLocation } from "../src/super/conference-location";

test("quiet exploration areas have location hints without story entry prompts", () => {
  assert.equal(
    conferenceLocation({ x: 0, y: 0, z: -30 }).name,
    "The Auditorium",
  );
  assert.equal(
    conferenceLocation({ x: 0, y: 36, z: -30 }).name,
    "Roof Gardens",
  );
  assert.equal(
    conferenceLocation({ x: 75, y: 24, z: -30 }).name,
    "Level 3 · Art Hallways",
  );
  assert.equal(
    conferenceLocation({ x: -78, y: 0, z: -50 }).name,
    "Movement Studio",
  );
  assert.equal(conferenceLocation({ x: 0, y: 0, z: 36 }).name, "Story Gallery");
  assert.doesNotMatch(
    conferenceLocation({ x: 0, y: 12, z: -30 }).hint,
    /painting|coin|jump/i,
  );
});

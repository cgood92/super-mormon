import assert from "node:assert/strict";
import test from "node:test";
import { Scene } from "three";
import { prepareWorld } from "./world-loading";
import type { WorldId } from "./worlds";

// Distinct titles catch a valid ID being sent to another world's builder.
const worldNames = {
  "jared-expedition": "Jared's Wilderness Journey",
  "jared-barges": "The Barge Builders",
  "shelem-stones": "The Sixteen Stones of Shelem",
  "jared-crossing": "Light upon the Waters",
  "ether-refuge": "Ether’s Refuge",
  "moroni-farewell": "Moroni’s Farewell",
  "peace-city": "A People of Peace",
  "mormon-records": "Mormon and the Hidden Records",
  missionary: "Neighborhood Color Challenge",
  signs: "Night Without Darkness",
  gathering: "Lachoneus's Gathering",
  "christ-bountiful": "Christ at Bountiful",
  samuel: "Samuel the Lamanite",
  "title-liberty": "The Title of Liberty",
  lehonti: "Lehonti on Mount Antipas",
  morianton: "Morianton's Flight",
  teancum: "Teancum's Night Mission",
  gid: "The Rescue at Gid",
  nephihah: "The Taking of Nephihah",
  hub: "Conference Center",
  streets: "Jerusalem",
  house: "Lehi’s House",
  palace: "Laban’s Palace",
  trade: "The Treasure Offer",
  night: "Jerusalem by Night",
  tree: "The Tree of Life",
  "broken-bow": "The Broken Bow",
  bountiful: "Bountiful",
  voyage: "Across the Great Waters",
  promised: "The Promised Land",
  vineyard: "The Olive Vineyard",
  jacob: "Jacob and Sherem",
  waters: "Waters of Mormon",
  ammon: "Ammon and the King's Flocks",
} satisfies Record<WorldId, string>;

for (const id of Object.keys(worldNames) as WorldId[]) {
  test(`${id} prepares the correct world and optional scene factories before building`, async () => {
    const scene = new Scene();
    const prepared = await prepareWorld(id);
    assert.equal(
      scene.children.length,
      0,
      "preparation must leave rendering inert",
    );
    assert.equal(
      typeof prepared.createTreeOfLifeScene,
      id === "tree" ? "function" : "undefined",
    );
    assert.equal(
      typeof prepared.createStoryScene,
      id === "trade" || id === "night" ? "function" : "undefined",
    );
    if (id === "tree") {
      const module = await import("../worlds/nephi/tree-of-life");
      assert.equal(
        prepared.createTreeOfLifeScene,
        module.createTreeOfLifeScene,
      );
    }
    if (id === "trade" || id === "night") {
      const module = await import("../worlds/jerusalem/story-scenes");
      assert.equal(prepared.createStoryScene, module.createStoryScene);
    }
    const world = prepared.buildWorld(id, scene);
    try {
      assert.equal(world.name, worldNames[id]);
      assert.ok(
        scene.children.length > 0,
        "the builder must populate the scene",
      );
      assert.ok(
        world.solids.length > 0,
        "the world must retain physical surfaces",
      );
    } finally {
      world.dispose?.();
    }
    assert.equal(
      scene.children.length,
      0,
      "disposal must release the built scene",
    );
  });
}

test("an unhandled world ID rejects instead of building Jerusalem", async () => {
  await assert.rejects(
    prepareWorld("unhandled-world" as WorldId),
    /Unhandled world: unhandled-world/,
  );
});

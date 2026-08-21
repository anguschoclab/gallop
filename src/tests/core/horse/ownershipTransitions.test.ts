import { describe, it, expect } from "vitest";
import {
  makePlayerOwned,
  makeNpcOwned,
  makeUnowned,
  isPlayerOwned,
  isNpcOwned,
  isUnowned,
  ownerKey,
  PLAYER_OWNER_ID,
} from "@/core/horse/ownership";
import { asNpcStableId } from "@/core/types/branded";
import type { Horse } from "@/core/horse/types";

describe("ownership transitions", () => {
  // Helper to create a minimal horse-like object with ownership
  function makeHorse(ownership: Horse["ownership"]): { ownership: Horse["ownership"] } {
    return { ownership };
  }

  describe("player -> NPC transfer", () => {
    it("changes ownership from player to npc", () => {
      const horse = makeHorse(makePlayerOwned());
      expect(isPlayerOwned(horse)).toBe(true);

      // Simulate transfer: FinanceHandler horse_transfer
      horse.ownership = makeNpcOwned(asNpcStableId("npc-stable-1"));
      expect(isNpcOwned(horse)).toBe(true);
      expect(isPlayerOwned(horse)).toBe(false);
    });
  });

  describe("NPC -> player transfer (claiming)", () => {
    it("changes ownership from npc to player", () => {
      const horse = makeHorse(makeNpcOwned(asNpcStableId("npc-1")));
      expect(isNpcOwned(horse)).toBe(true);

      // Simulate claiming by player
      horse.ownership = makePlayerOwned();
      expect(isPlayerOwned(horse)).toBe(true);
      expect(isNpcOwned(horse)).toBe(false);
    });
  });

  describe("NPC -> unowned (consignor dissolution)", () => {
    it("changes ownership from npc to unowned, NOT player", () => {
      const horse = makeHorse(makeNpcOwned(asNpcStableId("npc-1")));
      expect(isNpcOwned(horse)).toBe(true);

      // Simulate MarketHandler consignor dissolution
      // BUG FIX: was incorrectly setting owned=true, now sets unowned
      horse.ownership = makeUnowned();
      expect(isUnowned(horse)).toBe(true);
      expect(isPlayerOwned(horse)).toBe(false);
      expect(isNpcOwned(horse)).toBe(false);
    });
  });

  describe("unowned -> player (purchase)", () => {
    it("changes ownership from unowned to player", () => {
      const horse = makeHorse(makeUnowned());
      expect(isUnowned(horse)).toBe(true);

      // Simulate purchase by player
      horse.ownership = makePlayerOwned();
      expect(isPlayerOwned(horse)).toBe(true);
      expect(isUnowned(horse)).toBe(false);
    });
  });

  describe("unowned -> NPC (claiming by NPC)", () => {
    it("changes ownership from unowned to npc", () => {
      const horse = makeHorse(makeUnowned());
      expect(isUnowned(horse)).toBe(true);

      // Simulate claiming by NPC
      horse.ownership = makeNpcOwned(asNpcStableId("npc-2"));
      expect(isNpcOwned(horse)).toBe(true);
      expect(isUnowned(horse)).toBe(false);
    });
  });

  describe("ownerKey transitions", () => {
    it("player horse has PLAYER_OWNER_ID as ownerKey", () => {
      const horse = makeHorse(makePlayerOwned());
      expect(ownerKey(horse)).toBe(PLAYER_OWNER_ID);
    });

    it("npc horse has NpcStableId as ownerKey", () => {
      const stableId = asNpcStableId("npc-1");
      const horse = makeHorse(makeNpcOwned(stableId));
      expect(ownerKey(horse)).toBe(stableId);
    });

    it("unowned horse has null ownerKey", () => {
      const horse = makeHorse(makeUnowned());
      expect(ownerKey(horse)).toBe(null);
    });

    it("ownerKey changes correctly through transfer", () => {
      const horse = makeHorse(makePlayerOwned());
      expect(ownerKey(horse)).toBe(PLAYER_OWNER_ID);

      horse.ownership = makeNpcOwned(asNpcStableId("npc-1"));
      expect(ownerKey(horse)).toBe(asNpcStableId("npc-1"));

      horse.ownership = makeUnowned();
      expect(ownerKey(horse)).toBe(null);

      horse.ownership = makePlayerOwned();
      expect(ownerKey(horse)).toBe(PLAYER_OWNER_ID);
    });
  });

  describe("syndicate share devolution", () => {
    it("devolution changes ownership correctly when shares are transferred", () => {
      // When a syndicate devolves, the stallion's ownership changes
      // from player to npc (or vice versa) based on majority shareholder
      const stallion = makeHorse(makePlayerOwned());
      expect(isPlayerOwned(stallion)).toBe(true);

      // Simulate devolution: majority share goes to NPC
      stallion.ownership = makeNpcOwned(asNpcStableId("npc-buyer"));
      expect(isNpcOwned(stallion)).toBe(true);
      expect(ownerKey(stallion)).toBe(asNpcStableId("npc-buyer"));
    });
  });
});

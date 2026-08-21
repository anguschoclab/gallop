import { describe, it, expect } from "vitest";
import {
  isPlayerOwned,
  isNpcOwned,
  isUnowned,
  ownerKey,
  getStableId,
  makePlayerOwned,
  makeNpcOwned,
  makeUnowned,
  ownershipFromStableId,
  PLAYER_OWNER_ID,
  type HorseOwnership,
} from "@/core/horse/ownership";
import { asNpcStableId } from "@/core/types/branded";

describe("ownership model", () => {
  describe("isPlayerOwned", () => {
    it("returns true for player ownership", () => {
      expect(isPlayerOwned({ ownership: { type: "player" } })).toBe(true);
    });

    it("returns false for npc ownership", () => {
      expect(isPlayerOwned({ ownership: { type: "npc", stableId: asNpcStableId("s1") } })).toBe(
        false,
      );
    });

    it("returns false for unowned", () => {
      expect(isPlayerOwned({ ownership: { type: "unowned" } })).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isPlayerOwned(undefined)).toBe(false);
    });

    it("returns false for null", () => {
      expect(isPlayerOwned(null)).toBe(false);
    });
  });

  describe("isNpcOwned", () => {
    it("returns true for npc ownership", () => {
      expect(isNpcOwned({ ownership: { type: "npc", stableId: asNpcStableId("s1") } })).toBe(true);
    });

    it("returns false for player ownership", () => {
      expect(isNpcOwned({ ownership: { type: "player" } })).toBe(false);
    });

    it("returns false for unowned", () => {
      expect(isNpcOwned({ ownership: { type: "unowned" } })).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isNpcOwned(undefined)).toBe(false);
    });
  });

  describe("isUnowned", () => {
    it("returns true for unowned", () => {
      expect(isUnowned({ ownership: { type: "unowned" } })).toBe(true);
    });

    it("returns false for player ownership", () => {
      expect(isUnowned({ ownership: { type: "player" } })).toBe(false);
    });

    it("returns false for npc ownership", () => {
      expect(isUnowned({ ownership: { type: "npc", stableId: asNpcStableId("s1") } })).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isUnowned(undefined)).toBe(false);
    });
  });

  describe("ownerKey", () => {
    it("returns PLAYER_OWNER_ID for player-owned horse", () => {
      expect(ownerKey({ ownership: { type: "player" } })).toBe(PLAYER_OWNER_ID);
    });

    it("returns NpcStableId for npc-owned horse", () => {
      const stableId = asNpcStableId("npc-1");
      expect(ownerKey({ ownership: { type: "npc", stableId } })).toBe(stableId);
    });

    it("returns null for unowned horse", () => {
      expect(ownerKey({ ownership: { type: "unowned" } })).toBe(null);
    });

    it("returns null for undefined", () => {
      expect(ownerKey(undefined)).toBe(null);
    });

    it("returns null for null", () => {
      expect(ownerKey(null)).toBe(null);
    });
  });

  describe("getStableId", () => {
    it("returns NpcStableId for npc-owned horse", () => {
      const stableId = asNpcStableId("npc-1");
      expect(getStableId({ ownership: { type: "npc", stableId } })).toBe(stableId);
    });

    it("returns null for player-owned horse", () => {
      expect(getStableId({ ownership: { type: "player" } })).toBe(null);
    });

    it("returns null for unowned horse", () => {
      expect(getStableId({ ownership: { type: "unowned" } })).toBe(null);
    });

    it("returns null for undefined", () => {
      expect(getStableId(undefined)).toBe(null);
    });
  });

  describe("constructors", () => {
    it("makePlayerOwned produces { type: 'player' }", () => {
      expect(makePlayerOwned()).toEqual({ type: "player" });
    });

    it("makeNpcOwned produces { type: 'npc', stableId }", () => {
      const stableId = asNpcStableId("npc-1");
      expect(makeNpcOwned(stableId)).toEqual({ type: "npc", stableId });
    });

    it("makeUnowned produces { type: 'unowned' }", () => {
      expect(makeUnowned()).toEqual({ type: "unowned" });
    });
  });

  describe("ownershipFromStableId", () => {
    it("returns unowned for undefined stableId", () => {
      expect(ownershipFromStableId(undefined)).toEqual({ type: "unowned" });
    });

    it("returns unowned for empty string stableId", () => {
      expect(ownershipFromStableId("")).toEqual({ type: "unowned" });
    });

    it("returns npc-owned for a valid stableId", () => {
      const ownership = ownershipFromStableId("npc-stable-1");
      expect(ownership.type).toBe("npc");
      if (ownership.type === "npc") {
        expect(ownership.stableId).toBe("npc-stable-1");
      }
    });
  });

  describe("discriminated union exhaustiveness", () => {
    it("all three ownership types are mutually exclusive", () => {
      const player: HorseOwnership = makePlayerOwned();
      const npc: HorseOwnership = makeNpcOwned(asNpcStableId("s1"));
      const unowned: HorseOwnership = makeUnowned();

      expect(player.type).toBe("player");
      expect(npc.type).toBe("npc");
      expect(unowned.type).toBe("unowned");

      // Exactly one should be true for each
      expect(isPlayerOwned({ ownership: player })).toBe(true);
      expect(isNpcOwned({ ownership: player })).toBe(false);
      expect(isUnowned({ ownership: player })).toBe(false);

      expect(isPlayerOwned({ ownership: npc })).toBe(false);
      expect(isNpcOwned({ ownership: npc })).toBe(true);
      expect(isUnowned({ ownership: npc })).toBe(false);

      expect(isPlayerOwned({ ownership: unowned })).toBe(false);
      expect(isNpcOwned({ ownership: unowned })).toBe(false);
      expect(isUnowned({ ownership: unowned })).toBe(true);
    });
  });

  describe("MarketHandler bug regression", () => {
    it("a dissolved consignor should result in unowned, NOT player-owned", () => {
      // This tests the bug where MarketHandler set horse.stableId = undefined; horse.owned = true
      // which incorrectly marked consignor-dissolved horses as player-owned.
      // The fix: horse.ownership = makeUnowned()
      const ownership = makeUnowned();
      expect(ownership.type).toBe("unowned");
      expect(isPlayerOwned({ ownership })).toBe(false);
      expect(isUnowned({ ownership })).toBe(true);
    });
  });
});

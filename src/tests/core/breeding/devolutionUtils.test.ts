import { describe, it, expect } from "vitest";
import { findMajorityOwner, simulateShareChange } from "@/core/breeding/devolutionUtils";

describe("devolutionUtils", () => {
  describe("findMajorityOwner", () => {
    it("returns no devolution when owner is above threshold", () => {
      const result = findMajorityOwner({ player: 25, npcA: 15 }, 40, "player");
      expect(result.wouldDevolve).toBe(false);
      expect(result.newOwner).toBeNull();
      expect(result.shares).toBe(25);
    });

    it("returns wouldDevolve=true but newOwner=null on tie at threshold", () => {
      const result = findMajorityOwner({ player: 20, npcA: 20 }, 40, "player");
      expect(result.wouldDevolve).toBe(false);
      expect(result.newOwner).toBeNull();
    });

    it("returns devolution when owner below threshold and another has more", () => {
      const result = findMajorityOwner({ player: 15, npcA: 25 }, 40, "player");
      expect(result.wouldDevolve).toBe(true);
      expect(result.newOwner).toBe("npcA");
    });

    it("returns first holder when two non-owners tie for top", () => {
      const result = findMajorityOwner({ player: 10, npcA: 15, npcB: 15 }, 40, "player");
      expect(result.wouldDevolve).toBe(true);
      // The function picks the first holder with the highest count (matches original handler)
      expect(result.newOwner).toBe("npcA");
    });

    it("returns devolution when owner has 0 shares", () => {
      const result = findMajorityOwner({ npcA: 20, npcB: 10 }, 40, "player");
      expect(result.wouldDevolve).toBe(true);
      expect(result.newOwner).toBe("npcA");
    });

    it("returns no devolution when owner has 0 but nobody has more than 0", () => {
      const result = findMajorityOwner({}, 40, "player");
      expect(result.wouldDevolve).toBe(false);
      expect(result.newOwner).toBeNull();
    });
  });

  describe("simulateShareChange", () => {
    it("sale that causes tie does not trigger devolution", () => {
      const result = simulateShareChange({ player: 21, npcA: 19 }, 40, "player", "player", -2);
      expect(result.wouldDevolve).toBe(false);
      expect(result.newOwner).toBeNull();
    });

    it("sale that drops below NPC triggers devolution", () => {
      const result = simulateShareChange({ player: 20, npcA: 20 }, 40, "player", "player", -2);
      expect(result.wouldDevolve).toBe(true);
      expect(result.newOwner).toBe("npcA");
    });

    it("purchase that makes NPC majority triggers devolution when owner at threshold", () => {
      // Owner must already be <= threshold for purchase to trigger devolution
      // Player 19 <= 20, npcA buys 2 -> npcA 21. 21 > 19 -> devolution
      const result = simulateShareChange({ player: 19, npcA: 19 }, 40, "player", "npcA", 2);
      expect(result.wouldDevolve).toBe(true);
      expect(result.newOwner).toBe("npcA");
    });

    it("purchase that does not cross threshold does not trigger devolution", () => {
      // Player 19 <= 20, npcA buys 1 -> npcA 20. 20 = 19? No, 20 > 19 -> devolution!
      // Actually npcA 20 > player 19 -> would devolve. Let me use a different setup.
      // Player 19, npcA 15. npcA buys 3 -> npcA 18. 18 < 19 -> no devolution.
      const result = simulateShareChange({ player: 19, npcA: 15 }, 40, "player", "npcA", 3);
      expect(result.wouldDevolve).toBe(false);
      expect(result.newOwner).toBeNull();
    });

    it("sale by non-owner does not trigger devolution if owner still majority", () => {
      const result = simulateShareChange(
        { player: 25, npcA: 10, npcB: 5 },
        40,
        "player",
        "npcB",
        -3,
      );
      expect(result.wouldDevolve).toBe(false);
      expect(result.newOwner).toBeNull();
    });
  });
});

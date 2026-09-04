import { describe, it, expect } from "vitest";
import { personalityConsignmentPolicy } from "@/core/auction/auctionConsignment";
import { createTestHorse, createTestStable, createTestRng } from "@/tests/helpers";

describe("personalityConsignmentPolicy", () => {
  const rng = createTestRng();

  it("aggressive stable consigns weanlings", () => {
    const stable = createTestStable({ id: "s1", personality: "aggressive" });
    const horse = createTestHorse({
      id: "h1",
      age: 0,
      ownership: { type: "npc", stableId: stable.id },
    });
    const result = personalityConsignmentPolicy(stable, "weanling", [horse], rng);
    expect(result.consign).toHaveLength(1);
    expect(result.consign[0].id).toBe(horse.id);
  });

  it("win-now stable consigns fading mares as broodmares", () => {
    const stable = createTestStable({ id: "s1", personality: "win-now" });
    const horse = createTestHorse({
      id: "h1",
      age: 10,
      peakAge: 5,
      gender: "mare",
      ownership: { type: "npc", stableId: stable.id },
    });
    const result = personalityConsignmentPolicy(stable, "broodmare", [horse], rng);
    expect(result.consign).toHaveLength(1);
    expect(result.consign[0].id).toBe(horse.id);
  });

  it("does not consign horses already consigned", () => {
    const stable = createTestStable({ id: "s1", personality: "aggressive" });
    const horse = createTestHorse({
      id: "h1",
      age: 0,
      consignedSaleId: "sale-1",
      ownership: { type: "npc", stableId: stable.id },
    });
    const result = personalityConsignmentPolicy(stable, "weanling", [horse], rng);
    expect(result.consign).toHaveLength(0);
  });
});

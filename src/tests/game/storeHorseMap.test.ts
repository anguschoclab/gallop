import { describe, it, expect } from "vitest";
import { createTestHorse, createTestColt, createTestMare } from "@/tests/helpers";
import type { Horse } from "@/core/horse/types";

function makeHorseMap(horses: Horse[]): Map<string, Horse> {
  return new Map(horses.map((h) => [h.id, h]));
}

describe("horseMap O(1) lookups in store slices", () => {
  it("horseMap.get returns correct horse by ID", () => {
    const h1 = createTestHorse({ id: "h1", name: "Horse One" });
    const h2 = createTestHorse({ id: "h2", name: "Horse Two" });
    const horseMap = makeHorseMap([h1, h2]);

    expect(horseMap.get("h1")).toBe(h1);
    expect(horseMap.get("h2")).toBe(h2);
  });

  it("horseMap.get returns undefined for non-existent horse", () => {
    const horseMap = makeHorseMap([createTestHorse({ id: "h1" })]);
    expect(horseMap.get("nonexistent")).toBeUndefined();
  });

  it("horseMap works for breed() sire/dam lookup", () => {
    const sire = createTestColt({ id: "sire-1", name: "Sire" });
    const dam = createTestMare({ id: "dam-1", name: "Dam" });
    const horseMap = makeHorseMap([sire, dam]);

    // Simulate what breed() does: s.horseMap.get(sireId), s.horseMap.get(damId)
    const foundSire = horseMap.get("sire-1");
    const foundDam = horseMap.get("dam-1");

    expect(foundSire).toBe(sire);
    expect(foundDam).toBe(dam);
    expect(foundSire?.gender).toBe("colt");
    expect(foundDam?.gender).toBe("mare");
  });

  it("horseMap works for scoutHorse() lookup", () => {
    const horse = createTestHorse({ id: "scout-target", stableId: "npc-stable" });
    const horseMap = makeHorseMap([horse]);

    const found = horseMap.get("scout-target");
    expect(found).toBe(horse);
    expect(found?.stableId).toBe("npc-stable");
  });

  it("horseMap works for trainHorse() lookup", () => {
    const horse = createTestHorse({ id: "train-me", owned: true, energy: 80 });
    const horseMap = makeHorseMap([horse]);

    const found = horseMap.get("train-me");
    expect(found).toBe(horse);
    expect(found?.owned).toBe(true);
    expect(found?.energy).toBe(80);
  });

  it("horseMap works for withdrawConsignment() lookup", () => {
    const horse = createTestHorse({ id: "consign-1", consignedSaleId: "sale-1" });
    const horseMap = makeHorseMap([horse]);

    const found = horseMap.get("consign-1");
    expect(found).toBe(horse);
    expect(found?.consignedSaleId).toBe("sale-1");
  });

  it("horseMap works for runPrivateTrial() horse and stablemate lookup", () => {
    const horse = createTestHorse({ id: "trial-horse", owned: true, energy: 50 });
    const stablemate = createTestHorse({ id: "trial-mate", owned: true, energy: 40 });
    const horseMap = makeHorseMap([horse, stablemate]);

    expect(horseMap.get("trial-horse")).toBe(horse);
    expect(horseMap.get("trial-mate")).toBe(stablemate);
  });

  it("horseMap works for submitClaim() horse lookup", () => {
    const horse = createTestHorse({ id: "claim-target", owned: false, stableId: "npc-1" });
    const horseMap = makeHorseMap([horse]);

    const found = horseMap.get("claim-target");
    expect(found).toBe(horse);
    expect(found?.owned).toBe(false);
  });

  it("horseMap is populated from horses array", () => {
    const horses = [
      createTestHorse({ id: "h1" }),
      createTestHorse({ id: "h2" }),
      createTestHorse({ id: "h3" }),
    ];
    const horseMap = makeHorseMap(horses);

    expect(horseMap.size).toBe(3);
    for (const h of horses) {
      expect(horseMap.get(h.id)).toBe(h);
    }
  });
});

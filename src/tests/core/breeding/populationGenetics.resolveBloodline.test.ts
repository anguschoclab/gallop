import { describe, it, expect, beforeEach } from "vitest";
import { resolveBloodline } from "@/core/breeding/populationGenetics";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import type { Horse } from "@/game/types";
import { clearAllCaches } from "@/core/genetics/genotypeCache";

describe("populationGenetics - resolveBloodline", () => {
  let horseMap: Map<string, Horse>;

  beforeEach(() => {
    clearAllCaches();
    horseMap = new Map<string, Horse>();
  });

  it("returns Unaffiliated for a horse with no known bloodline and no pedigree", () => {
    const horse = createTestHorse({ id: "h1", name: "Random Horse" });
    // @ts-ignore force undefined bloodline for test
    horse.bloodline = undefined;
    horseMap.set("h1", horse);

    const result = resolveBloodline(horse, horseMap);
    expect(result).toBe("Unaffiliated");
  });

  it("returns cached bloodline if present on the horse object", () => {
    const horse = createTestHorse({ id: "h1", name: "Random Horse", bloodline: "Storm Cat" });
    horseMap.set("h1", horse);

    const result = resolveBloodline(horse, horseMap);
    expect(result).toBe("Storm Cat");
  });

  it("detects bloodline directly from horse name matching KNOWN_BLOODLINES", () => {
    const horse = createTestHorse({ id: "h1", name: "Northern Dancer" });
    // @ts-ignore force undefined bloodline for test
    horse.bloodline = undefined;
    horseMap.set("h1", horse);

    const result = resolveBloodline(horse, horseMap);
    expect(result).toBe("Northern Dancer");
  });

  it("detects bloodline from horse's sireName matching KNOWN_BLOODLINES", () => {
    const horse = createTestHorse({ id: "h1", name: "Random Foal", sireName: "Mr. Prospector" });
    // @ts-ignore force undefined bloodline for test
    horse.bloodline = undefined;
    horseMap.set("h1", horse);

    const result = resolveBloodline(horse, horseMap);
    expect(result).toBe("Mr. Prospector");
  });

  it("walks up the sire line in-game pedigree to find a known bloodline", () => {
    const grandsire = createTestHorse({ id: "gs1", name: "Galileo" });
    // @ts-ignore force undefined bloodline for test
    grandsire.bloodline = undefined;
    const sire = createTestHorse({ id: "s1", name: "Sire", pedigree: { generation: 1, name: "Sire", sireId: "gs1", damId: "" } as any });
    // @ts-ignore force undefined bloodline for test
    sire.bloodline = undefined;
    const foal = createTestHorse({ id: "f1", name: "Foal", pedigree: { generation: 2, name: "Foal", sireId: "s1", damId: "" } as any });
    // @ts-ignore force undefined bloodline for test
    foal.bloodline = undefined;

    horseMap.set("gs1", grandsire);
    horseMap.set("s1", sire);
    horseMap.set("f1", foal);

    const result = resolveBloodline(foal, horseMap);
    expect(result).toBe("Galileo");
  });

  it("returns Unaffiliated if max depth (6) is exceeded without finding a match", () => {
     let currentSireId = "sire_6";
     // @ts-ignore force undefined bloodline for test
     horseMap.set(currentSireId, createTestHorse({ id: currentSireId, name: "Unknown Sire 6", bloodline: undefined }));

     for (let i = 5; i >= 1; i--) {
        const nextSireId = `sire_${i}`;
        // @ts-ignore force undefined bloodline for test
        horseMap.set(nextSireId, createTestHorse({ id: nextSireId, name: `Unknown Sire ${i}`, bloodline: undefined, pedigree: { generation: i, name: `Unknown Sire ${i}`, sireId: currentSireId, damId: "" } as any }));
        currentSireId = nextSireId;
     }

     // @ts-ignore force undefined bloodline for test
     const foal = createTestHorse({ id: "foal", name: "Foal", bloodline: undefined, pedigree: { generation: 6, name: "Foal", sireId: currentSireId, damId: "" } as any });
     horseMap.set("foal", foal);

     const result = resolveBloodline(foal, horseMap);
     expect(result).toBe("Unaffiliated");
  });
});

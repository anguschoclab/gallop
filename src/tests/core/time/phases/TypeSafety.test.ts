import { describe, it, expect } from "vitest";
import type { Horse } from "@/core/horse/types";
import type { Jockey } from "@/core/jockey/types";
import type { Pedigree } from "@/game/types";

describe("Type safety — no as any needed for existing fields", () => {
  it("horse.insurancePolicy can be set to undefined", () => {
    const horse = {
      insurancePolicy: undefined,
    } as Partial<Horse>;
    horse.insurancePolicy = undefined;
    expect(horse.insurancePolicy).toBeUndefined();
  });

  it("jockey.isApprentice is accessible without cast", () => {
    const jockey = { isApprentice: true } as Partial<Jockey>;
    expect(jockey.isApprentice).toBe(true);
  });

  it("horse.climbingAptitude is accessible without cast", () => {
    const horse = { climbingAptitude: 1.0 } as Partial<Horse>;
    expect(horse.climbingAptitude).toBe(1.0);
  });

  it("horse.corneringAptitude is accessible without cast", () => {
    const horse = { corneringAptitude: 0.9 } as Partial<Horse>;
    expect(horse.corneringAptitude).toBe(0.9);
  });

  it("horse.pedigree is assignable to Pedigree type", () => {
    const horse = {
      pedigree: { name: "Test", generation: 0 },
    } as Partial<Horse>;
    const pedigree: Pedigree = horse.pedigree!;
    expect(pedigree.name).toBe("Test");
  });

  it("raceHistory entries have pacePositions, distance, surface, fieldSize", () => {
    const horse = {
      raceHistory: [
        {
          raceId: "r1",
          raceName: "Test Race",
          position: 1,
          day: 10,
          pacePositions: [1, 1, 1],
          distance: 1600,
          surface: "Turf",
          fieldSize: 8,
        },
      ],
    } as Partial<Horse>;
    const entry = horse.raceHistory![0];
    expect(entry.pacePositions).toEqual([1, 1, 1]);
    expect(entry.distance).toBe(1600);
    expect(entry.surface).toBe("Turf");
    expect(entry.fieldSize).toBe(8);
  });
});

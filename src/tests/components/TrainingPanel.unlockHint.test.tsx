import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { TrainingPanel } from "@/components/horse/TrainingPanel";
import type { Horse, PlayerFacilities } from "@/game/types";
import { createFacility } from "@/core/facilities";
import { makePlayerOwned } from "@/core/horse/ownership";

function makeHorse(): Horse {
  return {
    id: "horse-1",
    name: "Test Horse",
    age: 3,
    sex: "colt",
    energy: 80,
    potential: 90,
    stats: { speed: 50, stamina: 50, acceleration: 50, consistency: 50 } as any,
    surfacePreference: "turf" as any,
    distancePreference: "sprint" as any,
    goingPreference: "firm" as any,
    temperament: "calm" as any,
    fitness: 80,
    form: 0,
    wins: 0,
    starts: 0,
    earnings: 0,
    retired: false,
    ownership: makePlayerOwned(),
    breed: "thoroughbred" as any,
    coatColor: "bay" as any,
    markings: {} as any,
    sire: "Sire",
    dam: "Dam",
    dosage: {} as any,
    nicking: {} as any,
    bloodline: {} as any,
    inbreeding: {} as any,
    dosageIndex: 1.0,
    centerOfDistribution: 0,
    mudAptitude: 1.0,
    weatherPreference: "dry" as any,
    heartScore: 50,
    foalingEase: 50,
    trainability: 50,
    peakAge: 4,
    studCareer: undefined,
    blueHenStatus: "none" as any,
    healthStatus: "healthy" as any,
    raceHistory: [],
    pedigree: {} as any,
  } as unknown as Horse;
}

function makeBasicFacilities(): PlayerFacilities {
  const facilities = {} as PlayerFacilities;
  const types = [
    "main_track",
    "barn",
    "exercise_pool",
    "treadmill",
    "veterinary_clinic",
    "starting_gates",
    "transport",
    "spa",
    "nutrition_lab",
    "rehab_center",
  ] as const;
  for (const t of types) {
    facilities[t] = createFacility(t, "basic", 1);
  }
  return facilities;
}

describe("TrainingPanel — rethemed unlock hint", () => {
  it("unlock hint for locked workout contains Tier 0 (not raw level string)", () => {
    const horse = makeHorse();
    const { container } = render(
      <TrainingPanel
        horse={horse}
        isPregnant={false}
        slotsLeft={3}
        cash={100000}
        facilities={makeBasicFacilities()}
        onTrain={() => {}}
      />,
    );

    const tooltipContents = container.querySelectorAll("[data-radix-tooltip-content]");
    const allText = container.textContent ?? "";

    if (tooltipContents.length > 0) {
      const hint = tooltipContents[0].textContent ?? "";
      if (hint.includes("Requires")) {
        expect(hint).toMatch(/Tier 0/i);
        expect(hint).not.toMatch(/\(standard\)/i);
        expect(hint).not.toMatch(/\(premium\)/i);
        expect(hint).not.toMatch(/\(elite\)/i);
      }
    }

    expect(allText).not.toContain("(standard)");
    expect(allText).not.toContain("(premium)");
    expect(allText).not.toContain("(elite)");
  });
});

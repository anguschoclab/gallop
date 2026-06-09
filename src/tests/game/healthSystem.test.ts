import { describe, it, expect } from "vitest";
import { rollForInjury } from "@/core/health/healthSystem";
import { createRng } from "@/core/common/rng";
import type { Horse } from "@/game/types";
import type { StaffMember } from "@/core/staff/staffTypes";
import { createTestHorse } from "@/tests/helpers/createTestHorse";

describe("Health System - Injury Rolls", () => {
  const mockHorse = createTestHorse({
    id: "test-horse",
    energy: 100,
    genotype: {
      health: {
        bleeder: 0,
        ocd: 0,
      },
    } as any,
    ocdRisk: 0,
    stableId: "",
  });

  it("should rarely trigger injury for healthy horses", () => {
    const rng = createRng(123);
    const horse = { ...mockHorse } as Horse;

    // Run 1000 trials
    let injuries = 0;
    for (let i = 0; i < 1000; i++) {
      if (rollForInjury(rng, horse, 1)) {
        injuries++;
      }
    }

    // Base chance is 0.1%, so expected is ~1.
    // We expect it to be very low.
    expect(injuries).toBeLessThan(10);
  });

  it("should increase injury risk for exhausted horses", () => {
    const rng = createRng(123);
    const exhaustedHorse = { ...mockHorse, energy: 10 } as Horse;

    let injuries = 0;
    for (let i = 0; i < 1000; i++) {
      if (rollForInjury(rng, exhaustedHorse, 1)) {
        injuries++;
      }
    }

    // Risk is 3x for energy < 30
    expect(injuries).toBeGreaterThan(0);
  });

  it("should decrease injury risk with a veterinarian", () => {
    const rng1 = createRng(123);
    const rng2 = createRng(123);
    const horse = { ...mockHorse, energy: 20 } as Horse;

    const vet: StaffMember = {
      id: "vet-1",
      name: "Dr. Smith",
      role: "veterinarian",
      tier: "elite",
      salary: 1000,
      bonusValue: 0.5, // 50% reduction
      traits: [],
      stableId: "",
      fame: 0,
    };

    let withoutVet = 0;
    let withVet = 0;

    for (let i = 0; i < 5000; i++) {
      if (rollForInjury(rng1, horse, 1, [])) withoutVet++;
      if (rollForInjury(rng2, horse, 1, [vet])) withVet++;
    }

    expect(withVet).toBeLessThan(withoutVet);
  });
});

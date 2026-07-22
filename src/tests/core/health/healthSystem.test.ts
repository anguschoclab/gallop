import { describe, it, expect, vi, beforeEach } from "vitest";
import { rollForInjury } from "@/core/health/healthSystem";
import type { InjuryWeatherContext } from "@/core/health/healthSystem";
import type { Rng } from "@/core/common/rng";
import type { Horse } from "@/game/types";
import type { StaffMember } from "@/core/staff/staffTypes";

vi.mock("@/core/uuid", () => ({
  generateUUID: () => "test-uuid",
}));

describe("healthSystem - rollForInjury", () => {
  let mockRng: Rng;
  let baseHorse: Horse;

  beforeEach(() => {
    mockRng = {
      next: vi.fn(),
      int: vi.fn().mockReturnValue(10),
    } as unknown as Rng;

    baseHorse = {
      id: "h1",
      stableId: "s1",
      energy: 100,
      genotype: { health: { bleeder: [0, 0] } },
      ocdRisk: 0,
    } as Horse;
  });

  it("returns null if rng.next() > baseChance (no injury)", () => {
    vi.mocked(mockRng.next).mockReturnValue(0.5);
    expect(rollForInjury(mockRng, baseHorse, 1)).toBeNull();
  });

  it("returns minor injury on low severity roll", () => {
    // Base chance without modifiers is 0.001
    vi.mocked(mockRng.next).mockReturnValueOnce(0.0005).mockReturnValueOnce(0.5); // severity (below 0.68)

    const impact = rollForInjury(mockRng, baseHorse, 1);
    expect(impact).not.toBeNull();
    expect(impact?.severity).toBe("minor");
  });

  it("returns moderate injury on medium severity roll", () => {
    vi.mocked(mockRng.next).mockReturnValueOnce(0.0005).mockReturnValueOnce(0.75); // severity (between 0.68 and 0.88)

    const impact = rollForInjury(mockRng, baseHorse, 1);
    expect(impact?.severity).toBe("moderate");
  });

  it("returns major injury on high severity roll", () => {
    vi.mocked(mockRng.next).mockReturnValueOnce(0.0005).mockReturnValueOnce(0.9); // severity (between 0.88 and 0.94)

    const impact = rollForInjury(mockRng, baseHorse, 1);
    expect(impact?.severity).toBe("major");
  });

  it("returns career-ending injury on very high severity roll", () => {
    vi.mocked(mockRng.next).mockReturnValueOnce(0.0005).mockReturnValueOnce(0.95); // severity (> 0.94)

    const impact = rollForInjury(mockRng, baseHorse, 1);
    expect(impact?.severity).toBe("career-ending");
  });

  it("factors in vet bonus reducing injury chance", () => {
    const staff = [
      {
        stableId: "s1",
        role: "veterinarian",
        bonusValue: 0.5,
      },
    ] as unknown as StaffMember[];

    // Base chance = 0.001 * (1 - 0.5) = 0.0005
    // If rng roll is 0.0008, it should NOT trigger injury due to vet bonus
    vi.mocked(mockRng.next).mockReturnValue(0.0008);

    expect(rollForInjury(mockRng, baseHorse, 1, staff)).toBeNull();
  });

  it("factors in low energy increasing injury chance", () => {
    baseHorse.energy = 20; // < 30 triples chance = 0.003
    vi.mocked(mockRng.next)
      .mockReturnValueOnce(0.002) // Would fail normally (0.002 > 0.001), but succeeds here
      .mockReturnValueOnce(0.5);

    expect(rollForInjury(mockRng, baseHorse, 1)).not.toBeNull();
  });

  describe("genetics - bleeder risk", () => {
    it("increases injury chance based on bleeder genotype", () => {
      baseHorse.genotype = { health: { bleeder: [1, 1] } } as any;
      // bleederRisk = (1+1)/2 = 1, ocdRisk = 0 → added chance = 1 * 0.01 = 0.01
      // baseChance = 0.001 + 0.01 = 0.011
      vi.mocked(mockRng.next)
        .mockReturnValueOnce(0.005) // 0.005 < 0.011 → triggers injury
        .mockReturnValueOnce(0.5);

      expect(rollForInjury(mockRng, baseHorse, 1)).not.toBeNull();
    });

    it("does not trigger injury from bleeder alone if roll exceeds threshold", () => {
      baseHorse.genotype = { health: { bleeder: [1, 1] } } as any;
      // baseChance = 0.011, roll 0.012 > 0.011 → no injury
      vi.mocked(mockRng.next).mockReturnValue(0.012);

      expect(rollForInjury(mockRng, baseHorse, 1)).toBeNull();
    });
  });

  describe("genetics - OCD risk", () => {
    it("increases injury chance based on ocdRisk", () => {
      baseHorse.ocdRisk = 0.5;
      // added chance = 0.5 * 0.01 = 0.005
      // baseChance = 0.001 + 0.005 = 0.006
      vi.mocked(mockRng.next)
        .mockReturnValueOnce(0.003) // 0.003 < 0.006 → triggers injury
        .mockReturnValueOnce(0.5);

      expect(rollForInjury(mockRng, baseHorse, 1)).not.toBeNull();
    });

    it("combines bleeder and OCD risk additively", () => {
      baseHorse.genotype = { health: { bleeder: [1, 1] } } as any;
      baseHorse.ocdRisk = 0.5;
      // bleederRisk = 1, ocdRisk = 0.5 → added = 1.5 * 0.01 = 0.015
      // baseChance = 0.001 + 0.015 = 0.016
      vi.mocked(mockRng.next)
        .mockReturnValueOnce(0.012) // 0.012 < 0.016 → triggers injury
        .mockReturnValueOnce(0.5);

      expect(rollForInjury(mockRng, baseHorse, 1)).not.toBeNull();
    });
  });

  describe("weather and track conditions", () => {
    it("increases injury chance in storm weather", () => {
      const weatherCtx: InjuryWeatherContext = { pattern: "storm" };
      // weatherMult = 2.0, baseChance = 0.001 * 2.0 = 0.002
      vi.mocked(mockRng.next)
        .mockReturnValueOnce(0.0015) // 0.0015 < 0.002 → triggers injury
        .mockReturnValueOnce(0.5);

      expect(rollForInjury(mockRng, baseHorse, 1, [], weatherCtx)).not.toBeNull();
    });

    it("does not trigger injury in benign weather if roll exceeds base chance", () => {
      const weatherCtx: InjuryWeatherContext = { pattern: "clear" };
      // weatherMult = 1.0, baseChance = 0.001
      vi.mocked(mockRng.next).mockReturnValue(0.0015);

      expect(rollForInjury(mockRng, baseHorse, 1, [], weatherCtx)).toBeNull();
    });

    it("increases injury chance on heavy track condition", () => {
      const weatherCtx: InjuryWeatherContext = { trackCondition: "heavy" };
      // weatherMult = 1.6, baseChance = 0.001 * 1.6 = 0.0016
      vi.mocked(mockRng.next)
        .mockReturnValueOnce(0.0012) // 0.0012 < 0.0016 → triggers injury
        .mockReturnValueOnce(0.5);

      expect(rollForInjury(mockRng, baseHorse, 1, [], weatherCtx)).not.toBeNull();
    });

    it("stacks weather and track condition multipliers", () => {
      const weatherCtx: InjuryWeatherContext = {
        pattern: "rain",
        trackCondition: "yielding",
      };
      // weatherMult = 1.5 * 1.3 = 1.95, baseChance = 0.001 * 1.95 = 0.00195
      vi.mocked(mockRng.next)
        .mockReturnValueOnce(0.0017) // 0.0017 < 0.00195 → triggers injury
        .mockReturnValueOnce(0.5);

      expect(rollForInjury(mockRng, baseHorse, 1, [], weatherCtx)).not.toBeNull();
    });

    it("shifts severity threshold upward in adverse weather", () => {
      const weatherCtx: InjuryWeatherContext = { pattern: "storm" };
      // weatherMult = 2.0, severityShift = (2.0 - 1) * 0.04 = 0.04
      // catastrophicThreshold = 0.94 - 0.04 = 0.90
      // roll 0.91 > 0.90 → career-ending (would be "major" without weather shift)
      vi.mocked(mockRng.next)
        .mockReturnValueOnce(0.0005) // triggers injury
        .mockReturnValueOnce(0.91); // severity roll

      const impact = rollForInjury(mockRng, baseHorse, 1, [], weatherCtx);
      expect(impact?.severity).toBe("career-ending");
    });
  });
});

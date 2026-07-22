import { describe, it, expect, vi, beforeEach } from "vitest";
import { rollForInjury } from "@/core/health/healthSystem";
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
});

import { describe, it, expect, vi } from "vitest";
import { generateHealthInjuryImpacts } from "@/core/race/impacts/healthInjury";
import type { Horse } from "@/game/types";
import type { StaffMember } from "@/core/staff/staffTypes";
import type { InjuryWeatherContext } from "@/core/health/healthSystem";

// Mock dependencies to avoid complex logic during these isolated tests
vi.mock("@/core/health/healthSystem", () => ({
  rollForInjury: vi.fn(),
}));

vi.mock("@/core/horse/pricing", () => ({
  calculateBaseHorseValue: vi.fn(() => 100000),
}));

vi.mock("@/core/race/impacts/energyFormFame", () => ({
  generateEnergyImpact: vi.fn(() => ({ type: "energy_change" })),
}));

// We need to import the mocked functions to configure them in tests
import { rollForInjury } from "@/core/health/healthSystem";
import { generateEnergyImpact } from "@/core/race/impacts/energyFormFame";

describe("healthInjury", () => {
  const baseHorse: Horse = {
    id: "horse1",
    name: "Test Horse",
  } as unknown as Horse;

  const rng = { next: () => 0.5, int: (min: number, _max: number) => min } as any;
  const newDay = 1;
  const hiredStaff: StaffMember[] = [];
  const injuryWeatherCtx: InjuryWeatherContext = {};

  it("always pushes an energy impact", () => {
    vi.mocked(rollForInjury).mockReturnValueOnce(null);
    const impacts = generateHealthInjuryImpacts(
      baseHorse,
      newDay,
      hiredStaff,
      injuryWeatherCtx,
      rng,
    );

    expect(generateEnergyImpact).toHaveBeenCalledWith("horse1", newDay, rng, undefined);
    expect(impacts).toHaveLength(1);
    expect(impacts[0].type).toBe("energy_change");
  });

  it("pushes an injury impact if rollForInjury returns one", () => {
    const mockInjury = { type: "injury", severity: "minor" };
    vi.mocked(rollForInjury).mockReturnValueOnce(mockInjury as any);

    const impacts = generateHealthInjuryImpacts(
      baseHorse,
      newDay,
      hiredStaff,
      injuryWeatherCtx,
      rng,
    );

    expect(impacts).toHaveLength(2); // Energy + Injury
    expect(impacts).toContainEqual(mockInjury);
  });

  it("generates an insurance payout impact for career-ending injury with valid policy", () => {
    const mockInjury = { type: "injury", severity: "career-ending" };
    vi.mocked(rollForInjury).mockReturnValueOnce(mockInjury as any);

    const horseWithInsurance = {
      ...baseHorse,
      insurancePolicy: { type: "comprehensive", coveragePercent: 0.75 },
    } as unknown as Horse;

    const impacts = generateHealthInjuryImpacts(
      horseWithInsurance,
      newDay,
      hiredStaff,
      injuryWeatherCtx,
      rng,
    );

    expect(impacts).toHaveLength(3); // Energy + Injury + Insurance

    const payoutImpact = impacts.find((i) => i.type === "insurance_payout") as any;
    expect(payoutImpact).toBeDefined();
    expect(payoutImpact.horseId).toBe("horse1");
    // Expected payout = 100000 * 0.75 = 75000 (since INSURANCE_CONFIG.COVERAGE.comprehensive is 0.75)
    expect(payoutImpact.amount).toBe(75000);
  });

  it("does not generate insurance payout if injury is not career-ending", () => {
    const mockInjury = { type: "injury", severity: "major" };
    vi.mocked(rollForInjury).mockReturnValueOnce(mockInjury as any);

    const horseWithInsurance = {
      ...baseHorse,
      insurancePolicy: { type: "comprehensive", coveragePercent: 0.75 },
    } as unknown as Horse;

    const impacts = generateHealthInjuryImpacts(
      horseWithInsurance,
      newDay,
      hiredStaff,
      injuryWeatherCtx,
      rng,
    );

    expect(impacts).toHaveLength(2); // Energy + Injury only
    expect(impacts.find((i) => i.type === "insurance_payout")).toBeUndefined();
  });

  it("does not generate insurance payout if policy is 'none'", () => {
    const mockInjury = { type: "injury", severity: "career-ending" };
    vi.mocked(rollForInjury).mockReturnValueOnce(mockInjury as any);

    const horseWithNoInsurance = {
      ...baseHorse,
      insurancePolicy: { type: "none", coveragePercent: 0 },
    } as unknown as Horse;

    const impacts = generateHealthInjuryImpacts(
      horseWithNoInsurance,
      newDay,
      hiredStaff,
      injuryWeatherCtx,
      rng,
    );

    expect(impacts).toHaveLength(2); // Energy + Injury only
    expect(impacts.find((i) => i.type === "insurance_payout")).toBeUndefined();
  });
});

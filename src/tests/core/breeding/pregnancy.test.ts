import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolvePregnancies } from "@/core/breeding/pregnancy";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import type { Pregnancy, Horse, Stable } from "@/game/types";
import { GESTATION_DAYS, BREEDING_FEE, LIVE_FOAL_GUARANTEE_FEE } from "@/constants";
import * as horseFactory from "@/core/horse/horseFactory";

vi.mock("@/core/horse/horseFactory", () => ({
  resolveFoaling: vi.fn(),
}));

describe("resolvePregnancies", () => {
  const sireId = "sire1";
  const damId = "dam1";

  let mockSire: Horse;
  let mockDam: Horse;
  let mockPregnancy: Pregnancy;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSire = createTestHorse({ id: sireId, name: "SireName", gender: "colt" });
    mockSire.stud = {
      atStud: true,
      standingFee: 5000,
      lifetimeFoals: 0,
      lifetimeStakesFoals: 0,
      lifetimeG1Foals: 0,
      retirementDay: 1,
      currentSeasonFoals: 0,
      isSyndicated: false,
      sharesTotal: 0,
      sharesAvailable: 0,
      currentSyndicateValue: 0,
    } as any;
    mockDam = createTestHorse({ id: damId, name: "DamName", gender: "filly" });
    mockDam.foalsProduced = [];
    mockDam.blueHenStatus = {
      isBlueHen: false,
      stakesWinnersProduced: 0,
      group1WinnersProduced: 0,
      blueHenScore: 0,
      foalsProduced: 0,
    };

    mockPregnancy = {
      id: "preg1",
      sireId,
      damId,
      sireName: "SireName",
      damName: "DamName",

      conceivedDay: 1,
      dueDay: 1 + GESTATION_DAYS,
      isPlayerOwned: true,
      resolved: false,
      liveFoalGuarantee: false,
    };
  });

  it("skips pregnancy if dueDay is not yet reached", () => {
    const horses = [mockSire, mockDam];
    const stables: Stable[] = [];
    const usedNames = new Set<string>();

    // newDay is before dueDay
    const result = resolvePregnancies([mockPregnancy], horses, stables, usedNames, 10);

    expect(horseFactory.resolveFoaling).not.toHaveBeenCalled();
    expect(result.foals).toHaveLength(0);
    expect(result.pregnancies[0].resolved).toBe(false);
  });

  it("resolves a successful live foaling", () => {
    const horses = [mockSire, mockDam];
    const stables: Stable[] = [];
    const usedNames = new Set<string>();
    const newFoal = createTestHorse({
      id: "foal1",
      name: "NewFoal",
      pedigree: { sireId, damId, name: "foal", generation: 1 },
    });

    vi.mocked(horseFactory.resolveFoaling).mockReturnValue({
      kind: "live",

      foal: newFoal,
      transmission: false,
    });

    const result = resolvePregnancies(
      [mockPregnancy],
      horses,
      stables,
      usedNames,
      mockPregnancy.dueDay,
    );

    expect(horseFactory.resolveFoaling).toHaveBeenCalled();
    expect(result.foals).toHaveLength(1);
    expect(result.foals[0].id).toBe("foal1");
    expect(result.pregnancies[0].resolved).toBe(true);
    expect(result.studCareerUpdates).toHaveLength(1);
    expect(result.studCareerUpdates[0].horseId).toBe(sireId);
    expect(result.studCareerUpdates[0].studCareer.lifetimeFoals).toBe(1);
    expect(result.mareFoalingUpdates).toHaveLength(1);
    expect(result.mareFoalingUpdates[0].horseId).toBe(damId);
  });

  it("handles a stillbirth with NO live foal guarantee", () => {
    const horses = [mockSire, mockDam];
    const stables: Stable[] = [];
    const usedNames = new Set<string>();

    vi.mocked(horseFactory.resolveFoaling).mockReturnValue({
      kind: "complication",
      type: "stillbirth",
    });

    const result = resolvePregnancies(
      [mockPregnancy],
      horses,
      stables,
      usedNames,
      mockPregnancy.dueDay,
    );

    expect(result.foals).toHaveLength(0);
    expect(result.pregnancies[0].resolved).toBe(true);
    expect(result.cashAdjustment).toBe(0);
    expect(result.logs.some((l) => l.text.includes("exhausted"))).toBe(false); // only exhaustion text if guarantee
  });

  it("retries breeding on stillbirth WITH live foal guarantee", () => {
    mockPregnancy.liveFoalGuarantee = true;
    const horses = [mockSire, mockDam];
    const stables: Stable[] = [];
    const usedNames = new Set<string>();

    vi.mocked(horseFactory.resolveFoaling).mockReturnValue({
      kind: "complication",
      type: "stillbirth",
    });

    const result = resolvePregnancies(
      [mockPregnancy],
      horses,
      stables,
      usedNames,
      mockPregnancy.dueDay,
    );

    expect(result.foals).toHaveLength(0);
    expect(result.pregnancies[0].resolved).toBe(false);
    expect(result.pregnancies[0].reBreedingAttempts).toBe(1);
    expect(result.pregnancies[0].dueDay).toBe(mockPregnancy.dueDay + GESTATION_DAYS);
    expect(result.cashAdjustment).toBe(BREEDING_FEE + LIVE_FOAL_GUARANTEE_FEE); // Refunded on first failure
    expect(result.pregnancies[0].refunded).toBe(true);
  });

  it("exhausts live foal guarantee after 3 retries", () => {
    mockPregnancy.liveFoalGuarantee = true;
    mockPregnancy.reBreedingAttempts = 3;
    mockPregnancy.refunded = true; // Was refunded on a previous attempt
    const horses = [mockSire, mockDam];
    const stables: Stable[] = [];
    const usedNames = new Set<string>();

    vi.mocked(horseFactory.resolveFoaling).mockReturnValue({
      kind: "complication",
      type: "stillbirth",
    });

    const result = resolvePregnancies(
      [mockPregnancy],
      horses,
      stables,
      usedNames,
      mockPregnancy.dueDay,
    );

    expect(result.foals).toHaveLength(0);
    expect(result.pregnancies[0].resolved).toBe(true); // Fails after max retries
    expect(result.cashAdjustment).toBe(0); // Already refunded
    expect(result.logs.some((l) => l.text.includes("attempts exhausted"))).toBe(true);
  });
});

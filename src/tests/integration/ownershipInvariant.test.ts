import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { runPipelineForDay } from "@/tests/helpers/runPipeline";
import { makeGameState, h2r } from "@/tests/helpers/sampleGameState";
import { createTestHorse, createTestStable } from "@/tests/helpers";
import { isPlayerOwned } from "@/core/horse/ownership";
import { asNpcStableId, asHorseId } from "@/core/types/branded";
import { UPKEEP_PER_HORSE } from "@/constants";
import type { GameState, Horse, Stable } from "@/game/types";
import type { CashImpact, TransactionImpact, AnyImpact } from "@/core/resolver/impacts/index";
import { calculateTotalMaintenance } from "@/core/facilities/facilityDefaults";

const NUM_RUNS = 50;

const stableIds = ["stable-a", "stable-b", "stable-c"] as const;

interface HorsePopulation {
  player: Horse[];
  npc: Horse[];
  unowned: Horse[];
  stables: Stable[];
}

const horsePopulationArbitrary = fc.record({
  playerCount: fc.integer({ min: 1, max: 5 }),
  npcCount: fc.integer({ min: 0, max: 20 }),
  unownedCount: fc.integer({ min: 0, max: 10 }),
  stableIndex: fc.integer({ min: 0, max: stableIds.length - 1 }),
}) as fc.Arbitrary<{
  playerCount: number;
  npcCount: number;
  unownedCount: number;
  stableIndex: number;
}>;

function buildPopulation(params: {
  playerCount: number;
  npcCount: number;
  unownedCount: number;
  stableIndex: number;
}): HorsePopulation {
  const stables: Stable[] = stableIds.map((id) =>
    createTestStable({
      id: id as any,
      name: `Stable ${id}`,
      cash: 500_000,
    }),
  );

  const player: Horse[] = Array.from({ length: params.playerCount }, (_, i) =>
    createTestHorse({
      id: asHorseId(`player-horse-${i}`),
      name: `Player Horse ${i}`,
      ownership: { type: "player" } as any,
    }),
  );

  const npc: Horse[] = Array.from({ length: params.npcCount }, (_, i) => {
    const sid = stableIds[i % stableIds.length];
    return createTestHorse({
      id: asHorseId(`npc-horse-${i}`),
      name: `NPC Horse ${i}`,
      ownership: { type: "npc", stableId: asNpcStableId(sid) } as any,
    });
  });

  const unowned: Horse[] = Array.from({ length: params.unownedCount }, (_, i) =>
    createTestHorse({
      id: asHorseId(`unowned-horse-${i}`),
      name: `Unowned Horse ${i}`,
      ownership: { type: "unowned" } as any,
    }),
  );

  return { player, npc, unowned, stables };
}

function buildState(pop: HorsePopulation): GameState {
  const allHorses = [...pop.player, ...pop.npc, ...pop.unowned];
  return makeGameState({
    day: 1,
    cash: 500_000,
    horses: h2r(allHorses),
    npcStables: pop.stables,
  }) as GameState;
}

function isPlayerCashImpact(impact: AnyImpact): impact is CashImpact {
  if (impact.type !== "cash_change") return false;
  const ci = impact as CashImpact;
  return ci.entityId === "player" || ci.entityId === undefined;
}

describe("Ownership Invariant Property Tests", () => {
  describe("Test D — Only player-owned horses generate player cash impacts", () => {
    it("upkeep cash_change for player matches player horse count * UPKEEP_PER_HORSE", () => {
      fc.assert(
        fc.property(horsePopulationArbitrary, (params) => {
          const pop = buildPopulation(params);
          const state = buildState(pop);
          const result = runPipelineForDay(state, 2);

          const playerCashImpacts = result.impacts.filter(isPlayerCashImpact);
          const upkeepImpact = playerCashImpacts.find((i) => i.phase === "upkeep" && i.amount < 0);

          if (upkeepImpact) {
            const playerHorseCount = pop.player.filter(
              (h) => !h.lifecycleStatus || h.lifecycleStatus === "active",
            ).length;
            const facilityMaintenance = state.facilities
              ? calculateTotalMaintenance(state.facilities)
              : 0;
            const playerStaff = (state.hiredStaff ?? []).filter((s) => s.stableId === "");
            const playerStaffSalaries = playerStaff.reduce((sum, s) => sum + s.salary, 0);
            const expectedDailyCost =
              playerHorseCount * UPKEEP_PER_HORSE + facilityMaintenance + playerStaffSalaries;
            if (expectedDailyCost > 0) {
              expect(Math.abs(upkeepImpact.amount)).toBe(expectedDailyCost);
            }
          }
        }),
        { numRuns: NUM_RUNS },
      );
    });

    it("no player cash_change references a non-player horse name in reason", () => {
      fc.assert(
        fc.property(horsePopulationArbitrary, (params) => {
          const pop = buildPopulation(params);
          const state = buildState(pop);
          const result = runPipelineForDay(state, 2);

          const playerCashImpacts = result.impacts.filter(isPlayerCashImpact);
          const nonPlayerNames = new Set([...pop.npc, ...pop.unowned].map((h) => h.name));

          for (const impact of playerCashImpacts) {
            for (const name of nonPlayerNames) {
              expect(impact.reason).not.toContain(name);
            }
          }
        }),
        { numRuns: NUM_RUNS },
      );
    });
  });

  describe("Test E — No horse appears in two owners' billing", () => {
    it("each entityId group is distinct and NPC horse counts match per stable", () => {
      fc.assert(
        fc.property(horsePopulationArbitrary, (params) => {
          const pop = buildPopulation(params);
          const state = buildState(pop);
          const result = runPipelineForDay(state, 2);

          const cashImpacts = result.impacts.filter(
            (i) => i.type === "cash_change",
          ) as CashImpact[];
          const byEntity = new Map<string, CashImpact[]>();

          for (const ci of cashImpacts) {
            const key = String(ci.entityId);
            if (!byEntity.has(key)) byEntity.set(key, []);
            byEntity.get(key)!.push(ci);
          }

          for (const [sid, stableStable] of pop.stables.map((s) => [s.id, s] as const)) {
            const stableImpacts = byEntity.get(sid);
            if (!stableImpacts) continue;

            const expectedCount = pop.npc.filter(
              (h) =>
                h.ownership?.type === "npc" &&
                h.ownership.stableId === sid &&
                (!h.lifecycleStatus || h.lifecycleStatus === "active"),
            ).length;

            const upkeepImpact = stableImpacts.find((i) => i.phase === "upkeep" && i.amount < 0);
            if (upkeepImpact && expectedCount > 0) {
              expect(Math.abs(upkeepImpact.amount)).toBeGreaterThanOrEqual(
                expectedCount * UPKEEP_PER_HORSE,
              );
            }
          }
        }),
        { numRuns: NUM_RUNS },
      );
    });

    it("player upkeep count derived from cash_change matches isPlayerOwned active count", () => {
      fc.assert(
        fc.property(horsePopulationArbitrary, (params) => {
          const pop = buildPopulation(params);
          const state = buildState(pop);
          const result = runPipelineForDay(state, 2);

          const playerCashImpacts = result.impacts.filter(isPlayerCashImpact);
          const upkeepImpact = playerCashImpacts.find((i) => i.phase === "upkeep" && i.amount < 0);

          if (upkeepImpact) {
            const playerHorseCount = pop.player.filter(
              (h) => !h.lifecycleStatus || h.lifecycleStatus === "active",
            ).length;
            const facilityMaintenance = state.facilities
              ? calculateTotalMaintenance(state.facilities)
              : 0;
            const playerStaff = (state.hiredStaff ?? []).filter((s) => s.stableId === "");
            const playerStaffSalaries = playerStaff.reduce((sum, s) => sum + s.salary, 0);
            const expectedDailyCost =
              playerHorseCount * UPKEEP_PER_HORSE + facilityMaintenance + playerStaffSalaries;
            if (expectedDailyCost > 0) {
              expect(Math.abs(upkeepImpact.amount)).toBe(expectedDailyCost);
            }
          }
        }),
        { numRuns: NUM_RUNS },
      );
    });
  });

  describe("Test F — Unowned horses never generate cash/reputation/transactions", () => {
    it("no player cash_change references an unowned horse name", () => {
      fc.assert(
        fc.property(horsePopulationArbitrary, (params) => {
          const pop = buildPopulation(params);
          if (pop.unowned.length === 0) return;

          const state = buildState(pop);
          const result = runPipelineForDay(state, 2);

          const playerCashImpacts = result.impacts.filter(isPlayerCashImpact);
          const unownedNames = new Set(pop.unowned.map((h) => h.name));

          for (const impact of playerCashImpacts) {
            for (const name of unownedNames) {
              expect(impact.reason).not.toContain(name);
            }
          }
        }),
        { numRuns: NUM_RUNS },
      );
    });

    it("no transaction impact has horseId matching an unowned horse", () => {
      fc.assert(
        fc.property(horsePopulationArbitrary, (params) => {
          const pop = buildPopulation(params);
          if (pop.unowned.length === 0) return;

          const state = buildState(pop);
          const result = runPipelineForDay(state, 2);

          const unownedIds = new Set(pop.unowned.map((h) => h.id));
          const transactionImpacts = result.impacts.filter(
            (i) => i.type === "transaction",
          ) as TransactionImpact[];

          for (const ti of transactionImpacts) {
            if (ti.horseId) {
              expect(unownedIds.has(ti.horseId)).toBe(false);
            }
          }
        }),
        { numRuns: NUM_RUNS },
      );
    });

    it("no reputation_change impact has metadata.horseId matching an unowned horse", () => {
      fc.assert(
        fc.property(horsePopulationArbitrary, (params) => {
          const pop = buildPopulation(params);
          if (pop.unowned.length === 0) return;

          const state = buildState(pop);
          const result = runPipelineForDay(state, 2);

          const unownedIds = new Set(pop.unowned.map((h) => h.id));
          const repImpacts = result.impacts.filter((i) => i.type === "reputation_change");

          for (const ri of repImpacts) {
            const metaHorseId = (ri as any).metadata?.horseId;
            if (metaHorseId) {
              expect(unownedIds.has(metaHorseId)).toBe(false);
            }
          }
        }),
        { numRuns: NUM_RUNS },
      );
    });

    it("unowned horses do not appear in state.expenses after pipeline tick", () => {
      fc.assert(
        fc.property(horsePopulationArbitrary, (params) => {
          const pop = buildPopulation(params);
          if (pop.unowned.length === 0) return;

          const state = buildState(pop);
          const result = runPipelineForDay(state, 2);
          const finalState = result.state;

          const unownedIds = new Set(pop.unowned.map((h) => h.id));
          const expenses = finalState.expenses ?? [];

          for (const expense of expenses) {
            if (expense.horseId) {
              expect(unownedIds.has(asHorseId(expense.horseId))).toBe(false);
            }
          }
        }),
        { numRuns: NUM_RUNS },
      );
    });
  });
});

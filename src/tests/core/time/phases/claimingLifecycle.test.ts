import { describe, expect, it, vi } from "vitest";
import type { PipelineContext } from "@/platform/time/pipeline";
import type { RaceResolutionPorts } from "@/platform/time/pipelinePorts";
import type { GameState, Horse, Race, Stable } from "@/platform/game/types";
import type { ClaimingIntent } from "@/platform/resolver/intents";
import { claimRegistrationPhase } from "@/platform/time/phases/claimRegistration";
import { claimResolutionPhase } from "@/platform/time/phases/claimResolution";
import { raceResolutionPhase } from "@/platform/time/phases/raceResolution";
import { createTestHorse, createTestStable, createTestRng } from "@/tests/helpers";
import { h2r, makePipelineContext } from "@/tests/helpers/sampleGameState";
import { makeNpcOwned, makePlayerOwned } from "@/domains/horse/simulation/ownership";
import { asNpcStableId, asRaceId } from "@/shared/types/branded";
import { createInitialState } from "@/platform/game/store/initialization";
import { createStableAIState } from "@/domains/agents/simulation/npcCycleAI";
import { calculateOverallRating } from "@/domains/horse/simulation/stats";

const DAY = 10;
const BASE_STATE = createInitialState();

function gameStateFor(overrides: Partial<GameState>): GameState {
  const state = structuredClone(BASE_STATE);
  Object.assign(state, overrides);
  state.day = DAY;
  return state;
}

function claimingRace(horse: Horse, overrides: Partial<Race> = {}): Race {
  return {
    id: asRaceId("race-1"),
    name: "Canonical Claiming Race",
    day: DAY,
    distance: 1600,
    raceClass: "Claiming",
    entryFee: 0,
    purse: 10000,
    fieldSize: 8,
    entries: [{ horseId: horse.id, ownership: horse.ownership }],
    resolved: false,
    claimingPrice: 25000,
    ...overrides,
  };
}

function claimingIntent(
  horseId: string,
  claimantStableId: string | undefined,
  overrides: Partial<ClaimingIntent> = {},
): ClaimingIntent {
  return {
    id: `claim-intent-${claimantStableId ?? "player"}-${horseId}`,
    entityId: claimantStableId ?? "player",
    source: claimantStableId ? "npc" : "player",
    sourceId: claimantStableId,
    day: DAY,
    priority: 60,
    type: "claiming",
    raceId: "race-1",
    horseId,
    claimantStableId: claimantStableId ? asNpcStableId(claimantStableId) : undefined,
    claimingPrice: 25000,
    ...overrides,
  };
}

function aiManagerFor(stables: Stable[]): NonNullable<GameState["npcAIManager"]> {
  return {
    stableStates: Object.fromEntries(
      stables.map((stable) => [stable.id, createStableAIState(stable, DAY)]),
    ),
    globalDay: DAY,
    regionalKings: {},
  };
}

describe("canonical claiming lifecycle", () => {
  it("persists player and NPC claiming intents into state.claims once", () => {
    const horse = createTestHorse({ id: "horse-1", ownership: makePlayerOwned() });
    const stable = createTestStable({ id: "npc-1", cash: 100000 });
    const race = claimingRace(horse);
    const state = gameStateFor({
      horses: h2r([horse]),
      races: { [race.id]: race },
      npcStables: [stable],
      npcAIManager: aiManagerFor([stable]),
      claims: [],
    });
    const context = makePipelineContext({
      state,
      newDay: DAY,
      intents: [claimingIntent(horse.id, undefined), claimingIntent(horse.id, stable.id)],
    }) as PipelineContext;

    const result = claimRegistrationPhase.execute(context);

    expect(result.state.claims).toEqual([
      expect.objectContaining({
        id: "claim-intent-player-horse-1",
        raceId: race.id,
        horseId: horse.id,
        claimantStableId: undefined,
        price: 25000,
        day: DAY,
      }),
      expect.objectContaining({
        id: `claim-intent-${stable.id}-horse-1`,
        raceId: race.id,
        horseId: horse.id,
        claimantStableId: stable.id,
        price: 25000,
        day: DAY,
      }),
    ]);
    expect(
      result.state.npcAIManager?.stableStates[stable.id]?.claimingAI?.claimingHistory,
    ).toHaveLength(1);

    const repeated = claimRegistrationPhase.execute(result);
    expect(repeated.state.claims).toHaveLength(2);
    expect(
      repeated.state.npcAIManager?.stableStates[stable.id]?.claimingAI?.claimingHistory,
    ).toHaveLength(1);
  });

  it("settles each stored claim once and records real NPC outcomes", () => {
    const seller = createTestStable({ id: "seller", cash: 100000, horses: ["horse-1"] });
    const claimantA = createTestStable({ id: "claimant-a", cash: 100000 });
    const claimantB = createTestStable({ id: "claimant-b", cash: 100000 });
    const horse = createTestHorse({
      id: "horse-1",
      ownership: makeNpcOwned(asNpcStableId("seller")),
    });
    const race = claimingRace(horse);
    const stables = [seller, claimantA, claimantB];
    const state = gameStateFor({
      horses: h2r([horse]),
      races: { [race.id]: race },
      npcStables: stables,
      npcAIManager: aiManagerFor(stables),
      claims: [],
    });
    const registrationContext = makePipelineContext({
      state,
      newDay: DAY,
      intents: [claimingIntent(horse.id, claimantA.id), claimingIntent(horse.id, claimantB.id)],
    }) as PipelineContext;

    const registered = claimRegistrationPhase.execute(registrationContext);
    expect(registered.state.npcAIManager?.globalEconomicState?.claimingMarketActivity ?? 0).toBe(0);
    const resolvedRace = { ...race, resolved: true };
    const resolvedContext = {
      ...registered,
      state: {
        ...registered.state,
        races: { [race.id]: resolvedRace },
      },
      dailyRng: createTestRng("claim-winner"),
    } as PipelineContext;

    const settled = claimResolutionPhase.execute(resolvedContext);
    const transferImpacts = settled.impacts.filter((impact) => impact.type === "claiming");
    const cashImpacts = settled.impacts.filter((impact) => impact.type === "cash_change");
    const winnerImpact = transferImpacts[0];
    const winnerId = winnerImpact.type === "claiming" ? winnerImpact.toStableId : undefined;
    if (!winnerId) throw new Error("Expected a claiming transfer impact to identify the winner");
    const loserId = winnerId === claimantA.id ? claimantB.id : claimantA.id;

    expect(transferImpacts).toHaveLength(1);
    expect(cashImpacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entityId: winnerId, amount: -25000 }),
        expect.objectContaining({ entityId: seller.id, amount: 25000 }),
      ]),
    );
    expect(
      cashImpacts.some((impact: any) => impact.entityId === loserId && impact.amount > 0),
    ).toBe(false);
    expect(settled.state.claims).toEqual([]);
    expect(settled.state.npcAIManager?.globalEconomicState?.claimingMarketActivity).toBe(0.2);

    const winnerAI = settled.state.npcAIManager?.stableStates[winnerId]?.claimingAI;
    const loserAI = settled.state.npcAIManager?.stableStates[loserId]?.claimingAI;
    expect(winnerAI?.claimingHistory[0]).toMatchObject({ success: true });
    expect(winnerAI?.claimingHistory[0]?.value).toBe(calculateOverallRating(horse) * 1000 - 25000);
    expect(winnerAI?.learningState.outcomes).toHaveLength(1);
    expect(loserAI?.claimingHistory[0]).toMatchObject({ success: false, value: 0 });
    expect(loserAI?.learningState.outcomes).toHaveLength(1);

    const repeated = claimResolutionPhase.execute(settled);
    expect(repeated.impacts).toHaveLength(settled.impacts.length);
    expect(
      repeated.state.npcAIManager?.stableStates[winnerId]?.claimingAI?.learningState.outcomes,
    ).toHaveLength(1);
    expect(
      repeated.state.npcAIManager?.stableStates[loserId]?.claimingAI?.learningState.outcomes,
    ).toHaveLength(1);
  });

  it("does not let one NPC overdraw the same cash across multiple same-day claims", () => {
    const claimant = createTestStable({ id: "claimant", cash: 30000 });
    const seller = createTestStable({ id: "seller", cash: 100000 });
    const horseOne = createTestHorse({
      id: "horse-1",
      ownership: makeNpcOwned(asNpcStableId("seller")),
    });
    const horseTwo = createTestHorse({
      id: "horse-2",
      ownership: makeNpcOwned(asNpcStableId("seller")),
    });
    const raceOne = claimingRace(horseOne);
    const raceTwo = claimingRace(horseTwo, {
      id: asRaceId("race-2"),
      name: "Second Claiming Race",
    });
    const state = gameStateFor({
      horses: h2r([horseOne, horseTwo]),
      races: { [raceOne.id]: raceOne, [raceTwo.id]: raceTwo },
      npcStables: [seller, claimant],
      npcAIManager: aiManagerFor([seller, claimant]),
      claims: [],
    });
    const registered = claimRegistrationPhase.execute(
      makePipelineContext({
        state,
        newDay: DAY,
        intents: [
          claimingIntent(horseOne.id, claimant.id),
          claimingIntent(horseTwo.id, claimant.id, { raceId: raceTwo.id }),
        ],
      }) as PipelineContext,
    );
    const settled = claimResolutionPhase.execute({
      ...registered,
      state: {
        ...registered.state,
        races: {
          [raceOne.id]: { ...raceOne, resolved: true },
          [raceTwo.id]: { ...raceTwo, resolved: true },
        },
      },
    } as PipelineContext);

    expect(settled.impacts.filter((impact) => impact.type === "claiming")).toHaveLength(1);
    expect(
      settled.impacts.filter(
        (impact) =>
          impact.type === "cash_change" &&
          (impact as { entityId?: string }).entityId === claimant.id &&
          (impact as { amount?: number }).amount === -25000,
      ),
    ).toHaveLength(1);
    expect(settled.state.claims).toEqual([]);
    expect(
      settled.state.npcAIManager?.stableStates[claimant.id]?.claimingAI?.learningState.outcomes,
    ).toHaveLength(2);
  });

  it("attributes a winning player payment to the canonical player entity", () => {
    const seller = createTestStable({ id: "seller", cash: 100000 });
    const horse = createTestHorse({
      id: "horse-1",
      ownership: makeNpcOwned(asNpcStableId("seller")),
    });
    const race = claimingRace(horse);
    const state = gameStateFor({
      horses: h2r([horse]),
      races: { [race.id]: race },
      npcStables: [seller],
      claims: [],
      cash: 100000,
    });
    const registered = claimRegistrationPhase.execute(
      makePipelineContext({
        state,
        newDay: DAY,
        intents: [claimingIntent(horse.id, undefined)],
      }) as PipelineContext,
    );
    const settled = claimResolutionPhase.execute({
      ...registered,
      state: {
        ...registered.state,
        races: { [race.id]: { ...race, resolved: true } },
      },
    } as PipelineContext);

    expect(settled.impacts.filter((impact) => impact.type === "cash_change")).toEqual([
      expect.objectContaining({ entityId: "player", amount: -25000 }),
      expect.objectContaining({ entityId: seller.id, amount: 25000 }),
    ]);
  });

  it("voids a claim without a refund when the horse was withdrawn from claiming", () => {
    const claimant = createTestStable({ id: "claimant", cash: 100000 });
    const horse = createTestHorse({ id: "horse-1", ownership: makePlayerOwned() });
    const race = claimingRace(horse, {
      resolved: true,
      entries: [{ horseId: horse.id, ownership: horse.ownership, withdrawnFromClaiming: true }],
    });
    const state = gameStateFor({
      horses: h2r([horse]),
      races: { [race.id]: race },
      npcStables: [claimant],
      npcAIManager: aiManagerFor([claimant]),
      claims: [],
    });
    const context = makePipelineContext({
      state,
      newDay: DAY,
      intents: [claimingIntent(horse.id, claimant.id)],
    }) as PipelineContext;

    const registered = claimRegistrationPhase.execute(context);
    const settled = claimResolutionPhase.execute(registered);

    expect(settled.state.claims).toEqual([]);
    expect(settled.impacts.filter((impact) => impact.type === "cash_change")).toEqual([]);
    expect(
      settled.state.npcAIManager?.stableStates[claimant.id]?.claimingAI?.claimingHistory[0],
    ).toMatchObject({ success: false, value: 0 });
  });

  it("leaves claim settlement to claimResolution instead of consuming intents in raceResolution", () => {
    const claimant = createTestStable({ id: "claimant", cash: 100000 });
    const horse = createTestHorse({ id: "horse-1", ownership: makePlayerOwned() });
    const race = claimingRace(horse);
    const state = gameStateFor({
      horses: h2r([horse]),
      races: { [race.id]: race },
      npcStables: [claimant],
      npcAIManager: aiManagerFor([claimant]),
      claims: [],
    });
    const resolveClaiming: RaceResolutionPorts["resolveClaiming"] = vi.fn(() => ({
      impacts: [],
      transfers: [],
      withdrawnClaims: [],
      voidedClaims: [],
      unaffordableClaims: [],
      losingClaims: [],
    }));
    const raceResolutionPorts: RaceResolutionPorts = {
      resolveClaiming,
      simulate: () => ({
        raceId: race.id,
        result: [{ horseId: horse.id, position: 1, time: 96 }],
        runners: [],
        snapshots: [],
        paceSnapshots: [],
        factorLedgers: {},
      }),
      generateImpacts: () => [],
      recordRaceHistory: () => null,
      checkHallOfFame: () => null,
      checkTrackRecords: () => [],
    };
    const context = makePipelineContext({
      state,
      newDay: DAY,
      intents: [claimingIntent(horse.id, claimant.id)],
      ports: { raceResolution: raceResolutionPorts },
    }) as PipelineContext;

    raceResolutionPhase.execute(context);
    expect(resolveClaiming).not.toHaveBeenCalled();
  });
});

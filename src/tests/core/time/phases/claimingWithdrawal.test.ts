/**
 * Tests for claiming withdrawal phase
 */

import { describe, it, expect } from "vitest";
import { claimingWithdrawalPhase } from "@/core/time/phases/claimingWithdrawal";
import { makeGameState } from "@/tests/helpers/sampleGameState";
import { createMockPipelineContext } from "@/tests/helpers/testTypes";
import type { GameState, Race } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";
import type { AnyIntent, WithdrawFromClaimingIntent } from "@/core/resolver/intents";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";
import { makePlayerOwned } from "@/core/horse/ownership";

describe("claimingWithdrawalPhase", () => {
  const createTestState = (): GameState => makeGameState({ day: 10 }) as GameState;

  const createContext = (state: GameState, intents: AnyIntent[]): PipelineContext =>
    createMockPipelineContext({ state, intents, newDay: 10 });

  const makeRace = (overrides: Partial<Race>): Race => ({
    id: "race-1",
    name: "Test Race",
    day: 10,
    distance: 2000,
    raceClass: "OptionalClaiming",
    entryFee: 500,
    purse: 10000,
    minStat: 70,
    fieldSize: 8,
    entries: [{ horseId: "horse-1", ownership: makePlayerOwned() } as any],
    resolved: false,
    claimingPrice: 10000,
    ...overrides,
  });

  const makeWithdrawalIntent = (
    overrides: Partial<WithdrawFromClaimingIntent>,
  ): WithdrawFromClaimingIntent => ({
    id: "intent-1",
    day: 10,
    type: "withdraw_from_claiming",
    entityId: "player",
    priority: 100,
    source: "player",
    raceId: "race-1",
    horseId: "horse-1",
    ...overrides,
  });

  it("should have correct name", () => {
    expect(claimingWithdrawalPhase.name).toBe("claimingWithdrawal");
  });

  it("should process withdrawal intent and mark entry as withdrawn", () => {
    const state: GameState = {
      ...createTestState(),
      races: r2r([makeRace({})]),
    };

    const result = claimingWithdrawalPhase.execute(
      createContext(state, [makeWithdrawalIntent({})]),
    );

    expect(result.impacts).toHaveLength(1);
    expect(result.impacts[0].type).toBe("log");
    const race = Object.values(result.state.races)[0];
    expect(race.entries[0].withdrawnFromClaiming).toBe(true);
  });

  it("should skip withdrawal for non-existent race", () => {
    const state: GameState = {
      ...createTestState(),
      races: r2r([makeRace({ id: "race-2" })]),
    };

    const result = claimingWithdrawalPhase.execute(
      createContext(state, [makeWithdrawalIntent({ raceId: "race-1" })]),
    );

    expect(result.impacts).toHaveLength(0);
  });

  it("should skip withdrawal for non-existent entry", () => {
    const state: GameState = {
      ...createTestState(),
      races: r2r([makeRace({})]),
    };

    const result = claimingWithdrawalPhase.execute(
      createContext(state, [makeWithdrawalIntent({ horseId: "nonexistent" })]),
    );

    expect(result.impacts).toHaveLength(0);
  });

  it("should process multiple withdrawal intents for different races", () => {
    const state: GameState = {
      ...createTestState(),
      races: r2r([
        makeRace({
          id: "race-1",
          entries: [{ horseId: "horse-1", ownership: makePlayerOwned() } as any],
        }),
        makeRace({
          id: "race-2",
          entries: [{ horseId: "horse-2", ownership: makePlayerOwned() } as any],
        }),
      ]),
    };

    const intents: WithdrawFromClaimingIntent[] = [
      makeWithdrawalIntent({ id: "i1", raceId: "race-1", horseId: "horse-1" }),
      makeWithdrawalIntent({ id: "i2", raceId: "race-2", horseId: "horse-2" }),
    ];

    const result = claimingWithdrawalPhase.execute(createContext(state, intents));
    expect(result.impacts).toHaveLength(2);
    expect(Object.values(result.state.races)[0].entries[0].withdrawnFromClaiming).toBe(true);
    expect(Object.values(result.state.races)[1].entries[0].withdrawnFromClaiming).toBe(true);
  });

  it("should skip already withdrawn entries", () => {
    const state: GameState = {
      ...createTestState(),
      races: r2r([
        makeRace({
          entries: [
            {
              horseId: "horse-1",
              ownership: makePlayerOwned(),
              withdrawnFromClaiming: true,
            } as any,
          ],
        }),
      ]),
    };

    const result = claimingWithdrawalPhase.execute(
      createContext(state, [makeWithdrawalIntent({})]),
    );

    expect(result.impacts).toHaveLength(0);
  });
});

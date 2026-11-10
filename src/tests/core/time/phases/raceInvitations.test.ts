/**
 * raceInvitations.test.ts - Tests for the race invitation system
 */

import { describe, it, expect } from "vitest";
import { raceInvitationsPhase } from "@/platform/time/phases/raceInvitations";
import {
  isHorseEligibleForRace,
  isHorseInvitedToRace,
} from "@/domains/race/simulation/eligibility";
import { RacingValidator } from "@/platform/resolver/validators/RacingValidator";
import { makeGradedRace } from "@/domains/race/simulation/generation/raceGen";
import type { Horse, Race, GameState } from "@/platform/game/types";
import type {
  RaceEntryIntent,
  RaceWithdrawalIntent,
  WithdrawFromClaimingIntent,
} from "@/platform/resolver/intents";
import type { PipelineContext } from "@/platform/time/pipeline";
import type { GradedRace } from "@/shared/data/gradedRaces";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";
import { makePlayerOwned, makeNpcOwned, makeUnowned } from "@/domains/horse/simulation/ownership";

function makeHorse(overrides: Partial<Horse> = {}): Horse {
  return {
    id: overrides.id ?? "horse-1",
    name: overrides.name ?? "Test Horse",
    ownership: overrides.ownership ?? { type: "unowned" },
    gender: overrides.gender ?? "colt",
    age: overrides.age ?? 4,
    hemisphere: overrides.hemisphere ?? "Northern",
    energy: overrides.energy ?? 100,
    distanceAptitude: overrides.distanceAptitude ?? 1600,
    surfaceAptitude: overrides.surfaceAptitude ?? "Turf",
    fame: overrides.fame ?? 50,
    form: overrides.form ?? 0,
    stats: overrides.stats ?? { speed: 70, stamina: 70, acceleration: 70 },
    runningStyle: overrides.runningStyle ?? "E",
    appearance: overrides.appearance ?? "average",
    coatColor: overrides.coatColor ?? "bay",
    markings: overrides.markings ?? "none",
    silk: overrides.silk ?? "#000",
    raceHistory: overrides.raceHistory ?? [],
    consignedSaleId: overrides.consignedSaleId ?? null,
    activeInjury: overrides.activeInjury ?? null,
    lifecycleStatus: overrides.lifecycleStatus ?? "active",
    winAndYouInQualified: overrides.winAndYouInQualified ?? undefined,
    ...overrides,
  } as Horse;
}

function makeRace(overrides: Partial<Race> = {}): Race {
  return {
    id: overrides.id ?? "race-1",
    name: overrides.name ?? "Test Race",
    day: overrides.day ?? 100,
    distance: overrides.distance ?? 1600,
    raceClass: overrides.raceClass ?? "Graded",
    entryFee: overrides.entryFee ?? 1000,
    purse: overrides.purse ?? 100000,
    minStat: overrides.minStat ?? 50,
    fieldSize: overrides.fieldSize ?? 12,
    entries: overrides.entries ?? [],
    resolved: overrides.resolved ?? false,
    graded: overrides.graded ?? undefined,
    invitedHorseIds: overrides.invitedHorseIds ?? undefined,
    weather: overrides.weather ?? "clear",
    trackCondition: overrides.trackCondition ?? "good",
    ...overrides,
  } as Race;
}

describe("isHorseInvitedToRace", () => {
  it("returns true for non-invite races", () => {
    const horse = makeHorse();
    const race = makeRace();
    expect(isHorseInvitedToRace(horse, race, 1)).toBe(true);
  });

  it("returns true when horse is in invitedHorseIds", () => {
    const horse = makeHorse({ id: "h1" });
    const race = makeRace({
      graded: {
        key: "bc-classic",
        grade: "G1",
        track: "Keeneland",
        trackId: "t1",
        surface: "Dirt",
        requiresInvitation: true,
        invitedHorseIds: ["h1"],
      },
    });
    expect(isHorseInvitedToRace(horse, race, 1)).toBe(true);
  });

  it("returns true for Win-and-You're-In qualified horses", () => {
    const horse = makeHorse({
      id: "h1",
      winAndYouInQualified: [{ year: 1, raceId: "r1", raceKey: "bc-classic" }],
    });
    const race = makeRace({
      graded: {
        key: "bc-classic",
        grade: "G1",
        track: "Keeneland",
        trackId: "t1",
        surface: "Dirt",
        requiresInvitation: true,
      },
    });
    expect(isHorseInvitedToRace(horse, race, 1)).toBe(true);
  });

  it("returns false for uninvited horses in invite-only races", () => {
    const horse = makeHorse({ id: "h1" });
    const race = makeRace({
      graded: {
        key: "bc-classic",
        grade: "G1",
        track: "Keeneland",
        trackId: "t1",
        surface: "Dirt",
        requiresInvitation: true,
      },
    });
    expect(isHorseInvitedToRace(horse, race, 1)).toBe(false);
  });
});

describe("isHorseEligibleForRace", () => {
  it("blocks uninvited horses from invite-only races when currentDay is provided", () => {
    const horse = makeHorse({ id: "h1", energy: 100 });
    const race = makeRace({
      graded: {
        key: "bc-classic",
        grade: "G1",
        track: "Keeneland",
        trackId: "t1",
        surface: "Dirt",
        requiresInvitation: true,
      },
    });
    expect(isHorseEligibleForRace(horse, race, new Set(), 1)).toBe(false);
  });

  it("allows invited horses into invite-only races", () => {
    const horse = makeHorse({ id: "h1", energy: 100 });
    const race = makeRace({
      graded: {
        key: "bc-classic",
        grade: "G1",
        track: "Keeneland",
        trackId: "t1",
        surface: "Dirt",
        requiresInvitation: true,
      },
      invitedHorseIds: ["h1"],
    });
    expect(isHorseEligibleForRace(horse, race, new Set(), 1)).toBe(true);
  });

  it("allows Win-and-You're-In horses into invite-only races", () => {
    const horse = makeHorse({
      id: "h1",
      energy: 100,
      winAndYouInQualified: [{ year: 1, raceId: "r1", raceKey: "bc-classic" }],
    });
    const race = makeRace({
      graded: {
        key: "bc-classic",
        grade: "G1",
        track: "Keeneland",
        trackId: "t1",
        surface: "Dirt",
        requiresInvitation: true,
      },
    });
    expect(isHorseEligibleForRace(horse, race, new Set(), 1)).toBe(true);
  });

  it("skips invite check when currentDay is omitted", () => {
    const horse = makeHorse({ id: "h1", energy: 100 });
    const race = makeRace({
      graded: {
        key: "bc-classic",
        grade: "G1",
        track: "Keeneland",
        trackId: "t1",
        surface: "Dirt",
        requiresInvitation: true,
      },
    });
    expect(isHorseEligibleForRace(horse, race, new Set())).toBe(true);
  });
});

describe("RacingValidator — invitation gating", () => {
  const validator = new RacingValidator();

  it("rejects race_entry for uninvited horse in invite-only race", () => {
    const horse = makeHorse({ id: "h1", energy: 100, ownership: makePlayerOwned() });
    const race = makeRace({
      id: "race-1",
      graded: {
        key: "bc-classic",
        grade: "G1",
        track: "Keeneland",
        trackId: "t1",
        surface: "Dirt",
        requiresInvitation: true,
      },
    });
    const state = {
      day: 1,
      horses: h2r([horse]),
      races: r2r([race]),
    } as unknown as GameState;

    const result = validator.validate(
      {
        type: "race_entry",
        raceId: "race-1",
        horseId: "h1",
        id: "i1",
        entityId: "h1",
        source: "player",
        day: 1,
        priority: 100,
      },
      state,
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Invitation required for this race");
  });

  it("accepts race_entry for invited horse in invite-only race", () => {
    const horse = makeHorse({ id: "h1", energy: 100, ownership: makePlayerOwned() });
    const race = makeRace({
      id: "race-1",
      graded: {
        key: "bc-classic",
        grade: "G1",
        track: "Keeneland",
        trackId: "t1",
        surface: "Dirt",
        requiresInvitation: true,
        invitedHorseIds: ["h1"],
      },
    });
    const state = {
      day: 1,
      horses: h2r([horse]),
      races: r2r([race]),
    } as unknown as GameState;

    const result = validator.validate(
      {
        type: "race_entry",
        raceId: "race-1",
        horseId: "h1",
        id: "i1",
        entityId: "h1",
        source: "player",
        day: 1,
        priority: 100,
      },
      state,
    );
    expect(result.valid).toBe(true);
  });
});

describe("RacingValidator.canValidate", () => {
  const validator = new RacingValidator();

  it.each(["race_entry", "race_withdrawal", "withdraw_from_claiming"] as const)(
    "claims %s",
    (type) => {
      expect(validator.canValidate(type)).toBe(true);
    },
  );

  it.each(["training", "purchase"] as const)("does not claim %s", (type) => {
    expect(validator.canValidate(type)).toBe(false);
  });
});

describe("RacingValidator — race_entry", () => {
  const validator = new RacingValidator();

  const entryIntent = (overrides: Partial<RaceEntryIntent> = {}): RaceEntryIntent => ({
    type: "race_entry",
    raceId: "race-1",
    horseId: "h1",
    id: "i1",
    entityId: "h1",
    source: "player",
    day: 1,
    priority: 100,
    ...overrides,
  });

  const stateWith = (horse: Horse | null, race: Race | null, day = 200): GameState =>
    ({
      day,
      horses: horse ? h2r([horse]) : {},
      races: race ? r2r([race]) : {},
    }) as unknown as GameState;

  it("accepts a valid race entry", () => {
    const horse = makeHorse({ id: "h1", energy: 100, ownership: makePlayerOwned() });
    const race = makeRace({ id: "race-1" });
    expect(validator.validate(entryIntent(), stateWith(horse, race))).toEqual({
      valid: true,
    });
  });

  it("rejects when the horse does not exist", () => {
    const race = makeRace({ id: "race-1" });
    expect(validator.validate(entryIntent(), stateWith(null, race))).toEqual({
      valid: false,
      reason: "Horse not found",
    });
  });

  it("rejects a player intent for an NPC-owned horse", () => {
    const horse = makeHorse({
      id: "h1",
      energy: 100,
      ownership: makeNpcOwned("stable-x"),
    });
    const race = makeRace({ id: "race-1" });
    expect(validator.validate(entryIntent(), stateWith(horse, race))).toEqual({
      valid: false,
      reason: "Intent source does not own horse",
    });
  });

  it("accepts an NPC intent when sourceId matches the owner stable", () => {
    const horse = makeHorse({
      id: "h1",
      energy: 100,
      ownership: makeNpcOwned("stable-x"),
    });
    const race = makeRace({ id: "race-1" });
    expect(
      validator.validate(
        entryIntent({ source: "npc", sourceId: "stable-x" }),
        stateWith(horse, race),
      ),
    ).toEqual({ valid: true });
  });

  it("rejects an NPC intent when sourceId does not match the owner stable", () => {
    const horse = makeHorse({
      id: "h1",
      energy: 100,
      ownership: makeNpcOwned("stable-x"),
    });
    const race = makeRace({ id: "race-1" });
    expect(
      validator.validate(
        entryIntent({ source: "npc", sourceId: "stable-y" }),
        stateWith(horse, race),
      ),
    ).toEqual({ valid: false, reason: "Intent source does not own horse" });
  });

  it("accepts a system intent for a player-owned horse", () => {
    const horse = makeHorse({ id: "h1", energy: 100, ownership: makePlayerOwned() });
    const race = makeRace({ id: "race-1" });
    expect(validator.validate(entryIntent({ source: "system" }), stateWith(horse, race))).toEqual({
      valid: true,
    });
  });

  it("rejects a system intent for an NPC-owned horse", () => {
    const horse = makeHorse({
      id: "h1",
      energy: 100,
      ownership: makeNpcOwned("stable-x"),
    });
    const race = makeRace({ id: "race-1" });
    expect(validator.validate(entryIntent({ source: "system" }), stateWith(horse, race))).toEqual({
      valid: false,
      reason: "Intent source does not own horse",
    });
  });

  it("rejects a horse consigned to an auction", () => {
    const horse = makeHorse({
      id: "h1",
      energy: 100,
      ownership: makePlayerOwned(),
      consignedSaleId: "sale-1",
    });
    const race = makeRace({ id: "race-1" });
    expect(validator.validate(entryIntent(), stateWith(horse, race))).toEqual({
      valid: false,
      reason: "Horse is consigned to an auction",
    });
  });

  it("rejects when the race does not exist", () => {
    const horse = makeHorse({ id: "h1", energy: 100, ownership: makePlayerOwned() });
    expect(validator.validate(entryIntent(), stateWith(horse, null))).toEqual({
      valid: false,
      reason: "Race not found",
    });
  });

  it("rejects an already resolved race", () => {
    const horse = makeHorse({ id: "h1", energy: 100, ownership: makePlayerOwned() });
    const race = makeRace({ id: "race-1", resolved: true });
    expect(validator.validate(entryIntent(), stateWith(horse, race))).toEqual({
      valid: false,
      reason: "Race already resolved",
    });
  });

  it.each([
    [39, false],
    [40, true],
  ])("applies the energy threshold at 40 (energy %d → valid %s)", (energy, valid) => {
    const horse = makeHorse({ id: "h1", energy, ownership: makePlayerOwned() });
    const race = makeRace({ id: "race-1" });
    const result = validator.validate(entryIntent(), stateWith(horse, race));
    if (valid) {
      expect(result).toEqual({ valid: true });
    } else {
      expect(result).toEqual({ valid: false, reason: "Insufficient energy" });
    }
  });

  it("accepts an invited horse via top-level invitedHorseIds (takes precedence)", () => {
    const horse = makeHorse({ id: "h1", energy: 100, ownership: makePlayerOwned() });
    const race = makeRace({
      id: "race-1",
      invitedHorseIds: ["h1"],
      graded: {
        key: "bc-classic",
        grade: "G1",
        track: "Keeneland",
        trackId: "t1",
        surface: "Dirt",
        requiresInvitation: true,
        invitedHorseIds: ["other-horse"],
      },
    });
    expect(validator.validate(entryIntent(), stateWith(horse, race))).toEqual({
      valid: true,
    });
  });

  it("accepts a win-and-you-in qualifier for the current year", () => {
    const horse = makeHorse({
      id: "h1",
      energy: 100,
      ownership: makePlayerOwned(),
      winAndYouInQualified: [{ year: 1, raceId: "r0", raceKey: "bc-classic" }],
    });
    const race = makeRace({
      id: "race-1",
      graded: {
        key: "bc-classic",
        grade: "G1",
        track: "Keeneland",
        trackId: "t1",
        surface: "Dirt",
        requiresInvitation: true,
      },
    });
    // state.day = 200 → currentYear = floor(199/365)+1 = 1
    expect(validator.validate(entryIntent(), stateWith(horse, race))).toEqual({
      valid: true,
    });
  });

  it("rejects a win-and-you-in qualifier from a different year", () => {
    const horse = makeHorse({
      id: "h1",
      energy: 100,
      ownership: makePlayerOwned(),
      winAndYouInQualified: [{ year: 2, raceId: "r0", raceKey: "bc-classic" }],
    });
    const race = makeRace({
      id: "race-1",
      graded: {
        key: "bc-classic",
        grade: "G1",
        track: "Keeneland",
        trackId: "t1",
        surface: "Dirt",
        requiresInvitation: true,
      },
    });
    expect(validator.validate(entryIntent(), stateWith(horse, race))).toEqual({
      valid: false,
      reason: "Invitation required for this race",
    });
  });

  it("rejects a win-and-you-in qualifier for a different race key", () => {
    const horse = makeHorse({
      id: "h1",
      energy: 100,
      ownership: makePlayerOwned(),
      winAndYouInQualified: [{ year: 1, raceId: "r0", raceKey: "bc-turf" }],
    });
    const race = makeRace({
      id: "race-1",
      graded: {
        key: "bc-classic",
        grade: "G1",
        track: "Keeneland",
        trackId: "t1",
        surface: "Dirt",
        requiresInvitation: true,
      },
    });
    expect(validator.validate(entryIntent(), stateWith(horse, race))).toEqual({
      valid: false,
      reason: "Invitation required for this race",
    });
  });
});

describe("RacingValidator — race_withdrawal", () => {
  const validator = new RacingValidator();

  const withdrawalIntent = (
    overrides: Partial<RaceWithdrawalIntent> = {},
  ): RaceWithdrawalIntent => ({
    type: "race_withdrawal",
    raceId: "race-1",
    horseId: "h1",
    id: "i1",
    entityId: "h1",
    source: "player",
    day: 1,
    priority: 100,
    ...overrides,
  });

  const stateWith = (horse: Horse | null, race: Race | null): GameState =>
    ({
      day: 200,
      horses: horse ? h2r([horse]) : {},
      races: race ? r2r([race]) : {},
    }) as unknown as GameState;

  it("accepts a withdrawal for an entered horse", () => {
    const horse = makeHorse({ id: "h1", ownership: makePlayerOwned() });
    const race = makeRace({
      id: "race-1",
      entries: [{ horseId: "h1", ownership: horse.ownership }],
    });
    expect(validator.validate(withdrawalIntent(), stateWith(horse, race))).toEqual({
      valid: true,
    });
  });

  it("rejects when the horse does not exist", () => {
    const race = makeRace({ id: "race-1" });
    expect(validator.validate(withdrawalIntent(), stateWith(null, race))).toEqual({
      valid: false,
      reason: "Horse not found",
    });
  });

  it("rejects a player intent for an NPC-owned horse", () => {
    const horse = makeHorse({ id: "h1", ownership: makeNpcOwned("stable-x") });
    const race = makeRace({
      id: "race-1",
      entries: [{ horseId: "h1", ownership: horse.ownership }],
    });
    expect(validator.validate(withdrawalIntent(), stateWith(horse, race))).toEqual({
      valid: false,
      reason: "Intent source does not own horse",
    });
  });

  it("rejects when the race does not exist", () => {
    const horse = makeHorse({ id: "h1", ownership: makePlayerOwned() });
    expect(validator.validate(withdrawalIntent(), stateWith(horse, null))).toEqual({
      valid: false,
      reason: "Race not found",
    });
  });

  it("rejects an already resolved race", () => {
    const horse = makeHorse({ id: "h1", ownership: makePlayerOwned() });
    const race = makeRace({
      id: "race-1",
      resolved: true,
      entries: [{ horseId: "h1", ownership: horse.ownership }],
    });
    expect(validator.validate(withdrawalIntent(), stateWith(horse, race))).toEqual({
      valid: false,
      reason: "Race already resolved",
    });
  });

  it("rejects a horse that is not entered in the race", () => {
    const horse = makeHorse({ id: "h1", ownership: makePlayerOwned() });
    const race = makeRace({ id: "race-1", entries: [] });
    expect(validator.validate(withdrawalIntent(), stateWith(horse, race))).toEqual({
      valid: false,
      reason: "Horse not entered in this race",
    });
  });
});

describe("RacingValidator — withdraw_from_claiming", () => {
  const validator = new RacingValidator();

  const withdrawIntent = (
    overrides: Partial<WithdrawFromClaimingIntent> = {},
  ): WithdrawFromClaimingIntent => ({
    type: "withdraw_from_claiming",
    raceId: "race-1",
    horseId: "h1",
    id: "i1",
    entityId: "h1",
    source: "player",
    day: 1,
    priority: 100,
    ...overrides,
  });

  const stateWith = (horse: Horse | null, race: Race | null): GameState =>
    ({
      day: 200,
      horses: horse ? h2r([horse]) : {},
      races: race ? r2r([race]) : {},
    }) as unknown as GameState;

  const enteredOptionalClaiming = (horse: Horse, overrides: Partial<Race> = {}): Race =>
    makeRace({
      id: "race-1",
      raceClass: "OptionalClaiming",
      claimingPrice: 25000,
      entries: [{ horseId: "h1", ownership: horse.ownership }],
      ...overrides,
    });

  it.each(["OptionalClaiming", "MaidenOptionalClaiming"] as const)(
    "accepts withdrawal in %s races",
    (raceClass) => {
      const horse = makeHorse({ id: "h1", ownership: makePlayerOwned() });
      const race = enteredOptionalClaiming(horse, { raceClass });
      expect(validator.validate(withdrawIntent(), stateWith(horse, race))).toEqual({
        valid: true,
      });
    },
  );

  it("rejects when the race does not exist", () => {
    const horse = makeHorse({ id: "h1", ownership: makePlayerOwned() });
    expect(validator.validate(withdrawIntent(), stateWith(horse, null))).toEqual({
      valid: false,
      reason: "Race not found",
    });
  });

  it("rejects when the horse does not exist", () => {
    const race = makeRace({ id: "race-1" });
    expect(validator.validate(withdrawIntent(), stateWith(null, race))).toEqual({
      valid: false,
      reason: "Horse not found",
    });
  });

  it("rejects a player intent for an NPC-owned horse", () => {
    const horse = makeHorse({ id: "h1", ownership: makeNpcOwned("stable-x") });
    const race = enteredOptionalClaiming(horse);
    expect(validator.validate(withdrawIntent(), stateWith(horse, race))).toEqual({
      valid: false,
      reason: "Intent source does not own horse",
    });
  });

  it("rejects an already resolved race", () => {
    const horse = makeHorse({ id: "h1", ownership: makePlayerOwned() });
    const race = enteredOptionalClaiming(horse, { resolved: true });
    expect(validator.validate(withdrawIntent(), stateWith(horse, race))).toEqual({
      valid: false,
      reason: "Race already resolved",
    });
  });

  it("rejects a race without a claiming price", () => {
    const horse = makeHorse({ id: "h1", ownership: makePlayerOwned() });
    const race = makeRace({
      id: "race-1",
      raceClass: "OptionalClaiming",
      entries: [{ horseId: "h1", ownership: horse.ownership }],
    });
    expect(validator.validate(withdrawIntent(), stateWith(horse, race))).toEqual({
      valid: false,
      reason: "Race is not a claiming race",
    });
  });

  it("rejects a non-optional claiming race", () => {
    const horse = makeHorse({ id: "h1", ownership: makePlayerOwned() });
    const race = makeRace({
      id: "race-1",
      raceClass: "Claiming",
      claimingPrice: 25000,
      entries: [{ horseId: "h1", ownership: horse.ownership }],
    });
    expect(validator.validate(withdrawIntent(), stateWith(horse, race))).toEqual({
      valid: false,
      reason: "Withdrawal only allowed in optional claiming races",
    });
  });

  it("rejects a horse that is not entered in the race", () => {
    const horse = makeHorse({ id: "h1", ownership: makePlayerOwned() });
    const race = enteredOptionalClaiming(horse, { entries: [] });
    expect(validator.validate(withdrawIntent(), stateWith(horse, race))).toEqual({
      valid: false,
      reason: "Horse not entered in this race",
    });
  });

  it("rejects a horse already withdrawn from claiming", () => {
    const horse = makeHorse({ id: "h1", ownership: makePlayerOwned() });
    const race = enteredOptionalClaiming(horse, {
      entries: [{ horseId: "h1", ownership: horse.ownership, withdrawnFromClaiming: true }],
    });
    expect(validator.validate(withdrawIntent(), stateWith(horse, race))).toEqual({
      valid: false,
      reason: "Horse already withdrawn from claiming",
    });
  });
});

describe("RacingValidator — validation cache", () => {
  const validator = new RacingValidator();

  it("resolves horses and races from the cache maps", () => {
    const horse = makeHorse({ id: "h1", energy: 100, ownership: makePlayerOwned() });
    const race = makeRace({ id: "race-1" });
    const state = {
      day: 200,
      horses: {},
      races: {},
    } as unknown as GameState;
    const cache = {
      horseMap: new Map([["h1", horse]]),
      raceMap: new Map([["race-1", race]]),
    };

    expect(
      validator.validate(
        {
          type: "race_entry",
          raceId: "race-1",
          horseId: "h1",
          id: "i1",
          entityId: "h1",
          source: "player",
          day: 1,
          priority: 100,
        },
        state,
        cache,
      ),
    ).toEqual({ valid: true });
  });
});

describe("makeGradedRace — invitation inheritance", () => {
  it("auto-sets requiresInvitation for breeders-cup races", () => {
    const g: GradedRace = {
      uuid: "test-uuid",
      key: "bc-classic",
      name: "Breeders' Cup Classic",
      track: "Keeneland",
      trackId: "t1",
      grade: "G1",
      distance: 2000,
      surface: "Dirt",
      purse: 5000000,
      dayOfYear: 300,
      bcKey: "breeders-cup",
    };
    const race = makeGradedRace(g, 300);
    expect(race.graded?.requiresInvitation).toBe(true);
    expect(race.invitedHorseIds).toEqual([]);
  });

  it("preserves explicit requiresInvitation=false", () => {
    const g: GradedRace = {
      uuid: "test-uuid",
      key: "test-race",
      name: "Test Race",
      track: "Keeneland",
      trackId: "t1",
      grade: "G1",
      distance: 2000,
      surface: "Dirt",
      purse: 1000000,
      dayOfYear: 100,
      requiresInvitation: false,
    };
    const race = makeGradedRace(g, 100);
    expect(race.graded?.requiresInvitation).toBe(false);
  });
});

describe("raceInvitationsPhase", () => {
  it("sends invites for upcoming invite-only races", () => {
    const horse = makeHorse({
      id: "h1",
      ownership: makePlayerOwned(),
      distanceAptitude: 1600,
      fame: 80,
    });
    const race = makeRace({
      id: "race-1",
      day: 50,
      distance: 1600,
      graded: {
        key: "bc-classic",
        grade: "G1",
        track: "Keeneland",
        trackId: "t1",
        surface: "Dirt",
        requiresInvitation: true,
      },
    });

    const context: PipelineContext = {
      previousDay: 19,
      newDay: 20,
      state: {
        day: 20,
        horses: h2r([horse]),
        races: r2r([race]),
        inbox: [],
        pregnancies: [],
        reputation: { score: 300 },
      } as unknown as GameState,
      logs: [],
      dailyRng: { next: () => 0.5, int: () => 0, pick: () => "" } as any,
      intents: [],
      impacts: [],
      impactLog: [],
      horseMap: new Map([[horse.id, horse]]),
      raceMap: new Map([[race.id, race]]),
      stableMap: new Map(),
      jockeyMap: new Map(),
    };

    const result = raceInvitationsPhase.execute(context);
    const updatedRace = result.state.races["race-1"]!;
    expect(updatedRace.invitedHorseIds).toContain("h1");
    expect(result.impacts.length).toBeGreaterThan(0);
    expect(result.impacts[0].type).toBe("inbox_message");
    const inboxImpact = result.impacts.find((i) => i.type === "inbox_message");
    const body = (inboxImpact as any)?.message?.body ?? "";
    expect(body).toContain("Test Horse");
  });

  it("consolidates invitations for multiple player-owned horses into one message", () => {
    const horseA = makeHorse({
      id: "h-a",
      name: "Thunder",
      ownership: makePlayerOwned(),
      distanceAptitude: 1600,
      fame: 80,
    });
    const horseB = makeHorse({
      id: "h-b",
      name: "Lightning",
      ownership: makePlayerOwned(),
      distanceAptitude: 1600,
      fame: 70,
    });
    const horseC = makeHorse({
      id: "h-c",
      name: "Storm",
      ownership: makePlayerOwned(),
      distanceAptitude: 1600,
      fame: 60,
    });
    const race = makeRace({
      id: "race-1",
      day: 50,
      distance: 1600,
      fieldSize: 14,
      graded: {
        key: "bc-classic",
        grade: "G1",
        track: "Keeneland",
        trackId: "t1",
        surface: "Dirt",
        requiresInvitation: true,
      },
    });

    const context: PipelineContext = {
      previousDay: 19,
      newDay: 20,
      state: {
        day: 20,
        horses: h2r([horseA, horseB, horseC]),
        races: r2r([race]),
        inbox: [],
        pregnancies: [],
        reputation: { score: 300 },
      } as unknown as GameState,
      logs: [],
      dailyRng: { next: () => 0.5, int: () => 0, pick: () => "" } as any,
      intents: [],
      impacts: [],
      impactLog: [],
      horseMap: new Map([
        [horseA.id, horseA],
        [horseB.id, horseB],
        [horseC.id, horseC],
      ]),
      raceMap: new Map([[race.id, race]]),
      stableMap: new Map(),
      jockeyMap: new Map(),
    };

    const result = raceInvitationsPhase.execute(context);
    const inboxImpacts = result.impacts.filter((i) => i.type === "inbox_message");
    expect(inboxImpacts.length).toBe(1);
    const body = (inboxImpacts[0] as any).message.body;
    expect(body).toContain("Thunder");
    expect(body).toContain("Lightning");
    expect(body).toContain("Storm");
  });

  it("mixed owned/unowned horses — message lists only owned horses", () => {
    const ownedA = makeHorse({
      id: "h-owned-a",
      name: "Thunder",
      ownership: makePlayerOwned(),
      distanceAptitude: 1600,
      fame: 80,
    });
    const ownedB = makeHorse({
      id: "h-owned-b",
      name: "Lightning",
      ownership: makePlayerOwned(),
      distanceAptitude: 1600,
      fame: 70,
    });
    const npcHorse = makeHorse({
      id: "h-npc",
      name: "Dark Horse",
      ownership: makeUnowned(),
      distanceAptitude: 1600,
      fame: 90,
    });
    const race = makeRace({
      id: "race-1",
      day: 50,
      distance: 1600,
      fieldSize: 14,
      graded: {
        key: "bc-classic",
        grade: "G1",
        track: "Keeneland",
        trackId: "t1",
        surface: "Dirt",
        requiresInvitation: true,
      },
    });

    const context: PipelineContext = {
      previousDay: 19,
      newDay: 20,
      state: {
        day: 20,
        horses: h2r([ownedA, ownedB, npcHorse]),
        races: r2r([race]),
        inbox: [],
        pregnancies: [],
        reputation: { score: 300 },
      } as unknown as GameState,
      logs: [],
      dailyRng: { next: () => 0.5, int: () => 0, pick: () => "" } as any,
      intents: [],
      impacts: [],
      impactLog: [],
      horseMap: new Map([
        [ownedA.id, ownedA],
        [ownedB.id, ownedB],
        [npcHorse.id, npcHorse],
      ]),
      raceMap: new Map([[race.id, race]]),
      stableMap: new Map(),
      jockeyMap: new Map(),
    };

    const result = raceInvitationsPhase.execute(context);
    const inboxImpacts = result.impacts.filter((i) => i.type === "inbox_message");
    expect(inboxImpacts.length).toBe(1);
    const body = (inboxImpacts[0] as any).message.body;
    expect(body).toContain("Thunder");
    expect(body).toContain("Lightning");
    expect(body).not.toContain("Dark Horse");
  });

  it("no inbox message when only NPC horses are invited", () => {
    const npcA = makeHorse({
      id: "h-npc-a",
      name: "Dark Horse",
      ownership: makeUnowned(),
      distanceAptitude: 1600,
      fame: 90,
    });
    const npcB = makeHorse({
      id: "h-npc-b",
      name: "Shadow",
      ownership: makeUnowned(),
      distanceAptitude: 1600,
      fame: 80,
    });
    const race = makeRace({
      id: "race-1",
      day: 50,
      distance: 1600,
      fieldSize: 14,
      graded: {
        key: "bc-classic",
        grade: "G1",
        track: "Keeneland",
        trackId: "t1",
        surface: "Dirt",
        requiresInvitation: true,
      },
    });

    const context: PipelineContext = {
      previousDay: 19,
      newDay: 20,
      state: {
        day: 20,
        horses: h2r([npcA, npcB]),
        races: r2r([race]),
        inbox: [],
        pregnancies: [],
      } as unknown as GameState,
      logs: [],
      dailyRng: { next: () => 0.5, int: () => 0, pick: () => "" } as any,
      intents: [],
      impacts: [],
      impactLog: [],
      horseMap: new Map([
        [npcA.id, npcA],
        [npcB.id, npcB],
      ]),
      raceMap: new Map([[race.id, race]]),
      stableMap: new Map(),
      jockeyMap: new Map(),
    };

    const result = raceInvitationsPhase.execute(context);
    const inboxImpacts = result.impacts.filter((i) => i.type === "inbox_message");
    expect(inboxImpacts.length).toBe(0);
  });

  it("multi-day: new horse invited on subsequent day gets its own message", () => {
    const horseA = makeHorse({
      id: "h-a",
      name: "Thunder",
      ownership: makePlayerOwned(),
      distanceAptitude: 1600,
      fame: 80,
    });
    const horseB = makeHorse({
      id: "h-b",
      name: "Lightning",
      ownership: makePlayerOwned(),
      distanceAptitude: 1600,
      fame: 70,
    });
    const race = makeRace({
      id: "race-1",
      day: 50,
      distance: 1600,
      fieldSize: 14,
      invitedHorseIds: ["h-a"],
      graded: {
        key: "bc-classic",
        grade: "G1",
        track: "Keeneland",
        trackId: "t1",
        surface: "Dirt",
        requiresInvitation: true,
        invitedHorseIds: ["h-a"],
      },
    });

    const context: PipelineContext = {
      previousDay: 20,
      newDay: 21,
      state: {
        day: 21,
        horses: h2r([horseA, horseB]),
        races: r2r([race]),
        inbox: [],
        pregnancies: [],
        reputation: { score: 300 },
      } as unknown as GameState,
      logs: [],
      dailyRng: { next: () => 0.5, int: () => 0, pick: () => "" } as any,
      intents: [],
      impacts: [],
      impactLog: [],
      horseMap: new Map([
        [horseA.id, horseA],
        [horseB.id, horseB],
      ]),
      raceMap: new Map([[race.id, race]]),
      stableMap: new Map(),
      jockeyMap: new Map(),
    };

    const result = raceInvitationsPhase.execute(context);
    const inboxImpacts = result.impacts.filter((i) => i.type === "inbox_message");
    expect(inboxImpacts.length).toBe(1);
    const body = (inboxImpacts[0] as any).message.body;
    expect(body).toContain("Lightning");
    expect(body).not.toContain("Thunder");
  });

  it("deduplicates invites (does not re-invite already-invited horses)", () => {
    const horse = makeHorse({
      id: "h1",
      ownership: makePlayerOwned(),
      distanceAptitude: 1600,
      fame: 80,
    });
    const race = makeRace({
      id: "race-1",
      day: 50,
      distance: 1600,
      invitedHorseIds: ["h1"],
      graded: {
        key: "bc-classic",
        grade: "G1",
        track: "Keeneland",
        trackId: "t1",
        surface: "Dirt",
        requiresInvitation: true,
        invitedHorseIds: ["h1"],
      },
    });

    const context: PipelineContext = {
      previousDay: 19,
      newDay: 20,
      state: {
        day: 20,
        horses: h2r([horse]),
        races: r2r([race]),
        inbox: [],
        pregnancies: [],
      } as unknown as GameState,
      logs: [],
      dailyRng: { next: () => 0.5, int: () => 0, pick: () => "" } as any,
      intents: [],
      impacts: [],
      impactLog: [],
      horseMap: new Map([[horse.id, horse]]),
      raceMap: new Map([[race.id, race]]),
      stableMap: new Map(),
      jockeyMap: new Map(),
    };

    const result = raceInvitationsPhase.execute(context);
    const updatedRace = result.state.races["race-1"]!;
    expect(updatedRace.invitedHorseIds).toEqual(["h1"]);
    // No new inbox message should be generated
    const inboxImpacts = result.impacts.filter((i) => i.type === "inbox_message");
    expect(inboxImpacts.length).toBe(0);
  });

  it("excludes horses outside distance threshold from at-large invites", () => {
    const closeHorse = makeHorse({ id: "h-close", distanceAptitude: 1600, fame: 80 });
    const farHorse = makeHorse({ id: "h-far", distanceAptitude: 2600, fame: 100 });
    const race = makeRace({
      id: "race-1",
      day: 50,
      distance: 1600,
      graded: {
        key: "bc-classic",
        grade: "G1",
        track: "Keeneland",
        trackId: "t1",
        surface: "Dirt",
        requiresInvitation: true,
      },
    });

    const context: PipelineContext = {
      previousDay: 19,
      newDay: 20,
      state: {
        day: 20,
        horses: h2r([closeHorse, farHorse]),
        races: r2r([race]),
        inbox: [],
        pregnancies: [],
      } as unknown as GameState,
      logs: [],
      dailyRng: { next: () => 0.5, int: () => 0, pick: () => "" } as any,
      intents: [],
      impacts: [],
      impactLog: [],
      horseMap: new Map([
        [closeHorse.id, closeHorse],
        [farHorse.id, farHorse],
      ]),
      raceMap: new Map([[race.id, race]]),
      stableMap: new Map(),
      jockeyMap: new Map(),
    };

    const result = raceInvitationsPhase.execute(context);
    const updatedRace = result.state.races["race-1"]!;
    expect(updatedRace.invitedHorseIds).toContain("h-close");
    expect(updatedRace.invitedHorseIds).not.toContain("h-far");
  });

  it("always invites Win-and-You're-In horses regardless of distance", () => {
    const horse = makeHorse({
      id: "h-wyi",
      distanceAptitude: 2600,
      fame: 10,
      winAndYouInQualified: [{ year: 1, raceId: "r1", raceKey: "bc-classic" }],
    });
    const race = makeRace({
      id: "race-1",
      day: 50,
      distance: 1600,
      graded: {
        key: "bc-classic",
        grade: "G1",
        track: "Keeneland",
        trackId: "t1",
        surface: "Dirt",
        requiresInvitation: true,
      },
    });

    const context: PipelineContext = {
      previousDay: 19,
      newDay: 20,
      state: {
        day: 20,
        horses: h2r([horse]),
        races: r2r([race]),
        inbox: [],
        pregnancies: [],
      } as unknown as GameState,
      logs: [],
      dailyRng: { next: () => 0.5, int: () => 0, pick: () => "" } as any,
      intents: [],
      impacts: [],
      impactLog: [],
      horseMap: new Map([[horse.id, horse]]),
      raceMap: new Map([[race.id, race]]),
      stableMap: new Map(),
      jockeyMap: new Map(),
    };

    const result = raceInvitationsPhase.execute(context);
    const updatedRace = result.state.races["race-1"]!;
    expect(updatedRace.invitedHorseIds).toContain("h-wyi");
  });
});

/**
 * raceInvitations.test.ts - Tests for the race invitation system
 */

import { describe, it, expect } from "vitest";
import { raceInvitationsPhase } from "@/core/time/phases/raceInvitations";
import { isHorseEligibleForRace, isHorseInvitedToRace } from "@/core/race/eligibility";
import { RacingValidator } from "@/core/resolver/validators/RacingValidator";
import { makeGradedRace } from "@/core/race/generation/raceGen";
import type { Horse, Race, GameState } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GradedRace } from "@/data/gradedRaces";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";

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
    const horse = makeHorse({ id: "h1", energy: 100 });
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
    const horse = makeHorse({ id: "h1", energy: 100 });
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
    const horse = makeHorse({ id: "h1", ownership: { type: "player" }, distanceAptitude: 1600, fame: 80 });
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
      ownership: { type: "player" },
      distanceAptitude: 1600,
      fame: 80,
    });
    const horseB = makeHorse({
      id: "h-b",
      name: "Lightning",
      ownership: { type: "player" },
      distanceAptitude: 1600,
      fame: 70,
    });
    const horseC = makeHorse({
      id: "h-c",
      name: "Storm",
      ownership: { type: "player" },
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
      ownership: { type: "player" },
      distanceAptitude: 1600,
      fame: 80,
    });
    const ownedB = makeHorse({
      id: "h-owned-b",
      name: "Lightning",
      ownership: { type: "player" },
      distanceAptitude: 1600,
      fame: 70,
    });
    const npcHorse = makeHorse({
      id: "h-npc",
      name: "Dark Horse",
      ownership: { type: "unowned" },
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
      ownership: { type: "unowned" },
      distanceAptitude: 1600,
      fame: 90,
    });
    const npcB = makeHorse({
      id: "h-npc-b",
      name: "Shadow",
      ownership: { type: "unowned" },
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
      ownership: { type: "player" },
      distanceAptitude: 1600,
      fame: 80,
    });
    const horseB = makeHorse({
      id: "h-b",
      name: "Lightning",
      ownership: { type: "player" },
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
    const horse = makeHorse({ id: "h1", ownership: { type: "player" }, distanceAptitude: 1600, fame: 80 });
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

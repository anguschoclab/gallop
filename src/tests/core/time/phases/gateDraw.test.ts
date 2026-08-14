/**
 * gateDraw.test.ts - Tests for the gate draw phase
 */

import { describe, it, expect } from "vitest";
import { gateDrawPhase } from "@/core/time/phases/gateDraw";
import type { Horse, Race, GameState } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";
import type { InboxImpact } from "@/core/resolver/impacts/inboxImpacts";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";
import { createTestHorse } from "@/tests/helpers/createTestHorse";

function makeHorse(overrides: Partial<Horse> = {}): Horse {
  return createTestHorse(overrides);
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
    weather: overrides.weather ?? "clear",
    trackCondition: overrides.trackCondition ?? "good",
    ...overrides,
  } as Race;
}

function makeG1Race(overrides: Partial<Race> = {}): Race {
  return makeRace({
    graded: {
      key: "test-g1",
      grade: "G1",
      track: "Test Track",
      trackId: "t1",
      surface: "Turf",
    },
    ...overrides,
  });
}

function makeG2Race(overrides: Partial<Race> = {}): Race {
  return makeRace({
    graded: {
      key: "test-g2",
      grade: "G2",
      track: "Test Track",
      trackId: "t1",
      surface: "Turf",
    },
    ...overrides,
  });
}

function makeContext(races: Race[], horses: Horse[], newDay: number): PipelineContext {
  return {
    previousDay: newDay - 1,
    newDay,
    state: {
      day: newDay,
      horses: h2r(horses),
      races: r2r(races),
      inbox: [],
      pregnancies: [],
    } as unknown as GameState,
    logs: [],
    dailyRng: { next: () => 0.5, int: () => 0, pick: () => "" } as any,
    intents: [],
    impacts: [],
    impactLog: [],
    horseMap: new Map(horses.map((h) => [h.id, h])),
    raceMap: new Map(races.map((r) => [r.id, r])),
    stableMap: new Map(),
    jockeyMap: new Map(),
  };
}

function makeEntries(count: number): { horseId: string; owned: boolean }[] {
  return Array.from({ length: count }, (_, i) => ({
    horseId: `h${i + 1}`,
    owned: true,
  }));
}

function makeHorsesForEntries(count: number): Horse[] {
  return Array.from({ length: count }, (_, i) =>
    makeHorse({ id: `h${i + 1}`, name: `Horse ${i + 1}`, owned: true }),
  );
}

describe("gateDrawPhase", () => {
  // 1. G1 race draws at race.day - 5 — verify entries get unique gates 1..N
  it("G1 race draws gates 5 days before race day", () => {
    const entries = makeEntries(5);
    const horses = makeHorsesForEntries(5);
    const race = makeG1Race({ id: "r1", day: 100, entries });
    const ctx = makeContext([race], horses, 95); // 100 - 5 = 95

    const result = gateDrawPhase.execute(ctx);
    const updatedRace = result.state.races["r1"]!;

    const gates = updatedRace.entries.map((e) => e.gate).sort((a, b) => (a ?? 0) - (b ?? 0));
    expect(gates).toEqual([1, 2, 3, 4, 5]);
    expect(new Set(gates).size).toBe(5);
  });

  // 2. G1 race emits InboxImpact with correct category, priority, title
  it("G1 race emits inbox_message impact with category 'race' and priority 'info'", () => {
    const entries = makeEntries(3);
    const horses = makeHorsesForEntries(3);
    const race = makeG1Race({ id: "r1", name: "Grand Stakes", day: 100, entries });
    const ctx = makeContext([race], horses, 95);

    const result = gateDrawPhase.execute(ctx);
    const inboxImpacts = result.impacts.filter((i) => i.type === "inbox_message") as InboxImpact[];

    expect(inboxImpacts.length).toBe(1);
    const impact = inboxImpacts[0];
    expect(impact.message.category).toBe("race");
    expect(impact.message.priority).toBe("info");
    expect(impact.message.title).toBe("Gate Draw: Grand Stakes");
  });

  // 3. G1 email body contains horse names and gate numbers
  it("G1 email body contains horse names and gate numbers", () => {
    const entries = makeEntries(3);
    const horses = makeHorsesForEntries(3);
    const race = makeG1Race({ id: "r1", name: "Grand Stakes", day: 100, entries });
    const ctx = makeContext([race], horses, 95);

    const result = gateDrawPhase.execute(ctx);
    const inboxImpact = result.impacts.find((i) => i.type === "inbox_message") as
      InboxImpact | undefined;

    expect(inboxImpact).toBeDefined();
    expect(inboxImpact!.message.body).toContain("Horse 1");
    expect(inboxImpact!.message.body).toContain("Horse 2");
    expect(inboxImpact!.message.body).toContain("Horse 3");
  });

  // 4. G1 email has CTA with correct label, route, params
  it("G1 email has CTA with label 'View Race', route 'race.$raceId', and raceId param", () => {
    const entries = makeEntries(2);
    const horses = makeHorsesForEntries(2);
    const race = makeG1Race({ id: "r1", day: 100, entries });
    const ctx = makeContext([race], horses, 95);

    const result = gateDrawPhase.execute(ctx);
    const inboxImpact = result.impacts.find((i) => i.type === "inbox_message") as
      InboxImpact | undefined;

    expect(inboxImpact).toBeDefined();
    expect(inboxImpact!.message.cta).toBeDefined();
    expect(inboxImpact!.message.cta!.label).toBe("View Race");
    expect(inboxImpact!.message.cta!.route).toBe("race.$raceId");
    expect(inboxImpact!.message.cta!.params).toEqual({ raceId: "r1" });
  });

  // 5. Non-G1 race (G2) draws at race.day - 2 — no inbox impact
  it("G2 race draws gates 2 days before race day with no inbox impact", () => {
    const entries = makeEntries(4);
    const horses = makeHorsesForEntries(4);
    const race = makeG2Race({ id: "r2", day: 100, entries });
    const ctx = makeContext([race], horses, 98); // 100 - 2 = 98

    const result = gateDrawPhase.execute(ctx);
    const updatedRace = result.state.races["r2"]!;

    const gates = updatedRace.entries.map((e) => e.gate).sort((a, b) => (a ?? 0) - (b ?? 0));
    expect(gates).toEqual([1, 2, 3, 4]);

    const inboxImpacts = result.impacts.filter((i) => i.type === "inbox_message");
    expect(inboxImpacts.length).toBe(0);
  });

  // 6. Non-graded race draws at race.day - 2 — no inbox impact
  it("Non-graded race draws gates 2 days before race day with no inbox impact", () => {
    const entries = makeEntries(3);
    const horses = makeHorsesForEntries(3);
    const race = makeRace({ id: "r3", day: 100, entries, graded: undefined });
    const ctx = makeContext([race], horses, 98);

    const result = gateDrawPhase.execute(ctx);
    const updatedRace = result.state.races["r3"]!;

    const gates = updatedRace.entries.map((e) => e.gate).sort((a, b) => (a ?? 0) - (b ?? 0));
    expect(gates).toEqual([1, 2, 3]);

    const inboxImpacts = result.impacts.filter((i) => i.type === "inbox_message");
    expect(inboxImpacts.length).toBe(0);
  });

  // 7. Race not yet at draw day — no action
  it("G1 race at day-4 (not yet draw day) — no action", () => {
    const entries = makeEntries(3);
    const horses = makeHorsesForEntries(3);
    const race = makeG1Race({ id: "r1", day: 100, entries });
    const ctx = makeContext([race], horses, 96); // 100 - 4 = 96, not 5

    const result = gateDrawPhase.execute(ctx);
    const updatedRace = result.state.races["r1"]!;

    // Entries should not have gates
    expect(updatedRace.entries.every((e) => e.gate === undefined)).toBe(true);
    expect(result.impacts.length).toBe(0);
  });

  // 8. Race already resolved — no action
  it("Already-resolved race — no action", () => {
    const entries = makeEntries(3);
    const horses = makeHorsesForEntries(3);
    const race = makeG1Race({ id: "r1", day: 100, entries, resolved: true });
    const ctx = makeContext([race], horses, 95);

    const result = gateDrawPhase.execute(ctx);
    expect(result.impacts.length).toBe(0);
    // State should be unchanged
    expect(result.state.races["r1"]!.entries.every((e) => e.gate === undefined)).toBe(true);
  });

  // 9. Idempotency: re-running on same day with gates already assigned — no re-draw
  it("Idempotency: re-running with gates already assigned does not re-draw", () => {
    const entries = makeEntries(3).map((e, i) => ({ ...e, gate: i + 1 }));
    const horses = makeHorsesForEntries(3);
    const race = makeG1Race({ id: "r1", day: 100, entries });
    const ctx = makeContext([race], horses, 95);

    const result = gateDrawPhase.execute(ctx);
    const updatedRace = result.state.races["r1"]!;

    // Gates should be unchanged from the pre-assigned values
    expect(updatedRace.entries.map((e) => e.gate)).toEqual([1, 2, 3]);
    // No new inbox impact (already drawn)
    const inboxImpacts = result.impacts.filter((i) => i.type === "inbox_message");
    expect(inboxImpacts.length).toBe(0);
  });

  // 10. Race with 0 entries at draw time — no crash, no email
  it("Race with 0 entries at draw time — no crash, no gates, no email", () => {
    const race = makeG1Race({ id: "r1", day: 100, entries: [] });
    const ctx = makeContext([race], [], 95);

    expect(() => gateDrawPhase.execute(ctx)).not.toThrow();
    const result = gateDrawPhase.execute(ctx);
    expect(result.state.races["r1"]!.entries.length).toBe(0);
    expect(result.impacts.filter((i) => i.type === "inbox_message").length).toBe(0);
  });

  // 11. Multiple races on same day (one G1, one non-G1) — both get correct draw timing
  it("Multiple races: G1 draws at day-5, non-graded draws at day-2 on same simulation day", () => {
    const g1Entries = makeEntries(3);
    const nonGradedEntries = makeEntries(2);
    const horses = [
      ...makeHorsesForEntries(3),
      ...makeHorsesForEntries(2).map((h, i) => ({ ...h, id: `hg${i + 1}` })),
    ];
    // Non-graded horses need different IDs
    const nonGradedHorses = Array.from({ length: 2 }, (_, i) =>
      makeHorse({ id: `hg${i + 1}`, name: `NG Horse ${i + 1}`, owned: true }),
    );
    const allHorses = [...makeHorsesForEntries(3), ...nonGradedHorses];
    const nonGradedEntriesFixed = nonGradedHorses.map((h) => ({ horseId: h.id, owned: true }));

    const g1Race = makeG1Race({ id: "g1r", day: 100, entries: g1Entries });
    const nonGradedRace = makeRace({
      id: "ngr",
      day: 97,
      entries: nonGradedEntriesFixed,
      graded: undefined,
    });
    // On day 95: G1 (day 100) should draw (100-95=5), non-graded (day 97) should NOT (97-95=2, but it's not graded so needs day 95)
    // Actually 97-95=2, so non-graded SHOULD also draw on day 95
    const ctx = makeContext([g1Race, nonGradedRace], allHorses, 95);

    const result = gateDrawPhase.execute(ctx);

    // G1 should have gates
    const updatedG1 = result.state.races["g1r"]!;
    expect(updatedG1.entries.every((e) => e.gate !== undefined)).toBe(true);

    // Non-graded (day 97, current day 95, diff=2) should also have gates
    const updatedNG = result.state.races["ngr"]!;
    expect(updatedNG.entries.every((e) => e.gate !== undefined)).toBe(true);

    // Only G1 should have inbox impact
    const inboxImpacts = result.impacts.filter((i) => i.type === "inbox_message");
    expect(inboxImpacts.length).toBe(1);
  });

  // 12. Determinism: same race ID + same entries → same gate assignment across runs
  it("Determinism: same race ID and entries produce same gate assignment", () => {
    const entries = makeEntries(5);
    const horses = makeHorsesForEntries(5);
    const race = makeG1Race({ id: "deterministic-race", day: 100, entries });

    const ctx1 = makeContext([race], horses, 95);
    const result1 = gateDrawPhase.execute(ctx1);
    const gates1 = result1.state.races["deterministic-race"]!.entries.map((e) => e.gate);

    const ctx2 = makeContext([race], horses, 95);
    const result2 = gateDrawPhase.execute(ctx2);
    const gates2 = result2.state.races["deterministic-race"]!.entries.map((e) => e.gate);

    expect(gates1).toEqual(gates2);
  });

  // 13. Partial gates: race with some entries already having gates — only assign to unassigned
  it("Partial gates: preserves existing gates, assigns only to unassigned entries", () => {
    const entries = [
      { horseId: "h1", owned: true, gate: 3 },
      { horseId: "h2", owned: true, gate: 1 },
      { horseId: "h3", owned: true }, // no gate
    ];
    const horses = makeHorsesForEntries(3);
    const race = makeG1Race({ id: "r1", day: 100, entries });
    const ctx = makeContext([race], horses, 95);

    const result = gateDrawPhase.execute(ctx);
    const updatedRace = result.state.races["r1"]!;

    // h1 keeps gate 3, h2 keeps gate 1, h3 gets gate 2
    const h1 = updatedRace.entries.find((e) => e.horseId === "h1")!;
    const h2 = updatedRace.entries.find((e) => e.horseId === "h2")!;
    const h3 = updatedRace.entries.find((e) => e.horseId === "h3")!;

    expect(h1.gate).toBe(3);
    expect(h2.gate).toBe(1);
    expect(h3.gate).toBe(2);
  });
});

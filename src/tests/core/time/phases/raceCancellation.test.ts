/**
 * Tests for raceCancellation phase
 */

import { describe, it, expect } from "vitest";
import { raceCancellationPhase } from "@/core/time/phases/raceCancellation";
import { makeGameState, makePipelineContext } from "@/tests/helpers/sampleGameState";
import type { PipelineContext } from "@/core/time/pipeline";
import type { GameState, Race, HorseCampaign } from "@/game/types";
import { r2r } from "@/tests/helpers/sampleGameState";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { createMockPipelineContext } from "@/tests/helpers/testTypes";
import { raceResolutionPhase } from "@/core/time/phases/raceResolution";
import { raceEntryResolutionPhase } from "@/core/time/phases/raceEntryResolution";
import { runNpcRaceEntry } from "@/core/npc/raceEntry";
import { runAutoEntries, reconcileSlotStatuses } from "@/core/campaign/autoEntry";
import { pruneOldRaces } from "@/game/store/helpers/market";
import { archivingPhase } from "@/core/time/phases/archivingPhase";
import type { RaceEntryIntent } from "@/core/resolver/intents";

function makeRace(overrides: Partial<Race> = {}): Race {
  return {
    id: "race-1",
    name: "Test Race",
    day: 12,
    distance: 2000,
    raceClass: "Maiden",
    entryFee: 500,
    purse: 10000,
    fieldSize: 8,
    entries: [],
    resolved: false,
    ...overrides,
  };
}

describe("raceCancellationPhase", () => {
  describe("cancellation logic", () => {
    it("1. Race with 0 entries, day === newDay + 2, non-graded → cancelled", () => {
      const race = makeRace({ id: "race-empty", day: 12, entries: [] });
      const state = makeGameState({ day: 10, races: r2r([race]) }) as GameState;
      const context = makePipelineContext({ newDay: 10, state }) as PipelineContext;

      const result = raceCancellationPhase.execute(context);
      const updatedRace = result.state.races["race-empty"];
      expect(updatedRace.cancelled).toBe(true);
      expect(updatedRace.cancelledReason).toBe("Insufficient entries");
    });

    it("2. Race with 1 entry, day === newDay + 2, non-graded → cancelled, cash_change refund emitted", () => {
      const race = makeRace({
        id: "race-one-entry",
        day: 12,
        entryFee: 500,
        entries: [{ horseId: "h1", ownership: { type: "player" }, npc: false }],
      });
      const state = makeGameState({ day: 10, races: r2r([race]) }) as GameState;
      const context = makePipelineContext({ newDay: 10, state }) as PipelineContext;

      const result = raceCancellationPhase.execute(context);
      const updatedRace = result.state.races["race-one-entry"];
      expect(updatedRace.cancelled).toBe(true);

      const cashImpacts = result.impacts.filter((i) => i.type === "cash_change");
      expect(cashImpacts).toHaveLength(1);
      expect((cashImpacts[0] as any).amount).toBe(500);
    });

    it("3. Race with 2 entries, day === newDay + 2, non-graded → NOT cancelled", () => {
      const race = makeRace({
        id: "race-two-entries",
        day: 12,
        entries: [
          { horseId: "h1", ownership: { type: "player" }, npc: false },
          { horseId: "h2", ownership: { type: "npc", stableId: asNpcStableId("s1") }, npc: true },
        ],
      });
      const state = makeGameState({ day: 10, races: r2r([race]) }) as GameState;
      const context = makePipelineContext({ newDay: 10, state }) as PipelineContext;

      const result = raceCancellationPhase.execute(context);
      expect(result.state.races["race-two-entries"].cancelled).toBeUndefined();
    });

    it("4. Graded race with 0 entries, day === newDay + 2 → NOT cancelled", () => {
      const race = makeRace({
        id: "race-graded",
        day: 12,
        entries: [],
        graded: {
          key: "test-g1",
          grade: "G1",
          trackId: "track-1",
          surface: "Turf",
        } as any,
      });
      const state = makeGameState({ day: 10, races: r2r([race]) }) as GameState;
      const context = makePipelineContext({ newDay: 10, state }) as PipelineContext;

      const result = raceCancellationPhase.execute(context);
      expect(result.state.races["race-graded"].cancelled).toBeUndefined();
    });

    it("5. Race with 0 entries, day === newDay + 3 → NOT cancelled (not yet at threshold)", () => {
      const race = makeRace({ id: "race-far", day: 13, entries: [] });
      const state = makeGameState({ day: 10, races: r2r([race]) }) as GameState;
      const context = makePipelineContext({ newDay: 10, state }) as PipelineContext;

      const result = raceCancellationPhase.execute(context);
      expect(result.state.races["race-far"].cancelled).toBeUndefined();
    });

    it("6. Race with 0 entries, day === newDay + 1 → NOT cancelled (past threshold)", () => {
      const race = makeRace({ id: "race-past", day: 11, entries: [] });
      const state = makeGameState({ day: 10, races: r2r([race]) }) as GameState;
      const context = makePipelineContext({ newDay: 10, state }) as PipelineContext;

      const result = raceCancellationPhase.execute(context);
      expect(result.state.races["race-past"].cancelled).toBeUndefined();
    });

    it("7. Already-cancelled race at day === newDay + 2 → not re-processed (idempotent)", () => {
      const race = makeRace({
        id: "race-already-cancelled",
        day: 12,
        entries: [],
        cancelled: true,
        cancelledReason: "Insufficient entries",
      });
      const state = makeGameState({ day: 10, races: r2r([race]) }) as GameState;
      const context = makePipelineContext({ newDay: 10, state }) as PipelineContext;

      const result = raceCancellationPhase.execute(context);
      expect(result.impacts).toHaveLength(0);
      expect(result.state.races["race-already-cancelled"].cancelled).toBe(true);
    });

    it("8. Already-resolved race at day === newDay + 2 → not processed", () => {
      const race = makeRace({
        id: "race-resolved",
        day: 12,
        entries: [],
        resolved: true,
      });
      const state = makeGameState({ day: 10, races: r2r([race]) }) as GameState;
      const context = makePipelineContext({ newDay: 10, state }) as PipelineContext;

      const result = raceCancellationPhase.execute(context);
      expect(result.impacts).toHaveLength(0);
      expect(result.state.races["race-resolved"].cancelled).toBeUndefined();
    });
  });

  describe("notifications and refunds", () => {
    it("9. Player-owned entry in cancelled race → inbox_message impact emitted", () => {
      const race = makeRace({
        id: "race-player-entry",
        day: 12,
        entries: [{ horseId: "h-player", ownership: { type: "player" }, npc: false }],
      });
      const horse = createTestHorse({ id: "h-player", ownership: { type: "player" } });
      const state = makeGameState({
        day: 10,
        races: r2r([race]),
        horses: { [horse.id]: horse } as any,
      }) as GameState;
      const context = makePipelineContext({ newDay: 10, state }) as PipelineContext;

      const result = raceCancellationPhase.execute(context);
      const inboxImpacts = result.impacts.filter((i) => i.type === "inbox_message");
      expect(inboxImpacts).toHaveLength(1);
      const msg = (inboxImpacts[0] as any).message;
      expect(msg.category).toBe("race");
      expect(msg.priority).toBe("action");
      expect(msg.title).toContain("Race Cancelled");
    });

    it("10. NPC-only entries in cancelled race → no inbox_message impact", () => {
      const race = makeRace({
        id: "race-npc-only",
        day: 12,
        entries: [
          {
            horseId: "h-npc",
            ownership: { type: "npc", stableId: asNpcStableId("s1") },
            npc: true,
          },
        ],
      });
      const state = makeGameState({ day: 10, races: r2r([race]) }) as GameState;
      const context = makePipelineContext({ newDay: 10, state }) as PipelineContext;

      const result = raceCancellationPhase.execute(context);
      const inboxImpacts = result.impacts.filter((i) => i.type === "inbox_message");
      expect(inboxImpacts).toHaveLength(0);
    });

    it("11. NPC entry with stableId in cancelled race → cash_change with entityId: stableId", () => {
      const race = makeRace({
        id: "race-npc-refund",
        day: 12,
        entryFee: 300,
        entries: [
          {
            horseId: "h-npc",
            ownership: { type: "npc", stableId: asNpcStableId("s-npc") },
            npc: true,
          },
        ],
      });
      const state = makeGameState({ day: 10, races: r2r([race]) }) as GameState;
      const context = makePipelineContext({ newDay: 10, state }) as PipelineContext;

      const result = raceCancellationPhase.execute(context);
      const cashImpacts = result.impacts.filter((i) => i.type === "cash_change");
      expect(cashImpacts).toHaveLength(1);
      expect((cashImpacts[0] as any).entityId).toBe("s-npc");
      expect((cashImpacts[0] as any).amount).toBe(300);
    });
  });

  describe("campaign slot updates", () => {
    it("12. Campaign slot with raceId matching cancelled race, status 'planned' → campaign_slot impact with status 'cancelled'", () => {
      const race = makeRace({ id: "race-campaign", day: 12, entries: [] });
      const campaign: HorseCampaign = {
        horseId: "h1",
        goalType: "maximize_earnings",
        slots: [
          {
            dayTarget: 12,
            dayWindow: 3,
            raceId: "race-campaign",
            role: "target",
            status: "planned",
          },
        ],
        flags: [],
        autoManaged: false,
        confirmedAptitudes: {
          surfaceStarts: { Turf: 0, Dirt: 0, Synthetic: 0 },
          distanceBandStarts: { sprint: 0, mile: 0, intermediate: 0, staying: 0 },
        },
        createdDay: 1,
        lastReviewedDay: 1,
      };
      const state = makeGameState({
        day: 10,
        races: r2r([race]),
        campaigns: [campaign],
      }) as GameState;
      const context = makePipelineContext({ newDay: 10, state }) as PipelineContext;

      const result = raceCancellationPhase.execute(context);
      const slotImpacts = result.impacts.filter((i) => i.type === "campaign_slot");
      expect(slotImpacts).toHaveLength(1);
      expect((slotImpacts[0] as any).slot.status).toBe("cancelled");
      expect((slotImpacts[0] as any).horseId).toBe("h1");
    });

    it("13. Campaign slot with raceId not matching cancelled race → no campaign_slot impact", () => {
      const race = makeRace({ id: "race-no-match", day: 12, entries: [] });
      const campaign: HorseCampaign = {
        horseId: "h1",
        goalType: "maximize_earnings",
        slots: [
          {
            dayTarget: 20,
            dayWindow: 3,
            raceId: "some-other-race",
            role: "target",
            status: "planned",
          },
        ],
        flags: [],
        autoManaged: false,
        confirmedAptitudes: {
          surfaceStarts: { Turf: 0, Dirt: 0, Synthetic: 0 },
          distanceBandStarts: { sprint: 0, mile: 0, intermediate: 0, staying: 0 },
        },
        createdDay: 1,
        lastReviewedDay: 1,
      };
      const state = makeGameState({
        day: 10,
        races: r2r([race]),
        campaigns: [campaign],
      }) as GameState;
      const context = makePipelineContext({ newDay: 10, state }) as PipelineContext;

      const result = raceCancellationPhase.execute(context);
      const slotImpacts = result.impacts.filter((i) => i.type === "campaign_slot");
      expect(slotImpacts).toHaveLength(0);
    });
  });

  describe("multiple races", () => {
    it("14. Multiple races on same day, some below threshold, some above → only below-threshold cancelled", () => {
      const raceBelow = makeRace({
        id: "race-below",
        day: 12,
        entries: [],
      });
      const raceAbove = makeRace({
        id: "race-above",
        day: 12,
        entries: [
          { horseId: "h1", ownership: { type: "player" }, npc: false },
          { horseId: "h2", ownership: { type: "npc", stableId: asNpcStableId("s1") }, npc: true },
        ],
      });
      const state = makeGameState({ day: 10, races: r2r([raceBelow, raceAbove]) }) as GameState;
      const context = makePipelineContext({ newDay: 10, state }) as PipelineContext;

      const result = raceCancellationPhase.execute(context);
      expect(result.state.races["race-below"].cancelled).toBe(true);
      expect(result.state.races["race-above"].cancelled).toBeUndefined();
    });
  });

  describe("guard points in existing phases", () => {
    it("15. raceResolutionPhase skips cancelled race (day <= newDay) — not simulated", () => {
      const race = makeRace({
        id: "race-cancelled-overdue",
        day: 5,
        entries: [],
        resolved: false,
        cancelled: true,
        cancelledReason: "Insufficient entries",
      });
      const state = makeGameState({
        day: 10,
        races: r2r([race]),
        reputation: {
          score: 50,
          tier: "local",
          events: [],
          totalWins: 0,
          gradedWins: { G1: 0, G2: 0, G3: 0, Listed: 0 },
          yearsActive: 1,
        },
      }) as GameState;
      const context = makePipelineContext({ newDay: 10, state }) as PipelineContext;

      const result = raceResolutionPhase.execute(context);
      expect(result.state.races["race-cancelled-overdue"].resolved).toBe(false);
      expect(result.impacts.filter((i) => i.type === "race_result")).toHaveLength(0);
    });

    it("16. raceResolutionPhase cleanup prunes cancelled races older than 30 days", () => {
      const oldCancelledRace = makeRace({
        id: "race-old-cancelled",
        day: 5,
        entries: [],
        resolved: false,
        cancelled: true,
        cancelledReason: "Insufficient entries",
      });
      const state = makeGameState({
        day: 50,
        races: r2r([oldCancelledRace]),
        reputation: {
          score: 50,
          tier: "local",
          events: [],
          totalWins: 0,
          gradedWins: { G1: 0, G2: 0, G3: 0, Listed: 0 },
          yearsActive: 1,
        },
      }) as GameState;
      const context = makePipelineContext({ newDay: 50, state }) as PipelineContext;

      const result = raceResolutionPhase.execute(context);
      expect(result.state.races["race-old-cancelled"]).toBeUndefined();
    });

    it("17. raceEntryResolutionPhase skips cancelled race — no race_entry impact", () => {
      const horse = createTestHorse({ id: "horse-1" });
      const race = makeRace({
        id: "race-cancelled-entry",
        day: 5,
        entries: [],
        resolved: false,
        cancelled: true,
        cancelledReason: "Insufficient entries",
      });
      const state = makeGameState({
        day: 1,
        races: r2r([race]),
        horses: { [horse.id]: horse } as any,
      }) as GameState;

      const intent: RaceEntryIntent = {
        id: "intent-1",
        day: 1,
        type: "race_entry",
        entityId: "horse-1",
        priority: 100,
        source: "player",
        horseId: "horse-1",
        raceId: "race-cancelled-entry",
      };

      const context = createMockPipelineContext({ state, intents: [intent] });
      const result = raceEntryResolutionPhase.execute(context);

      expect(result.impacts.filter((i) => i.type === "race_entry")).toHaveLength(0);
    });

    it("18. runNpcRaceEntry skips cancelled races", () => {
      const horse = createTestHorse({ id: "h-npc", stableId: "s1" });
      const race = makeRace({
        id: "race-cancelled-npc",
        day: 12,
        entries: [],
        resolved: false,
        cancelled: true,
        cancelledReason: "Insufficient entries",
      });
      const stable = { id: "s1", name: "S1", cash: 10000, horses: ["h-npc"] } as any;

      const updatedRaces = runNpcRaceEntry(
        [stable],
        [horse],
        [],
        [race],
        10,
        { next: () => 0.5 } as any,
        3,
        new Set(),
      );

      const updatedRace = updatedRaces.find((r) => r.id === "race-cancelled-npc");
      expect(updatedRace?.entries.length).toBe(0);
    });

    it("19. runAutoEntries skips cancelled races — slot targeting cancelled race not entered", () => {
      const horse = createTestHorse({ id: "h-auto", ownership: { type: "player" } });
      const race = makeRace({
        id: "race-cancelled-auto",
        day: 12,
        entries: [],
        resolved: false,
        cancelled: true,
        cancelledReason: "Insufficient entries",
      });
      const campaign: HorseCampaign = {
        horseId: "h-auto",
        goalType: "maximize_earnings",
        slots: [
          {
            dayTarget: 12,
            dayWindow: 3,
            raceId: "race-cancelled-auto",
            role: "target",
            status: "planned",
          },
        ],
        flags: [],
        autoManaged: true,
        confirmedAptitudes: {
          surfaceStarts: { Turf: 0, Dirt: 0, Synthetic: 0 },
          distanceBandStarts: { sprint: 0, mile: 0, intermediate: 0, staying: 0 },
        },
        createdDay: 1,
        lastReviewedDay: 1,
      };

      const result = runAutoEntries({
        horse,
        campaign,
        races: [race],
        currentDay: 10,
        cash: 100000,
        enterRaceFn: () => ({ ok: true }),
      });

      expect(result.entered).toHaveLength(0);
      const slot = result.updatedSlots[0];
      expect(slot.status).not.toBe("entered");
    });

    it("20. reconcileSlotStatuses marks slot as 'cancelled' when race is cancelled and slot was 'entered'", () => {
      const race = makeRace({
        id: "race-reconcile",
        day: 12,
        entries: [],
        resolved: false,
        cancelled: true,
        cancelledReason: "Insufficient entries",
      });
      const campaign: HorseCampaign = {
        horseId: "h1",
        goalType: "maximize_earnings",
        slots: [
          {
            dayTarget: 12,
            dayWindow: 3,
            raceId: "race-reconcile",
            role: "target",
            status: "entered",
          },
        ],
        flags: [],
        autoManaged: false,
        confirmedAptitudes: {
          surfaceStarts: { Turf: 0, Dirt: 0, Synthetic: 0 },
          distanceBandStarts: { sprint: 0, mile: 0, intermediate: 0, staying: 0 },
        },
        createdDay: 1,
        lastReviewedDay: 1,
      };

      const updatedSlots = reconcileSlotStatuses(campaign, [race]);
      expect(updatedSlots[0].status).toBe("cancelled");
    });

    it("21. pruneOldRaces prunes cancelled races older than 30 days (non-graded)", () => {
      const oldCancelled = makeRace({
        id: "race-old",
        day: 10,
        entries: [],
        resolved: false,
        cancelled: true,
        cancelledReason: "Insufficient entries",
      });
      const result = pruneOldRaces([oldCancelled], 50);
      expect(result.find((r) => r.id === "race-old")).toBeUndefined();
    });

    it("22. archivingPhase archives cancelled races older than 30 days", () => {
      const oldCancelled = makeRace({
        id: "race-archive",
        day: 10,
        entries: [],
        resolved: false,
        cancelled: true,
        cancelledReason: "Insufficient entries",
      });
      const state = makeGameState({
        day: 50,
        races: r2r([oldCancelled]),
      }) as GameState;
      const context = makePipelineContext({ newDay: 50, state }) as PipelineContext;

      const result = archivingPhase.execute(context);
      expect(result.state.races["race-archive"]).toBeUndefined();
      expect(result.state.archive?.races.find((r) => r.id === "race-archive")).toBeDefined();
    });
  });
});

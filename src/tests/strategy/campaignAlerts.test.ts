import { describe, it, expect } from "vitest";
import { schedulerPhase } from "@/core/time/phases/schedulerPhase";
import { raceEntryResolutionPhase } from "@/core/time/phases/raceEntryResolution";
import { HorseHandler } from "@/core/resolver/handlers/HorseHandler";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import type { Race, HorseCampaign, GameState } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";
import type { RaceEntryIntent } from "@/core/resolver/intents";
import type { InjuryImpact, HealthStatusImpact } from "@/core/resolver/impacts/index";
import { makePlayerOwned, makeNpcOwned } from "@/core/horse/ownership";
import { asHorseId, asNpcStableId } from "@/core/types/branded";
import { createRng } from "@/core/common/rng";

describe("Campaign Alerts: Field Full Bumping & Injury Notifications", () => {
  it("emits an urgent inbox message and campaign flag when auto-entry skips due to full field", () => {
    const horse = createTestHorse({
      id: asHorseId("horse-auto-1"),
      name: "Thunder Bolt",
      ownership: makePlayerOwned(),
      energy: 90,
      age: 3,
    });

    const fullRace: Race = {
      id: "race-full-1",
      name: "Saratoga Cup",
      day: 100,
      fieldSize: 2,
      entryFee: 500,
      distance: 1600,
      surface: "Dirt",
      track: "Saratoga",
      entries: [
        { horseId: asHorseId("npc-1"), ownership: makeNpcOwned(asNpcStableId("stable-npc-1")) },
        { horseId: asHorseId("npc-2"), ownership: makeNpcOwned(asNpcStableId("stable-npc-2")) },
      ],
      resolved: false,
      cancelled: false,
    } as Race;

    const campaign: HorseCampaign = {
      horseId: horse.id,
      goalType: "chase_g1",
      autoManaged: true,
      createdDay: 1,
      lastReviewedDay: 95,
      flags: [],
      confirmedAptitudes: {
        surfaceStarts: { Turf: 0, Dirt: 3, Synthetic: 0 },
        distanceBandStarts: { sprint: 0, mile: 3, intermediate: 0, staying: 0 },
      },
      slots: [
        {
          dayTarget: 100,
          dayWindow: 5,
          raceId: fullRace.id,
          role: "target",
          status: "planned",
        },
      ],
    };

    const dummyState = {
      day: 98,
      cash: 50000,
      horses: { [horse.id]: horse },
      races: { [fullRace.id]: fullRace },
      campaigns: [campaign],
      inbox: [],
    } as unknown as GameState;

    const context: PipelineContext = {
      state: dummyState,
      newDay: 98,
      horseMap: new Map([[horse.id, horse]]),
      raceMap: new Map([[fullRace.id, fullRace]]),
      stableMap: new Map(),
      jockeyMap: new Map(),
      intents: [],
      impacts: [],
      logs: [],
      dailyRng: createRng(12345),
    };

    const nextContext = schedulerPhase.execute(context);

    // 1. Check an inbox message was emitted
    const inboxImpact = nextContext.impacts.find(
      (imp) =>
        imp.type === "inbox_message" &&
        (imp as any).message?.title?.includes("Bumped") &&
        (imp as any).message?.category === "race",
    );
    expect(inboxImpact).toBeDefined();
    expect((inboxImpact as any).message.priority).toBe("urgent");
    expect((inboxImpact as any).message.cta?.route).toContain("strategy");

    // 2. Check campaign flag added
    const updatedCampaign = nextContext.state.campaigns?.find((c) => c.horseId === horse.id);
    expect(updatedCampaign).toBeDefined();
    const fieldFullFlag = updatedCampaign?.flags.find(
      (f) => f.type === "field_full" || f.message.includes("field full"),
    );
    expect(fieldFullFlag).toBeDefined();
  });

  it("emits an inbox message when player entry is rejected because field is full and no bump is possible", () => {
    const weakHorse = createTestHorse({
      id: asHorseId("horse-weak"),
      name: "Slow Mover",
      ownership: makePlayerOwned(),
      energy: 90,
      stats: {
        speed: 40,
        stamina: 40,
        acceleration: 40,
        consistency: 40,
        temperament: 40,
        conformation: 40,
      },
    });

    const strongNpc1 = createTestHorse({
      id: asHorseId("horse-strong-1"),
      name: "Titan",
      ownership: makeNpcOwned(asNpcStableId("stable-npc-1")),
      stats: {
        speed: 90,
        stamina: 90,
        acceleration: 90,
        consistency: 90,
        temperament: 90,
        conformation: 90,
      },
    });

    const strongNpc2 = createTestHorse({
      id: asHorseId("horse-strong-2"),
      name: "Colossus",
      ownership: makeNpcOwned(asNpcStableId("stable-npc-2")),
      stats: {
        speed: 90,
        stamina: 90,
        acceleration: 90,
        consistency: 90,
        temperament: 90,
        conformation: 90,
      },
    });

    const fullRace: Race = {
      id: "race-full-entry",
      name: "Metropolitan Mile",
      day: 50,
      fieldSize: 2,
      entryFee: 200,
      distance: 1600,
      surface: "Dirt",
      track: "Belmont Park",
      entries: [
        { horseId: strongNpc1.id, ownership: strongNpc1.ownership },
        { horseId: strongNpc2.id, ownership: strongNpc2.ownership },
      ],
      resolved: false,
      cancelled: false,
    } as Race;

    const entryIntent: RaceEntryIntent = {
      id: "intent-entry-full",
      entityId: weakHorse.id,
      source: "player",
      day: 50,
      priority: 100,
      type: "race_entry",
      raceId: fullRace.id,
      horseId: weakHorse.id,
    };

    const dummyState = {
      day: 50,
      cash: 50000,
      horses: {
        [weakHorse.id]: weakHorse,
        [strongNpc1.id]: strongNpc1,
        [strongNpc2.id]: strongNpc2,
      },
      races: { [fullRace.id]: fullRace },
      npcStables: [],
      jockeys: [],
      transactions: [],
      transports: [],
      inbox: [],
    } as unknown as GameState;

    const context: PipelineContext = {
      state: dummyState,
      newDay: 50,
      horseMap: new Map([
        [weakHorse.id, weakHorse],
        [strongNpc1.id, strongNpc1],
        [strongNpc2.id, strongNpc2],
      ]),
      raceMap: new Map([[fullRace.id, fullRace]]),
      stableMap: new Map(),
      jockeyMap: new Map(),
      intents: [entryIntent],
      impacts: [],
      logs: [],
      dailyRng: createRng(12345),
    };

    const nextContext = raceEntryResolutionPhase.execute(context);

    // Player intent should not produce a successful race_entry impact
    const entryImpact = nextContext.impacts.find(
      (imp) => imp.type === "race_entry" && (imp as any).horseId === weakHorse.id,
    );
    expect(entryImpact).toBeUndefined();

    // But should produce an inbox_message impact alerting the player
    const alertImpact = nextContext.impacts.find(
      (imp) =>
        imp.type === "inbox_message" &&
        (imp as any).message?.title?.includes("Full") &&
        (imp as any).message?.category === "race",
    );
    expect(alertImpact).toBeDefined();
    expect((alertImpact as any).message.cta?.route).toContain("strategy");
  });

  it("adds a health_issue campaign flag and strategy CTA when horse suffers race injury", () => {
    const horse = createTestHorse({
      id: asHorseId("horse-injured-1"),
      name: "Golden Runner",
      ownership: makePlayerOwned(),
      healthStatus: "healthy",
    });

    const campaign: HorseCampaign = {
      horseId: horse.id,
      goalType: "chase_g1",
      autoManaged: true,
      createdDay: 1,
      lastReviewedDay: 20,
      flags: [],
      confirmedAptitudes: {
        surfaceStarts: { Turf: 2, Dirt: 0, Synthetic: 0 },
        distanceBandStarts: { sprint: 2, mile: 0, intermediate: 0, staying: 0 },
      },
      slots: [
        {
          dayTarget: 30,
          dayWindow: 5,
          role: "target",
          status: "planned",
        },
      ],
    };

    const state = {
      day: 25,
      horses: { [horse.id]: { ...horse } },
      campaigns: [campaign],
      inbox: [],
    } as unknown as GameState;

    const handler = new HorseHandler();
    const injuryImpact: InjuryImpact = {
      id: "impact-injury-1",
      intentId: "",
      day: 25,
      phase: "raceResolution",
      logLevel: "always",
      type: "injury",
      horseId: horse.id,
      severity: "major",
      injuryType: "tendonitis",
      recoveryDays: 45,
      reason: "Tendonitis sustained during race",
    };

    handler.handle(state as any, injuryImpact);

    // 1. Verify health status updated on horse
    expect(state.horses[horse.id].healthStatus).toBe("recovering");

    // 2. Verify campaign flag added
    const updatedCampaign = state.campaigns?.find((c) => c.horseId === horse.id);
    expect(updatedCampaign).toBeDefined();
    const healthFlag = updatedCampaign?.flags.find((f) => f.type === "health_issue");
    expect(healthFlag).toBeDefined();
    expect(healthFlag?.message).toContain("tendonitis");

    // 3. Verify inbox message created with CTA to strategy
    const inboxMsg = state.inbox.find((m) => m.category === "injury");
    expect(inboxMsg).toBeDefined();
    expect(inboxMsg?.cta?.route).toContain("strategy");
  });

  it("adds a health_issue campaign flag when horse undergoes recovering health status change", () => {
    const horse = createTestHorse({
      id: asHorseId("horse-ocd-1"),
      name: "Young Prospect",
      ownership: makePlayerOwned(),
      healthStatus: "healthy",
      age: 2,
    });

    const campaign: HorseCampaign = {
      horseId: horse.id,
      goalType: "develop_maiden",
      autoManaged: true,
      createdDay: 1,
      lastReviewedDay: 10,
      flags: [],
      confirmedAptitudes: {
        surfaceStarts: { Turf: 0, Dirt: 0, Synthetic: 0 },
        distanceBandStarts: { sprint: 0, mile: 0, intermediate: 0, staying: 0 },
      },
      slots: [],
    };

    const state = {
      day: 15,
      horses: { [horse.id]: { ...horse } },
      campaigns: [campaign],
      inbox: [],
    } as unknown as GameState;

    const handler = new HorseHandler();
    const healthImpact: HealthStatusImpact = {
      id: "impact-health-1",
      intentId: "",
      day: 15,
      phase: "trainingResolution",
      logLevel: "always",
      type: "health_status_change",
      horseId: horse.id,
      status: "recovering",
      previousStatus: "healthy",
      recoveryDay: 45,
      reason: "OCD injury during training",
    };

    handler.handle(state as any, healthImpact);

    expect(state.horses[horse.id].healthStatus).toBe("recovering");

    const updatedCampaign = state.campaigns?.find((c) => c.horseId === horse.id);
    const healthFlag = updatedCampaign?.flags.find((f) => f.type === "health_issue");
    expect(healthFlag).toBeDefined();

    const inboxMsg = state.inbox.find((m) => m.category === "injury" || m.title.includes("Health"));
    expect(inboxMsg).toBeDefined();
    expect(inboxMsg?.cta?.route).toContain("strategy");
  });
});

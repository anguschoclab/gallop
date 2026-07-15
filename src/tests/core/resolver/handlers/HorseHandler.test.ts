import { describe, it, expect } from "vitest";
import { HorseHandler } from "@/core/resolver/handlers/HorseHandler";
import type { GameState } from "@/game/store/state";
import type {
  HorseStatImpact,
  EnergyImpact,
  FormImpact,
  FameImpact,
  RenameImpact,
  AgingImpact,
  PastureRetirementImpact,
  HorseDeathImpact,
  RecoveryImpact,
  FitnessImpact,
  PeakingIndexImpact,
  BeyerImpact,
} from "@/core/resolver/impacts/index";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";
import type { Horse } from "@/game/types";

describe("HorseHandler", () => {
  it("horse_stat_change clamps to potential", () => {
    const handler = new HorseHandler();
    const state = {
      horses: h2r([
        {
          id: "h1",
          name: "Star",
          potential: 80,
          stats: {
            speed: 70,
            stamina: 60,
            acceleration: 50,
            temperament: 40,
            conformation: 30,
            consistency: 20,
          },
        },
      ] as unknown as Horse[]),
    } as unknown as GameState;

    const impact: HorseStatImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "trainingResolution",
      logLevel: "always",
      type: "horse_stat_change",
      horseId: "h1",
      stat: "speed",
      delta: 20,
      reason: "Training gain",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.horses["h1"].stats.speed).toBe(80);
  });

  it("horse_stat_change does not go below 0", () => {
    const handler = new HorseHandler();
    const state = {
      horses: h2r([
        {
          id: "h1",
          name: "Star",
          potential: 80,
          stats: {
            speed: 5,
            stamina: 60,
            acceleration: 50,
            temperament: 40,
            conformation: 30,
            consistency: 20,
          },
        },
      ] as unknown as Horse[]),
    } as unknown as GameState;

    const impact: HorseStatImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "trainingResolution",
      logLevel: "always",
      type: "horse_stat_change",
      horseId: "h1",
      stat: "speed",
      delta: -20,
      reason: "Decline",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.horses["h1"].stats.speed).toBe(0);
  });

  it("energy_change clamps 0-100", () => {
    const handler = new HorseHandler();
    const state = {
      horses: h2r([{ id: "h1", name: "Star", energy: 90 }] as unknown as Horse[]),
    } as unknown as GameState;

    const impact: EnergyImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "raceResolution",
      logLevel: "always",
      type: "energy_change",
      horseId: "h1",
      delta: 50,
      reason: "Energy gain",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.horses["h1"].energy).toBe(100);
  });

  it("energy_change does not go below 0", () => {
    const handler = new HorseHandler();
    const state = {
      horses: h2r([{ id: "h1", name: "Star", energy: 10 }] as unknown as Horse[]),
    } as unknown as GameState;

    const impact: EnergyImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "raceResolution",
      logLevel: "always",
      type: "energy_change",
      horseId: "h1",
      delta: -50,
      reason: "Energy loss",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.horses["h1"].energy).toBe(0);
  });

  it("form_change clamps -10 to 10", () => {
    const handler = new HorseHandler();
    const state = {
      horses: h2r([{ id: "h1", name: "Star", form: 8 }] as unknown as Horse[]),
    } as unknown as GameState;

    const impact: FormImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "raceResolution",
      logLevel: "always",
      type: "form_change",
      horseId: "h1",
      delta: 5,
      reason: "Good race",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.horses["h1"].form).toBe(10);
  });

  it("fame_change clamps 0-100", () => {
    const handler = new HorseHandler();
    const state = {
      horses: h2r([{ id: "h1", name: "Star", fame: 95 }] as unknown as Horse[]),
    } as unknown as GameState;

    const impact: FameImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "raceResolution",
      logLevel: "always",
      type: "fame_change",
      horseId: "h1",
      delta: 10,
      reason: "G1 win",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.horses["h1"].fame).toBe(100);
  });

  it("rename updates name", () => {
    const handler = new HorseHandler();
    const state = {
      horses: h2r([{ id: "h1", name: "Old Name" }] as unknown as Horse[]),
    } as unknown as GameState;

    const impact: RenameImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "managementResolution",
      logLevel: "always",
      type: "rename",
      horseId: "h1",
      newName: "New Name",
      reason: "Renamed",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.horses["h1"].name).toBe("New Name");
  });

  it("aging updates age", () => {
    const handler = new HorseHandler();
    const state = {
      horses: h2r([{ id: "h1", name: "Star", age: 3 }] as unknown as Horse[]),
    } as unknown as GameState;

    const impact: AgingImpact = {
      id: "imp-1",
      intentId: "",
      day: 365,
      phase: "seasonResolution",
      logLevel: "always",
      type: "aging",
      horseId: "h1",
      newAge: 4,
      previousAge: 3,
      reason: "New year",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.horses["h1"].age).toBe(4);
  });

  it("pasture_retirement sets lifecycleStatus", () => {
    const handler = new HorseHandler();
    const state = {
      horses: h2r([{ id: "h1", name: "Star" }] as unknown as Horse[]),
    } as unknown as GameState;

    const impact: PastureRetirementImpact = {
      id: "imp-1",
      intentId: "",
      day: 100,
      phase: "managementResolution",
      logLevel: "always",
      type: "pasture_retirement",
      horseId: "h1",
      retiredOnDay: 100,
      reason: "Retired",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.horses["h1"].lifecycleStatus).toBe("retired");
    expect(draft.horses["h1"].retiredOnDay).toBe(100);
  });

  it("horse_death sets lifecycleStatus, cause, day", () => {
    const handler = new HorseHandler();
    const state = {
      horses: h2r([{ id: "h1", name: "Star" }] as unknown as Horse[]),
    } as unknown as GameState;

    const impact: HorseDeathImpact = {
      id: "imp-1",
      intentId: "",
      day: 200,
      phase: "raceResolution",
      logLevel: "always",
      type: "horse_death",
      horseId: "h1",
      cause: "colic",
      deceasedOnDay: 200,
      reason: "Passed away",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.horses["h1"].lifecycleStatus).toBe("deceased");
    expect(draft.horses["h1"].deceasedOnDay).toBe(200);
    expect(draft.horses["h1"].causeOfDeath).toBe("colic");
  });

  it("recovery_change clamps 0-100", () => {
    const handler = new HorseHandler();
    const state = {
      horses: h2r([{ id: "h1", name: "Star", recoveryPoints: 10 }] as unknown as Horse[]),
    } as unknown as GameState;

    const impact: RecoveryImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "trainingResolution",
      logLevel: "always",
      type: "recovery_change",
      horseId: "h1",
      delta: -50,
      reason: "Recovery used",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.horses["h1"].recoveryPoints).toBe(0);
  });

  it("fitness_change does not go below 0", () => {
    const handler = new HorseHandler();
    const state = {
      horses: h2r([{ id: "h1", name: "Star", fitness: 30 }] as unknown as Horse[]),
    } as unknown as GameState;

    const impact: FitnessImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "raceResolution",
      logLevel: "always",
      type: "fitness_change",
      horseId: "h1",
      delta: -50,
      reason: "Race fatigue",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.horses["h1"].fitness).toBe(0);
  });

  it("peaking_index_update sets value", () => {
    const handler = new HorseHandler();
    const state = {
      horses: h2r([{ id: "h1", name: "Star" }] as unknown as Horse[]),
    } as unknown as GameState;

    const impact: PeakingIndexImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "trainingResolution",
      logLevel: "always",
      type: "peaking_index_update",
      horseId: "h1",
      value: 75,
      reason: "Peaking update",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.horses["h1"].peakingIndex).toBe(75);
  });

  it("beyer_update sets lastBeyer and lastRaceDay", () => {
    const handler = new HorseHandler();
    const state = {
      horses: h2r([{ id: "h1", name: "Star" }] as unknown as Horse[]),
    } as unknown as GameState;

    const impact: BeyerImpact = {
      id: "imp-1",
      intentId: "",
      day: 50,
      phase: "raceResolution",
      logLevel: "always",
      type: "beyer_update",
      horseId: "h1",
      beyer: 92,
      raceDay: 50,
      reason: "Race result",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.horses["h1"].lastBeyer).toBe(92);
    expect(draft.horses["h1"].lastRaceDay).toBe(50);
  });

  it("handle() resolves horse by entityId when horseId is absent", () => {
    const handler = new HorseHandler();
    const state = {
      horses: h2r([{ id: "h1", name: "Star", energy: 50 }] as unknown as Horse[]),
    } as unknown as GameState;

    const impact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "raceResolution",
      logLevel: "always",
      type: "energy_change",
      entityId: "h1",
      delta: 20,
      reason: "Energy gain",
    } as any;

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.horses["h1"].energy).toBe(70);
  });

  it("canHandle returns true for known horse impact types", () => {
    const handler = new HorseHandler();
    expect(handler.canHandle("horse_stat_change")).toBe(true);
    expect(handler.canHandle("energy_change")).toBe(true);
    expect(handler.canHandle("form_change")).toBe(true);
    expect(handler.canHandle("fame_change")).toBe(true);
    expect(handler.canHandle("gelding")).toBe(true);
    expect(handler.canHandle("rename")).toBe(true);
    expect(handler.canHandle("aging")).toBe(true);
    expect(handler.canHandle("injury")).toBe(true);
    expect(handler.canHandle("beyer_update")).toBe(true);
    expect(handler.canHandle("horse_deletion")).toBe(true);
    expect(handler.canHandle("cash_change")).toBe(false);
  });
});

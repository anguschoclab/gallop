import { describe, it, expect } from "vitest";
import { HorseHandler } from "@/core/resolver/handlers/HorseHandler";
import type { GameState } from "@/game/store/state";
import type {
  HorseStatImpact,
  EnergyImpact,
  FormImpact,
  FameImpact,
  RecoveryImpact,
  FitnessImpact,
  FatigueImpact,
} from "@/core/resolver/impacts/index";
import { h2r } from "@/tests/helpers/sampleGameState";
import type { Horse } from "@/game/types";

function mkState(horse: Partial<Horse>): GameState {
  return {
    horses: h2r([{ id: "h1", name: "Star", ...horse } as unknown as Horse]),
  } as unknown as GameState;
}

function mkImpact<
  T extends {
    id: string;
    intentId: string;
    day: number;
    phase: string;
    logLevel: string;
    type: string;
    horseId: string;
  },
>(type: string, horseId: string, extra: Record<string, unknown>): T {
  return {
    id: "imp-1",
    intentId: "",
    day: 10,
    phase: "trainingResolution",
    logLevel: "always",
    type,
    horseId,
    ...extra,
  } as unknown as T;
}

describe("HorseHandler — stat rounding", () => {
  it("rounds stat result when current stat is a float", () => {
    const handler = new HorseHandler();
    const state = mkState({
      potential: 100,
      stats: {
        speed: 38.395981615409255,
        stamina: 60,
        acceleration: 50,
        temperament: 40,
        conformation: 30,
        consistency: 20,
      },
    });
    const impact = mkImpact<HorseStatImpact>("horse_stat_change", "h1", {
      stat: "speed",
      delta: 1,
      reason: "Training",
    });
    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);
    expect(draft.horses["h1"].stats.speed).toBe(39);
  });

  it("rounds stat result when delta is a float", () => {
    const handler = new HorseHandler();
    const state = mkState({
      potential: 100,
      stats: {
        speed: 50,
        stamina: 60,
        acceleration: 50,
        temperament: 40,
        conformation: 30,
        consistency: 20,
      },
    });
    const impact = mkImpact<HorseStatImpact>("horse_stat_change", "h1", {
      stat: "speed",
      delta: 1.7,
      reason: "Training",
    });
    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);
    expect(draft.horses["h1"].stats.speed).toBe(52);
  });

  it("rounds stat after clamping to potential", () => {
    const handler = new HorseHandler();
    const state = mkState({
      potential: 80,
      stats: {
        speed: 79,
        stamina: 60,
        acceleration: 50,
        temperament: 40,
        conformation: 30,
        consistency: 20,
      },
    });
    const impact = mkImpact<HorseStatImpact>("horse_stat_change", "h1", {
      stat: "speed",
      delta: 2,
      reason: "Training",
    });
    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);
    expect(draft.horses["h1"].stats.speed).toBe(80);
  });

  it("rounds energy when delta is a float", () => {
    const handler = new HorseHandler();
    const state = mkState({ energy: 80 });
    const impact = mkImpact<EnergyImpact>("energy_change", "h1", {
      delta: -15.3,
      reason: "Training",
    });
    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);
    expect(draft.horses["h1"].energy).toBe(65);
  });

  it("rounds fame when delta is 0.5", () => {
    const handler = new HorseHandler();
    const state = mkState({ fame: 10 });
    const impact = mkImpact<FameImpact>("fame_change", "h1", { delta: 0.5, reason: "Placed" });
    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);
    expect(draft.horses["h1"].fame).toBe(11);
  });

  it("rounds form after applying delta", () => {
    const handler = new HorseHandler();
    const state = mkState({ form: 3 });
    const impact = mkImpact<FormImpact>("form_change", "h1", { delta: 1.5, reason: "Good race" });
    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);
    expect(draft.horses["h1"].form).toBe(5);
  });

  it("rounds fitness after applying delta", () => {
    const handler = new HorseHandler();
    const state = mkState({ fitness: 50 });
    const impact = mkImpact<FitnessImpact>("fitness_change", "h1", {
      delta: 12.0,
      reason: "Training",
    });
    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);
    expect(draft.horses["h1"].fitness).toBe(62);
  });

  it("rounds fatigue after applying delta", () => {
    const handler = new HorseHandler();
    const state = mkState({ fatigue: 30 });
    const impact = mkImpact<FatigueImpact>("fatigue_change", "h1", { delta: 24.0, reason: "Race" });
    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);
    expect(draft.horses["h1"].fatigue).toBe(54);
  });

  it("rounds recoveryPoints after applying delta", () => {
    const handler = new HorseHandler();
    const state = mkState({ recoveryPoints: 50 });
    const impact = mkImpact<RecoveryImpact>("recovery_change", "h1", {
      delta: 15.7,
      reason: "Recovery",
    });
    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);
    expect(draft.horses["h1"].recoveryPoints).toBe(66);
  });

  it("preserves integer stats when delta is integer", () => {
    const handler = new HorseHandler();
    const state = mkState({
      potential: 100,
      stats: {
        speed: 50,
        stamina: 60,
        acceleration: 50,
        temperament: 40,
        conformation: 30,
        consistency: 20,
      },
    });
    const impact = mkImpact<HorseStatImpact>("horse_stat_change", "h1", {
      stat: "speed",
      delta: 5,
      reason: "Training",
    });
    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);
    expect(draft.horses["h1"].stats.speed).toBe(55);
  });
});

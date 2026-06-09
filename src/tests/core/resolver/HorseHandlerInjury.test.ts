import { describe, it, expect } from "vitest";
import { HorseHandler } from "@/core/resolver/handlers/HorseHandler";
import type { GameState } from "@/game/store/state";
import type { InjuryImpact, HealthStatusImpact } from "@/core/resolver/impacts/index";

describe("HorseHandler - Injury Handling", () => {
  it("should update horse health status when injured", () => {
    const handler = new HorseHandler();
    const state = {
      horses: [{ id: "horse-1", name: "Star", healthStatus: "healthy" }],
    } as unknown as GameState;

    const impact: InjuryImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "raceResolution",
      logLevel: "always",
      type: "injury",
      horseId: "horse-1",
      severity: "moderate",
      injuryType: "Sore shins",
      recoveryDays: 20,
      reason: "Race injury",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    const horse = draft.horses[0];
    expect(horse.healthStatus).toBe("recovering");
    expect(horse.activeInjury).toBeDefined();
    expect(horse.activeInjury.type).toBe("Sore shins");
    expect(horse.activeInjury.recoveryDays).toBe(20);
  });

  it("should mark horse as other_illness for career-ending injuries", () => {
    const handler = new HorseHandler();
    const state = {
      horses: [{ id: "horse-1", name: "Star", healthStatus: "healthy" }],
    } as unknown as GameState;

    const impact: InjuryImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "raceResolution",
      logLevel: "always",
      type: "injury",
      horseId: "horse-1",
      severity: "career-ending",
      injuryType: "Severe fracture",
      recoveryDays: 999,
      reason: "Race injury",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    const horse = draft.horses[0];
    expect(horse.healthStatus).toBe("other_illness");
  });

  it("should NOT overwrite covering_sickness with an injury", () => {
    const handler = new HorseHandler();
    const state = {
      horses: [{ id: "horse-1", name: "Star", healthStatus: "covering_sickness", healthStatusDay: 5 }],
    } as unknown as GameState;

    const impact: InjuryImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "raceResolution",
      logLevel: "always",
      type: "injury",
      horseId: "horse-1",
      severity: "moderate",
      injuryType: "Sore shins",
      recoveryDays: 20,
      reason: "Race injury",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    const horse = draft.horses[0];
    expect(horse.healthStatus).toBe("covering_sickness");
    expect(horse.healthStatusDay).toBe(5);
    expect(horse.activeInjury).toBeUndefined();
  });

  it("should NOT overwrite other_illness with an injury", () => {
    const handler = new HorseHandler();
    const state = {
      horses: [{ id: "horse-1", name: "Star", healthStatus: "other_illness", healthStatusDay: 3 }],
    } as unknown as GameState;

    const impact: InjuryImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "raceResolution",
      logLevel: "always",
      type: "injury",
      horseId: "horse-1",
      severity: "major",
      injuryType: "Tendon tear",
      recoveryDays: 45,
      reason: "Race injury",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    const horse = draft.horses[0];
    expect(horse.healthStatus).toBe("other_illness");
    expect(horse.healthStatusDay).toBe(3);
    expect(horse.activeInjury).toBeUndefined();
  });

  it("should NOT overwrite recovering status with an injury", () => {
    const handler = new HorseHandler();
    const state = {
      horses: [{ id: "horse-1", name: "Star", healthStatus: "recovering", healthStatusDay: 8 }],
    } as unknown as GameState;

    const impact: InjuryImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "raceResolution",
      logLevel: "always",
      type: "injury",
      horseId: "horse-1",
      severity: "minor",
      injuryType: "Soft tissue strain",
      recoveryDays: 14,
      reason: "Race injury",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    const horse = draft.horses[0];
    expect(horse.healthStatus).toBe("recovering");
    expect(horse.healthStatusDay).toBe(8);
    expect(horse.activeInjury).toBeUndefined();
  });

  it("should NOT overwrite existing sickness via health_status_change impact", () => {
    const handler = new HorseHandler();
    const state = {
      horses: [{ id: "horse-1", name: "Star", healthStatus: "covering_sickness", healthStatusDay: 5 }],
    } as unknown as GameState;

    const impact: HealthStatusImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "trainingResolution",
      logLevel: "always",
      type: "health_status_change",
      horseId: "horse-1",
      status: "other_illness",
      previousStatus: "healthy",
      reason: "OCD injury during training",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    const horse = draft.horses[0];
    expect(horse.healthStatus).toBe("covering_sickness");
    expect(horse.healthStatusDay).toBe(5);
  });
});

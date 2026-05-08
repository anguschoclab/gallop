import { describe, it, expect } from "vitest";
import { HorseHandler } from "@/core/resolver/handlers/HorseHandler";
import type { GameState } from "@/game/state";
import type { InjuryImpact } from "@/core/resolver/impacts";

describe("HorseHandler - Injury Handling", () => {
  it("should update horse health status when injured", () => {
    const handler = new HorseHandler();
    const state = {
      horses: [
        { id: "horse-1", name: "Star", healthStatus: "healthy" }
      ]
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
      reason: "Race injury"
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
      horses: [
        { id: "horse-1", name: "Star", healthStatus: "healthy" }
      ]
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
      reason: "Race injury"
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    const horse = draft.horses[0];
    expect(horse.healthStatus).toBe("other_illness");
  });
});

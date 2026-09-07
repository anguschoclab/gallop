import { describe, it, expect } from "vitest";
import { RacingHandler } from "@/core/resolver/handlers/RacingHandler";
import type { JockeyContractImpact, JockeyReleaseImpact } from "@/core/resolver/impacts/jockeyImpacts";
import type { GameState } from "@/game/types";
import { createDefaultGameState } from "@/game/store/state";

describe("RacingHandler: jockey_contract and jockey_release impacts", () => {
  it("handles jockey_contract impact by updating jockey contract details", () => {
    const handler = new RacingHandler();
    expect(handler.canHandle("jockey_contract")).toBe(true);

    const state: GameState = {
      ...createDefaultGameState(),
      jockeys: [
        {
          id: "j-1",
          name: "Top Jockey",
          contractUntil: undefined,
          stableId: undefined,
          loyalty: 50,
        } as any,
      ],
    };

    const impact: JockeyContractImpact = {
      id: "imp-jc-1",
      intentId: "intent-jc-1",
      day: 12,
      phase: "racingResolution",
      logLevel: "always",
      type: "jockey_contract",
      jockeyId: "j-1" as any,
      stableId: "stable-player" as any,
      contractUntil: 100,
      bonus: 1000,
      stableAffinity: 80,
      loyalty: 75,
      reason: "Signed new contract",
    };

    handler.handle(state as any, impact as any);
    const jockey = state.jockeys?.find((j) => j.id === "j-1");
    expect(jockey?.contractUntil).toBe(100);
    expect(jockey?.stableId).toBe("stable-player");
    expect(jockey?.loyalty).toBe(75);
  });

  it("handles jockey_release impact by clearing contract details", () => {
    const handler = new RacingHandler();
    expect(handler.canHandle("jockey_release")).toBe(true);

    const state: GameState = {
      ...createDefaultGameState(),
      jockeys: [
        {
          id: "j-2",
          name: "Released Jockey",
          contractUntil: 50,
          stableId: "stable-1",
        } as any,
      ],
    };

    const impact: JockeyReleaseImpact = {
      id: "imp-jr-1",
      intentId: "intent-jr-1",
      day: 15,
      phase: "racingResolution",
      logLevel: "always",
      type: "jockey_release",
      jockeyId: "j-2" as any,
      reason: "Contract ended",
    };

    handler.handle(state as any, impact as any);
    const jockey = state.jockeys?.find((j) => j.id === "j-2");
    expect(jockey?.contractUntil).toBeUndefined();
    expect(jockey?.stableId).toBeUndefined();
  });
});

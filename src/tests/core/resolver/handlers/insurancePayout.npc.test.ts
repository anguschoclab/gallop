import { describe, it, expect } from "vitest";
import { SystemHandler } from "@/core/resolver/handlers/SystemHandler";
import type { InsurancePayoutImpact } from "@/core/resolver/impacts/raceImpacts";
import type { GameState } from "@/game/types";
import { createDefaultGameState } from "@/game/store/state";

describe("SystemHandler: insurance_payout entity attribution", () => {
  it("credits player cash when entityId is player", () => {
    const handler = new SystemHandler();
    const state: GameState = {
      ...createDefaultGameState(),
      cash: 10000,
    };

    const impact: InsurancePayoutImpact = {
      id: "imp-1",
      day: 5,
      phase: "managementResolution",
      logLevel: "always",
      type: "insurance_payout",
      horseId: "horse-1" as any,
      amount: 5000,
      reason: "Claim payout",
      entityId: "player",
    } as any;

    handler.handle(state as any, impact as any);
    expect(state.cash).toBe(15000);
  });

  it("credits NPC stable cash and NOT player cash when entityId is an NPC stableId", () => {
    const handler = new SystemHandler();
    const state: GameState = {
      ...createDefaultGameState(),
      cash: 10000,
      npcStables: [
        {
          id: "stable-npc-1",
          name: "Rival Stable",
          cash: 20000,
        } as any,
      ],
    };

    const impact: InsurancePayoutImpact = {
      id: "imp-2",
      day: 5,
      phase: "managementResolution",
      logLevel: "always",
      type: "insurance_payout",
      horseId: "horse-npc-1" as any,
      amount: 7500,
      reason: "NPC Claim payout",
      entityId: "stable-npc-1",
    } as any;

    handler.handle(state as any, impact as any);
    // Player cash MUST remain unchanged
    expect(state.cash).toBe(10000);
    // NPC stable cash MUST be credited
    const npc = state.npcStables.find((s) => s.id === "stable-npc-1");
    expect(npc?.cash).toBe(27500);
  });
});

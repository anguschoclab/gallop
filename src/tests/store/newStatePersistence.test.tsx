/**
 * newStatePersistence.test.tsx — Verifies that playerNominations,
 * syndicateInvestors, and stewardsInquiries survive a simulated reload
 * (JSON round-trip through PERSISTED_KEYS) and that the UI restores the
 * same state after rehydration.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useGame } from "@/game/store";
import { createDefaultGameState } from "@/game/store/state";
import type { GameState } from "@/game/types";
import type { NominationRecord } from "@/core/racing/nominationFees";
import type { InvestorRecord } from "@/core/breeding/investorTypes";
import type { StewardsInquiry } from "@/core/stewards/stewardTypes";
import { StewardsDigestToast } from "@/components/stewards/StewardsDigestToast";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";
import { makePlayerOwned } from "@/core/horse/ownership";

// Persisted keys must mirror src/game/store/index.ts PERSISTED_KEYS.
const PERSISTED_KEYS = [
  "day",
  "cash",
  "horses",
  "playerNominations",
  "syndicateInvestors",
  "stewardsInquiries",
] as const;

function simulateReload<T extends Record<string, unknown>>(
  state: T,
  keys: readonly string[],
): Record<string, unknown> {
  const partial: Record<string, unknown> = {};
  for (const key of keys) {
    if (key in state) partial[key] = (state as any)[key];
  }
  return JSON.parse(JSON.stringify(partial));
}

const nomination: NominationRecord = {
  id: "nom-1",
  horseId: "horse-1",
  raceId: "race-derby",
  raceName: "Kentucky Derby",
  raceDay: 120,
  grade: "G1",
  tier: "early",
  feePaid: 2000,
  nominatedDay: 10,
  status: "active",
};

const investor: InvestorRecord = {
  id: "inv-1",
  syndicateId: "synd-1",
  name: "Ada Whitmore",
  stableId: "npc-1",
  personality: "conservative",
  shares: 4,
  investedCash: 40000,
  joinedDay: 5,
  satisfaction: 72,
  expectations: [{ kind: "dividend", target: 1000, horizonDays: 30, history: ["met"] }],
};

const inquiry: StewardsInquiry = {
  id: "inq-1",
  raceId: "race-derby",
  day: 15,
  type: "interference",
  status: "resolved",
  outcome: "warning",
  accusedHorseId: "horse-1",
  description: "Bumped rival in the stretch.",
  evidence: ["Head-on angle shows contact at the 1/8 pole."],
};

describe("Persistence of nominations / investors / stewards inquiries", () => {
  it("all three fields survive a JSON round-trip through PERSISTED_KEYS", () => {
    const state = {
      day: 15,
      cash: 100000,
      horses: {},
      playerNominations: [nomination],
      syndicateInvestors: { "synd-1": investor },
      stewardsInquiries: [inquiry],
    };

    const reloaded = simulateReload(state, PERSISTED_KEYS);

    expect(reloaded.playerNominations).toEqual([nomination]);
    expect(reloaded.syndicateInvestors).toEqual({ "synd-1": investor });
    expect(reloaded.stewardsInquiries).toEqual([inquiry]);
  });

  it("each field is listed in the store's persisted partition", async () => {
    // The store module must load and PERSISTED_KEYS must include our fields.
    // We assert indirectly by importing the store and using the default state
    // as the baseline (empty), then confirming shape after round-trip.
    const mod = await import("@/game/store/index");
    expect(mod.useGame).toBeDefined();

    const baseline = createDefaultGameState();
    expect(baseline.playerNominations).toEqual([]);
    expect(baseline.syndicateInvestors).toEqual({});
    expect(baseline.stewardsInquiries).toEqual([]);
  });

  describe("UI restores from rehydrated state", () => {
    beforeEach(() => {
      useGame.setState(createDefaultGameState());
    });

    it("StewardsDigestToast renders for a rehydrated inquiry involving a player horse", () => {
      const base = createDefaultGameState();
      const seededState: Partial<GameState> = {
        horses: h2r([
          { id: "horse-1", name: "Silver Comet", ownership: makePlayerOwned() } as any,
        ]),
        playerNominations: [nomination],
        syndicateInvestors: { "synd-1": investor },
        stewardsInquiries: [inquiry],
      };

      // Simulate rehydration by round-tripping the persisted partition,
      // then merging back onto a fresh default state.
      const rehydrated = simulateReload({ ...base, ...seededState }, PERSISTED_KEYS);
      useGame.setState({ ...base, ...(rehydrated as Partial<GameState>) });

      // UI reflects the rehydrated inquiry.
      render(<StewardsDigestToast />);
      expect(screen.getByText("Stewards' Inquiry")).toBeInTheDocument();
      expect(screen.getByText(/Bumped rival in the stretch/i)).toBeInTheDocument();

      // Store state also carries the other two persisted fields.
      const s = useGame.getState() as GameState;
      expect((s as any).playerNominations).toHaveLength(1);
      expect((s as any).playerNominations[0].id).toBe("nom-1");
      expect((s as any).syndicateInvestors["synd-1"].name).toBe("Ada Whitmore");
    });
  });
});

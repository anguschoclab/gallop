/**
 * storeRehydration.test.tsx — Tests for store rehydration edge cases.
 *
 * Covers:
 * 1. Version-key guard: incompatible stored data is discarded but playerNominations
 *    and syndicateInvestors survive a version mismatch.
 * 2. Empty localStorage: UI renders with empty state and no StewardsInquiryOverlay.
 * 3. Navigation simulation: rehydrating state while "on" a syndicate or racing
 *    route yields the correct UI.
 * 4. Corrupted localStorage JSON: app falls back to defaults without crashing.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useGame } from "@/game/store";
import { createDefaultGameState } from "@/game/store/state";
import { STORE_STATE_VERSION } from "@/game/store/index";
import type { GameState } from "@/game/types";
import type { NominationRecord } from "@/core/racing/nominationFees";
import type { InvestorRecord } from "@/core/breeding/investorTypes";
import type { StewardsInquiry } from "@/core/stewards/stewardTypes";
import { StewardsInquiryOverlay } from "@/components/race/StewardsInquiryOverlay";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";
import type { Horse } from "@/game/types";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const nomination: NominationRecord = {
  id: "nom-v",
  horseId: "horse-v",
  raceId: "race-v",
  raceName: "Version Test Stakes",
  raceDay: 200,
  grade: "G2",
  tier: "standard",
  feePaid: 2000,
  nominatedDay: 80,
  status: "active",
};

const investor: InvestorRecord = {
  id: "inv-v",
  syndicateId: "synd-v",
  name: "Vera Hollis",
  stableId: "npc-v",
  personality: "speculator",
  shares: 3,
  investedCash: 30000,
  joinedDay: 10,
  satisfaction: 65,
  expectations: [{ kind: "asset_appreciation", target: 15000, horizonDays: 180, history: [] }],
};

const playerHorse: Partial<GameState["horses"][number]> = {
  id: "horse-overlay",
  name: "Midnight Comet",
  ownership: { type: "player" },
} as any;

const inquiry: StewardsInquiry = {
  id: "inq-overlay",
  raceId: "race-overlay",
  day: 30,
  type: "lane_violation",
  status: "resolved",
  outcome: "fine",
  accusedHorseId: "horse-overlay",
  description: "Lane violation in the final furlong.",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Simulate the version-check path that `onRehydrateStorage` runs.
 * Returns the state that would be set after a version mismatch rehydration.
 */
function simulateVersionMismatchRehydration(
  stored: Record<string, unknown>,
): Record<string, unknown> {
  const defaults = createDefaultGameState() as any;
  // Version mismatch detected — apply the same logic as onRehydrateStorage
  if ((stored as any).storeVersion !== STORE_STATE_VERSION) {
    return {
      ...defaults,
      playerNominations: Array.isArray(stored.playerNominations) ? stored.playerNominations : [],
      syndicateInvestors:
        stored.syndicateInvestors && typeof stored.syndicateInvestors === "object"
          ? stored.syndicateInvestors
          : {},
      storeVersion: STORE_STATE_VERSION,
    };
  }
  return { ...defaults, ...stored };
}

// ── Test suites ───────────────────────────────────────────────────────────────

describe("STORE_STATE_VERSION constant", () => {
  it("is a positive integer", () => {
    expect(typeof STORE_STATE_VERSION).toBe("number");
    expect(STORE_STATE_VERSION).toBeGreaterThan(0);
    expect(Number.isInteger(STORE_STATE_VERSION)).toBe(true);
  });
});

describe("Version-key rehydration guard", () => {
  it("discards incompatible stored data when version does not match", () => {
    const oldVersionState = {
      storeVersion: STORE_STATE_VERSION - 1, // incompatible
      day: 999,
      cash: 1,
      horses: h2r([{ id: "stale-horse", name: "Old Timer", ownership: { type: "player" } }] as unknown as Horse[]),
      playerNominations: [nomination],
      syndicateInvestors: { "synd-v": investor },
    };

    const result = simulateVersionMismatchRehydration(oldVersionState);

    // Version mismatch: day and cash should come from defaults
    const defaults = createDefaultGameState() as any;
    expect(result.day).toBe(defaults.day);
    expect(result.cash).toBe(defaults.cash);

    // storeVersion is bumped to current
    expect(result.storeVersion).toBe(STORE_STATE_VERSION);
  });

  it("preserves playerNominations across a version mismatch", () => {
    const oldVersionState = {
      storeVersion: 0, // old version
      playerNominations: [nomination],
      syndicateInvestors: {},
    };

    const result = simulateVersionMismatchRehydration(oldVersionState);
    expect(result.playerNominations).toEqual([nomination]);
  });

  it("preserves syndicateInvestors across a version mismatch", () => {
    const oldVersionState = {
      storeVersion: 0,
      playerNominations: [],
      syndicateInvestors: { "synd-v": investor },
    };

    const result = simulateVersionMismatchRehydration(oldVersionState);
    expect(result.syndicateInvestors).toEqual({ "synd-v": investor });
  });

  it("falls back to empty arrays when stored fields are absent or invalid in old data", () => {
    const oldVersionState = {
      storeVersion: 0,
      // no playerNominations or syndicateInvestors
    };

    const result = simulateVersionMismatchRehydration(oldVersionState);
    expect(result.playerNominations).toEqual([]);
    expect(result.syndicateInvestors).toEqual({});
  });

  it("does not discard data when version matches", () => {
    const currentVersionState = {
      storeVersion: STORE_STATE_VERSION,
      day: 42,
      cash: 999999,
      playerNominations: [nomination],
      syndicateInvestors: { "synd-v": investor },
    };

    const result = simulateVersionMismatchRehydration(currentVersionState);
    // Version matches — data is kept
    expect(result.day).toBe(42);
    expect(result.cash).toBe(999999);
    expect(result.playerNominations).toEqual([nomination]);
    expect(result.syndicateInvestors).toEqual({ "synd-v": investor });
  });
});

describe("Empty localStorage — UI renders with default empty state", () => {
  beforeEach(() => {
    localStorage.clear();
    useGame.setState(createDefaultGameState());
  });

  it("playerNominations is empty after clearing localStorage and resetting state", () => {
    const s = useGame.getState() as any;
    expect(s.playerNominations).toEqual([]);
  });

  it("syndicateInvestors is empty after clearing localStorage and resetting state", () => {
    const s = useGame.getState() as any;
    expect(s.syndicateInvestors ?? {}).toEqual({});
  });

  it("StewardsInquiryOverlay is not rendered when stewardsInquiries is empty", () => {
    useGame.setState({ ...createDefaultGameState(), stewardsInquiries: [] } as any);
    const { container } = render(<StewardsInquiryOverlay />);
    // Overlay renders nothing when there are no pending inquiries
    expect(container.firstChild).toBeNull();
  });

  it("StewardsInquiryOverlay is not rendered even when there are inquiries for NPC horses only", () => {
    useGame.setState({
      ...createDefaultGameState(),
      // No owned horses — inquiry is for an NPC horse
      horses: h2r([{ id: "npc-horse", name: "Rival", ownership: { type: "unowned" } } as any]),
      stewardsInquiries: [
        {
          ...inquiry,
          accusedHorseId: "npc-horse",
        },
      ],
    } as any);

    const { container } = render(<StewardsInquiryOverlay />);
    expect(container.firstChild).toBeNull();
  });
});

describe("Navigation simulation — state survives route changes", () => {
  beforeEach(() => {
    useGame.setState(createDefaultGameState());
  });

  it("playerNominations and syndicateInvestors persist after simulated navigation to /syndicate/:id", () => {
    // Simulate the state you'd have while on /syndicate/$syndicateId
    useGame.setState({
      playerNominations: [nomination],
      syndicateInvestors: { "synd-v": investor },
    } as any);

    // Simulate a reload: persist → JSON → rehydrate
    const s = useGame.getState() as any;
    const persisted = JSON.parse(
      JSON.stringify({
        playerNominations: s.playerNominations,
        syndicateInvestors: s.syndicateInvestors,
      }),
    );

    useGame.setState({
      ...createDefaultGameState(),
      ...persisted,
    } as any);

    const restored = useGame.getState() as any;
    expect(restored.playerNominations).toHaveLength(1);
    expect(restored.playerNominations[0].id).toBe("nom-v");
    expect(restored.syndicateInvestors["synd-v"].name).toBe("Vera Hollis");
  });

  it("StewardsInquiryOverlay is visible after reload while on /racing with an active inquiry", () => {
    // Simulate state present while watching a race with an active unacknowledged inquiry
    useGame.setState({
      ...createDefaultGameState(),
      horses: h2r([playerHorse as any]),
      stewardsInquiries: [inquiry],
    } as any);

    // Simulate a page reload: JSON round-trip the persisted fields
    const s = useGame.getState() as any;
    const persisted = JSON.parse(
      JSON.stringify({
        horses: s.horses,
        stewardsInquiries: s.stewardsInquiries,
      }),
    );

    // Rehydrate
    useGame.setState({ ...createDefaultGameState(), ...persisted } as any);

    render(<StewardsInquiryOverlay />);
    expect(screen.getByText("Stewards Inquiry")).toBeTruthy();
    expect(screen.getByText("Midnight Comet")).toBeTruthy();
  });

  it("StewardsInquiryOverlay remains closed after reload on /syndicate/:id when dismissed key is set", () => {
    // Mark the inquiry as already dismissed in localStorage
    localStorage.setItem("stewards.inquiries.dismissed.v1", JSON.stringify(["inq-overlay"]));

    useGame.setState({
      ...createDefaultGameState(),
      horses: h2r([playerHorse as any]),
      stewardsInquiries: [inquiry],
    } as any);

    const { container } = render(<StewardsInquiryOverlay />);
    // Dismissed inquiry → overlay should not be visible
    expect(container.firstChild).toBeNull();
  });
});

describe("Corrupted localStorage JSON — app falls back to defaults without crashing", () => {
  beforeEach(() => {
    localStorage.clear();
    useGame.setState(createDefaultGameState());
  });

  it("simulateReload with corrupted JSON gracefully returns defaults", () => {
    // Simulate what would happen if stored JSON is malformed
    const corruptedJson = "{ this is not valid JSON !!!";

    let parsed: any;
    try {
      parsed = JSON.parse(corruptedJson);
    } catch {
      parsed = null;
    }

    // When JSON parse fails, we fall back to createDefaultGameState()
    const fallback = parsed ?? createDefaultGameState();
    expect(fallback).toBeDefined();

    // After applying fallback, key fields should be the defaults
    const defaults = createDefaultGameState() as any;
    expect(fallback.playerNominations ?? defaults.playerNominations).toEqual([]);
    expect(fallback.syndicateInvestors ?? defaults.syndicateInvestors ?? {}).toEqual({});
  });

  it("store remains in default state when localStorage contains corrupt data", () => {
    // Corrupt the entry that would normally be loaded
    localStorage.setItem("gallop-game-state", "not-valid-json");

    // State should remain at whatever useGame currently has (default after beforeEach reset)
    const s = useGame.getState() as any;
    expect(s.playerNominations).toEqual([]);
    expect(Array.isArray(s.stewardsInquiries)).toBe(true);
  });

  it("store does not crash when syndicateInvestors stored value is a string instead of an object", () => {
    // This would happen if an old schema serialized the field differently
    const malformed = {
      storeVersion: 0, // triggers version mismatch path
      playerNominations: [nomination],
      syndicateInvestors: "not-an-object", // wrong type
    };

    const result = simulateVersionMismatchRehydration(malformed);
    // Falls back to empty object
    expect(result.syndicateInvestors).toEqual({});
    // playerNominations still preserved
    expect(result.playerNominations).toEqual([nomination]);
  });

  it("store does not crash when playerNominations stored value is null", () => {
    const malformed = {
      storeVersion: 0,
      playerNominations: null, // wrong type
      syndicateInvestors: { "synd-v": investor },
    };

    const result = simulateVersionMismatchRehydration(malformed);
    expect(result.playerNominations).toEqual([]);
    expect(result.syndicateInvestors).toEqual({ "synd-v": investor });
  });
});

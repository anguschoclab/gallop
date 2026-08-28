import { describe, it, expect, vi, beforeEach } from "vitest";
import { seedStore } from "@/test-utils/renderWithStore";
import { useGame } from "@/game/store";
import { createTestNpcHorse } from "@/tests/helpers/createTestHorse";
import type { GameState, PrivateSaleOffer, Horse, Stable } from "@/game/types";
import { makeNpcOwned, makePlayerOwned, getStableId } from "@/core/horse/ownership";
import { asNpcStableId } from "@/core/types/branded";
import { h2r } from "@/tests/helpers/sampleGameState";

const mkHorse = (overrides: Partial<Horse> = {}): Horse =>
  createTestNpcHorse({
    id: "horse-1",
    name: "Thunder",
    ownership: makeNpcOwned(asNpcStableId("stable-1")),
    fame: 60,
    potential: 90,
    careerStarts: 10,
    careerWins: 7,
    lifetimeEarnings: 500_000,
    fanCount: 1000,
    ...overrides,
  });

const mkStable = (overrides: Partial<Stable> = {}): Stable =>
  ({
    id: "stable-1",
    name: "Green Acres",
    owner: "NPC",
    tier: "mid",
    reputation: 50,
    founded: 1,
    cash: 100000,
    horses: ["horse-1"],
    isMajor: false,
    colors: { primary: "#000", secondary: "#fff" },
    personality: "aggressive",
    staff: {} as any,
    outposts: [],
    ...overrides,
  }) as Stable;

const mkPendingOffer = (overrides: Partial<PrivateSaleOffer> = {}): PrivateSaleOffer => ({
  id: "offer-1",
  horseId: "horse-1",
  fromStableId: undefined,
  toStableId: "stable-1",
  amount: 50000,
  status: "pending",
  createdDay: 5,
  expiresDay: 8,
  ...overrides,
});

describe("privateSaleSlice requestOverride", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requestOverride premium with sufficient cash — succeeds, offer accepted", () => {
    const horse = mkHorse();
    const stable = mkStable();
    seedStore({
      cash: 500000,
      horses: h2r([horse]),
      npcStables: [stable],
      privateSaleOffers: [mkPendingOffer()],
    });

    const result = useGame.getState().requestOverride("offer-1", "premium");
    expect(result.ok).toBe(true);

    const state = useGame.getState() as any;
    const offer = state.privateSaleOffers.find((o: PrivateSaleOffer) => o.id === "offer-1");
    expect(offer.status).toBe("accepted");
    expect(offer.overrideType).toBe("premium");
    expect(offer.overrideAmount).toBeDefined();
    expect(offer.overrideAmount!).toBeGreaterThan(0);

    // Cash should be deducted
    expect(state.cash).toBeLessThan(500000);

    // Horse should be player-owned
    const updatedHorse = state.horses["horse-1"];
    expect(updatedHorse.ownership?.type).toBe("player");
  });

  it("requestOverride premium with insufficient cash — fails", () => {
    const horse = mkHorse();
    const stable = mkStable();
    seedStore({
      cash: 100,
      horses: h2r([horse]),
      npcStables: [stable],
      privateSaleOffers: [mkPendingOffer()],
    });

    const result = useGame.getState().requestOverride("offer-1", "premium");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("insufficient_funds");
  });

  it("requestOverride diplomatic — sets override_pending status", () => {
    const horse = mkHorse();
    const stable = mkStable();
    seedStore({
      cash: 500000,
      horses: h2r([horse]),
      npcStables: [stable],
      privateSaleOffers: [mkPendingOffer()],
    });

    const result = useGame.getState().requestOverride("offer-1", "diplomatic");
    expect(result.ok).toBe(true);

    const state = useGame.getState() as any;
    const offer = state.privateSaleOffers.find((o: PrivateSaleOffer) => o.id === "offer-1");
    expect(offer.status).toBe("override_pending");
    expect(offer.overrideType).toBe("diplomatic");
    expect(offer.overrideAmount).toBeDefined();
    expect(offer.overrideAmount!).toBeGreaterThan(0);

    // Cash should NOT be deducted yet (resolved next day)
    expect(state.cash).toBe(500000);
  });

  it("requestOverride on non-pending offer — fails", () => {
    const horse = mkHorse();
    const stable = mkStable();
    seedStore({
      cash: 500000,
      horses: h2r([horse]),
      npcStables: [stable],
      privateSaleOffers: [mkPendingOffer({ status: "countered", counterAmount: 60000 })],
    });

    const result = useGame.getState().requestOverride("offer-1", "premium");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("offer_not_actionable");
  });

  it("requestOverride on non-existent offer — fails", () => {
    seedStore({
      cash: 500000,
      privateSaleOffers: [],
    });

    const result = useGame.getState().requestOverride("nonexistent", "premium");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("offer_not_found");
  });

  // ── Known buyer premium: requestOverride with non-zero reputation ──────────

  it("requestOverride premium with regional reputation — overrideAmount higher than rep=0", () => {
    // Use an untouchable horse so the premium applies
    const horse = mkHorse({
      fame: 60,
      potential: 90,
      careerStarts: 10,
      careerWins: 7,
      lifetimeEarnings: 500_000,
      fanCount: 1000,
    });
    const stable = mkStable();

    // First: requestOverride at rep=0 to get baseline overrideAmount
    seedStore({
      cash: 10_000_000,
      horses: h2r([horse]),
      npcStables: [stable],
      privateSaleOffers: [mkPendingOffer()],
    });
    useGame.getState().requestOverride("offer-1", "premium");
    const rep0Amount = (useGame.getState() as any).privateSaleOffers.find(
      (o: PrivateSaleOffer) => o.id === "offer-1",
    ).overrideAmount;

    // Now: requestOverride at rep=300 (regional) — premium is 10%
    seedStore({
      cash: 10_000_000,
      horses: h2r([horse]),
      npcStables: [stable],
      privateSaleOffers: [mkPendingOffer()],
      reputation: { score: 300, tier: "regional" } as any,
    });
    useGame.getState().requestOverride("offer-1", "premium");
    const rep300Amount = (useGame.getState() as any).privateSaleOffers.find(
      (o: PrivateSaleOffer) => o.id === "offer-1",
    ).overrideAmount;

    expect(rep300Amount).toBeGreaterThan(rep0Amount);
    // Premium is applied to ask before computePremiumBuyout multiplies it,
    // so the ratio is ~1.10 but may differ by ±1 due to rounding order.
    expect(rep300Amount).toBeCloseTo(rep0Amount * 1.1, -1);
  });

  it("requestOverride diplomatic with regional reputation — overrideAmount higher than rep=0", () => {
    const horse = mkHorse({
      fame: 60,
      potential: 90,
      careerStarts: 10,
      careerWins: 7,
      lifetimeEarnings: 500_000,
      fanCount: 1000,
    });
    const stable = mkStable();

    // Baseline at rep=0
    seedStore({
      cash: 10_000_000,
      horses: h2r([horse]),
      npcStables: [stable],
      privateSaleOffers: [mkPendingOffer()],
    });
    useGame.getState().requestOverride("offer-1", "diplomatic");
    const rep0Amount = (useGame.getState() as any).privateSaleOffers.find(
      (o: PrivateSaleOffer) => o.id === "offer-1",
    ).overrideAmount;

    // At rep=300 (regional) — premium is 10%
    seedStore({
      cash: 10_000_000,
      horses: h2r([horse]),
      npcStables: [stable],
      privateSaleOffers: [mkPendingOffer()],
      reputation: { score: 300, tier: "regional" } as any,
    });
    useGame.getState().requestOverride("offer-1", "diplomatic");
    const rep300Amount = (useGame.getState() as any).privateSaleOffers.find(
      (o: PrivateSaleOffer) => o.id === "offer-1",
    ).overrideAmount;

    expect(rep300Amount).toBeGreaterThan(rep0Amount);
    // Premium is applied to ask before computeDiplomaticPressure multiplies it,
    // so the ratio is ~1.10 but may differ by ±1 due to rounding order.
    expect(rep300Amount).toBeCloseTo(rep0Amount * 1.1, -1);
  });
});

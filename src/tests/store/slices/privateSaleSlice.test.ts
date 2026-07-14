import { describe, it, expect, vi, beforeEach } from "vitest";
import { seedStore } from "@/test-utils/renderWithStore";
import { useGame } from "@/game/store";
import { createTestNpcHorse } from "@/tests/helpers/createTestHorse";
import type { GameState, PrivateSaleOffer, Horse, Stable } from "@/game/types";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";

const mkOffer = (overrides: Partial<PrivateSaleOffer> = {}): PrivateSaleOffer => ({
  id: "offer-1",
  horseId: "horse-1",
  fromStableId: undefined,
  toStableId: "stable-1",
  amount: 50000,
  counterAmount: 60000,
  status: "countered",
  createdDay: 5,
  expiresDay: 8,
  ...overrides,
});

const mkHorse = (overrides: Partial<Horse> = {}): Horse =>
  createTestNpcHorse({
    id: "horse-1",
    name: "Thunder",
    stableId: "stable-1",
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

describe("privateSaleSlice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accept counter with sufficient cash — transfers horse, deducts cash, updates offer", () => {
    const horse = mkHorse();
    const stable = mkStable();
    seedStore({
      cash: 100000,
      horses: h2r([horse]),
      npcStables: [stable],
      privateSaleOffers: [mkOffer()],
    });

    const result = useGame.getState().respondToPrivateSale("offer-1", true);
    expect(result.ok).toBe(true);

    const state = useGame.getState() as any;
    expect(state.cash).toBe(40000);
    const updatedHorse = state.horseMap.get("horse-1");
    expect(updatedHorse.owned).toBe(true);
    expect(updatedHorse.stableId).toBeUndefined();
    const offer = state.privateSaleOffers.find((o: PrivateSaleOffer) => o.id === "offer-1");
    expect(offer.status).toBe("accepted");
  });

  it("accept counter with insufficient cash — returns error, no state changes", () => {
    const horse = mkHorse();
    const stable = mkStable();
    seedStore({
      cash: 50000,
      horses: h2r([horse]),
      npcStables: [stable],
      privateSaleOffers: [mkOffer({ counterAmount: 60000 })],
    });

    const result = useGame.getState().respondToPrivateSale("offer-1", true);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("insufficient_funds");

    const state = useGame.getState() as any;
    expect(state.cash).toBe(50000);
    const offer = state.privateSaleOffers.find((o: PrivateSaleOffer) => o.id === "offer-1");
    expect(offer.status).toBe("countered");
  });

  it("decline counter — offer status becomes declined, no horse/cash changes", () => {
    const horse = mkHorse();
    const stable = mkStable();
    seedStore({
      cash: 100000,
      horses: h2r([horse]),
      npcStables: [stable],
      privateSaleOffers: [mkOffer()],
    });

    const result = useGame.getState().respondToPrivateSale("offer-1", false);
    expect(result.ok).toBe(true);

    const state = useGame.getState() as any;
    expect(state.cash).toBe(100000);
    const offer = state.privateSaleOffers.find((o: PrivateSaleOffer) => o.id === "offer-1");
    expect(offer.status).toBe("declined");
  });

  it("accept non-counter offer — returns offer_not_actionable", () => {
    const horse = mkHorse();
    const stable = mkStable();
    seedStore({
      cash: 100000,
      horses: h2r([horse]),
      npcStables: [stable],
      privateSaleOffers: [mkOffer({ status: "pending", counterAmount: undefined })],
    });

    const result = useGame.getState().respondToPrivateSale("offer-1", true);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("offer_not_actionable");
  });

  it("accept non-existent offer — returns offer_not_found", () => {
    seedStore({
      cash: 100000,
      privateSaleOffers: [],
    });

    const result = useGame.getState().respondToPrivateSale("nonexistent", true);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("offer_not_found");
  });

  it("proposePrivateSale creates offer record with status pending", () => {
    const horse = mkHorse();
    const stable = mkStable();
    seedStore({
      cash: 100000,
      horses: h2r([horse]),
      npcStables: [stable],
      privateSaleOffers: [],
    });

    const result = useGame.getState().proposePrivateSale("horse-1", "stable-1", 50000);
    expect(result.ok).toBe(true);
    expect(result.reason).toBe("offer_submitted");

    const state = useGame.getState() as any;
    expect(state.privateSaleOffers).toHaveLength(1);
    const offer = state.privateSaleOffers[0];
    expect(offer.status).toBe("pending");
    expect(offer.fromStableId).toBeUndefined();
    expect(offer.toStableId).toBe("stable-1");
    expect(offer.horseId).toBe("horse-1");
    expect(offer.amount).toBe(50000);
  });

  it("proposePrivateSale with insufficient cash — returns error, no offer created", () => {
    const horse = mkHorse();
    const stable = mkStable();
    seedStore({
      cash: 100,
      horses: h2r([horse]),
      npcStables: [stable],
      privateSaleOffers: [],
    });

    const result = useGame.getState().proposePrivateSale("horse-1", "stable-1", 50000);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("insufficient_funds");

    const state = useGame.getState() as any;
    expect(state.privateSaleOffers).toHaveLength(0);
  });

  it("proposePrivateSale with wrong stable — returns horse_not_in_stable", () => {
    const horse = mkHorse({ stableId: "other-stable" });
    const stable = mkStable();
    seedStore({
      cash: 100000,
      horses: h2r([horse]),
      npcStables: [stable],
      privateSaleOffers: [],
    });

    const result = useGame.getState().proposePrivateSale("horse-1", "stable-1", 50000);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("horse_not_in_stable");
  });
});

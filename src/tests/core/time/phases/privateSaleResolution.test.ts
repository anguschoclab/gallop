import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPipelineContext } from "@/tests/helpers/testTypes";
import { makeGameState } from "@/tests/helpers/sampleGameState";
import { createTestNpcHorse } from "@/tests/helpers/createTestHorse";
import type { GameState, PrivateSaleOffer, Horse, Stable } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";

const mkOffer = (overrides: Partial<PrivateSaleOffer> = {}): PrivateSaleOffer => ({
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

const mkHorse = (overrides: Partial<Horse> = {}): Horse =>
  createTestNpcHorse({
    id: "horse-1",
    name: "Thunder",
    stableId: "stable-1",
    ...overrides,
  });

const createContext = (state: Partial<GameState>, newDay = 10): PipelineContext =>
  createMockPipelineContext({
    state: { ...makeGameState(), ...state } as GameState,
    newDay,
  });

describe("privateSaleResolutionPhase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have correct name", async () => {
    const mod = await import("@/core/time/phases/privateSaleResolution");
    expect(mod.privateSaleResolutionPhase.name).toBe("privateSaleResolution");
  });

  it("should have order 34", async () => {
    const mod = await import("@/core/time/phases/privateSaleResolution");
    expect(mod.privateSaleResolutionPhase.order).toBe(34);
  });

  it("returns context unchanged when no pending offers", async () => {
    const mod = await import("@/core/time/phases/privateSaleResolution");
    const ctx = createContext({
      horses: h2r([mkHorse()]),
      npcStables: [mkStable()],
      privateSaleOffers: [],
    });
    const result = mod.privateSaleResolutionPhase.execute(ctx);
    expect(result).toBe(ctx);
  });

  it("aggressive: high offer (>=0.7x valuation) accepted", async () => {
    const mod = await import("@/core/time/phases/privateSaleResolution");
    const horse = mkHorse();
    const stable = mkStable({ personality: "aggressive" });
    const { calculateNpcHorseValue } = await import("@/core/horse/pricing");
    const valuation = calculateNpcHorseValue(horse, stable.tier);
    const offerAmount = Math.round(valuation * 0.75);

    const ctx = createContext({
      horses: h2r([horse]),
      npcStables: [stable],
      privateSaleOffers: [mkOffer({ amount: offerAmount })],
    });
    const result = mod.privateSaleResolutionPhase.execute(ctx);
    const offers = result.state.privateSaleOffers!;
    expect(offers[0].status).toBe("accepted");
    const transferImpacts = result.impacts.filter((i) => i.type === "horse_transfer");
    expect(transferImpacts).toHaveLength(1);
    expect(transferImpacts[0].horseId).toBe("horse-1");
    expect(transferImpacts[0].fromStableId).toBe("stable-1");
    expect(transferImpacts[0].toStableId).toBeUndefined();
    const cashImpacts = result.impacts.filter((i) => i.type === "cash_change");
    expect(cashImpacts).toHaveLength(2);
  });

  it("aggressive: medium offer (>=0.5x valuation) countered", async () => {
    const mod = await import("@/core/time/phases/privateSaleResolution");
    const horse = mkHorse();
    const stable = mkStable({ personality: "aggressive" });
    const { calculateNpcHorseValue } = await import("@/core/horse/pricing");
    const valuation = calculateNpcHorseValue(horse, stable.tier);
    const offerAmount = Math.round(valuation * 0.55);

    const ctx = createContext({
      horses: h2r([horse]),
      npcStables: [stable],
      privateSaleOffers: [mkOffer({ amount: offerAmount })],
    });
    const result = mod.privateSaleResolutionPhase.execute(ctx);
    const offers = result.state.privateSaleOffers!;
    expect(offers[0].status).toBe("countered");
    expect(offers[0].counterAmount).toBe(Math.round(valuation * 1.1));
  });

  it("aggressive: low offer (<0.5x valuation) declined", async () => {
    const mod = await import("@/core/time/phases/privateSaleResolution");
    const horse = mkHorse();
    const stable = mkStable({ personality: "aggressive" });
    const { calculateNpcHorseValue } = await import("@/core/horse/pricing");
    const valuation = calculateNpcHorseValue(horse, stable.tier);
    const offerAmount = Math.round(valuation * 0.4);

    const ctx = createContext({
      horses: h2r([horse]),
      npcStables: [stable],
      privateSaleOffers: [mkOffer({ amount: offerAmount })],
    });
    const result = mod.privateSaleResolutionPhase.execute(ctx);
    const offers = result.state.privateSaleOffers!;
    expect(offers[0].status).toBe("declined");
    expect(result.impacts.filter((i) => i.type === "horse_transfer")).toHaveLength(0);
  });

  it("conservative: offer >= 1.0x valuation accepted", async () => {
    const mod = await import("@/core/time/phases/privateSaleResolution");
    const horse = mkHorse();
    const stable = mkStable({ personality: "conservative" });
    const { calculateNpcHorseValue } = await import("@/core/horse/pricing");
    const valuation = calculateNpcHorseValue(horse, stable.tier);
    const offerAmount = Math.round(valuation * 1.05);

    const ctx = createContext({
      horses: h2r([horse]),
      npcStables: [stable],
      privateSaleOffers: [mkOffer({ amount: offerAmount })],
    });
    const result = mod.privateSaleResolutionPhase.execute(ctx);
    expect(result.state.privateSaleOffers![0].status).toBe("accepted");
  });

  it("conservative: offer >= 0.8x valuation countered", async () => {
    const mod = await import("@/core/time/phases/privateSaleResolution");
    const horse = mkHorse();
    const stable = mkStable({ personality: "conservative" });
    const { calculateNpcHorseValue } = await import("@/core/horse/pricing");
    const valuation = calculateNpcHorseValue(horse, stable.tier);
    const offerAmount = Math.round(valuation * 0.85);

    const ctx = createContext({
      horses: h2r([horse]),
      npcStables: [stable],
      privateSaleOffers: [mkOffer({ amount: offerAmount })],
    });
    const result = mod.privateSaleResolutionPhase.execute(ctx);
    expect(result.state.privateSaleOffers![0].status).toBe("countered");
    expect(result.state.privateSaleOffers![0].counterAmount).toBe(Math.round(valuation * 1.2));
  });

  it("conservative: low offer declined", async () => {
    const mod = await import("@/core/time/phases/privateSaleResolution");
    const horse = mkHorse();
    const stable = mkStable({ personality: "conservative" });
    const { calculateNpcHorseValue } = await import("@/core/horse/pricing");
    const valuation = calculateNpcHorseValue(horse, stable.tier);
    const offerAmount = Math.round(valuation * 0.5);

    const ctx = createContext({
      horses: h2r([horse]),
      npcStables: [stable],
      privateSaleOffers: [mkOffer({ amount: offerAmount })],
    });
    const result = mod.privateSaleResolutionPhase.execute(ctx);
    expect(result.state.privateSaleOffers![0].status).toBe("declined");
  });

  it("prestige: only accepts >= 1.3x valuation", async () => {
    const mod = await import("@/core/time/phases/privateSaleResolution");
    const horse = mkHorse();
    const stable = mkStable({ personality: "prestige" });
    const { calculateNpcHorseValue } = await import("@/core/horse/pricing");
    const valuation = calculateNpcHorseValue(horse, stable.tier);

    const ctx1 = createContext({
      horses: h2r([horse]),
      npcStables: [stable],
      privateSaleOffers: [mkOffer({ id: "o1", amount: Math.round(valuation * 1.2) })],
    });
    expect(
      mod.privateSaleResolutionPhase.execute(ctx1).state.privateSaleOffers![0].status,
    ).not.toBe("accepted");

    const ctx2 = createContext({
      horses: h2r([horse]),
      npcStables: [stable],
      privateSaleOffers: [mkOffer({ id: "o2", amount: Math.round(valuation * 1.35) })],
    });
    expect(mod.privateSaleResolutionPhase.execute(ctx2).state.privateSaleOffers![0].status).toBe(
      "accepted",
    );
  });

  it("breeder: only accepts >= 1.1x valuation", async () => {
    const mod = await import("@/core/time/phases/privateSaleResolution");
    const horse = mkHorse();
    const stable = mkStable({ personality: "breeder" });
    const { calculateNpcHorseValue } = await import("@/core/horse/pricing");
    const valuation = calculateNpcHorseValue(horse, stable.tier);

    const ctx = createContext({
      horses: h2r([horse]),
      npcStables: [stable],
      privateSaleOffers: [mkOffer({ amount: Math.round(valuation * 1.15) })],
    });
    expect(mod.privateSaleResolutionPhase.execute(ctx).state.privateSaleOffers![0].status).toBe(
      "accepted",
    );
  });

  it("trader: accepts >= 0.8x valuation", async () => {
    const mod = await import("@/core/time/phases/privateSaleResolution");
    const horse = mkHorse();
    const stable = mkStable({ personality: "trader" });
    const { calculateNpcHorseValue } = await import("@/core/horse/pricing");
    const valuation = calculateNpcHorseValue(horse, stable.tier);

    const ctx = createContext({
      horses: h2r([horse]),
      npcStables: [stable],
      privateSaleOffers: [mkOffer({ amount: Math.round(valuation * 0.85) })],
    });
    expect(mod.privateSaleResolutionPhase.execute(ctx).state.privateSaleOffers![0].status).toBe(
      "accepted",
    );
  });

  it("developer: accepts >= 0.9x valuation", async () => {
    const mod = await import("@/core/time/phases/privateSaleResolution");
    const horse = mkHorse();
    const stable = mkStable({ personality: "developer" });
    const { calculateNpcHorseValue } = await import("@/core/horse/pricing");
    const valuation = calculateNpcHorseValue(horse, stable.tier);

    const ctx = createContext({
      horses: h2r([horse]),
      npcStables: [stable],
      privateSaleOffers: [mkOffer({ amount: Math.round(valuation * 0.95) })],
    });
    expect(mod.privateSaleResolutionPhase.execute(ctx).state.privateSaleOffers![0].status).toBe(
      "accepted",
    );
  });

  it("win-now: accepts >= 1.0x valuation", async () => {
    const mod = await import("@/core/time/phases/privateSaleResolution");
    const horse = mkHorse();
    const stable = mkStable({ personality: "win-now" });
    const { calculateNpcHorseValue } = await import("@/core/horse/pricing");
    const valuation = calculateNpcHorseValue(horse, stable.tier);

    const ctx = createContext({
      horses: h2r([horse]),
      npcStables: [stable],
      privateSaleOffers: [mkOffer({ amount: Math.round(valuation * 1.05) })],
    });
    expect(mod.privateSaleResolutionPhase.execute(ctx).state.privateSaleOffers![0].status).toBe(
      "accepted",
    );
  });

  it("specialist: accepts >= 1.0x valuation", async () => {
    const mod = await import("@/core/time/phases/privateSaleResolution");
    const horse = mkHorse();
    const stable = mkStable({ personality: "specialist" });
    const { calculateNpcHorseValue } = await import("@/core/horse/pricing");
    const valuation = calculateNpcHorseValue(horse, stable.tier);

    const ctx = createContext({
      horses: h2r([horse]),
      npcStables: [stable],
      privateSaleOffers: [mkOffer({ amount: Math.round(valuation * 1.05) })],
    });
    expect(mod.privateSaleResolutionPhase.execute(ctx).state.privateSaleOffers![0].status).toBe(
      "accepted",
    );
  });

  it("non-pending offers are not processed", async () => {
    const mod = await import("@/core/time/phases/privateSaleResolution");
    const ctx = createContext({
      horses: h2r([mkHorse()]),
      npcStables: [mkStable()],
      privateSaleOffers: [
        mkOffer({ id: "c1", status: "countered", counterAmount: 60000 }),
        mkOffer({ id: "a1", status: "accepted" }),
        mkOffer({ id: "d1", status: "declined" }),
        mkOffer({ id: "e1", status: "expired" }),
      ],
    });
    const result = mod.privateSaleResolutionPhase.execute(ctx);
    const offers = result.state.privateSaleOffers!;
    expect(offers[0].status).toBe("countered");
    expect(offers[1].status).toBe("accepted");
    expect(offers[2].status).toBe("declined");
    expect(offers[3].status).toBe("expired");
  });

  it("accepted offer generates correct impacts", async () => {
    const mod = await import("@/core/time/phases/privateSaleResolution");
    const horse = mkHorse();
    const stable = mkStable({ personality: "aggressive" });
    const { calculateNpcHorseValue } = await import("@/core/horse/pricing");
    const valuation = calculateNpcHorseValue(horse, stable.tier);
    const offerAmount = Math.round(valuation * 0.75);

    const ctx = createContext({
      horses: h2r([horse]),
      npcStables: [stable],
      privateSaleOffers: [mkOffer({ amount: offerAmount })],
    });
    const result = mod.privateSaleResolutionPhase.execute(ctx);
    const transfer = result.impacts.find((i) => i.type === "horse_transfer");
    expect(transfer).toBeDefined();
    expect(transfer!.horseId).toBe("horse-1");
    expect(transfer!.fromStableId).toBe("stable-1");
    expect(transfer!.toStableId).toBeUndefined();
    expect(transfer!.price).toBe(offerAmount);

    const playerCash = result.impacts.find(
      (i) => i.type === "cash_change" && (i as any).entityId === "player",
    );
    expect(playerCash).toBeDefined();
    expect((playerCash as any).amount).toBe(-offerAmount);

    const npcCash = result.impacts.find(
      (i) => i.type === "cash_change" && (i as any).entityId === "stable-1",
    );
    expect(npcCash).toBeDefined();
    expect((npcCash as any).amount).toBe(offerAmount);
  });

  it("countered offer sets counterAmount", async () => {
    const mod = await import("@/core/time/phases/privateSaleResolution");
    const horse = mkHorse();
    const stable = mkStable({ personality: "aggressive" });
    const { calculateNpcHorseValue } = await import("@/core/horse/pricing");
    const valuation = calculateNpcHorseValue(horse, stable.tier);
    const offerAmount = Math.round(valuation * 0.55);

    const ctx = createContext({
      horses: h2r([horse]),
      npcStables: [stable],
      privateSaleOffers: [mkOffer({ amount: offerAmount })],
    });
    const result = mod.privateSaleResolutionPhase.execute(ctx);
    expect(result.state.privateSaleOffers![0].counterAmount).toBe(Math.round(valuation * 1.1));
  });

  it("log entries generated for each decision", async () => {
    const mod = await import("@/core/time/phases/privateSaleResolution");
    const horse1 = mkHorse({ id: "horse-1", name: "Thunder" });
    const horse2 = mkHorse({ id: "horse-2", name: "Lightning" });
    const stable = mkStable({ personality: "aggressive", horses: ["horse-1", "horse-2"] });
    const { calculateNpcHorseValue } = await import("@/core/horse/pricing");
    const valuation = calculateNpcHorseValue(horse1, stable.tier);

    const ctx = createContext({
      horses: h2r([horse1, horse2]),
      npcStables: [stable],
      privateSaleOffers: [
        mkOffer({ id: "o1", horseId: "horse-1", amount: Math.round(valuation * 0.75) }),
        mkOffer({ id: "o2", horseId: "horse-2", amount: Math.round(valuation * 0.4) }),
      ],
    });
    const result = mod.privateSaleResolutionPhase.execute(ctx);
    expect(result.logs.length).toBe(2);
    expect(result.logs[0].text).toContain("Thunder");
    expect(result.logs[0].text).toContain("Green Acres");
    expect(result.logs[1].text).toContain("Lightning");
  });

  it("horse not found — offer skipped, remains pending", async () => {
    const mod = await import("@/core/time/phases/privateSaleResolution");
    const ctx = createContext({
      horses: {},
      npcStables: [mkStable()],
      privateSaleOffers: [mkOffer({ horseId: "nonexistent" })],
    });
    const result = mod.privateSaleResolutionPhase.execute(ctx);
    expect(result.state.privateSaleOffers![0].status).toBe("pending");
  });

  it("stable not found — offer skipped, remains pending", async () => {
    const mod = await import("@/core/time/phases/privateSaleResolution");
    const ctx = createContext({
      horses: h2r([mkHorse()]),
      npcStables: [],
      privateSaleOffers: [mkOffer({ toStableId: "nonexistent" })],
    });
    const result = mod.privateSaleResolutionPhase.execute(ctx);
    expect(result.state.privateSaleOffers![0].status).toBe("pending");
  });

  it("horse already transferred (stableId mismatch) — offer declined", async () => {
    const mod = await import("@/core/time/phases/privateSaleResolution");
    const horse = mkHorse({ stableId: "different-stable" });
    const ctx = createContext({
      horses: h2r([horse]),
      npcStables: [mkStable()],
      privateSaleOffers: [mkOffer({ toStableId: "stable-1" })],
    });
    const result = mod.privateSaleResolutionPhase.execute(ctx);
    expect(result.state.privateSaleOffers![0].status).toBe("declined");
  });

  it("multiple pending offers for different horses — all processed independently", async () => {
    const mod = await import("@/core/time/phases/privateSaleResolution");
    const horse1 = mkHorse({ id: "horse-1", name: "Thunder" });
    const horse2 = mkHorse({ id: "horse-2", name: "Lightning" });
    const stable = mkStable({ horses: ["horse-1", "horse-2"] });
    const { calculateNpcHorseValue } = await import("@/core/horse/pricing");
    const valuation = calculateNpcHorseValue(horse1, stable.tier);

    const ctx = createContext({
      horses: h2r([horse1, horse2]),
      npcStables: [stable],
      privateSaleOffers: [
        mkOffer({ id: "o1", horseId: "horse-1", amount: Math.round(valuation * 0.75) }),
        mkOffer({ id: "o2", horseId: "horse-2", amount: Math.round(valuation * 0.4) }),
      ],
    });
    const result = mod.privateSaleResolutionPhase.execute(ctx);
    const offers = result.state.privateSaleOffers!;
    expect(offers[0].status).toBe("accepted");
    expect(offers[1].status).toBe("declined");
  });
});

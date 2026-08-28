import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPipelineContext } from "@/tests/helpers/testTypes";
import { makeGameState } from "@/tests/helpers/sampleGameState";
import { createTestNpcHorse } from "@/tests/helpers/createTestHorse";
import type { GameState, PrivateSaleOffer, Horse, Stable } from "@/game/types";
import { makeNpcOwned, getStableId } from "@/core/horse/ownership";
import { asNpcStableId, asHorseId, asStableId } from "@/core/types/branded";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";
import type { PipelineContext } from "@/core/time/pipeline";

const mkOffer = (overrides: Partial<PrivateSaleOffer> = {}): PrivateSaleOffer => ({
  id: "offer-1",
  horseId: asHorseId("horse-1"),
  fromStableId: undefined,
  toStableId: asStableId("stable-1"),
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
    id: asHorseId("horse-1"),
    name: "Thunder",
    ownership: makeNpcOwned(asNpcStableId("stable-1")),
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
    const { calculateLotValuation } = await import("@/core/auction/engine");
    const { attachmentAdjustedAsk } = await import("@/core/horse/attachment");
    const valuation = attachmentAdjustedAsk(
      horse,
      stable,
      calculateLotValuation(horse, stable, "racing_age", [horse]),
    );
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
    const { calculateLotValuation } = await import("@/core/auction/engine");
    const { attachmentAdjustedAsk } = await import("@/core/horse/attachment");
    const valuation = attachmentAdjustedAsk(
      horse,
      stable,
      calculateLotValuation(horse, stable, "racing_age", [horse]),
    );
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
    const { calculateLotValuation } = await import("@/core/auction/engine");
    const { attachmentAdjustedAsk } = await import("@/core/horse/attachment");
    const valuation = attachmentAdjustedAsk(
      horse,
      stable,
      calculateLotValuation(horse, stable, "racing_age", [horse]),
    );
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
    const { calculateLotValuation } = await import("@/core/auction/engine");
    const { attachmentAdjustedAsk } = await import("@/core/horse/attachment");
    const valuation = attachmentAdjustedAsk(
      horse,
      stable,
      calculateLotValuation(horse, stable, "racing_age", [horse]),
    );
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
    const { calculateLotValuation } = await import("@/core/auction/engine");
    const { attachmentAdjustedAsk } = await import("@/core/horse/attachment");
    const valuation = attachmentAdjustedAsk(
      horse,
      stable,
      calculateLotValuation(horse, stable, "racing_age", [horse]),
    );
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
    const { calculateLotValuation } = await import("@/core/auction/engine");
    const { attachmentAdjustedAsk } = await import("@/core/horse/attachment");
    const valuation = attachmentAdjustedAsk(
      horse,
      stable,
      calculateLotValuation(horse, stable, "racing_age", [horse]),
    );
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
    const { calculateLotValuation } = await import("@/core/auction/engine");
    const { attachmentAdjustedAsk } = await import("@/core/horse/attachment");
    const valuation = attachmentAdjustedAsk(
      horse,
      stable,
      calculateLotValuation(horse, stable, "racing_age", [horse]),
    );

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
    const { calculateLotValuation } = await import("@/core/auction/engine");
    const { attachmentAdjustedAsk } = await import("@/core/horse/attachment");
    const valuation = attachmentAdjustedAsk(
      horse,
      stable,
      calculateLotValuation(horse, stable, "racing_age", [horse]),
    );

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
    const { calculateLotValuation } = await import("@/core/auction/engine");
    const { attachmentAdjustedAsk } = await import("@/core/horse/attachment");
    const valuation = attachmentAdjustedAsk(
      horse,
      stable,
      calculateLotValuation(horse, stable, "racing_age", [horse]),
    );

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
    const { calculateLotValuation } = await import("@/core/auction/engine");
    const { attachmentAdjustedAsk } = await import("@/core/horse/attachment");
    const valuation = attachmentAdjustedAsk(
      horse,
      stable,
      calculateLotValuation(horse, stable, "racing_age", [horse]),
    );

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
    const { calculateLotValuation } = await import("@/core/auction/engine");
    const { attachmentAdjustedAsk } = await import("@/core/horse/attachment");
    const valuation = attachmentAdjustedAsk(
      horse,
      stable,
      calculateLotValuation(horse, stable, "racing_age", [horse]),
    );

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
    const { calculateLotValuation } = await import("@/core/auction/engine");
    const { attachmentAdjustedAsk } = await import("@/core/horse/attachment");
    const valuation = attachmentAdjustedAsk(
      horse,
      stable,
      calculateLotValuation(horse, stable, "racing_age", [horse]),
    );

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
    const { calculateLotValuation } = await import("@/core/auction/engine");
    const { attachmentAdjustedAsk } = await import("@/core/horse/attachment");
    const valuation = attachmentAdjustedAsk(
      horse,
      stable,
      calculateLotValuation(horse, stable, "racing_age", [horse]),
    );
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
    const { calculateLotValuation } = await import("@/core/auction/engine");
    const { attachmentAdjustedAsk } = await import("@/core/horse/attachment");
    const valuation = attachmentAdjustedAsk(
      horse,
      stable,
      calculateLotValuation(horse, stable, "racing_age", [horse]),
    );
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
    const horse1 = mkHorse({ id: asHorseId("horse-1"), name: "Thunder" });
    const horse2 = mkHorse({ id: asHorseId("horse-2"), name: "Lightning" });
    const stable = mkStable({
      personality: "aggressive",
      horses: [asHorseId("horse-1"), asHorseId("horse-2")],
    });
    const { calculateLotValuation } = await import("@/core/auction/engine");
    const { attachmentAdjustedAsk } = await import("@/core/horse/attachment");
    const valuation = attachmentAdjustedAsk(
      horse1,
      stable,
      calculateLotValuation(horse1, stable, "racing_age", [horse1, horse2]),
    );

    const ctx = createContext({
      horses: h2r([horse1, horse2]),
      npcStables: [stable],
      privateSaleOffers: [
        mkOffer({ id: "o1", horseId: asHorseId("horse-1"), amount: Math.round(valuation * 0.75) }),
        mkOffer({ id: "o2", horseId: asHorseId("horse-2"), amount: Math.round(valuation * 0.4) }),
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
      privateSaleOffers: [mkOffer({ horseId: asHorseId("nonexistent") })],
    });
    const result = mod.privateSaleResolutionPhase.execute(ctx);
    expect(result.state.privateSaleOffers![0].status).toBe("pending");
  });

  it("stable not found — offer skipped, remains pending", async () => {
    const mod = await import("@/core/time/phases/privateSaleResolution");
    const ctx = createContext({
      horses: h2r([mkHorse()]),
      npcStables: [],
      privateSaleOffers: [mkOffer({ toStableId: asStableId("nonexistent") })],
    });
    const result = mod.privateSaleResolutionPhase.execute(ctx);
    expect(result.state.privateSaleOffers![0].status).toBe("pending");
  });

  it("horse already transferred (stableId mismatch) — offer declined", async () => {
    const mod = await import("@/core/time/phases/privateSaleResolution");
    const horse = mkHorse({ ownership: makeNpcOwned(asNpcStableId("different-stable")) });
    const ctx = createContext({
      horses: h2r([horse]),
      npcStables: [mkStable()],
      privateSaleOffers: [mkOffer({ toStableId: asStableId("stable-1") })],
    });
    const result = mod.privateSaleResolutionPhase.execute(ctx);
    expect(result.state.privateSaleOffers![0].status).toBe("declined");
  });

  it("multiple pending offers for different horses — all processed independently", async () => {
    const mod = await import("@/core/time/phases/privateSaleResolution");
    const horse1 = mkHorse({ id: asHorseId("horse-1"), name: "Thunder" });
    const horse2 = mkHorse({ id: asHorseId("horse-2"), name: "Lightning" });
    const stable = mkStable({ horses: [asHorseId("horse-1"), asHorseId("horse-2")] });
    const { calculateLotValuation } = await import("@/core/auction/engine");
    const { attachmentAdjustedAsk } = await import("@/core/horse/attachment");
    const valuation = attachmentAdjustedAsk(
      horse1,
      stable,
      calculateLotValuation(horse1, stable, "racing_age", [horse1, horse2]),
    );

    const ctx = createContext({
      horses: h2r([horse1, horse2]),
      npcStables: [stable],
      privateSaleOffers: [
        mkOffer({ id: "o1", horseId: asHorseId("horse-1"), amount: Math.round(valuation * 0.75) }),
        mkOffer({ id: "o2", horseId: asHorseId("horse-2"), amount: Math.round(valuation * 0.4) }),
      ],
    });
    const result = mod.privateSaleResolutionPhase.execute(ctx);
    const offers = result.state.privateSaleOffers!;
    expect(offers[0].status).toBe("accepted");
    expect(offers[1].status).toBe("declined");
  });

  // ── Known buyer premium integration tests ──────────────────────────────────

  it("regional reputation raises ask for protected horse — offer accepted at rep=0 is countered at rep=300", async () => {
    const mod = await import("@/core/time/phases/privateSaleResolution");
    const { calculateLotValuation } = await import("@/core/auction/engine");
    const { attachmentAdjustedAsk, evaluateHorseAttachment } =
      await import("@/core/horse/attachment");

    // Horse with enough signals to reach "protected" tier (score >= 52)
    const horse = mkHorse({
      fame: 40,
      potential: 82,
      careerStarts: 10,
      careerWins: 6,
      lifetimeEarnings: 300_000,
      fanCount: 800,
    });
    const stable = mkStable({ personality: "aggressive" });

    // Sanity: confirm the horse is "protected"
    const attachment = evaluateHorseAttachment(horse, stable);
    expect(attachment.tier).toBe("protected");

    const marketValue = calculateLotValuation(horse, stable, "racing_age", [horse]);
    const askAtRep0 = attachmentAdjustedAsk(horse, stable, marketValue);
    // Offer just above the accept threshold for aggressive (0.7x ask).
    // Use ceil to avoid rounding-down below the threshold.
    const offerAmount = Math.ceil(askAtRep0 * 0.7);

    // At rep=0: ratio >= 0.7 → accepted
    const ctx0 = createContext({
      horses: h2r([horse]),
      npcStables: [stable],
      privateSaleOffers: [mkOffer({ amount: offerAmount })],
      reputation: { score: 0, tier: "unknown" } as any,
    });
    const result0 = mod.privateSaleResolutionPhase.execute(ctx0);
    expect(result0.state.privateSaleOffers![0].status).toBe("accepted");

    // At rep=300 (regional): ask is 10% higher, ratio ≈ 0.7/1.10 ≈ 0.636 < 0.7 → countered
    const ctx300 = createContext({
      horses: h2r([horse]),
      npcStables: [stable],
      privateSaleOffers: [mkOffer({ id: "o2", amount: offerAmount })],
      reputation: { score: 300, tier: "regional" } as any,
    });
    const result300 = mod.privateSaleResolutionPhase.execute(ctx300);
    expect(result300.state.privateSaleOffers![0].status).toBe("countered");
  });

  it("regional reputation does NOT affect valued horse — same outcome as rep=0", async () => {
    const mod = await import("@/core/time/phases/privateSaleResolution");
    const { calculateLotValuation } = await import("@/core/auction/engine");
    const { attachmentAdjustedAsk, evaluateHorseAttachment } =
      await import("@/core/horse/attachment");

    // Default test horse is "valued" (fame=30, potential=75 → score ~28)
    const horse = mkHorse();
    const stable = mkStable({ personality: "aggressive" });

    const attachment = evaluateHorseAttachment(horse, stable);
    expect(attachment.tier).toBe("valued");

    const marketValue = calculateLotValuation(horse, stable, "racing_age", [horse]);
    const askAtRep0 = attachmentAdjustedAsk(horse, stable, marketValue);
    const offerAmount = Math.ceil(askAtRep0 * 0.75);

    // At rep=0: accepted (0.75 >= 0.7 for aggressive)
    const ctx0 = createContext({
      horses: h2r([horse]),
      npcStables: [stable],
      privateSaleOffers: [mkOffer({ amount: offerAmount })],
      reputation: { score: 0, tier: "unknown" } as any,
    });
    const result0 = mod.privateSaleResolutionPhase.execute(ctx0);
    expect(result0.state.privateSaleOffers![0].status).toBe("accepted");

    // At rep=300 (regional): still accepted — premium doesn't apply to "valued" horses
    const ctx300 = createContext({
      horses: h2r([horse]),
      npcStables: [stable],
      privateSaleOffers: [mkOffer({ id: "o2", amount: offerAmount })],
      reputation: { score: 300, tier: "regional" } as any,
    });
    const result300 = mod.privateSaleResolutionPhase.execute(ctx300);
    expect(result300.state.privateSaleOffers![0].status).toBe("accepted");
  });

  it("legendary reputation (score=900) raises ask even more for untouchable horse", async () => {
    const mod = await import("@/core/time/phases/privateSaleResolution");
    const { calculateLotValuation } = await import("@/core/auction/engine");
    const { attachmentAdjustedAsk, evaluateHorseAttachment } =
      await import("@/core/horse/attachment");

    // Horse with enough signals to reach "untouchable" tier (score >= 78)
    const horse = mkHorse({
      fame: 60,
      potential: 90,
      careerStarts: 10,
      careerWins: 7,
      lifetimeEarnings: 500_000,
      fanCount: 1000,
    });
    const stable = mkStable({ personality: "aggressive" });

    const attachment = evaluateHorseAttachment(horse, stable);
    expect(attachment.tier).toBe("untouchable");

    const marketValue = calculateLotValuation(horse, stable, "racing_age", [horse]);
    const askAtRep0 = attachmentAdjustedAsk(horse, stable, marketValue);
    const askAtRep900 = attachmentAdjustedAsk(horse, stable, marketValue, 900);

    // Premium at legendary is 30%
    expect(askAtRep900).toBe(Math.round(askAtRep0 * 1.3));

    // Offer at 0.7x ask_0 → accepted at rep=0, but at rep=900 ratio ≈ 0.7/1.30 ≈ 0.54
    // For aggressive: 0.54 >= 0.5 (counter threshold) → countered
    const offerAmount = Math.ceil(askAtRep0 * 0.7);

    const ctx0 = createContext({
      horses: h2r([horse]),
      npcStables: [stable],
      privateSaleOffers: [mkOffer({ amount: offerAmount })],
      reputation: { score: 0, tier: "unknown" } as any,
    });
    const result0 = mod.privateSaleResolutionPhase.execute(ctx0);
    expect(result0.state.privateSaleOffers![0].status).toBe("accepted");

    const ctx900 = createContext({
      horses: h2r([horse]),
      npcStables: [stable],
      privateSaleOffers: [mkOffer({ id: "o2", amount: offerAmount })],
      reputation: { score: 900, tier: "legendary" } as any,
    });
    const result900 = mod.privateSaleResolutionPhase.execute(ctx900);
    expect(result900.state.privateSaleOffers![0].status).toBe("countered");
  });
});

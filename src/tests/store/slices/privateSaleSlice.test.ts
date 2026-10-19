import { describe, it, expect, vi, beforeEach } from "vitest";
import { seedStore } from "@/test-utils/renderWithStore";
import { useGame } from "@/platform/game/store";
import { createTestNpcHorse } from "@/tests/helpers/createTestHorse";
import type { PrivateSaleOffer, Horse, Race, Stable } from "@/platform/game/types";
import { makeNpcOwned, makePlayerOwned, getStableId } from "@/domains/horse/simulation/ownership";
import { asNpcStableId } from "@/shared/types/branded";
import { h2r } from "@/tests/helpers/sampleGameState";
import { generatePersonIdentity } from "@/domains/person/simulation/generator";

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
    ownership: makeNpcOwned(asNpcStableId("stable-1")),
    ...overrides,
  });

const mkClaimingRace = (overrides: Partial<Race> = {}): Race =>
  ({
    id: "race-1",
    name: "Claiming Stakes",
    day: 10,
    distance: 1600,
    raceClass: "Claiming",
    entryFee: 0,
    purse: 50000,
    fieldSize: 8,
    entries: [],
    resolved: false,
    claimingPrice: 25000,
    ...overrides,
  }) as Race;

const mkStable = (overrides: Partial<Stable> = {}): Stable =>
  ({
    id: "stable-1",
    name: "Green Acres",
    owner: generatePersonIdentity({
      id: "npc",
      displayName: "NPC",
      role: "owner",
      ageBand: "adult",
    }),
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
    const updatedHorse = state.horses["horse-1"];
    expect(updatedHorse.ownership?.type).toBe("player");
    expect(getStableId(updatedHorse)).toBeNull();
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
    const horse = mkHorse({ ownership: makeNpcOwned(asNpcStableId("other-stable")) });
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

  it("enterClaimingRace accepts the canonical claimingPrice field", () => {
    const horse = mkHorse({ ownership: makePlayerOwned() });
    const race = mkClaimingRace();
    seedStore({
      day: 5,
      horses: h2r([horse]),
      races: { [race.id]: race },
    });

    const result = useGame.getState().enterClaimingRace(race.id, horse.id);
    expect(result.ok).toBe(true);
    expect(useGame.getState().pendingIntents).toEqual([
      expect.objectContaining({
        type: "race_entry",
        raceId: race.id,
        horseId: horse.id,
        source: "player",
      }),
    ]);
  });

  it("fileClaim accepts canonical claimingPrice races and rejects duplicate pending claims", () => {
    const horse = mkHorse();
    const race = mkClaimingRace({
      entries: [{ horseId: horse.id, ownership: horse.ownership }],
    });
    seedStore({
      day: 5,
      cash: 100000,
      horses: h2r([horse]),
      races: { [race.id]: race },
      pendingIntents: [],
      claims: [],
    });

    const result = useGame.getState().fileRaceClaim(race.id, horse.id);
    expect(result.ok).toBe(true);
    expect(useGame.getState().pendingIntents).toEqual([
      expect.objectContaining({
        type: "claiming",
        raceId: race.id,
        horseId: horse.id,
        claimingPrice: 25000,
        source: "player",
      }),
    ]);

    const duplicate = useGame.getState().fileRaceClaim(race.id, horse.id);
    expect(duplicate).toEqual({ ok: false, reason: "duplicate_claim" });
    expect(useGame.getState().pendingIntents).toHaveLength(1);
  });

  it("fileRaceClaim rejects horses that are not entered and already resolved races", () => {
    const horse = mkHorse();
    const race = mkClaimingRace();
    seedStore({
      day: 5,
      cash: 100000,
      horses: h2r([horse]),
      races: { [race.id]: race },
      pendingIntents: [],
      claims: [],
    });

    expect(useGame.getState().fileRaceClaim(race.id, horse.id)).toEqual({
      ok: false,
      reason: "horse_not_entered",
    });
    expect(useGame.getState().pendingIntents).toEqual([]);

    seedStore({
      races: {
        [race.id]: {
          ...race,
          resolved: true,
          entries: [{ horseId: horse.id, ownership: horse.ownership }],
        },
      },
    });
    expect(useGame.getState().fileRaceClaim(race.id, horse.id)).toEqual({
      ok: false,
      reason: "race_resolved",
    });
  });
});

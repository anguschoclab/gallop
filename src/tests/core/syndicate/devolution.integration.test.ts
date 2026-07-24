import { describe, it, expect } from "vitest";
import { SyndicationHandler } from "@/core/resolver/handlers/SyndicationHandler";
import type { GameState } from "@/game/types";
import type { Horse } from "@/game/types";
import type { ShareTransactionImpact } from "@/core/resolver/impacts/breedingImpacts";
import { h2r } from "@/tests/helpers/sampleGameState";

function makeStallion(id: string, name: string, stableId?: string): Horse {
  return {
    id,
    name,
    gender: "horse",
    age: 8,
    energy: 100,
    form: 0,
    potential: 80,
    raceHistory: [
      { raceId: "r1", raceName: "G1 Race", position: 1, day: 100, grade: "G1" },
    ],
    stud: { atStud: true, standingFee: 50000, bookSize: 50, seasonBookings: 0 },
    owned: !stableId,
    stableId,
    fame: 50,
    lifetimeEarnings: 1000000,
    careerStarts: 10,
    careerWins: 5,
    distanceAptitude: 0.5,
    surfaceAptitude: { Turf: 0.5, Dirt: 0.5, Synthetic: 0.5 },
    climbingAptitude: 0.5,
    corneringAptitude: 0.5,
    injuryProneness: 0.5,
    height: 16,
    weight: 1000,
    heartScore: 100,
    fiberBias: "balanced",
    strideType: "balanced",
    trackPreference: "balanced",
    mudAptitude: 0.5,
    trainability: 0.5,
    peakAge: 5,
    recoveryRate: 0.5,
    fertility: 0.5,
    foalingEase: 0.5,
    markings: [],
    bleederRisk: 0.5,
    roarerRisk: 0.5,
  } as unknown as Horse;
}

function makeSyndicate(
  id: string,
  stallionId: string,
  stallionName: string,
  shareHolders: Record<string, number>,
  totalShares = 40,
) {
  return {
    id,
    stallionId,
    stallionName,
    totalShares,
    shareHolders,
    sharePrice: 10000,
    studFee: 50000,
    isPublic: true,
    lifetimeEarnings: 0,
  };
}

function makeState(
  stallion: Horse,
  syndicate: ReturnType<typeof makeSyndicate>,
  npcStables: { id: string; name: string; cash: number }[] = [],
): GameState {
  return {
    cash: 1000000,
    horses: h2r([stallion]),
    syndicates: { [syndicate.id]: syndicate },
    shareTransactions: [],
    shareActivityFeed: [],
    npcStables,
    log: [],
  } as unknown as GameState;
}

function makePurchaseImpact(
  syndicateId: string,
  buyerId: string,
  shares: number,
  pricePerShare = 10000,
  day = 10,
): ShareTransactionImpact {
  return {
    id: `imp-${Math.random()}`,
    intentId: "",
    day,
    phase: "management_resolution",
    logLevel: "conditional",
    type: "share_transaction",
    syndicateId,
    stableId: buyerId,
    buyerStableId: buyerId,
    sellerStableId: "treasury",
    shares,
    pricePerShare,
    reason: "Purchase",
  };
}

function makeSaleImpact(
  syndicateId: string,
  sellerId: string,
  shares: number,
  pricePerShare = 10000,
  day = 10,
): ShareTransactionImpact {
  return {
    id: `imp-${Math.random()}`,
    intentId: "",
    day,
    phase: "management_resolution",
    logLevel: "conditional",
    type: "share_transaction",
    syndicateId,
    stableId: sellerId,
    buyerStableId: "market",
    sellerStableId: sellerId,
    shares: -shares,
    pricePerShare,
    reason: "Sale",
  };
}

describe("Syndicate Devolution Integration", () => {
  it("crossing exactly 50% does not trigger devolution on tie", () => {
    const stallion = makeStallion("s1", "Champ");
    // Use 50 total shares: player 21, npcA 19, 10 unissued
    const syndicate = makeSyndicate("syn-s1", "s1", "Champ", { player: 21, npcA: 19 }, 50);
    const state = makeState(stallion, syndicate, [{ id: "npcA", name: "NPC A", cash: 500000 }]);
    const handler = new SyndicationHandler();

    // Player sells 1 -> player 20, npcA 19. 20 <= 25 but npcA 19 < 20, no transfer
    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, makeSaleImpact("syn-s1", "player", 1));
    expect(draft.syndicates["syn-s1"].shareHolders.player).toBe(20);
    expect(draft.horses["s1"].stableId).toBeUndefined(); // Still player-owned

    // Player sells 1 -> player 19, npcA 19. 19 <= 25, npcA 19 = 19, tie -> no transfer
    handler.handle(draft, makeSaleImpact("syn-s1", "player", 1));
    expect(draft.syndicates["syn-s1"].shareHolders.player).toBe(19);
    expect(draft.horses["s1"].stableId).toBeUndefined(); // Still player-owned (tie)

    // NPC-A buys 2 -> npcA 21, player 19. 19 <= 25, npcA 21 > 19 -> transfer!
    handler.handle(draft, makePurchaseImpact("syn-s1", "npcA", 2));
    expect(draft.syndicates["syn-s1"].shareHolders.npcA).toBe(21);
    expect(draft.horses["s1"].stableId).toBe("npcA");
    expect(draft.horses["s1"].owned).toBe(false);

    // Check devolution feed entry
    const devolutionFeeds = draft.shareActivityFeed.filter((f: any) => f.type === "devolution");
    expect(devolutionFeeds).toHaveLength(1);
    expect(devolutionFeeds[0].previousOwner).toBe("player");
    expect(devolutionFeeds[0].newOwner).toBe("npcA");
    expect(devolutionFeeds[0].stallionName).toBe("Champ");
  });

  it("multiple top shareholders tie does not trigger transfer", () => {
    const stallion = makeStallion("s1", "Champ");
    // Use 50 total shares so there are unissued shares for purchases
    const syndicate = makeSyndicate(
      "syn-s1", "s1", "Champ",
      { player: 15, npcA: 15, npcB: 10 },
      50,
    );
    const state = makeState(stallion, syndicate, [
      { id: "npcA", name: "NPC A", cash: 500000 },
      { id: "npcB", name: "NPC B", cash: 500000 },
    ]);
    const handler = new SyndicationHandler();
    const draft = JSON.parse(JSON.stringify(state));

    // Player is owner at 15. 15 <= 20 -> check. npcA 15 = 15, not > -> no transfer
    // (devolution check happens on every transaction, but player is already below threshold)
    // Actually player 15 <= 20, npcA 15 is not > 15, so no transfer.

    // NPC-A buys 1 -> npcA 16, player 15. 15 <= 25, npcA 16 > 15 -> transfer to npcA
    handler.handle(draft, makePurchaseImpact("syn-s1", "npcA", 1));
    expect(draft.horses["s1"].stableId).toBe("npcA");

    // NPC-A sells 6 -> npcA 10, player 15. npcA is owner. 10 <= 25, player 15 > 10 -> transfer to player
    handler.handle(draft, makeSaleImpact("syn-s1", "npcA", 6));
    expect(draft.horses["s1"].stableId).toBeUndefined(); // Back to player

    // Player sells 5 -> player 10, npcA 10, npcB 10. Player is owner. 10 <= 25, nobody > 10 -> no transfer
    handler.handle(draft, makeSaleImpact("syn-s1", "player", 5));
    expect(draft.horses["s1"].stableId).toBeUndefined(); // Still player (3-way tie)

    // Verify 2 devolution events
    const devolutionFeeds = draft.shareActivityFeed.filter((f: any) => f.type === "devolution");
    expect(devolutionFeeds).toHaveLength(2);
  });

  it("sequential trades trigger multiple devolutions", () => {
    const stallion = makeStallion("s1", "Champ");
    // 50 total shares, threshold = 25. Start: player 20, npcA 15, npcB 5 = 40, 10 unissued.
    // Player already below threshold (20 <= 25) but npcA 15 < 20, no transfer yet.
    const syndicate = makeSyndicate(
      "syn-s1", "s1", "Champ",
      { player: 20, npcA: 15, npcB: 5 },
      50,
    );
    const state = makeState(stallion, syndicate, [
      { id: "npcA", name: "NPC A", cash: 1000000 },
      { id: "npcB", name: "NPC B", cash: 1000000 },
    ]);
    const handler = new SyndicationHandler();
    const draft = JSON.parse(JSON.stringify(state));

    // NPC-A buys 6 -> npcA 21, player 20. 20 <= 25, npcA 21 > 20 -> transfer to npcA (devolution #1)
    handler.handle(draft, makePurchaseImpact("syn-s1", "npcA", 6));
    expect(draft.horses["s1"].stableId).toBe("npcA");

    // NPC-A sells 10 -> npcA 11, player 20. npcA is owner. 11 <= 25, player 20 > 11 -> transfer to player (devolution #2)
    handler.handle(draft, makeSaleImpact("syn-s1", "npcA", 10));
    expect(draft.horses["s1"].stableId).toBeUndefined(); // Back to player

    // NPC-B buys 14 -> npcB 19, player 20. player is owner. 20 <= 25, npcB 19 < 20 -> no transfer
    handler.handle(draft, makePurchaseImpact("syn-s1", "npcB", 14));
    expect(draft.horses["s1"].stableId).toBeUndefined(); // Still player

    // Player sells 5 -> player 15, npcB 19. player is owner. 15 <= 25, npcB 19 > 15 -> transfer to npcB (devolution #3)
    handler.handle(draft, makeSaleImpact("syn-s1", "player", 5));
    expect(draft.horses["s1"].stableId).toBe("npcB");

    // Verify 3 devolution events
    const devolutionFeeds = draft.shareActivityFeed.filter((f: any) => f.type === "devolution");
    expect(devolutionFeeds).toHaveLength(3);
    expect(devolutionFeeds[0].previousOwner).toBe("player");
    expect(devolutionFeeds[0].newOwner).toBe("npcA");
    expect(devolutionFeeds[1].previousOwner).toBe("npcA");
    expect(devolutionFeeds[1].newOwner).toBe("player");
    expect(devolutionFeeds[2].previousOwner).toBe("player");
    expect(devolutionFeeds[2].newOwner).toBe("npcB");
  });

  it("records transactions with buyer/seller fields", () => {
    const stallion = makeStallion("s1", "Champ");
    const syndicate = makeSyndicate("syn-s1", "s1", "Champ", { player: 20 });
    const state = makeState(stallion, syndicate);
    const handler = new SyndicationHandler();
    const draft = JSON.parse(JSON.stringify(state));

    handler.handle(draft, makePurchaseImpact("syn-s1", "npcA", 5));

    expect(draft.shareTransactions).toHaveLength(1);
    expect(draft.shareTransactions[0].buyerStableId).toBe("npcA");
    expect(draft.shareTransactions[0].sellerStableId).toBe("treasury");
    expect(draft.shareTransactions[0].shares).toBe(5);
  });

  it("records activity feed for purchases and sales", () => {
    const stallion = makeStallion("s1", "Champ");
    const syndicate = makeSyndicate("syn-s1", "s1", "Champ", { player: 20, npcA: 10 });
    const state = makeState(stallion, syndicate, [{ id: "npcA", name: "NPC A", cash: 500000 }]);
    const handler = new SyndicationHandler();
    const draft = JSON.parse(JSON.stringify(state));

    // Purchase
    handler.handle(draft, makePurchaseImpact("syn-s1", "npcA", 2));
    const purchaseFeeds = draft.shareActivityFeed.filter((f: any) => f.type === "share_purchase");
    expect(purchaseFeeds).toHaveLength(1);
    expect(purchaseFeeds[0].buyerStableId).toBe("npcA");
    expect(purchaseFeeds[0].sellerStableId).toBe("treasury");
    expect(purchaseFeeds[0].cashMoved).toBe(20000);

    // Sale
    handler.handle(draft, makeSaleImpact("syn-s1", "npcA", 3));
    const saleFeeds = draft.shareActivityFeed.filter((f: any) => f.type === "share_sale");
    expect(saleFeeds).toHaveLength(1);
    expect(saleFeeds[0].sellerStableId).toBe("npcA");
    expect(saleFeeds[0].buyerStableId).toBe("market");
    expect(saleFeeds[0].cashMoved).toBe(30000);
  });
});

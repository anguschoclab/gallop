import { describe, it, expect } from "vitest";
import { SyndicationHandler } from "@/core/resolver/handlers/SyndicationHandler";
import type { GameState } from "@/game/store/state";
import type {
  SyndicateCreationImpact,
  ShareTransactionImpact,
  SyndicateFeeDistributionImpact,
  SyndicateSatisfactionImpact,
} from "@/core/resolver/impacts/index";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";

describe("SyndicationHandler", () => {
  it("syndicate_creation creates syndicate for G1 winner", () => {
    const handler = new SyndicationHandler();
    const state = {
      cash: 1000,
      horses: h2r([
        {
          id: "h1",
          name: "Champion",
          raceHistory: [{ grade: "G1", position: 1 }],
          stud: { standingFee: 20000 },
        },
      ] as unknown as Horse[]),
      syndicates: {},
    } as unknown as GameState;

    const impact: SyndicateCreationImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "managementResolution",
      logLevel: "always",
      type: "syndicate_creation",
      syndicateId: "syn-1",
      stallionId: "h1",
      stallionName: "Champion",
      totalShares: 40,
      sharePrice: 50000,
      initialShareholders: { player: 10 },
      reason: "Syndicate created",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.syndicates["syn-1"]).toBeDefined();
    expect(draft.syndicates["syn-1"].stallionName).toBe("Champion");
    expect(draft.syndicates["syn-1"].totalShares).toBe(40);
    expect(draft.syndicates["syn-1"].shareHolders.player).toBe(10);
  });

  it("syndicate_creation does not create syndicate for non-G1 winner", () => {
    const handler = new SyndicationHandler();
    const state = {
      cash: 1000,
      horses: h2r([{ id: "h1", name: "NonWinner", raceHistory: [{ grade: "G2", position: 1 }] }] as unknown as Horse[]),
      syndicates: {},
    } as unknown as GameState;

    const impact: SyndicateCreationImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "managementResolution",
      logLevel: "always",
      type: "syndicate_creation",
      syndicateId: "syn-1",
      stallionId: "h1",
      stallionName: "NonWinner",
      totalShares: 40,
      sharePrice: 50000,
      initialShareholders: {},
      reason: "Syndicate created",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.syndicates["syn-1"]).toBeUndefined();
  });

  it("share_transaction purchase adds shares", () => {
    const handler = new SyndicationHandler();
    const state = {
      cash: 1000,
      horses: {},
      syndicates: {
        "syn-1": {
          id: "syn-1",
          stallionId: "h1",
          stallionName: "Champ",
          totalShares: 40,
          shareHolders: { player: 10 },
          sharePrice: 5000,
          studFee: 20000,
          isPublic: true,
          lifetimeEarnings: 0,
        },
      },
      shareTransactions: [],
    } as unknown as GameState;

    const impact: ShareTransactionImpact = {
      id: "imp-1",
      intentId: "",
      day: 15,
      phase: "managementResolution",
      logLevel: "always",
      type: "share_transaction",
      syndicateId: "syn-1",
      stableId: "stable-2",
      shares: 5,
      pricePerShare: 5000,
      reason: "Share purchase",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.syndicates["syn-1"].shareHolders["stable-2"]).toBe(5);
    expect(draft.shareTransactions).toHaveLength(1);
  });

  it("share_transaction sale removes shares", () => {
    const handler = new SyndicationHandler();
    const state = {
      cash: 1000,
      horses: {},
      syndicates: {
        "syn-1": {
          id: "syn-1",
          stallionId: "h1",
          stallionName: "Champ",
          totalShares: 40,
          shareHolders: { player: 10, "stable-2": 5 },
          sharePrice: 5000,
          studFee: 20000,
          isPublic: true,
          lifetimeEarnings: 0,
        },
      },
      shareTransactions: [],
    } as unknown as GameState;

    const impact: ShareTransactionImpact = {
      id: "imp-1",
      intentId: "",
      day: 15,
      phase: "managementResolution",
      logLevel: "always",
      type: "share_transaction",
      syndicateId: "syn-1",
      stableId: "stable-2",
      shares: -3,
      pricePerShare: 5000,
      reason: "Share sale",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.syndicates["syn-1"].shareHolders["stable-2"]).toBe(2);
  });

  it("syndicate_fee_distribution distributes to shareholders", () => {
    const handler = new SyndicationHandler();
    const state = {
      cash: 1000,
      horses: {},
      npcStables: [{ id: "stable-2", cash: 0 }],
      syndicates: {
        "syn-1": {
          id: "syn-1",
          stallionId: "h1",
          stallionName: "Champ",
          totalShares: 40,
          shareHolders: { player: 10, "stable-2": 10 },
          sharePrice: 5000,
          studFee: 20000,
          isPublic: true,
          lifetimeEarnings: 0,
        },
      },
    } as unknown as GameState;

    const impact: SyndicateFeeDistributionImpact = {
      id: "imp-1",
      intentId: "",
      day: 20,
      phase: "breedingResolution",
      logLevel: "always",
      type: "syndicate_fee_distribution",
      syndicateId: "syn-1",
      totalFee: 10000,
      breedingDay: 20,
      reason: "Fee distribution",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.syndicates["syn-1"].lifetimeEarnings).toBe(10000);
    expect(draft.cash).toBe(6000);
    expect(draft.npcStables[0].cash).toBe(5000);
  });

  it("syndicate_satisfaction updates satisfaction clamped 0-100", () => {
    const handler = new SyndicationHandler();
    const state = {
      cash: 1000,
      horses: {},
      syndicates: {
        "syn-1": {
          id: "syn-1",
          stallionId: "h1",
          stallionName: "Champ",
          totalShares: 40,
          shareHolders: { player: 10 },
          sharePrice: 5000,
          studFee: 20000,
          isPublic: true,
          lifetimeEarnings: 0,
        },
      },
    } as unknown as GameState;

    const impact: SyndicateSatisfactionImpact = {
      id: "imp-1",
      intentId: "",
      day: 30,
      phase: "breedingResolution",
      logLevel: "always",
      type: "syndicate_satisfaction",
      syndicateId: "syn-1",
      stableId: "player",
      satisfactionDelta: 60,
      reason: "Great results",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.syndicates["syn-1"].shareholderSatisfaction.player).toBe(100);
    expect(draft.syndicates["syn-1"].lastSatisfactionUpdate).toBe(30);
  });

  it("canHandle returns true for syndication impact types only", () => {
    const handler = new SyndicationHandler();
    expect(handler.canHandle("syndicate_creation")).toBe(true);
    expect(handler.canHandle("share_transaction")).toBe(true);
    expect(handler.canHandle("syndicate_fee_distribution")).toBe(true);
    expect(handler.canHandle("syndicate_satisfaction")).toBe(true);
    expect(handler.canHandle("cash_change")).toBe(false);
  });
});

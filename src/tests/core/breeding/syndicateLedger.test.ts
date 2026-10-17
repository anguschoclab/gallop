import { describe, it, expect } from "vitest";
import {
  appendSyndicateValueSnapshots,
  playerSyndicateSnapshots,
  syndicateLedgerTimeSeries,
  SYNDICATE_SNAPSHOT_MAX,
  type SyndicateValueSnapshot,
} from "@/core/breeding/syndicateLedger";
import type { ShareActivityFeedItem, Syndicate } from "@/core/breeding/types";
import { SyndicationHandler } from "@/core/resolver/handlers/SyndicationHandler";
import type { SyndicateFeeDistributionImpact } from "@/core/resolver/impacts/breedingImpacts";
import type { GameState } from "@/game/types";

const syndicate = (overrides: Partial<Syndicate> = {}): Syndicate =>
  ({
    id: "syn1",
    stallionId: "st1",
    stallionName: "Great Sire",
    totalShares: 40,
    shareHolders: { player: 10, npc1: 30 },
    sharePrice: 2_000,
    studFee: 5_000,
    isPublic: true,
    lifetimeEarnings: 0,
    ...overrides,
  }) as unknown as Syndicate;

const feed = (overrides: Partial<ShareActivityFeedItem> = {}): ShareActivityFeedItem =>
  ({
    id: `f-${overrides.id ?? Math.random()}`,
    syndicateId: "syn1",
    syndicateName: "Great Sire",
    type: "fee_distribution",
    shares: 10,
    pricePerShare: 0,
    cashMoved: 12_500,
    day: 20,
    ...overrides,
  }) as ShareActivityFeedItem;

describe("playerSyndicateSnapshots", () => {
  it("emits a snapshot per syndicate the player holds", () => {
    const snaps = playerSyndicateSnapshots(
      { syn1: syndicate(), syn2: syndicate({ id: "syn2", shareHolders: { player: 5 } }) },
      42,
    );
    expect(snaps).toHaveLength(2);
    expect(snaps[0]).toMatchObject({
      syndicateId: "syn1",
      stallionName: "Great Sire",
      day: 42,
      sharePrice: 2_000,
      playerShares: 10,
      stakeValue: 20_000,
    });
  });

  it("skips syndicates the player does not hold", () => {
    const snaps = playerSyndicateSnapshots({ syn1: syndicate({ shareHolders: { npc1: 40 } }) }, 42);
    expect(snaps).toEqual([]);
  });

  it("handles a missing syndicate map", () => {
    expect(playerSyndicateSnapshots(undefined, 1)).toEqual([]);
  });
});

describe("appendSyndicateValueSnapshots", () => {
  const snap = (
    day: number,
    syndicateId = "syn1",
    stakeValue = 10_000,
  ): SyndicateValueSnapshot => ({
    syndicateId,
    stallionName: "Sire",
    day,
    sharePrice: 1_000,
    playerShares: 10,
    stakeValue,
  });

  it("appends new snapshots", () => {
    const next = appendSyndicateValueSnapshots(undefined, [snap(10)]);
    expect(next).toHaveLength(1);
  });

  it("replaces a same-day snapshot for the same syndicate", () => {
    const existing = [snap(10, "syn1", 9_000)];
    const next = appendSyndicateValueSnapshots(existing, [snap(10, "syn1", 11_000)]);
    expect(next).toHaveLength(1);
    expect(next[0].stakeValue).toBe(11_000);
  });

  it("keeps other syndicates recorded on the same day", () => {
    const existing = [snap(10, "syn1"), snap(10, "syn2", 5_000)];
    const next = appendSyndicateValueSnapshots(existing, [snap(10, "syn1", 12_000)]);
    expect(next).toHaveLength(2);
    expect(next.find((s) => s.syndicateId === "syn2")!.stakeValue).toBe(5_000);
  });

  it("caps the array at SYNDICATE_SNAPSHOT_MAX keeping the newest", () => {
    const existing = Array.from({ length: SYNDICATE_SNAPSHOT_MAX }, (_, i) => snap(i, `syn-${i}`));
    const next = appendSyndicateValueSnapshots(existing, [snap(9_999, "syn-new")]);
    expect(next).toHaveLength(SYNDICATE_SNAPSHOT_MAX);
    expect(next.at(-1)!.syndicateId).toBe("syn-new");
  });
});

describe("syndicateLedgerTimeSeries", () => {
  const snap = (day: number, stakeValue: number, syndicateId = "syn1"): SyndicateValueSnapshot => ({
    syndicateId,
    stallionName: "Sire",
    day,
    sharePrice: stakeValue / 10,
    playerShares: 10,
    stakeValue,
  });

  it("returns day-sorted stake values with cumulative player income from the feed", () => {
    const snapshots = [snap(30, 20_000), snap(10, 10_000), snap(20, 15_000)];
    const activity = [
      feed({ day: 15, cashMoved: 5_000 }),
      feed({ day: 25, cashMoved: 7_000 }),
      feed({ day: 25, cashMoved: 9_999, syndicateId: "other" }), // different syndicate
      feed({ day: 12, cashMoved: 1, type: "share_sale" }), // not income
    ];
    const series = syndicateLedgerTimeSeries(snapshots, activity, "syn1");
    expect(series.map((p) => p.day)).toEqual([10, 20, 30]);
    expect(series[0]).toMatchObject({ stakeValue: 10_000, cumulativePlayerIncome: 0 });
    expect(series[1]).toMatchObject({ stakeValue: 15_000, cumulativePlayerIncome: 5_000 });
    expect(series[2]).toMatchObject({ stakeValue: 20_000, cumulativePlayerIncome: 12_000 });
  });

  it("returns an empty series for an unknown syndicate", () => {
    expect(syndicateLedgerTimeSeries([], [], "nope")).toEqual([]);
  });
});

describe("SyndicationHandler fee distribution feed", () => {
  it("records the player's payout in shareActivityFeed", () => {
    const state = {
      cash: 0,
      horses: {},
      syndicates: { syn1: syndicate() },
      shareTransactions: [],
      shareActivityFeed: [],
      npcStables: [{ id: "npc1", name: "Rival", cash: 0 }],
      log: [],
    } as unknown as GameState;
    const impact: SyndicateFeeDistributionImpact = {
      id: "i1",
      intentId: "",
      day: 30,
      phase: "race_resolution",
      logLevel: "conditional",
      type: "syndicate_fee_distribution",
      syndicateId: "syn1",
      totalFee: 40_000,
      breedingDay: 30,
      reason: "test",
    };
    const draft: GameState = structuredClone(state);
    new SyndicationHandler().handle(draft, impact);

    // Player holds 10 of 40 issued shares → 10_000 payout.
    expect(draft.cash).toBe(10_000);
    const items = draft.shareActivityFeed.filter((f) => f.type === "fee_distribution");
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      syndicateId: "syn1",
      shares: 10,
      cashMoved: 10_000,
      totalFee: 40_000,
      day: 30,
    });
  });
});

import { describe, it, expect } from "vitest";
import {
  MAX_RIVAL_STAKE_PERCENT,
  splitStakePrize,
  stakeBuyPricePerPercent,
  stakeSellPricePerPercent,
  stakeResultReputation,
  rivalStakeEligibility,
  type RivalStake,
} from "@/domains/syndicates/model/rivalStakes";
import { buyRivalStake, sellRivalStake } from "@/domains/syndicates/simulation/rivalStakeTrades";
import { generateRivalStakeImpacts } from "@/domains/race/simulation/impacts/rivalStakeImpacts";
import { SyndicationHandler } from "@/platform/resolver/handlers/SyndicationHandler";
import { produce } from "immer";
import type { CashImpact } from "@/platform/resolver/impacts";
import type { GameState, Horse, Race } from "@/platform/game/types";

const npcHorse = (over: Partial<Horse> = {}) =>
  ({
    id: "h1",
    name: "Rival Star",
    age: 4,
    gender: "colt",
    ownership: { type: "npc", stableId: "s1" },
    lifecycleStatus: "active",
    racingViable: true,
    raceHistory: [],
    stats: {},
    ...over,
  }) as unknown as Horse;

const stake = (percent: number): RivalStake => ({
  horseId: "h1",
  horseName: "Rival Star",
  stableId: "s1",
  percent,
  costBasis: 0,
  boughtDay: 1,
  prizeEarned: 0,
  reputationEarned: 0,
  saleProceeds: 0,
  payouts: [],
});

describe("rival stake rules", () => {
  it("caps stakes at 49% so the rival keeps control", () => {
    expect(MAX_RIVAL_STAKE_PERCENT).toBe(49);
  });

  it("charges a 15% premium to buy and pays 90% to sell back, per 1%", () => {
    expect(stakeBuyPricePerPercent(100_000)).toBe(1_150);
    expect(stakeSellPricePerPercent(100_000)).toBe(900);
  });

  it("splits a prize by stake percentage", () => {
    expect(splitStakePrize(60_000, 25)).toEqual({ playerShare: 15_000, ownerShare: 45_000 });
  });

  it("gives the stake's share of win prestige, a smaller share for graded places, none otherwise", () => {
    expect(stakeResultReputation(80, 25, 1, true)).toBe(20);
    expect(stakeResultReputation(80, 25, 2, true)).toBe(6);
    expect(stakeResultReputation(80, 25, 2, false)).toBe(0);
    expect(stakeResultReputation(80, 25, 5, true)).toBe(0);
  });

  it("only sells stakes in active rival racehorses", () => {
    expect(rivalStakeEligibility(npcHorse()).ok).toBe(true);
    expect(rivalStakeEligibility(npcHorse({ ownership: { type: "player" } } as never)).ok).toBe(false);
    expect(rivalStakeEligibility(npcHorse({ lifecycleStatus: "retired" })).ok).toBe(false);
  });
});

describe("buying and selling a rival stake", () => {
  const base = () =>
    ({
      day: 10,
      cash: 1_000_000,
      horses: { h1: npcHorse() },
      npcStables: [{ id: "s1", name: "Rival Stable", cash: 50_000 }],
      rivalStakes: {},
      transactions: [],
      log: [],
    }) as unknown as GameState;

  it("moves the cost from the player to the owner and refuses past 49%", () => {
    const s = base();
    const r = buyRivalStake(s, "h1", 20);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.patch.cash).toBe(1_000_000 - r.amount);
    expect(r.patch.npcStables![0].cash).toBe(50_000 + r.amount);
    expect(r.patch.rivalStakes!.h1.percent).toBe(20);
    const next = { ...s, ...r.patch } as GameState;
    expect(buyRivalStake(next, "h1", 30).ok).toBe(false);
    expect(buyRivalStake(next, "h1", 29).ok).toBe(true);
  });

  it("selling the whole stake removes it and pays the player", () => {
    const s = base();
    const bought = buyRivalStake(s, "h1", 10);
    if (!bought.ok) throw new Error("buy failed");
    const next = { ...s, ...bought.patch } as GameState;
    const sold = sellRivalStake(next, "h1", 10);
    expect(sold.ok).toBe(true);
    if (!sold.ok) return;
    expect(sold.patch.cash).toBe((next.cash as number) + sold.amount);
    expect(sold.patch.rivalStakes!.h1).toBeUndefined();
  });
});

describe("race payouts to a rival stake", () => {
  const race = { id: "r1", name: "Big Cup", purse: 100_000, graded: { grade: "G1" } } as unknown as Race;

  it("reduces the owner's prize to their share and pays the player the rest plus prestige", () => {
    const ownerCash = { type: "cash_change", entityId: "s1", amount: 60_000 } as unknown as CashImpact;
    const impacts = generateRivalStakeImpacts(npcHorse(), 1, race, ownerCash, stake(25), 12);
    expect(ownerCash.amount).toBe(45_000);
    const playerCash = impacts.find((i) => i.type === "cash_change") as CashImpact;
    expect(playerCash.entityId).toBe("player");
    expect(playerCash.amount).toBe(15_000);
    expect(impacts.some((i) => i.type === "reputation_change")).toBe(true);
  });

  it("records the payout once on the stake even if replayed", () => {
    const ownerCash = { type: "cash_change", entityId: "s1", amount: 60_000 } as unknown as CashImpact;
    const payout = generateRivalStakeImpacts(npcHorse(), 1, race, ownerCash, stake(25), 12).find(
      (i) => i.type === "rival_stake_payout",
    )!;
    const handler = new SyndicationHandler();
    const start = { rivalStakes: { h1: stake(25) } } as unknown as GameState;
    const once = produce(start, (d) => handler.handle(d, payout));
    const twice = produce(once, (d) => handler.handle(d, payout));
    expect(twice.rivalStakes.h1.prizeEarned).toBe(15_000);
    expect(twice.rivalStakes.h1.payouts).toHaveLength(1);
  });

  it("does nothing for horses without a stake", () => {
    const ownerCash = { type: "cash_change", entityId: "s1", amount: 60_000 } as unknown as CashImpact;
    expect(generateRivalStakeImpacts(npcHorse(), 1, race, ownerCash, undefined, 12)).toEqual([]);
    expect(ownerCash.amount).toBe(60_000);
  });
});

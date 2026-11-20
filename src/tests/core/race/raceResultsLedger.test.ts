import { describe, it, expect } from "vitest";
import { buildRaceResults, summarizeRaceResults } from "@/domains/race/simulation/raceResultsLedger";
import { createTestHorse, createTestNpcHorse } from "@/tests/helpers";
import type { Transaction } from "@/domains/transactions/model/transactionTypes";
import type { ReputationEvent } from "@/domains/reputation/model/reputationTypes";

describe("race results ledger", () => {
  const mine = createTestHorse({
    id: "h1",
    raceHistory: [{ raceId: "r1", raceName: "Oaks", position: 2, day: 4, purseEarned: 1125 }],
  });
  const rival = createTestNpcHorse({
    raceHistory: [{ raceId: "r1", raceName: "Oaks", position: 1, day: 4, purseEarned: 5000 }],
  });
  const tx = [
    { subcategory: "entry_fee", amount: -400, raceId: "r1", horseId: "h1" },
    { subcategory: "jockey_fee", amount: -100, raceId: "r1", horseId: "h1" },
    { subcategory: "jockey_fee", amount: -113, raceId: "r1", horseId: "h1" },
  ] as Transaction[];
  const rep = [{ raceId: "r1", horseId: "h1", amount: 3 }] as ReputationEvent[];

  it("lists only my horses with prize minus entry and jockey fees, and prestige", () => {
    const rows = buildRaceResults({ horses: [mine, rival], transactions: tx, reputationEvents: rep });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ prize: 1125, entryFee: 400, jockeyFee: 213, cashNet: 512, prestige: 3 });
  });

  it("totals starts, places, jockey fees and net cash", () => {
    const rows = buildRaceResults({ horses: [mine], transactions: tx, reputationEvents: rep });
    expect(summarizeRaceResults(rows)).toMatchObject({ starts: 1, wins: 0, places: 1, jockeyFees: 213, cashNet: 512 });
  });
});

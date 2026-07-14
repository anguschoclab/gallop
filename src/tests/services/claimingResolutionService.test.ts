import { describe, it, expect } from "vitest";
import { processClaimingResolution } from "@/services/auction/claimingResolutionService";
import { createTestRng, createTestHorse } from "@/tests/helpers";
import { isValidUUID } from "@/core/uuid";
import type { Race, Horse } from "@/game/types";
import type { ClaimingIntent } from "@/core/resolver/intents";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";

const DAY = 10;

function mkRace(overrides?: Partial<Race>): Race {
  return {
    id: "race-1",
    name: "Test Claiming Race",
    day: DAY,
    distance: 1600,
    raceClass: "Claiming",
    entryFee: 300,
    purse: 20000,
    fieldSize: 8,
    entries: [],
    resolved: true,
    claimingPrice: 25000,
    ...overrides,
  } as Race;
}

function mkClaimingIntent(overrides?: Partial<ClaimingIntent>): ClaimingIntent {
  return {
    id: "intent-1",
    entityId: "stable-1",
    source: "npc",
    day: DAY,
    priority: 5,
    type: "claiming",
    raceId: "race-1",
    horseId: "horse-1",
    claimantStableId: "stable-1",
    claimingPrice: 25000,
    ...overrides,
  } as ClaimingIntent;
}

function mkClaimedHorse(id: string, stableId?: string): Horse {
  return createTestHorse({ id, name: `Horse ${id}`, stableId });
}

describe("processClaimingResolution — empty / early return", () => {
  it("empty claimIntents returns empty impacts", () => {
    const race = mkRace();
    const result = processClaimingResolution({
      race,
      claimIntents: [],
      horses: {},
      newDay: DAY,
      rng: createTestRng("empty"),
    });
    expect(result.impacts).toEqual([]);
  });

  it("claims for horses not in race.entries are silently dropped", () => {
    const race = mkRace({ entries: [] });
    const intent = mkClaimingIntent({ horseId: "h-orphan" });
    const result = processClaimingResolution({
      race,
      claimIntents: [intent],
      horses: h2r([mkClaimedHorse("h-orphan", "stable-old")]),
      newDay: DAY,
      rng: createTestRng("orphan"),
    });
    expect(result.impacts).toEqual([]);
  });
});

describe("processClaimingResolution — withdrawn claims", () => {
  it("single withdrawn claim produces cash_change refund + log impact", () => {
    const race = mkRace({
      entries: [
        { horseId: "h1", owned: false, stableId: "stable-old", withdrawnFromClaiming: true },
      ],
    });
    const intent = mkClaimingIntent({
      id: "w-1",
      horseId: "h1",
      claimantStableId: "stable-buyer",
      claimingPrice: 25000,
    });
    const result = processClaimingResolution({
      race,
      claimIntents: [intent],
      horses: h2r([mkClaimedHorse("h1", "stable-old")]),
      newDay: DAY,
      rng: createTestRng("withdrawn-single"),
    });
    expect(result.impacts).toHaveLength(2);
    expect(result.impacts[0].type).toBe("cash_change");
    expect((result.impacts[0] as any).amount).toBe(25000);
    expect((result.impacts[0] as any).entityId).toBe("stable-buyer");
    expect(result.impacts[1].type).toBe("log");
  });

  it("multiple withdrawn claims produce 2 impacts per claim", () => {
    const race = mkRace({
      entries: [
        { horseId: "h1", owned: false, stableId: "s-old", withdrawnFromClaiming: true },
        { horseId: "h2", owned: false, stableId: "s-old", withdrawnFromClaiming: true },
      ],
    });
    const intents = [
      mkClaimingIntent({ id: "w-1", horseId: "h1", claimantStableId: "s-a", claimingPrice: 25000 }),
      mkClaimingIntent({ id: "w-2", horseId: "h2", claimantStableId: "s-b", claimingPrice: 25000 }),
    ];
    const result = processClaimingResolution({
      race,
      claimIntents: intents,
      horses: h2r([mkClaimedHorse("h1", "s-old"), mkClaimedHorse("h2", "s-old")]),
      newDay: DAY,
      rng: createTestRng("withdrawn-multi"),
    });
    expect(result.impacts).toHaveLength(4);
  });

  it("withdrawn claim with undefined claimantStableId defaults entityId to empty string", () => {
    const race = mkRace({
      entries: [{ horseId: "h1", owned: false, stableId: "s-old", withdrawnFromClaiming: true }],
    });
    const intent = mkClaimingIntent({
      id: "w-1",
      horseId: "h1",
      claimantStableId: undefined,
      claimingPrice: 25000,
    });
    const result = processClaimingResolution({
      race,
      claimIntents: [intent],
      horses: h2r([mkClaimedHorse("h1", "s-old")]),
      newDay: DAY,
      rng: createTestRng("withdrawn-no-stable"),
    });
    expect((result.impacts[0] as any).entityId).toBe("");
  });
});

describe("processClaimingResolution — eligible claims (single claimant)", () => {
  const eligibleRace = mkRace({
    entries: [{ horseId: "h1", owned: false, stableId: "stable-old" }],
  });
  const eligibleIntent = mkClaimingIntent({
    id: "c-1",
    horseId: "h1",
    claimantStableId: "stable-buyer",
    claimingPrice: 25000,
  });
  const eligibleHorses = [mkClaimedHorse("h1", "stable-old")];

  it("single eligible claim produces 4 impacts: claiming + payment + proceeds + log", () => {
    const result = processClaimingResolution({
      race: eligibleRace,
      claimIntents: [eligibleIntent],
      horses: eligibleHorses,
      newDay: DAY,
      rng: createTestRng("eligible-single"),
    });
    expect(result.impacts).toHaveLength(4);
    const types = result.impacts.map((i) => i.type);
    expect(types).toContain("claiming");
    expect(types).toContain("cash_change");
    expect(types).toContain("log");
  });

  it("claiming impact has correct fields", () => {
    const result = processClaimingResolution({
      race: eligibleRace,
      claimIntents: [eligibleIntent],
      horses: eligibleHorses,
      newDay: DAY,
      rng: createTestRng("eligible-fields"),
    });
    const claimingImpact = result.impacts.find((i) => i.type === "claiming") as any;
    expect(claimingImpact).toBeDefined();
    expect(claimingImpact.raceId).toBe("race-1");
    expect(claimingImpact.horseId).toBe("h1");
    expect(claimingImpact.fromStableId).toBe("stable-old");
    expect(claimingImpact.toStableId).toBe("stable-buyer");
    expect(claimingImpact.claimingPrice).toBe(25000);
  });

  it("cash_change payment is negative claimingPrice from buyer stable", () => {
    const result = processClaimingResolution({
      race: eligibleRace,
      claimIntents: [eligibleIntent],
      horses: eligibleHorses,
      newDay: DAY,
      rng: createTestRng("eligible-payment"),
    });
    const cashImpacts = result.impacts.filter((i) => i.type === "cash_change") as any[];
    const payment = cashImpacts.find((c) => c.amount < 0);
    expect(payment).toBeDefined();
    expect(payment.amount).toBe(-25000);
    expect(payment.entityId).toBe("stable-buyer");
  });

  it("cash_change proceeds is positive claimingPrice to old stable", () => {
    const result = processClaimingResolution({
      race: eligibleRace,
      claimIntents: [eligibleIntent],
      horses: eligibleHorses,
      newDay: DAY,
      rng: createTestRng("eligible-proceeds"),
    });
    const cashImpacts = result.impacts.filter((i) => i.type === "cash_change") as any[];
    const proceeds = cashImpacts.find((c) => c.amount > 0);
    expect(proceeds).toBeDefined();
    expect(proceeds.amount).toBe(25000);
    expect(proceeds.entityId).toBe("stable-old");
  });
});

describe("processClaimingResolution — multiple claimants same horse", () => {
  const multiRace = mkRace({
    entries: [{ horseId: "h1", owned: false, stableId: "stable-old" }],
  });
  const multiHorses = [mkClaimedHorse("h1", "stable-old")];

  it("two claimants for same horse: exactly one claiming transfer impact", () => {
    const intents = [
      mkClaimingIntent({
        id: "c-a",
        horseId: "h1",
        claimantStableId: "stable-a",
        claimingPrice: 25000,
      }),
      mkClaimingIntent({
        id: "c-b",
        horseId: "h1",
        claimantStableId: "stable-b",
        claimingPrice: 25000,
      }),
    ];
    const result = processClaimingResolution({
      race: multiRace,
      claimIntents: intents,
      horses: multiHorses,
      newDay: DAY,
      rng: createTestRng("multi-claim"),
    });
    const claimingImpacts = result.impacts.filter((i) => i.type === "claiming");
    expect(claimingImpacts).toHaveLength(1);
  });

  it("two claimants same horse: log impacts include outdrawn message for loser", () => {
    const intents = [
      mkClaimingIntent({
        id: "c-a",
        horseId: "h1",
        claimantStableId: "stable-a",
        claimingPrice: 25000,
      }),
      mkClaimingIntent({
        id: "c-b",
        horseId: "h1",
        claimantStableId: "stable-b",
        claimingPrice: 25000,
      }),
    ];
    const result = processClaimingResolution({
      race: multiRace,
      claimIntents: intents,
      horses: multiHorses,
      newDay: DAY,
      rng: createTestRng("multi-log"),
    });
    const logImpacts = result.impacts.filter((i) => i.type === "log") as any[];
    const outdrawnLogs = logImpacts.filter(
      (l) => l.text.includes("outdrawn") || l.text.includes("failed"),
    );
    expect(outdrawnLogs.length).toBeGreaterThanOrEqual(1);
  });

  it("determinism: same RNG seed selects same winner", () => {
    const intents = [
      mkClaimingIntent({
        id: "c-a",
        horseId: "h1",
        claimantStableId: "stable-a",
        claimingPrice: 25000,
      }),
      mkClaimingIntent({
        id: "c-b",
        horseId: "h1",
        claimantStableId: "stable-b",
        claimingPrice: 25000,
      }),
    ];
    const r1 = processClaimingResolution({
      race: multiRace,
      claimIntents: intents,
      horses: multiHorses,
      newDay: DAY,
      rng: createTestRng("det-1"),
    });
    const r2 = processClaimingResolution({
      race: multiRace,
      claimIntents: intents,
      horses: multiHorses,
      newDay: DAY,
      rng: createTestRng("det-1"),
    });
    expect(r1.impacts.map((i) => i.id)).toEqual(r2.impacts.map((i) => i.id));
  });

  it("two claimants same horse: losing claimant gets refund cash_change", () => {
    const intents = [
      mkClaimingIntent({
        id: "c-a",
        horseId: "h1",
        claimantStableId: "stable-a",
        claimingPrice: 25000,
      }),
      mkClaimingIntent({
        id: "c-b",
        horseId: "h1",
        claimantStableId: "stable-b",
        claimingPrice: 25000,
      }),
    ];
    const result = processClaimingResolution({
      race: multiRace,
      claimIntents: intents,
      horses: multiHorses,
      newDay: DAY,
      rng: createTestRng("refund-test"),
    });
    const claimingImpact = result.impacts.find((i) => i.type === "claiming") as any;
    const winningStableId = claimingImpact.toStableId;
    const losingIntentId = winningStableId === "stable-a" ? "c-b" : "c-a";

    const refundImpacts = result.impacts.filter(
      (i) =>
        i.type === "cash_change" && (i as any).amount > 0 && (i as any).intentId === losingIntentId,
    ) as any[];
    expect(refundImpacts).toHaveLength(1);
  });

  it("two claimants same horse: refund amount equals claimingPrice", () => {
    const intents = [
      mkClaimingIntent({
        id: "c-a",
        horseId: "h1",
        claimantStableId: "stable-a",
        claimingPrice: 25000,
      }),
      mkClaimingIntent({
        id: "c-b",
        horseId: "h1",
        claimantStableId: "stable-b",
        claimingPrice: 25000,
      }),
    ];
    const result = processClaimingResolution({
      race: multiRace,
      claimIntents: intents,
      horses: multiHorses,
      newDay: DAY,
      rng: createTestRng("refund-amount"),
    });
    const refundImpacts = result.impacts.filter(
      (i) => i.type === "cash_change" && (i as any).amount > 0 && (i as any).intentId !== "",
    ) as any[];
    expect(refundImpacts).toHaveLength(1);
    expect(refundImpacts[0].amount).toBe(25000);
  });

  it("two claimants same horse: refund entityId matches losing claimant's stableId", () => {
    const intents = [
      mkClaimingIntent({
        id: "c-a",
        horseId: "h1",
        claimantStableId: "stable-a",
        claimingPrice: 25000,
      }),
      mkClaimingIntent({
        id: "c-b",
        horseId: "h1",
        claimantStableId: "stable-b",
        claimingPrice: 25000,
      }),
    ];
    const result = processClaimingResolution({
      race: multiRace,
      claimIntents: intents,
      horses: multiHorses,
      newDay: DAY,
      rng: createTestRng("refund-entity"),
    });
    const claimingImpact = result.impacts.find((i) => i.type === "claiming") as any;
    const winningStableId = claimingImpact.toStableId;
    const losingStableId = winningStableId === "stable-a" ? "stable-b" : "stable-a";

    const refundImpacts = result.impacts.filter(
      (i) => i.type === "cash_change" && (i as any).amount > 0 && (i as any).intentId !== "",
    ) as any[];
    expect(refundImpacts).toHaveLength(1);
    expect(refundImpacts[0].entityId).toBe(losingStableId);
  });

  it("three claimants same horse: two losers get refunds", () => {
    const intents = [
      mkClaimingIntent({
        id: "c-a",
        horseId: "h1",
        claimantStableId: "stable-a",
        claimingPrice: 25000,
      }),
      mkClaimingIntent({
        id: "c-b",
        horseId: "h1",
        claimantStableId: "stable-b",
        claimingPrice: 25000,
      }),
      mkClaimingIntent({
        id: "c-c",
        horseId: "h1",
        claimantStableId: "stable-c",
        claimingPrice: 25000,
      }),
    ];
    const result = processClaimingResolution({
      race: multiRace,
      claimIntents: intents,
      horses: multiHorses,
      newDay: DAY,
      rng: createTestRng("three-claims"),
    });
    const refundImpacts = result.impacts.filter(
      (i) => i.type === "cash_change" && (i as any).amount > 0 && (i as any).intentId !== "",
    ) as any[];
    expect(refundImpacts).toHaveLength(2);
  });

  it("player + NPC claim same horse: loser gets refund", () => {
    const intents = [
      mkClaimingIntent({
        id: "c-player",
        horseId: "h1",
        claimantStableId: undefined,
        claimingPrice: 25000,
      }),
      mkClaimingIntent({
        id: "c-npc",
        horseId: "h1",
        claimantStableId: "stable-a",
        claimingPrice: 25000,
      }),
    ];
    const result = processClaimingResolution({
      race: multiRace,
      claimIntents: intents,
      horses: multiHorses,
      newDay: DAY,
      rng: createTestRng("player-npc"),
    });
    const refundImpacts = result.impacts.filter(
      (i) => i.type === "cash_change" && (i as any).amount > 0 && (i as any).intentId !== "",
    ) as any[];
    expect(refundImpacts).toHaveLength(1);
    const claimingImpact = result.impacts.find((i) => i.type === "claiming") as any;
    const winningStableId = claimingImpact.toStableId;
    const losingIntentId = winningStableId === "stable-a" ? "c-player" : "c-npc";
    expect(refundImpacts[0].intentId).toBe(losingIntentId);
  });

  it("two claimants same horse: claiming impact intentId matches winning claim", () => {
    const intents = [
      mkClaimingIntent({
        id: "c-a",
        horseId: "h1",
        claimantStableId: "stable-a",
        claimingPrice: 25000,
      }),
      mkClaimingIntent({
        id: "c-b",
        horseId: "h1",
        claimantStableId: "stable-b",
        claimingPrice: 25000,
      }),
    ];
    const result = processClaimingResolution({
      race: multiRace,
      claimIntents: intents,
      horses: multiHorses,
      newDay: DAY,
      rng: createTestRng("intent-match"),
    });
    const claimingImpact = result.impacts.find((i) => i.type === "claiming") as any;
    const winningStableId = claimingImpact.toStableId;
    const winningIntentId = winningStableId === "stable-a" ? "c-a" : "c-b";
    expect(claimingImpact.intentId).toBe(winningIntentId);
  });

  it("two claimants same horse: winning intentId is not the losing claim's id", () => {
    const intents = [
      mkClaimingIntent({
        id: "c-a",
        horseId: "h1",
        claimantStableId: "stable-a",
        claimingPrice: 25000,
      }),
      mkClaimingIntent({
        id: "c-b",
        horseId: "h1",
        claimantStableId: "stable-b",
        claimingPrice: 25000,
      }),
    ];
    const result = processClaimingResolution({
      race: multiRace,
      claimIntents: intents,
      horses: multiHorses,
      newDay: DAY,
      rng: createTestRng("intent-negative"),
    });
    const claimingImpact = result.impacts.find((i) => i.type === "claiming") as any;
    const winningStableId = claimingImpact.toStableId;
    const losingIntentId = winningStableId === "stable-a" ? "c-b" : "c-a";
    expect(claimingImpact.intentId).not.toBe(losingIntentId);
  });
});

describe("processClaimingResolution — race not resolved / no claimingPrice", () => {
  it("resolved: false → processClaims returns empty, all eligible claims become losing refunds", () => {
    const race = mkRace({
      resolved: false,
      entries: [{ horseId: "h1", owned: false, stableId: "stable-old" }],
    });
    const intent = mkClaimingIntent({
      id: "c-1",
      horseId: "h1",
      claimantStableId: "stable-buyer",
      claimingPrice: 25000,
    });
    const result = processClaimingResolution({
      race,
      claimIntents: [intent],
      horses: h2r([mkClaimedHorse("h1", "stable-old")]),
      newDay: DAY,
      rng: createTestRng("not-resolved"),
    });
    const claimingImpacts = result.impacts.filter((i) => i.type === "claiming");
    expect(claimingImpacts).toHaveLength(0);
    const refundImpacts = result.impacts.filter(
      (i) => i.type === "cash_change" && (i as any).amount > 0,
    );
    expect(refundImpacts.length).toBeGreaterThanOrEqual(1);
  });

  it("claimingPrice: undefined → same behavior as not resolved", () => {
    const race = mkRace({
      claimingPrice: undefined,
      entries: [{ horseId: "h1", owned: false, stableId: "stable-old" }],
    });
    const intent = mkClaimingIntent({
      id: "c-1",
      horseId: "h1",
      claimantStableId: "stable-buyer",
      claimingPrice: 25000,
    });
    const result = processClaimingResolution({
      race,
      claimIntents: [intent],
      horses: h2r([mkClaimedHorse("h1", "stable-old")]),
      newDay: DAY,
      rng: createTestRng("no-price"),
    });
    const claimingImpacts = result.impacts.filter((i) => i.type === "claiming");
    expect(claimingImpacts).toHaveLength(0);
  });
});

describe("processClaimingResolution — horse edge cases", () => {
  it("horse not in horses array → claim becomes losing refund", () => {
    const race = mkRace({
      entries: [{ horseId: "h1", owned: false, stableId: "stable-old" }],
    });
    const intent = mkClaimingIntent({
      id: "c-1",
      horseId: "h1",
      claimantStableId: "stable-buyer",
      claimingPrice: 25000,
    });
    const result = processClaimingResolution({
      race,
      claimIntents: [intent],
      horses: {},
      newDay: DAY,
      rng: createTestRng("horse-missing"),
    });
    const claimingImpacts = result.impacts.filter((i) => i.type === "claiming");
    expect(claimingImpacts).toHaveLength(0);
    const refundImpacts = result.impacts.filter(
      (i) => i.type === "cash_change" && (i as any).amount > 0,
    );
    expect(refundImpacts.length).toBeGreaterThanOrEqual(1);
  });

  it("horse with stableId: undefined → claim becomes losing refund", () => {
    const race = mkRace({
      entries: [{ horseId: "h1", owned: false, stableId: undefined }],
    });
    const intent = mkClaimingIntent({
      id: "c-1",
      horseId: "h1",
      claimantStableId: "stable-buyer",
      claimingPrice: 25000,
    });
    const result = processClaimingResolution({
      race,
      claimIntents: [intent],
      horses: h2r([mkClaimedHorse("h1", undefined)]),
      newDay: DAY,
      rng: createTestRng("no-stable"),
    });
    const claimingImpacts = result.impacts.filter((i) => i.type === "claiming");
    expect(claimingImpacts).toHaveLength(0);
  });
});

describe("processClaimingResolution — mixed scenarios", () => {
  it("1 withdrawn + 1 eligible (different horses) produces both refund and transfer impacts", () => {
    const race = mkRace({
      entries: [
        { horseId: "h-w", owned: false, stableId: "s-old-w", withdrawnFromClaiming: true },
        { horseId: "h-e", owned: false, stableId: "s-old-e" },
      ],
    });
    const intents = [
      mkClaimingIntent({
        id: "w-1",
        horseId: "h-w",
        claimantStableId: "s-buyer-w",
        claimingPrice: 25000,
      }),
      mkClaimingIntent({
        id: "c-1",
        horseId: "h-e",
        claimantStableId: "s-buyer-e",
        claimingPrice: 25000,
      }),
    ];
    const result = processClaimingResolution({
      race,
      claimIntents: intents,
      horses: h2r([mkClaimedHorse("h-w", "s-old-w"), mkClaimedHorse("h-e", "s-old-e")]),
      newDay: DAY,
      rng: createTestRng("mixed"),
    });
    const hasRefund = result.impacts.some(
      (i) => i.type === "cash_change" && (i as any).amount > 0 && (i as any).intentId === "w-1",
    );
    const hasClaiming = result.impacts.some((i) => i.type === "claiming");
    expect(hasRefund).toBe(true);
    expect(hasClaiming).toBe(true);
  });

  it("impact ordering: withdrawn refunds come before transfer impacts", () => {
    const race = mkRace({
      entries: [
        { horseId: "h-w", owned: false, stableId: "s-old-w", withdrawnFromClaiming: true },
        { horseId: "h-e", owned: false, stableId: "s-old-e" },
      ],
    });
    const intents = [
      mkClaimingIntent({
        id: "w-1",
        horseId: "h-w",
        claimantStableId: "s-buyer-w",
        claimingPrice: 25000,
      }),
      mkClaimingIntent({
        id: "c-1",
        horseId: "h-e",
        claimantStableId: "s-buyer-e",
        claimingPrice: 25000,
      }),
    ];
    const result = processClaimingResolution({
      race,
      claimIntents: intents,
      horses: h2r([mkClaimedHorse("h-w", "s-old-w"), mkClaimedHorse("h-e", "s-old-e")]),
      newDay: DAY,
      rng: createTestRng("mixed-order"),
    });
    const firstClaimingIndex = result.impacts.findIndex((i) => i.type === "claiming");
    const lastWithdrawnRefundIndex =
      result.impacts
        .map((i, idx) => ({ i, idx }))
        .filter(({ i }) => i.type === "cash_change" && (i as any).intentId === "w-1")
        .pop()?.idx ?? -1;
    expect(lastWithdrawnRefundIndex).toBeLessThan(firstClaimingIndex);
  });
});

describe("processClaimingResolution — impact structure validation", () => {
  it("all impacts have correct day, phase, and valid UUID id", () => {
    const race = mkRace({
      entries: [{ horseId: "h1", owned: false, stableId: "stable-old" }],
    });
    const intent = mkClaimingIntent({
      id: "c-1",
      horseId: "h1",
      claimantStableId: "stable-buyer",
      claimingPrice: 25000,
    });
    const result = processClaimingResolution({
      race,
      claimIntents: [intent],
      horses: h2r([mkClaimedHorse("h1", "stable-old")]),
      newDay: DAY,
      rng: createTestRng("structure"),
    });
    for (const impact of result.impacts) {
      expect(impact.day).toBe(DAY);
      expect(impact.phase).toBe("raceResolution");
      expect(isValidUUID(impact.id)).toBe(true);
    }
  });

  it("all impact IDs are unique within a single call", () => {
    const race = mkRace({
      entries: [
        { horseId: "h-w", owned: false, stableId: "s-old-w", withdrawnFromClaiming: true },
        { horseId: "h-e", owned: false, stableId: "s-old-e" },
      ],
    });
    const intents = [
      mkClaimingIntent({
        id: "w-1",
        horseId: "h-w",
        claimantStableId: "s-buyer-w",
        claimingPrice: 25000,
      }),
      mkClaimingIntent({
        id: "c-1",
        horseId: "h-e",
        claimantStableId: "s-buyer-e",
        claimingPrice: 25000,
      }),
    ];
    const result = processClaimingResolution({
      race,
      claimIntents: intents,
      horses: h2r([mkClaimedHorse("h-w", "s-old-w"), mkClaimedHorse("h-e", "s-old-e")]),
      newDay: DAY,
      rng: createTestRng("unique-ids"),
    });
    const ids = result.impacts.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

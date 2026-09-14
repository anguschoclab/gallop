import { describe, it, expect, vi } from "vitest";
import { resolveClaimingResolution } from "@/core/auction/claimingResolutionService";
import type { Race, Horse } from "@/game/types";
import type { ClaimingIntent } from "@/core/resolver/intents";
import { createRng } from "@/core/common/rng";
import { createTestHorse } from "@/tests/helpers";

function mkRace(
  entries: { horseId: string; withdrawnFromClaiming?: boolean }[],
  claimingPrice = 10000,
): Race {
  return {
    id: "r1",
    name: "Claiming Race",
    day: 10,
    claimingPrice,
    resolved: true,
    entries: entries.map((e) => ({
      horseId: e.horseId,
      withdrawnFromClaiming: !!e.withdrawnFromClaiming,
    })),
  } as unknown as Race;
}

describe("resolveClaimingResolution", () => {
  it("should process withdrawn claims and return refunds", () => {
    const rng = createRng("test-seed");
    const horse = createTestHorse({ id: "h1", name: "Claimed Horse" });
    const race = mkRace([{ horseId: "h1", withdrawnFromClaiming: true }]);
    const claimIntents: ClaimingIntent[] = [
      {
        id: "intent1",
        type: "claiming",
        horseId: "h1",
        claimantStableId: "stable1",
        claimingPrice: 10000,
        raceId: "r1",
        entityId: "stable1",
        source: "player",
        day: 10,
        priority: 1,
      },
    ];

    const { impacts } = resolveClaimingResolution({
      race,
      claimIntents,
      horses: [horse],
      newDay: 11,
      rng,
    });

    // Should have a refund cash impact and a log impact
    expect(impacts).toHaveLength(2);
    expect(
      impacts.some(
        (i) => i.type === "cash_change" && i.amount === 10000 && i.entityId === "stable1",
      ),
    ).toBe(true);
    expect(impacts.some((i) => i.type === "log" && i.text.includes("withdrawn"))).toBe(true);
  });

  it("should process successful claims and losing claimant refunds", () => {
    const rng = createRng("test-seed");
    // Using a mocked rng to deterministically pick the winner if there are multiple
    vi.spyOn(rng, "int").mockReturnValue(0); // Winner is first intent

    const horse = createTestHorse({ id: "h1", name: "Claimed Horse" });
    const race = mkRace([{ horseId: "h1" }]);
    const claimIntents: ClaimingIntent[] = [
      {
        id: "intent1",
        type: "claiming",
        horseId: "h1",
        claimantStableId: "stable1",
        claimingPrice: 10000,
        raceId: "r1",
        entityId: "stable1",
        source: "player",
        day: 10,
        priority: 1,
      },
      {
        id: "intent2",
        type: "claiming",
        horseId: "h1",
        claimantStableId: "stable2",
        claimingPrice: 10000,
        raceId: "r1",
        entityId: "stable2",
        source: "player",
        day: 10,
        priority: 1,
      },
    ];

    const { impacts } = resolveClaimingResolution({
      race,
      claimIntents,
      horses: [horse],
      newDay: 11,
      rng,
    });

    // Impacts should include:
    // 1. Claiming transfer (claiming)
    // 2. Winner cash deduction (-10000)
    // 3. Loser cash refund (+10000 for fromStableId if owned, but unowned here, still generates impact)
    // 4. Logs
    // 5. Loser refund (+10000 for stable2)

    const claimingImpacts = impacts.filter((i) => i.type === "claiming");
    expect(claimingImpacts).toHaveLength(1);
    expect(claimingImpacts[0]).toMatchObject({ toStableId: "stable1" });

    const refundImpacts = impacts.filter(
      (i) => i.type === "cash_change" && i.amount === 10000 && i.entityId === "stable2",
    );
    expect(refundImpacts).toHaveLength(1);

    vi.restoreAllMocks();
  });
});

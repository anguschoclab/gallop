import { describe, it, expect } from "vitest";
import { resolveClaimingResolution } from "@/domains/auction/simulation/claimingResolutionService";
import type { Race } from "@/platform/game/types";
import type { ClaimResolutionInput } from "@/domains/market/simulation/claimingImpacts";
import { createRng } from "@/shared/common/rng";
import { createTestHorse } from "@/tests/helpers";
import { makeNpcOwned } from "@/domains/horse/simulation/ownership";
import { asNpcStableId } from "@/shared/types/branded";

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
    entries: entries.map((entry) => ({
      horseId: entry.horseId,
      ownership: makeNpcOwned(asNpcStableId("stable0")),
      withdrawnFromClaiming: !!entry.withdrawnFromClaiming,
    })),
  } as unknown as Race;
}

function mkClaim(overrides?: Partial<ClaimResolutionInput>): ClaimResolutionInput {
  return {
    id: "claim-1",
    horseId: "h1",
    claimantStableId: "stable1",
    price: 10000,
    ...overrides,
  };
}

function resolve(race: Race, claims: ClaimResolutionInput[]) {
  return resolveClaimingResolution({
    race,
    claims,
    horses: [createTestHorse({ id: "h1", name: "Claimed Horse" })],
    newDay: 11,
    rng: createRng("test-seed"),
    playerCash: 100000,
    stableCash: new Map([
      ["stable1", 100000],
      ["stable2", 100000],
    ]),
  });
}

describe("resolveClaimingResolution", () => {
  it("voids a withdrawn claim without a cash refund", () => {
    const { impacts } = resolve(mkRace([{ horseId: "h1", withdrawnFromClaiming: true }]), [
      mkClaim(),
    ]);

    expect(impacts).toHaveLength(1);
    expect(impacts[0]).toMatchObject({ type: "log" });
    expect((impacts[0] as { text: string }).text).toContain("withdrawn");
  });

  it("settles one winner and emits no losing-claimant refund", () => {
    const { impacts, transfers, losingClaims } = resolve(mkRace([{ horseId: "h1" }]), [
      mkClaim({ id: "claim-1", claimantStableId: "stable1" }),
      mkClaim({ id: "claim-2", claimantStableId: "stable2" }),
    ]);

    expect(transfers).toHaveLength(1);
    expect(losingClaims).toHaveLength(1);
    expect(impacts.filter((impact) => impact.type === "claiming")).toHaveLength(1);
    expect(
      impacts.some(
        (impact) =>
          impact.type === "cash_change" &&
          (impact as any).entityId === losingClaims[0].claimantStableId &&
          (impact as any).amount > 0,
      ),
    ).toBe(false);
  });
});

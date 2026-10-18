import { describe, expect, it } from "vitest";
import { resolveClaimingResolution } from "@/domains/auction/simulation/claimingResolutionService";;
import { createTestHorse, createTestRng } from "@/tests/helpers";
import { isValidUUID } from "@/shared/uuid/uuid";
import type { Horse, Race } from "@/platform/game/types";
import type { ClaimResolutionInput } from "@/domains/market/simulation/claimingImpacts";
import { asNpcStableId } from "@/shared/types/branded";
import { makeNpcOwned, makeUnowned } from "@/domains/horse/simulation/ownership";

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

function mkClaim(overrides?: Partial<ClaimResolutionInput>): ClaimResolutionInput {
  return {
    id: "claim-1",
    horseId: "horse-1",
    claimantStableId: "stable-1" as any,
    price: 25000,
    ...overrides,
  };
}

function mkClaimedHorse(id: string, stableId?: string): Horse {
  return createTestHorse({
    id,
    name: `Horse ${id}`,
    ownership: stableId ? makeNpcOwned(asNpcStableId(stableId)) : makeUnowned(),
  });
}

function resolve(race: Race, claims: ClaimResolutionInput[], horses: Horse[]) {
  return resolveClaimingResolution({
    race,
    claims,
    horses,
    newDay: DAY,
    rng: createTestRng("claim-resolution"),
    playerCash: 1_000_000,
    stableCash: new Map([
      ["stable-1", 1_000_000],
      ["stable-buyer", 1_000_000],
      ["stable-a", 1_000_000],
      ["stable-b", 1_000_000],
      ["stable-c", 1_000_000],
      ["s-a", 1_000_000],
      ["s-b", 1_000_000],
      ["s-buyer", 1_000_000],
      ["s-buyer-w", 1_000_000],
      ["s-buyer-e", 1_000_000],
      ["s-buyer-1", 1_000_000],
      ["s-buyer-2", 1_000_000],
      ["s-a1", 1_000_000],
      ["s-b1", 1_000_000],
      ["s-a2", 1_000_000],
      ["s-b2", 1_000_000],
    ]),
  });
}

describe("resolveClaimingResolution", () => {
  it("returns empty output when no claims are persisted", () => {
    const result = resolve(mkRace(), [], []);
    expect(result.impacts).toEqual([]);
    expect(result.transfers).toEqual([]);
  });

  it("voids claims for horses that are not entered", () => {
    const result = resolve(
      mkRace({ entries: [] }),
      [mkClaim({ horseId: "h-orphan" })],
      [mkClaimedHorse("h-orphan", "stable-old")],
    );
    expect(result.impacts).toEqual([]);
    expect(result.voidedClaims).toHaveLength(1);
  });

  it("voids a withdrawn claim without a cash refund", () => {
    const race = mkRace({
      entries: [
        {
          horseId: "h1",
          ownership: makeNpcOwned(asNpcStableId("stable-old")),
          withdrawnFromClaiming: true,
        },
      ],
    });
    const result = resolve(
      race,
      [mkClaim({ id: "w-1", horseId: "h1", claimantStableId: "stable-buyer" as any })],
      [mkClaimedHorse("h1", "stable-old")],
    );

    expect(result.impacts).toHaveLength(1);
    expect(result.impacts[0]).toMatchObject({
      type: "log",
      phase: "claimResolution",
      intentId: "w-1",
    });
    expect(result.impacts.some((impact) => impact.type === "cash_change")).toBe(false);
    expect(result.withdrawnClaims).toHaveLength(1);
  });

  it("settles an eligible claim with one transfer, one payment, and one proceeds impact", () => {
    const race = mkRace({
      entries: [{ horseId: "h1", ownership: makeNpcOwned(asNpcStableId("stable-old")) }],
    });
    const result = resolve(
      race,
      [mkClaim({ id: "c-1", horseId: "h1", claimantStableId: "stable-buyer" as any })],
      [mkClaimedHorse("h1", "stable-old")],
    );

    expect(result.transfers).toHaveLength(1);
    expect(result.impacts).toHaveLength(4);
    expect(result.impacts.map((impact) => impact.type)).toEqual([
      "claiming",
      "cash_change",
      "cash_change",
      "log",
    ]);
    expect(result.impacts[0]).toMatchObject({
      type: "claiming",
      intentId: "c-1",
      raceId: "race-1",
      horseId: "h1",
      fromStableId: "stable-old",
      toStableId: "stable-buyer",
      claimingPrice: 25000,
    });
    expect(result.impacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "cash_change",
          entityId: "stable-buyer",
          amount: -25000,
        }),
        expect.objectContaining({
          type: "cash_change",
          entityId: "stable-old",
          amount: 25000,
        }),
      ]),
    );
  });

  it("selects exactly one winner for multiple claims and emits no loser refunds", () => {
    const race = mkRace({
      entries: [{ horseId: "h1", ownership: makeNpcOwned(asNpcStableId("stable-old")) }],
    });
    const claims = [
      mkClaim({ id: "c-a", horseId: "h1", claimantStableId: "stable-a" as any }),
      mkClaim({ id: "c-b", horseId: "h1", claimantStableId: "stable-b" as any }),
    ];
    const first = resolve(race, claims, [mkClaimedHorse("h1", "stable-old")]);
    const second = resolve(race, claims, [mkClaimedHorse("h1", "stable-old")]);

    expect(first.transfers).toHaveLength(1);
    expect(first.losingClaims).toHaveLength(1);
    expect(first.impacts.filter((impact) => impact.type === "claiming")).toHaveLength(1);
    const loser = first.losingClaims[0].claimantStableId;
    expect(
      first.impacts.some(
        (impact) =>
          impact.type === "cash_change" &&
          (impact as any).entityId === loser &&
          (impact as any).amount > 0,
      ),
    ).toBe(false);
    expect(first.impacts.map((impact) => impact.id)).toEqual(
      second.impacts.map((impact) => impact.id),
    );
  });

  it("marks unaffordable claims as failures without transfer or cash impacts", () => {
    const race = mkRace({
      entries: [{ horseId: "h1", ownership: makeNpcOwned(asNpcStableId("stable-old")) }],
    });
    const result = resolveClaimingResolution({
      race,
      claims: [mkClaim({ id: "poor", horseId: "h1", claimantStableId: "stable-a" as any })],
      horses: [mkClaimedHorse("h1", "stable-old")],
      newDay: DAY,
      rng: createTestRng("poor"),
      playerCash: 1_000_000,
      stableCash: new Map([["stable-a", 100]]),
    });

    expect(result.transfers).toEqual([]);
    expect(result.unaffordableClaims).toHaveLength(1);
    expect(result.impacts).toHaveLength(1);
    expect(result.impacts[0].type).toBe("log");
  });

  it("does not transfer when the race is unresolved or has no claiming price", () => {
    const claim = mkClaim({ horseId: "h1", claimantStableId: "stable-buyer" as any });
    const entry = { horseId: "h1", ownership: makeNpcOwned(asNpcStableId("stable-old")) };
    for (const race of [
      mkRace({ resolved: false, entries: [entry] }),
      mkRace({ claimingPrice: undefined, entries: [entry] }),
    ]) {
      const result = resolve(race, [claim], [mkClaimedHorse("h1", "stable-old")]);
      expect(result.transfers).toEqual([]);
      expect(result.impacts.filter((impact) => impact.type === "claiming")).toEqual([]);
    }
  });

  it("handles an unowned source horse without inventing a seller", () => {
    const race = mkRace({
      entries: [{ horseId: "h1", ownership: makeUnowned() }],
    });
    const result = resolve(
      race,
      [mkClaim({ id: "c-1", horseId: "h1", claimantStableId: "stable-buyer" as any })],
      [mkClaimedHorse("h1")],
    );
    expect(result.transfers).toHaveLength(1);
    expect(result.impacts[0]).toMatchObject({
      type: "claiming",
      fromStableId: "",
      toStableId: "stable-buyer",
    });
  });

  it("separates withdrawn and eligible claims across different horses", () => {
    const race = mkRace({
      entries: [
        {
          horseId: "h-w",
          ownership: makeNpcOwned(asNpcStableId("s-old-w")),
          withdrawnFromClaiming: true,
        },
        { horseId: "h-e", ownership: makeNpcOwned(asNpcStableId("s-old-e")) },
      ],
    });
    const result = resolve(
      race,
      [
        mkClaim({ id: "w-1", horseId: "h-w", claimantStableId: "s-buyer-w" as any }),
        mkClaim({ id: "c-1", horseId: "h-e", claimantStableId: "s-buyer-e" as any }),
      ],
      [mkClaimedHorse("h-w", "s-old-w"), mkClaimedHorse("h-e", "s-old-e")],
    );

    expect(result.withdrawnClaims).toHaveLength(1);
    expect(result.transfers).toHaveLength(1);
    expect(
      result.impacts.some(
        (impact) =>
          impact.type === "cash_change" &&
          (impact as any).entityId === "s-buyer-w" &&
          (impact as any).amount > 0,
      ),
    ).toBe(false);
  });

  it("emits deterministic, uniquely identified impacts in the claim-resolution phase", () => {
    const race = mkRace({
      entries: [{ horseId: "h1", ownership: makeNpcOwned(asNpcStableId("stable-old")) }],
    });
    const result = resolve(
      race,
      [mkClaim({ id: "c-1", horseId: "h1", claimantStableId: "stable-buyer" as any })],
      [mkClaimedHorse("h1", "stable-old")],
    );

    const ids = result.impacts.map((impact) => impact.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const impact of result.impacts) {
      expect(impact.day).toBe(DAY);
      expect(impact.phase).toBe("claimResolution");
      expect(isValidUUID(impact.id)).toBe(true);
    }
  });
});

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NpcSyndicateIntentPanel } from "@/components/market/NpcSyndicateIntentPanel";
import type { Horse, Stable } from "@/game/types";
import type { Syndicate } from "@/core/breeding/types";
import { createTestStable } from "@/tests/helpers/createTestStable";
import { makePlayerOwned } from "@/core/horse/ownership";

function makeStallion(g1Wins: number): Horse {
  return {
    id: "stallion1",
    name: "Champ",
    gender: "horse",
    age: 8,
    potential: 85,
    fame: 60,
    lifetimeEarnings: 4_000_000,
    ownership: makePlayerOwned(),
    stud: { atStud: true, standingFee: 50000, bookSize: 50, seasonBookings: 20 },
    raceHistory: Array.from({ length: g1Wins }, (_, i) => ({
      raceId: `r${i}`,
      raceName: "Big One",
      position: 1,
      day: 100 + i,
      grade: "G1",
    })),
  } as unknown as Horse;
}

function makeSyndicate(overrides: Partial<Syndicate> = {}): Syndicate {
  return {
    id: "syn1",
    stallionId: "stallion1",
    stallionName: "Champ",
    totalShares: 40,
    sharePrice: 10_000,
    studFee: 50_000,
    lifetimeEarnings: 1_000_000,
    shareHolders: { player: 20 },
    ...overrides,
  } as unknown as Syndicate;
}

function makeStable(
  personality: Stable["personality"],
  cash: number,
  id: string,
  name: string,
): Stable {
  return createTestStable({ id, personality, cash, name });
}

afterEach(() => cleanup());

describe("NpcSyndicateIntentPanel", () => {
  it("shows counteroffer acceptance range when offeredShares is set", () => {
    const syndicate = makeSyndicate({ shareHolders: { player: 20 } });
    const stallion = makeStallion(2);
    const npcStables = [
      makeStable("aggressive", 50_000_000, "npc1", "Powerhouse Stables"),
    ];
    render(
      <NpcSyndicateIntentPanel
        syndicate={syndicate}
        stallion={stallion}
        npcStables={npcStables}
        offeredShares={3}
      />,
    );
    // Should show "Offer 3 → accepts 1–N" for the within-range rival
    expect(screen.getByText(/Offer 3 →/)).toBeTruthy();
    expect(screen.getByText(/Within range/)).toBeTruthy();
  });

  it("shows over-budget note when offered shares exceed the NPC's budget", () => {
    const syndicate = makeSyndicate({ shareHolders: { player: 20 } });
    const stallion = makeStallion(2);
    const npcStables = [
      makeStable("conservative", 1_000_000, "npc1", "Cautious Stables"),
    ];
    render(
      <NpcSyndicateIntentPanel
        syndicate={syndicate}
        stallion={stallion}
        npcStables={npcStables}
        offeredShares={100}
      />,
    );
    expect(screen.getByText(/Exceeds budget/)).toBeTruthy();
  });

  it("does not show counteroffer guidance when offeredShares is not set", () => {
    const syndicate = makeSyndicate({ shareHolders: { player: 20 } });
    const stallion = makeStallion(2);
    const npcStables = [
      makeStable("aggressive", 50_000_000, "npc1", "Powerhouse Stables"),
    ];
    render(
      <NpcSyndicateIntentPanel
        syndicate={syndicate}
        stallion={stallion}
        npcStables={npcStables}
      />,
    );
    expect(screen.queryByText(/Offer \d+ →/)).toBeNull();
  });
});

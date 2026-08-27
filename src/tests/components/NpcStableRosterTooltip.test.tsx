import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { NpcStableRosterTab } from "@/components/stable/NpcStableRosterTab";
import type { Horse, Stable, PrivateSaleOffer } from "@/game/types";
import { createTestNpcHorse } from "@/tests/helpers/createTestHorse";
import { makeNpcOwned } from "@/core/horse/ownership";
import { asNpcStableId, asHorseId, asStableId } from "@/core/types/branded";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, params }: any) => <a href={to}>{children}</a>,
}));

const mkHorse = (overrides: Partial<Horse> = {}): Horse =>
  createTestNpcHorse({
    id: asHorseId("horse-1"),
    name: "Thunder",
    ownership: makeNpcOwned(asNpcStableId("stable-1")),
    fame: 60,
    potential: 90,
    careerStarts: 10,
    careerWins: 7,
    lifetimeEarnings: 500_000,
    fanCount: 1000,
    ...overrides,
  });

const mkStable = (overrides: Partial<Stable> = {}): Stable =>
  ({
    id: "stable-1",
    name: "Green Acres",
    owner: "NPC",
    tier: "mid",
    reputation: 50,
    founded: 1,
    cash: 100000,
    horses: ["horse-1"],
    isMajor: false,
    colors: { primary: "#000", secondary: "#fff" },
    personality: "aggressive",
    staff: {} as any,
    outposts: [],
    ...overrides,
  }) as Stable;

function mkPageData(overrides: any = {}) {
  return {
    stable: mkStable(),
    stableHorses: [mkHorse()],
    activeHorses: [mkHorse()],
    colts: [],
    fillies: [],
    friction: 0,
    headToHead: { wins: 0, losses: 0 },
    grudgeMatches: [],
    awards: [],
    day: 10,
    cash: 200000,
    privateSaleOffers: [] as PrivateSaleOffer[],
    scoutHorse: vi.fn(),
    respondToPrivateSale: vi.fn(),
    setOfferHorse: vi.fn(),
    horses: {},
    news: [],
    ...overrides,
  };
}

describe("NpcStableRosterTab tooltip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("protected horse shows attachment tooltip on roster", () => {
    const horse = mkHorse({
      fame: 30,
      potential: 75,
      careerStarts: 8,
      careerWins: 4,
      lifetimeEarnings: 100_000,
      fanCount: 400,
    });
    const pageData = mkPageData({ stableHorses: [horse] });
    const { container } = render(<NpcStableRosterTab pageData={pageData} />);

    // The attachment label text should be present (not "available")
    expect(container.textContent).not.toContain("Available");

    // A tooltip trigger should wrap the attachment text
    const tooltipTriggers = container.querySelectorAll("button, [role='button']");
    expect(tooltipTriggers.length).toBeGreaterThan(0);
  });

  it("available horse does not show attachment tooltip", () => {
    // Horse with minimal stats → available tier (score < 26)
    const horse = mkHorse({
      fame: 0,
      potential: 50,
      careerStarts: 0,
      careerWins: 0,
      lifetimeEarnings: 0,
      fanCount: 0,
    });
    const pageData = mkPageData({ stableHorses: [horse] });
    const { container } = render(<NpcStableRosterTab pageData={pageData} />);

    // The "Protected" label should NOT be present for available tier
    expect(container.textContent).not.toContain("Protected");
    expect(container.textContent).not.toContain("Valued");
  });
});

import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import type { Horse } from "@/game/types";
import type { useNpcStableDetail } from "@/hooks/stable/useNpcStableDetail";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock("@/hooks/horse/useHorseCard", () => ({
  useHorseCard: () => ({
    ovr: 70,
    simpleHorseCards: false,
    scoutStatus: { label: "Fully Scouted", icon: "✓", color: "text-success" },
    displayStats: {
      stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
      overallEstimate: 70,
    },
    genderColor: "text-blue-400",
    gradeColor: () => "text-gold",
    sparklineData: [],
  }),
}));

vi.mock("@/core/npc/scouting", () => ({
  calculateScoutCost: () => 100,
  getDisplayableStats: () => ({
    stats: { speed: 70, stamina: 70, acceleration: 70, consistency: 70 },
    overallEstimate: 70,
  }),
  getScoutStatus: () => ({ label: "Fully Scouted", icon: "✓", color: "text-success" }),
}));

vi.mock("@/core/horse/stats", () => ({
  calculateOverallRating: () => 70,
}));

vi.mock("@/core/horse/grading", () => ({
  scoutGrade: () => "B+",
}));

vi.mock("@/core/common/uiTokens", () => ({
  statGradeColor: () => "text-gold",
}));

vi.mock("@/core/horse/gender", () => ({
  genderSymbol: () => "♂",
  isMaleHorse: () => true,
}));

vi.mock("@/core/horse/uiHelpers", () => ({
  getCoatColor: () => "#000000",
  getInjuryColor: () => "text-cream/40",
  getInjuryLabel: () => "Low",
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { NpcStableRosterTab } from "@/components/stable/NpcStableRosterTab";

const mkHorse = (overrides: Partial<Horse> = {}): Horse =>
  ({
    id: "h1",
    name: "Thunder",
    age: 3,
    gender: "colt",
    energy: 80,
    peakingIndex: 0,
    form: 50,
    potential: 75,
    fame: 10,
    stats: {
      speed: 70,
      stamina: 70,
      acceleration: 70,
      temperament: 70,
      durability: 70,
      consistency: 70,
    } as any,
    surfaceAptitude: { Turf: 1.0, Dirt: 0.9, Synthetic: 0.95 },
    distanceAptitude: 1600,
    raceHistory: [],
    ownership: { type: "npc", stableId: asNpcStableId("npc1") },
    silk: { primary: "#ff0000", secondary: "#00ff00" } as any,
    ...overrides,
  }) as Horse;

const mkPageData = (overrides: any = {}): ReturnType<typeof useNpcStableDetail> => ({
  stable: {
    id: "npc1",
    name: "Test Stable",
    country: "USA",
    personality: "bold_approach",
    cash: 100000,
    colors: { primary: "#ff0000", secondary: "#00ff00" },
    staff: {},
    reputation: 50,
    founded: 2020,
  } as any,
  stableHorses: [mkHorse()],
  day: 10,
  cash: 50000,
  privateSaleOffers: [],
  scoutHorse: vi.fn(() => ({ success: true, message: "Scouted" })),
  respondToPrivateSale: vi.fn(),
  setOfferHorse: vi.fn(),
  offerHorse: null,
  horses: {},
  ...overrides,
});

describe("NpcStableRosterTab responsive layout", () => {
  it("button container div has flex-wrap class", () => {
    const { container } = render(<NpcStableRosterTab pageData={mkPageData()} />);
    const buttonRow = container.querySelector(".mt-2.flex");
    expect(buttonRow).toBeTruthy();
    expect(buttonRow!.className).toContain("flex-wrap");
  });

  it("card wrapper div has min-w-0 class", () => {
    const { container } = render(<NpcStableRosterTab pageData={mkPageData()} />);
    const cardWrapper = container.querySelector(".relative.group");
    expect(cardWrapper).toBeTruthy();
    expect(cardWrapper!.className).toContain("min-w-0");
  });
});

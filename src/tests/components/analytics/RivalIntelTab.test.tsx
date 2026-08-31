import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RivalIntelTab } from "@/components/analytics/RivalIntelTab";

// Mock reused components that call useGame internally
vi.mock("@/components/analytics/EconomicIndicators", () => ({
  EconomicIndicators: () => <div data-testid="economic-indicators">Economic Indicators</div>,
}));

vi.mock("@/components/briefing/StorylinesTab", () => ({
  StorylinesTab: () => <div data-testid="storylines-tab">Active Storylines</div>,
}));

// Mock the store hook
vi.mock("@/game/store", () => ({
  useGameWithShallow: vi.fn((selector: (s: any) => any) =>
    selector({
      npcAIManager: {
        difficultyModulator: {
          playerWinRate: 0.35,
          npcCompetenceMultiplier: 1.1,
          lastAdjustmentDay: 100,
          playerWins: 7,
          playerEntries: 20,
        },
        previousDifficultyMultiplier: 1.0,
        activeCartels: [{ id: "c1", memberStableIds: ["s1", "s2"], type: "breeding" as const }],
        stableStates: {
          s1: {
            stableId: "s1",
            friction: -45,
            winsAgainstPlayer: 3,
            regionalPrestige: { "North Region": 80 },
            strategicDirectives: [
              { id: "d1", priority: "high" as const, type: "acquire_stallion" },
            ],
            npcRelationships: {
              s2: {
                trust: 30,
                allianceType: "breeding_partnership" as const,
                allianceSinceDay: 80,
                history: [],
              },
            },
            narrativeState: {
              activeArcs: [],
              storyBeats: [],
              dramaticPotential: 0.7,
            },
            worldAssessment: {
              playerDominance: 0.6,

              opportunities: [{ type: "auction", value: 50000 }],
            },
            financialDistress: {
              level: "caution",
              daysOfCash: 12,
              recommendedActions: ["reduce_spending"],
            },
          },
        },
      },
    }),
  ),
  useGame: vi.fn((selector: (s: any) => any) =>
    selector({
      npcStables: [
        { id: "s1", name: "Thunder Stables", personality: { ambition: 0.8 } },
        { id: "s2", name: "Lightning Ranch", personality: { ambition: 0.6 } },
      ],
    }),
  ),
}));

// Mock tanstack router Link
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, params }: any) => (
    <a href={to.replace("$stableId", params?.stableId ?? "")}>{children}</a>
  ),
}));

describe("RivalIntelTab", () => {
  it("renders the tab header", () => {
    render(<RivalIntelTab />);
    expect(screen.getByText("Rival Intelligence")).toBeDefined();
  });

  it("displays difficulty modulator panel with trend indicator", () => {
    render(<RivalIntelTab />);
    expect(screen.getByText(/Difficulty Modulator/i)).toBeDefined();
    expect(screen.getByText("35.0%")).toBeDefined();
    expect(screen.getByText("110%")).toBeDefined();
    expect(screen.getByText(/rising/i)).toBeDefined();
  });

  it("renders EconomicIndicators component", () => {
    render(<RivalIntelTab />);
    expect(screen.getByTestId("economic-indicators")).toBeDefined();
  });

  it("displays NPC stable intelligence cards", () => {
    render(<RivalIntelTab />);
    expect(screen.getAllByText("Thunder Stables").length).toBeGreaterThan(0);
  });

  it("displays friction values for NPC stables", () => {
    render(<RivalIntelTab />);
    expect(screen.getByText(/-45/)).toBeDefined();
  });

  it("displays active cartels section with stable links", () => {
    render(<RivalIntelTab />);
    expect(screen.getByText(/Active Cartels/i)).toBeDefined();
    expect(screen.getAllByText(/breeding/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Thunder Stables").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Lightning Ranch").length).toBeGreaterThan(0);
  });

  it("renders StorylinesTab component", () => {
    render(<RivalIntelTab />);
    expect(screen.getByTestId("storylines-tab")).toBeDefined();
  });

  it("displays NPC distress monitor panel", () => {
    render(<RivalIntelTab />);
    expect(screen.getByText(/NPC Distress Monitor/i)).toBeDefined();
    expect(screen.getByText(/caution/i)).toBeDefined();
    expect(screen.getByText(/Days of cash/i)).toBeDefined();
  });

  it("displays strategic directives for NPC stables", () => {
    render(<RivalIntelTab />);
    expect(screen.getAllByText(/Strategic Directives/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/acquire_stallion/i)).toBeDefined();
  });

  it("displays NPC relationships section with trust heatmap", () => {
    render(<RivalIntelTab />);
    expect(screen.getByText(/NPC Relationships/i)).toBeDefined();
    expect(screen.getByText(/breeding_partnership/i)).toBeDefined();
    expect(screen.getByText(/Trust: 30/i)).toBeDefined();
  });

  it("displays world assessment section", () => {
    render(<RivalIntelTab />);
    expect(screen.getByText(/World Assessment/i)).toBeDefined();
    expect(screen.getByText(/player dominance/i)).toBeDefined();
  });
});

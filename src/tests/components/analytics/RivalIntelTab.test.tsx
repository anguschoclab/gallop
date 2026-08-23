import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RivalIntelTab } from "@/components/analytics/RivalIntelTab";

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
        globalEconomicState: {
          studFeeTrend: 5.2,
          yearlingPriceIndex: 110.5,
          claimingMarketActivity: 42,
        },
        activeCartels: [{ id: "c1", memberStableIds: ["s1", "s2"], type: "breeding" as const }],
        narrativeArcs: [
          {
            id: "arc1",
            type: "rivalry",
            stableId: "s1",
            startDay: 50,
            status: "rising_action" as const,
            beats: [],
          },
        ],
        stableStates: {
          s1: {
            stableId: "s1",
            friction: -45,
            winsAgainstPlayer: 3,
            regionalPrestige: { "North Region": 80 },
            strategicDirectives: [
              { id: "d1", priority: "high" as const, action: "acquire_stallion" },
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
              playerStrength: 0.6,
              topThreats: [{ stableId: "s2", threatLevel: 0.8 }],
              opportunities: [{ type: "auction", value: 50000 }],
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

describe("RivalIntelTab", () => {
  it("renders the tab header", () => {
    render(<RivalIntelTab />);
    expect(screen.getByText("Rival Intelligence")).toBeDefined();
  });

  it("displays difficulty modulator panel", () => {
    render(<RivalIntelTab />);
    expect(screen.getByText(/Difficulty Modulator/i)).toBeDefined();
    expect(screen.getByText("35.0%")).toBeDefined();
    expect(screen.getByText("110%")).toBeDefined();
  });

  it("displays economic state panel", () => {
    render(<RivalIntelTab />);
    expect(screen.getByText(/Economic State/i)).toBeDefined();
    expect(screen.getByText(/5.2/)).toBeDefined();
  });

  it("displays NPC stable intelligence cards", () => {
    render(<RivalIntelTab />);
    expect(screen.getByText("Thunder Stables")).toBeDefined();
  });

  it("displays friction values for NPC stables", () => {
    render(<RivalIntelTab />);
    expect(screen.getByText(/-45/)).toBeDefined();
  });

  it("displays active cartels section", () => {
    render(<RivalIntelTab />);
    expect(screen.getByText(/Active Cartels/i)).toBeDefined();
    expect(screen.getAllByText(/breeding/i).length).toBeGreaterThan(0);
  });

  it("displays narrative arcs section", () => {
    render(<RivalIntelTab />);
    expect(screen.getByText(/Narrative Arcs/i)).toBeDefined();
    expect(screen.getByText(/rising_action/i)).toBeDefined();
  });

  it("displays strategic directives for NPC stables", () => {
    render(<RivalIntelTab />);
    expect(screen.getAllByText(/Strategic Directives/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/acquire_stallion/i)).toBeDefined();
  });

  it("displays NPC relationships section", () => {
    render(<RivalIntelTab />);
    expect(screen.getByText(/NPC Relationships/i)).toBeDefined();
    expect(screen.getByText(/breeding_partnership/i)).toBeDefined();
  });

  it("displays world assessment section", () => {
    render(<RivalIntelTab />);
    expect(screen.getByText(/World Assessment/i)).toBeDefined();
    expect(screen.getByText(/player strength/i)).toBeDefined();
  });
});

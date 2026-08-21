import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { AIPersonalityCard } from "@/components/npc/AIPersonalityCard";
import { StrategicDirectivesPanel } from "@/components/npc/StrategicDirectivesPanel";
import { RelationshipGraph } from "@/components/npc/RelationshipGraph";
import { AiActivityFeed } from "@/components/npc/AiActivityFeed";
import { EconomicIndicators } from "@/components/analytics/EconomicIndicators";
import { NarrativeArcCard } from "@/components/narrative/NarrativeArcCard";
import { JockeyStrategyBreakdown } from "@/components/race/JockeyStrategyBreakdown";
import { TacticalAnalysisPanel } from "@/components/race/TacticalAnalysisPanel";
import type {
  StableAIState,
  NpcAIManager,
  NpcRelationship,
  NarrativeArc,
} from "@/core/ai/npcCycleAI";
import type {
  EconomicTrend,
  StrategicDirective,
  BudgetAllocation,
} from "@/core/ai/strategicCoordinator";
import type { PersonalityAIState } from "@/core/ai/personalitySystem";
import type { Stable } from "@/game/types";
import type { RaceRunner } from "@/core/race/types";
import type { NewsItem } from "@/services/narrative/newsTypes";

function createMockPersonalityState(
  overrides: Partial<PersonalityAIState> = {},
): PersonalityAIState {
  return {
    personality: "aggressive",
    learningRate: 0.7,
    memoryDepth: 50,
    adaptationSpeed: 0.6,
    strategicHorizon: 30,
    competitiveAwareness: 0.8,
    conservatism: 0.3,
    innovation: 0.7,
    learningState: {
      outcomes: {},
      totalOutcomes: 0,
      recentOutcomes: [],
    } as any,
    currentStrategy: "aggressive_expansion",
    strategyConfidence: 0.75,
    lastStrategyChangeDay: 50,
    ...overrides,
  };
}

function createMockStableAIState(overrides: Partial<StableAIState> = {}): StableAIState {
  return {
    stableId: "s1",
    personalityState: createMockPersonalityState(),
    learningState: { outcomes: {}, totalOutcomes: 0, recentOutcomes: [] } as any,
    lastUpdateDay: 100,
    friction: 45,
    winsAgainstPlayer: 3,
    regionalPrestige: { north_america: 120 },
    strategicDirectives: [
      { type: "aggressive_expansion", priority: 1, weight: 0.9 },
      { type: "breeding_focus", priority: 2, weight: 0.6 },
    ],
    budgetAllocation: {
      total: 500000,
      training: 150000,
      facilities: 100000,
      auctions: 120000,
      claiming: 50000,
      breeding: 80000,
    },
    npcRelationships: {
      s2: {
        trust: 60,
        allianceType: "racing_coalition",
        history: [{ day: 50, type: "alliance_formed", description: "Coalition formed" }],
      },
    },
    narrativeState: {
      activeArcs: [],
      storyBeats: [],
      dramaticPotential: 0.5,
    },
    ...overrides,
  };
}

function createMockNpcAIManager(overrides: Partial<NpcAIManager> = {}): NpcAIManager {
  return {
    stableStates: { s1: createMockStableAIState() },
    globalDay: 100,
    regionalKings: {},
    globalEconomicState: {
      studFeeTrend: 0.05,
      yearlingPriceIndex: 110,
      claimingMarketActivity: 50,
    },
    economicHistory: [
      { studFeeTrend: 0.01, yearlingPriceIndex: 100, claimingMarketActivity: 40 },
      { studFeeTrend: 0.03, yearlingPriceIndex: 105, claimingMarketActivity: 45 },
      { studFeeTrend: 0.05, yearlingPriceIndex: 110, claimingMarketActivity: 50 },
    ],
    activeCartels: [{ id: "c1", memberStableIds: ["s1", "s2"], type: "auction" }],
    ...overrides,
  };
}

function createMockStable(overrides: Partial<Stable> = {}): Stable {
  return {
    id: "s1",
    name: "Alpha Stable",
    personality: "aggressive",
    cash: 500000,
    reputation: 80,
    ...overrides,
  } as Stable;
}

describe("AI UI Pipeline Integration", () => {
  it("renders AIPersonalityCard with full AI state from store", () => {
    const manager = createMockNpcAIManager();
    renderWithStore(<AIPersonalityCard stableAI={manager.stableStates.s1} />, {
      npcAIManager: manager,
    });
    expect(screen.getAllByText(/aggressive/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/70%/)).toBeInTheDocument();
  });

  it("renders StrategicDirectivesPanel with directives from AI state", () => {
    const manager = createMockNpcAIManager();
    renderWithStore(
      <StrategicDirectivesPanel directives={manager.stableStates.s1.strategicDirectives!} />,
      { npcAIManager: manager },
    );
    expect(screen.getByText(/aggressive expansion/i)).toBeInTheDocument();
    expect(screen.getByText(/breeding focus/i)).toBeInTheDocument();
  });

  it("renders RelationshipGraph with NPC relationships from AI state", () => {
    const manager = createMockNpcAIManager();
    const stables = [createMockStable(), createMockStable({ id: "s2", name: "Beta Stable" })];
    renderWithStore(
      <RelationshipGraph
        stableId="s1"
        relationships={manager.stableStates.s1.npcRelationships!}
        stables={stables}
        cartels={manager.activeCartels}
      />,
      { npcAIManager: manager },
    );
    expect(screen.getByText("Beta Stable")).toBeInTheDocument();
    expect(screen.getByText(/racing coalition/i)).toBeInTheDocument();
  });

  it("renders EconomicIndicators with global economic state from store", () => {
    const manager = createMockNpcAIManager();
    renderWithStore(<EconomicIndicators />, { npcAIManager: manager });
    expect(screen.getByText(/economic indicators/i)).toBeInTheDocument();
    expect(screen.getByText(/expansion/i)).toBeInTheDocument();
  });

  it("renders AiActivityFeed with news items", () => {
    const news: NewsItem[] = [
      {
        id: "n1",
        day: 100,
        category: "stable",
        importance: "high",
        headline: "Alpha buys horse",
        body: "Big purchase",
      },
    ];
    renderWithStore(<AiActivityFeed news={news} />, {});
    expect(screen.getByText("Alpha buys horse")).toBeInTheDocument();
  });

  it("renders NarrativeArcCard with arc from AI state", () => {
    const arc: NarrativeArc = {
      id: "arc-1",
      type: "rivalry",
      stableId: "s1",
      startDay: 50,
      status: "climax",
      beats: [{ day: 100, arcId: "arc-1", headline: "Big showdown", body: "Epic race" }],
    };
    render(<NarrativeArcCard arc={arc} stableName="Alpha Stable" />);
    expect(screen.getByText("Big showdown")).toBeInTheDocument();
  });

  it("renders TacticalAnalysisPanel with runner tactical data", () => {
    const runners: RaceRunner[] = [
      {
        horseId: "h1",
        name: "Thunder",
        silk: "red",
        ownership: { type: "unowned" },
        jockeyId: "j1",
        jockeyName: "Mike",
        runningStyle: "S",
        jockeyInstructions: {
          ridingStyle: "closer",
          earlyPosition: "midpack",
          moveTiming: "late",
          aggressiveness: 0.7,
        },
      },
    ];
    render(<TacticalAnalysisPanel runners={runners} />);
    expect(screen.getByText("Thunder")).toBeInTheDocument();
    expect(screen.getByText("Mike")).toBeInTheDocument();
  });

  it("renders all components together without crashing", () => {
    const manager = createMockNpcAIManager();
    const stables = [createMockStable(), createMockStable({ id: "s2", name: "Beta" })];
    const runners: RaceRunner[] = [
      {
        horseId: "h1",
        name: "Thunder",
        silk: "red",
        ownership: { type: "unowned" },
        jockeyId: "j1",
        jockeyName: "Mike",
      },
    ];
    const news: NewsItem[] = [
      {
        id: "n1",
        day: 100,
        category: "stable",
        importance: "high",
        headline: "Test",
        body: "Body",
      },
    ];

    renderWithStore(
      <div>
        <AIPersonalityCard stableAI={manager.stableStates.s1} />
        <StrategicDirectivesPanel directives={manager.stableStates.s1.strategicDirectives!} />
        <RelationshipGraph
          stableId="s1"
          relationships={manager.stableStates.s1.npcRelationships!}
          stables={stables}
          cartels={manager.activeCartels}
        />
        <EconomicIndicators />
        <AiActivityFeed news={news} />
        <TacticalAnalysisPanel runners={runners} />
      </div>,
      { npcAIManager: manager },
    );

    expect(screen.getByText(/economic indicators/i)).toBeInTheDocument();
    expect(screen.getByText("Thunder")).toBeInTheDocument();
    expect(screen.getByText("Test")).toBeInTheDocument();
  });
});

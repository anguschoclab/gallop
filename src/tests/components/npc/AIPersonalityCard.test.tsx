import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AIPersonalityCard } from "@/components/npc/AIPersonalityCard";
import { StrategicDirectivesPanel } from "@/components/npc/StrategicDirectivesPanel";
import type { StableAIState } from "@/core/ai/npcCycleAI";
import type { StrategicDirective, BudgetAllocation } from "@/core/ai/strategicCoordinator";

function createMockStableAI(overrides: Partial<StableAIState> = {}): StableAIState {
  return {
    stableId: "s1",
    personalityState: {
      personality: "aggressive",
      learningRate: 0.6,
      memoryDepth: 50,
      adaptationSpeed: 0.7,
      strategicHorizon: 0.8,
      competitiveAwareness: 0.9,
      conservatism: 0.2,
      innovation: 0.8,
      learningState: {
        outcomes: [],
        successRates: {},
        patterns: {},
        lastUpdateDay: 100,
      },
      currentStrategy: "aggressive_expansion",
      strategyConfidence: 0.75,
      lastStrategyChangeDay: 80,
    },
    learningState: {
      outcomes: [],
      successRates: {},
      patterns: {},
      lastUpdateDay: 100,
    },
    lastUpdateDay: 100,
    friction: 0,
    winsAgainstPlayer: 0,
    regionalPrestige: {},
    ...overrides,
  };
}

describe("AIPersonalityCard", () => {
  it("renders personality type", () => {
    const stableAI = createMockStableAI();
    render(<AIPersonalityCard stableAI={stableAI} />);
    expect(screen.getAllByText(/aggressive/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders risk tolerance from conservatism", () => {
    const stableAI = createMockStableAI();
    render(<AIPersonalityCard stableAI={stableAI} />);
    expect(screen.getByText(/risk tolerance/i)).toBeInTheDocument();
  });

  it("renders learning rate", () => {
    const stableAI = createMockStableAI();
    render(<AIPersonalityCard stableAI={stableAI} />);
    expect(screen.getByText(/learning rate/i)).toBeInTheDocument();
  });

  it("renders strategic horizon", () => {
    const stableAI = createMockStableAI();
    render(<AIPersonalityCard stableAI={stableAI} />);
    expect(screen.getByText(/strategic horizon/i)).toBeInTheDocument();
  });

  it("renders current strategy and confidence", () => {
    const stableAI = createMockStableAI();
    render(<AIPersonalityCard stableAI={stableAI} />);
    expect(screen.getByText(/aggressive expansion/i)).toBeInTheDocument();
    expect(screen.getByText(/confidence/i)).toBeInTheDocument();
  });

  it("renders innovation value", () => {
    const stableAI = createMockStableAI();
    render(<AIPersonalityCard stableAI={stableAI} />);
    expect(screen.getByText(/innovation/i)).toBeInTheDocument();
  });

  it("renders budget allocation when present", () => {
    const budget: BudgetAllocation = {
      total: 100000,
      training: 20000,
      facilities: 15000,
      auctions: 30000,
      claiming: 10000,
      breeding: 25000,
    };
    const stableAI = createMockStableAI({ budgetAllocation: budget });
    render(<AIPersonalityCard stableAI={stableAI} />);
    expect(screen.getByText(/budget/i)).toBeInTheDocument();
    expect(screen.getByText(/training/i)).toBeInTheDocument();
    expect(screen.getByText(/auctions/i)).toBeInTheDocument();
  });

  it("renders without budget allocation", () => {
    const stableAI = createMockStableAI();
    render(<AIPersonalityCard stableAI={stableAI} />);
    expect(screen.queryByText(/budget allocation/i)).not.toBeInTheDocument();
  });

  it("renders learning insights when jockeyStrategyAI is present", () => {
    const stableAI = createMockStableAI({
      jockeyStrategyAI: {
        personalityState: {
          personality: "aggressive",
          learningRate: 0.6,
          memoryDepth: 50,
          adaptationSpeed: 0.7,
          strategicHorizon: 0.8,
          competitiveAwareness: 0.9,
          conservatism: 0.2,
          innovation: 0.8,
          learningState: { outcomes: [], successRates: {}, patterns: {}, lastUpdateDay: 100 },
          currentStrategy: "aggressive_expansion",
          strategyConfidence: 0.75,
          lastStrategyChangeDay: 80,
        },
        learningState: { outcomes: [], successRates: {}, patterns: {}, lastUpdateDay: 100 },
        strategyHistory: [
          {
            raceId: "r1",
            horseId: "h1",
            jockeyId: "j1",
            stableId: "s1",
            day: 90,
            runningStyle: "E",
            aggressiveness: 0.7,
            position: 2,
          },
        ],
      },
    });
    render(<AIPersonalityCard stableAI={stableAI} />);
    expect(screen.getByText(/learning insights/i)).toBeInTheDocument();
    expect(screen.getByText(/total races/i)).toBeInTheDocument();
    expect(screen.getByText(/avg position/i)).toBeInTheDocument();
    expect(screen.getByText(/success rate/i)).toBeInTheDocument();
  });

  it("does not render learning insights when jockeyStrategyAI is absent", () => {
    const stableAI = createMockStableAI();
    render(<AIPersonalityCard stableAI={stableAI} />);
    expect(screen.queryByText(/learning insights/i)).not.toBeInTheDocument();
  });
});

describe("StrategicDirectivesPanel", () => {
  it("renders directives sorted by priority", () => {
    const directives: StrategicDirective[] = [
      { type: "racing_focus", priority: 3, weight: 0.5 },
      { type: "aggressive_expansion", priority: 1, weight: 0.9 },
      { type: "breeding_focus", priority: 2, weight: 0.7 },
    ];
    render(<StrategicDirectivesPanel directives={directives} />);
    const items = screen.getAllByTestId("directive-item");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("aggressive expansion");
    expect(items[1]).toHaveTextContent("breeding focus");
    expect(items[2]).toHaveTextContent("racing focus");
  });

  it("renders weight for each directive", () => {
    const directives: StrategicDirective[] = [
      { type: "aggressive_expansion", priority: 1, weight: 0.9 },
    ];
    render(<StrategicDirectivesPanel directives={directives} />);
    expect(screen.getByText(/90%/)).toBeInTheDocument();
  });

  it("renders empty state when no directives", () => {
    render(<StrategicDirectivesPanel directives={[]} />);
    expect(screen.getByText(/no active directives/i)).toBeInTheDocument();
  });

  it("renders empty state when directives is undefined", () => {
    render(<StrategicDirectivesPanel directives={undefined} />);
    expect(screen.getByText(/no active directives/i)).toBeInTheDocument();
  });
});

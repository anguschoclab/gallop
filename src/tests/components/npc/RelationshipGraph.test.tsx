import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RelationshipGraph } from "@/components/npc/RelationshipGraph";
import type { NpcRelationship, StableAIState } from "@/core/ai/npcCycleAI";
import type { Stable } from "@/game/types";

function createMockRelationship(overrides: Partial<NpcRelationship> = {}): NpcRelationship {
  return {
    trust: 50,
    allianceType: null,
    history: [],
    ...overrides,
  };
}

function createMockStable(overrides: Partial<Stable> = {}): Stable {
  return {
    id: "s1",
    name: "Test Stable",
    country: "USA",
    personality: "aggressive",
    cash: 100000,
    reputation: 50,
    tier: "mid",
    colors: { primary: "#0000ff", secondary: "#ff0000" },
    founded: 1,
    staff: {},
    ...overrides,
  } as Stable;
}

describe("RelationshipGraph", () => {
  it("renders empty state when no relationships", () => {
    render(<RelationshipGraph stableId="s1" relationships={{}} stables={[]} />);
    expect(screen.getByText(/no diplomatic relationships/i)).toBeInTheDocument();
  });

  it("renders stable names for each relationship", () => {
    const relationships: Record<string, NpcRelationship> = {
      s2: createMockRelationship({ trust: 60 }),
      s3: createMockRelationship({ trust: -40 }),
    };
    const stables = [
      createMockStable({ id: "s1", name: "Alpha Stable" }),
      createMockStable({ id: "s2", name: "Beta Stable" }),
      createMockStable({ id: "s3", name: "Gamma Stable" }),
    ];
    render(<RelationshipGraph stableId="s1" relationships={relationships} stables={stables} />);
    expect(screen.getByText("Beta Stable")).toBeInTheDocument();
    expect(screen.getByText("Gamma Stable")).toBeInTheDocument();
  });

  it("renders alliance type badge when alliance exists", () => {
    const relationships: Record<string, NpcRelationship> = {
      s2: createMockRelationship({ trust: 70, allianceType: "breeding_partnership" }),
    };
    const stables = [
      createMockStable({ id: "s1", name: "Alpha" }),
      createMockStable({ id: "s2", name: "Beta" }),
    ];
    render(<RelationshipGraph stableId="s1" relationships={relationships} stables={stables} />);
    expect(screen.getByText(/breeding partnership/i)).toBeInTheDocument();
  });

  it("renders trust value with positive styling for positive trust", () => {
    const relationships: Record<string, NpcRelationship> = {
      s2: createMockRelationship({ trust: 50 }),
    };
    const stables = [createMockStable({ id: "s1" }), createMockStable({ id: "s2", name: "Beta" })];
    render(<RelationshipGraph stableId="s1" relationships={relationships} stables={stables} />);
    expect(screen.getByText(/50/)).toBeInTheDocument();
  });

  it("renders diplomatic history events when present", () => {
    const relationships: Record<string, NpcRelationship> = {
      s2: createMockRelationship({
        trust: -30,
        history: [
          { day: 100, type: "betrayal", description: "Broken alliance" },
          { day: 120, type: "cooperation", description: "Shared breeding info" },
        ],
      }),
    };
    const stables = [createMockStable({ id: "s1" }), createMockStable({ id: "s2", name: "Beta" })];
    render(<RelationshipGraph stableId="s1" relationships={relationships} stables={stables} />);
    expect(screen.getByText("Broken alliance")).toBeInTheDocument();
    expect(screen.getByText("Shared breeding info")).toBeInTheDocument();
  });

  it("renders cartel info when present", () => {
    const relationships: Record<string, NpcRelationship> = {
      s2: createMockRelationship({ trust: 80, allianceType: "economic_cartel" }),
    };
    const stables = [createMockStable({ id: "s1" }), createMockStable({ id: "s2", name: "Beta" })];
    render(
      <RelationshipGraph
        stableId="s1"
        relationships={relationships}
        stables={stables}
        cartels={[{ id: "c1", memberStableIds: ["s1", "s2"], type: "auction" }]}
      />,
    );
    expect(screen.getByText(/cartel membership/i)).toBeInTheDocument();
  });
});

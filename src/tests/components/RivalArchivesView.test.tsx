import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Stable } from "@/game/types";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

import { RivalArchivesView } from "@/components/stable/RivalArchivesView";

const mkStable = (overrides: Partial<Stable> = {}): Stable =>
  ({
    id: "s1",
    name: "Test Stable",
    owner: "Owner",
    tier: "elite",
    reputation: 50,
    founded: 2020,
    cash: 100000,
    horses: [],
    isMajor: true,
    colors: { primary: "#ff0000", secondary: "#00ff00" },
    personality: "aggressive",
    staff: {},
    outposts: [],
    ...overrides,
  }) as Stable;

const mkNpcAIManager = (overrides: Partial<NpcAIManager> = {}): NpcAIManager =>
  ({
    stableStates: {},
    globalDay: 1,
    regionalKings: {},
    ...overrides,
  }) as NpcAIManager;

const noopNavigate = vi.fn();

describe("RivalArchivesView", () => {
  it("renders empty state when no stables provided", () => {
    render(
      <RivalArchivesView
        stables={[]}
        rivalQ=""
        rivalTier="all"
        horseCountsByStable={new Map()}
        npcAIManager={mkNpcAIManager()}
        navigate={noopNavigate}
      />,
    );
    expect(screen.getByText("No Rivals Found")).toBeInTheDocument();
  });

  it("renders stable cards for each stable", () => {
    const stables = [
      mkStable({ id: "s1", name: "Alpha Stable" }),
      mkStable({ id: "s2", name: "Beta Stable" }),
    ];
    render(
      <RivalArchivesView
        stables={stables}
        rivalQ=""
        rivalTier="all"
        horseCountsByStable={
          new Map([
            ["s1", 5],
            ["s2", 3],
          ])
        }
        npcAIManager={mkNpcAIManager()}
        navigate={noopNavigate}
      />,
    );
    expect(screen.getByText("Alpha Stable")).toBeInTheDocument();
    expect(screen.getByText("Beta Stable")).toBeInTheDocument();
  });

  it("resolves alliance names from the stables array", () => {
    const stables = [
      mkStable({ id: "s1", name: "Alpha Stable" }),
      mkStable({ id: "s2", name: "Beta Stable" }),
      mkStable({ id: "s3", name: "Gamma Stable" }),
    ];
    const npcAIManager = mkNpcAIManager({
      stableStates: {
        s1: {
          stableId: "s1",
          personalityState: {} as any,
          learningState: {} as any,
          lastUpdateDay: 1,
          friction: 0,
          winsAgainstPlayer: 0,
          regionalPrestige: {},
          npcRelationships: {
            s2: {
              trust: 50,
              allianceType: "racing_coalition",
              history: [],
            },
          },
        },
      },
    });

    const { container } = render(
      <RivalArchivesView
        stables={stables}
        rivalQ=""
        rivalTier="all"
        horseCountsByStable={new Map()}
        npcAIManager={npcAIManager}
        navigate={noopNavigate}
      />,
    );

    // Alliance badge should contain the resolved stable name "Beta Stable"
    const allianceBadge = container.querySelector('[title*="Beta Stable"]');
    expect(allianceBadge).toBeTruthy();
    expect(allianceBadge!.textContent).toContain("Beta Stable");
  });

  it("falls back to stableId when alliance target not found in stables array", () => {
    const stables = [mkStable({ id: "s1", name: "Alpha Stable" })];
    const npcAIManager = mkNpcAIManager({
      stableStates: {
        s1: {
          stableId: "s1",
          personalityState: {} as any,
          learningState: {} as any,
          lastUpdateDay: 1,
          friction: 0,
          winsAgainstPlayer: 0,
          regionalPrestige: {},
          npcRelationships: {
            sX: {
              trust: 50,
              allianceType: "breeding_partnership",
              history: [],
            },
          },
        },
      },
    });

    const { container } = render(
      <RivalArchivesView
        stables={stables}
        rivalQ=""
        rivalTier="all"
        horseCountsByStable={new Map()}
        npcAIManager={npcAIManager}
        navigate={noopNavigate}
      />,
    );

    // Should fall back to raw ID "sX" since no stable with that ID exists
    const allianceBadge = container.querySelector('[title*="sX"]');
    expect(allianceBadge).toBeTruthy();
    expect(allianceBadge!.textContent).toContain("sX");
  });

  it("displays horse count from horseCountsByStable map", () => {
    const stables = [mkStable({ id: "s1", name: "Alpha Stable" })];
    render(
      <RivalArchivesView
        stables={stables}
        rivalQ=""
        rivalTier="all"
        horseCountsByStable={new Map([["s1", 12]])}
        npcAIManager={mkNpcAIManager()}
        navigate={noopNavigate}
      />,
    );
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("shows reset button when filters are active", () => {
    render(
      <RivalArchivesView
        stables={[]}
        rivalQ="alpha"
        rivalTier="all"
        horseCountsByStable={new Map()}
        npcAIManager={mkNpcAIManager()}
        navigate={noopNavigate}
      />,
    );
    expect(screen.getByText("Reset")).toBeInTheDocument();
  });

  it("does not show reset button when no filters are active", () => {
    render(
      <RivalArchivesView
        stables={[]}
        rivalQ=""
        rivalTier="all"
        horseCountsByStable={new Map()}
        npcAIManager={mkNpcAIManager()}
        navigate={noopNavigate}
      />,
    );
    expect(screen.queryByText("Reset")).not.toBeInTheDocument();
  });
});

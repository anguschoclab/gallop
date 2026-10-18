import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RivalCareerCompareTable } from "@/domains/stable/ui/RivalCareerCompareTable";
import type { RivalCareerProfile } from "@/domains/agents/application/npcFacade";
import type { RivalRankingsColumn } from "@/domains/market/simulation/rivalRankingsComparison";

vi.mock("@/platform/game/store", () => ({
  useGame: (selector: (s: any) => any) => selector({}),
  useGameWithShallow: (selector: (s: any) => any) => selector({}),
}));

const profile = (id: string, name: string): RivalCareerProfile => ({
  id,
  name,
  stableId: "stable-a",
  age: 4,
  starts: 10,
  wins: 3,
  winRate: 0.3,
  earnings: 50000,
  fame: 40,
  stage: "prime",
  stageLabel: "Prime",
  daysSinceStart: 5,
  milestones: [],
  placeRate: 0.6,
  avgFinish: 3.2,
  prizePerStart: 5000,
  efficiencyScore: 45,
});

const column = (rivalId: string, over: Partial<RivalRankingsColumn> = {}): RivalRankingsColumn => ({
  rivalId,
  values: { rank: 4, points: 40, price: 200000 },
  baseline: { rank: 9, points: 10, price: 90000 },
  gap: { rank: -5, points: 30, price: 110000 },
  ...over,
});

describe("RivalCareerCompareTable rankings rows", () => {
  it("renders no rankings section without the rankings prop", () => {
    render(<RivalCareerCompareTable profiles={[profile("r1", "Rival One")]} />);
    expect(screen.queryByText(/daily rankings/i)).toBeNull();
  });

  it("renders rank, points and value rows with gaps vs the baseline", () => {
    render(
      <RivalCareerCompareTable
        profiles={[profile("r1", "Rival One")]}
        rankings={{
          day: 10,
          baselineLabel: "Test Yard",
          columns: [column("r1")],
        }}
      />,
    );
    expect(screen.getByText(/daily rankings/i)).toBeInTheDocument();
    expect(screen.getByText(/day 10/i)).toBeInTheDocument();
    expect(screen.getByText(/test yard/i)).toBeInTheDocument();
    expect(screen.getByText("#4")).toBeInTheDocument();
    expect(screen.getByText(/5 places ahead/i)).toBeInTheDocument();
    expect(screen.getByText(/\+30/)).toBeInTheDocument();
    expect(screen.getByText(/\$200,000/)).toBeInTheDocument();
  });

  it("renders a no-record placeholder for a rival without a snapshot", () => {
    render(
      <RivalCareerCompareTable
        profiles={[profile("r1", "Rival One")]}
        rankings={{
          day: 10,
          baselineLabel: "Test Yard",
          columns: [column("r1", { values: null, gap: null })],
        }}
      />,
    );
    expect(screen.getAllByText(/no record/i).length).toBeGreaterThan(0);
  });
});

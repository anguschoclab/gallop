import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { seedStore } from "@/test-utils/renderWithStore";
import { createDefaultGameState } from "@/game/store/state";
import { ReputationDashboard } from "@/components/reputation/ReputationDashboard";
import { createTestHorse } from "@/tests/helpers";
import type { ManagerReputation } from "@/core/reputation/reputationTypes";
import { makePlayerOwned } from "@/core/horse/ownership";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    children?: ReactNode;
    to?: string;
    params?: Record<string, string>;
  }) => createElement("a", { to, "data-params": JSON.stringify(params) }, children),
  useNavigate: () => () => {},
  useSearch: () => ({}),
}));

describe("ReputationDashboard — entity linking", () => {
  it("renders event description with NewsContent auto-detection for horse names", () => {
    const horse = createTestHorse({
      id: "h1",
      name: "Champion Horse",
      ownership: makePlayerOwned(),
    });
    const reputation: ManagerReputation = {
      score: 500,
      totalWins: 10,
      gradedWins: { G1: 2, G2: 1, G3: 0, Listed: 0 },
      yearsActive: 3,
      events: [
        {
          id: "e1",
          day: 50,
          source: "race_win",
          description: "Champion Horse won the big race",
          amount: 50,
        },
      ],
    } as unknown as ManagerReputation;

    seedStore({
      ...createDefaultGameState(),
      day: 55,
      horses: { [horse.id]: horse },
      reputation,
    });

    const { container } = render(<ReputationDashboard />);
    const link = container.querySelector("a[to='/stable/$horseId']");
    expect(link).not.toBeNull();
    expect(link?.textContent).toBe("Champion Horse");
    expect(link?.getAttribute("data-params")).toBe(JSON.stringify({ horseId: "h1" }));
  });
});

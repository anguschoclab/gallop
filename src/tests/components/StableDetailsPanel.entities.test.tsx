import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { StableDetailsPanel } from "@/components/dashboard/StableDetailsPanel";
import type { StandingEntry } from "@/core/standings/computeStandings";

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

describe("StableDetailsPanel — entity linking", () => {
  it("renders recent result race names as Links to /race/$raceId", () => {
    const entry: StandingEntry = {
      stableId: "npc1",
      name: "Rival Stable",
      isPlayer: false,
      rangePrizeMoney: 100000,
      prestige: 50,
      winsVsPlayer: 2,
      sparkline: [0, 0, 100000],
      recentResults: [
        { raceName: "Grand Stakes", raceId: "r1", position: 1, day: 50, purseEarned: 60000 },
      ] as any,
    };
    const { container } = render(<StableDetailsPanel stable={entry} />);
    const link = container.querySelector("a[to='/race/$raceId']");
    expect(link).not.toBeNull();
    expect(link?.textContent).toBe("Grand Stakes");
    expect(link?.getAttribute("data-params")).toBe(JSON.stringify({ raceId: "r1" }));
  });

  it("renders stable name as a Link to /npc-stables/$stableId", () => {
    const entry: StandingEntry = {
      stableId: "npc1",
      name: "Rival Stable",
      isPlayer: false,
      rangePrizeMoney: 50000,
      prestige: 40,
      winsVsPlayer: 1,
      sparkline: [0, 50000],
      recentResults: [],
    };
    const { container } = render(<StableDetailsPanel stable={entry} />);
    const link = container.querySelector("a[to='/npc-stables/$stableId']");
    expect(link).not.toBeNull();
    expect(link?.textContent).toBe("Rival Stable");
  });
});

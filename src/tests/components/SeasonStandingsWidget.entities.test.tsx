import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { seedStore } from "@/test-utils/renderWithStore";
import { createDefaultGameState } from "@/game/store/state";
import { SeasonStandingsWidget } from "@/components/dashboard/SeasonStandingsWidget";
import { createTestHorse, createTestStable } from "@/tests/helpers";

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

describe("SeasonStandingsWidget — entity linking", () => {
  it("renders NPC stable names as Links to /npc-stables/$stableId", () => {
    const stable = createTestStable({ id: "npc1", name: "Rival Stable" });
    const horse = createTestHorse({
      id: "h1",
      name: "Thunder",
      owned: true,
      raceHistory: [
        {
          raceId: "r1",
          raceName: "Test Race",
          position: 1,
          day: 50,
          beyer: 80,
          purse: 100000,
          purseEarned: 60000,
          surface: "Turf",
          distance: 1600,
          stableId: "__player__",
        } as any,
      ],
    });
    const horse2 = createTestHorse({
      id: "h2",
      name: "Lightning",
      owned: false,
      stableId: "npc1",
      raceHistory: [
        {
          raceId: "r2",
          raceName: "NPC Race",
          position: 1,
          day: 50,
          beyer: 75,
          purse: 100000,
          purseEarned: 80000,
          surface: "Turf",
          distance: 1600,
          stableId: "npc1",
        } as any,
      ],
    });

    seedStore({
      ...createDefaultGameState(),
      day: 60,
      horses: { h1: horse, h2: horse2 },
      npcStables: [stable],
    });

    const { container } = render(<SeasonStandingsWidget />);
    const link = container.querySelector("a[to='/npc-stables/$stableId']");
    expect(link).not.toBeNull();
    expect(link?.textContent).toBe("Rival Stable");
  });
});

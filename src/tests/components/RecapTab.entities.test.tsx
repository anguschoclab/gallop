import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { seedStore } from "@/test-utils/renderWithStore";
import { createDefaultGameState } from "@/game/store/state";
import { RecapTab } from "@/components/briefing/RecapTab";
import { createTestHorse } from "@/tests/helpers";
import type { Race } from "@/core/race/types";

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

describe("RecapTab — entity linking", () => {
  it("renders race name as a Link to /race/$raceId", () => {
    const horse = createTestHorse({ id: "h1", name: "Winner", ownership: { type: "player" } });
    const race = {
      id: "r1",
      name: "Grand Stakes",
      day: 50,
      distance: 1600,
      raceClass: "Maiden",
      entryFee: 0,
      purse: 50000,
      fieldSize: 1,
      entries: [{ horseId: "h1", ownership: { type: "player" } }],
      resolved: true,
      result: [{ horseId: "h1", position: 1, time: 90 }],
      graded: { key: "g1", grade: "G1", track: "Aintree", surface: "Turf" },
    } as unknown as Race;

    seedStore({
      ...createDefaultGameState(),
      day: 55,
      horses: { [horse.id]: horse },
      races: { r1: race },
    });

    const { container } = render(<RecapTab />);
    const raceLinks = container.querySelectorAll("a[to='/race/$raceId']");
    expect(raceLinks.length).toBeGreaterThanOrEqual(1);
    expect(raceLinks[0]?.textContent).toBe("Grand Stakes");
    expect(raceLinks[0]?.getAttribute("data-params")).toBe(JSON.stringify({ raceId: "r1" }));
  });
});

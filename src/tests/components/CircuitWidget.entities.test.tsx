import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { createDefaultGameState } from "@/game/store/state";
import { CircuitWidget } from "@/components/dashboard/CircuitWidget";
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

function mkRace(id: string, name: string, day: number): Race {
  return {
    id,
    name,
    day,
    distance: 1600,
    raceClass: "Maiden",
    entryFee: 0,
    purse: 50000,
    fieldSize: 8,
    entries: [],
    resolved: false,
  } as unknown as Race;
}

describe("CircuitWidget — entity linking", () => {
  it("renders upcoming race name as a Link to /race/$raceId", () => {
    const race = mkRace("r1", "Grand Stakes", 100);
    const { container } = renderWithStore(<CircuitWidget />, {
      ...createDefaultGameState(),
      day: 50,
      races: { r1: race },
    });
    const raceLinks = container.querySelectorAll("a[to='/race/$raceId']");
    expect(raceLinks.length).toBeGreaterThanOrEqual(1);
    expect(raceLinks[0]?.textContent).toBe("Grand Stakes");
    expect(raceLinks[0]?.getAttribute("data-params")).toBe(JSON.stringify({ raceId: "r1" }));
  });

  it("renders multiple upcoming race links", () => {
    const r1 = mkRace("r1", "Race A", 100);
    const r2 = mkRace("r2", "Race B", 110);
    const { container } = renderWithStore(<CircuitWidget />, {
      ...createDefaultGameState(),
      day: 50,
      races: { r1, r2 },
    });
    const raceLinks = container.querySelectorAll("a[to='/race/$raceId']");
    expect(raceLinks.length).toBeGreaterThanOrEqual(2);
  });
});

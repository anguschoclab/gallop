import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
  useNavigate: () => () => {},
  useSearch: () => ({}),
}));

import { ClaimingRacePanel } from "@/components/race/ClaimingRacePanel";
import type { Race, Horse, Claim } from "@/game/types";

const mkHorse = (overrides: Partial<Horse> = {}): Horse =>
  ({
    id: "h1",
    name: "Thunder",
    age: 3,
    gender: "colt",
    ...overrides,
  }) as Horse;

const mkRace = (overrides: Partial<Race> = {}): Race =>
  ({
    id: "race1",
    name: "Test Claiming Race",
    day: 10,
    distance: 2000,
    raceClass: "Maiden",
    entryFee: 500,
    purse: 10000,
    minStat: 70,
    fieldSize: 8,
    entries: [{ horseId: "h1", owned: false, stableId: "s1" }],
    resolved: false,
    claiming: { price: 5000 },
    ...overrides,
  }) as Race;

describe("ClaimingRacePanel — tooltip on disabled claim button", () => {
  it("renders tooltip wrapper when cannot afford claim", () => {
    const race = mkRace();
    const { container } = render(
      <ClaimingRacePanel
        race={race}
        horses={[mkHorse()]}
        claims={[]}
        cash={1000}
        fileClaim={vi.fn()}
      />,
    );
    // Radix tooltip provider is a context wrapper (no DOM element),
    // but the wrapper span with tabIndex and cursor-not-allowed is rendered
    const wrapperSpan = container.querySelector("span.cursor-not-allowed");
    expect(wrapperSpan).toBeTruthy();
  });

  it("disabled claim button is present when cannot afford", () => {
    const race = mkRace();
    const { container } = render(
      <ClaimingRacePanel
        race={race}
        horses={[mkHorse()]}
        claims={[]}
        cash={1000}
        fileClaim={vi.fn()}
      />,
    );
    const btn = container.querySelector("button.pointer-events-none");
    expect(btn).toBeTruthy();
    expect(btn?.hasAttribute("disabled")).toBe(true);
  });

  it("renders plain button when can afford claim", () => {
    const race = mkRace();
    render(
      <ClaimingRacePanel
        race={race}
        horses={[mkHorse()]}
        claims={[]}
        cash={10000}
        fileClaim={vi.fn()}
      />,
    );
    expect(screen.queryByText(/You need/i)).toBeNull();
    expect(screen.getByRole("button", { name: /Claim/i })).toBeTruthy();
  });
});

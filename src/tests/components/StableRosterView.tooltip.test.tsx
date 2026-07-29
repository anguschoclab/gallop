import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { createElement, type ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
  useNavigate: () => () => {},
  useSearch: () => ({}),
}));

import { StableRosterView } from "@/components/stable/StableRosterView";
import type { Horse } from "@/game/types";

const mkHorse = (overrides: Partial<Horse> = {}): Horse =>
  ({
    id: "h1",
    name: "Thunder",
    age: 3,
    gender: "colt",
    energy: 80,
    peakingIndex: 0,
    raceHistory: [],
    surfaceAptitude: { Turf: 0.5, Dirt: 0.5, Synthetic: 0.5 },
    stats: {
      speed: 70,
      stamina: 70,
      acceleration: 70,
      temperament: 70,
      conformation: 70,
      consistency: 70,
    },
    ...overrides,
  }) as Horse;

describe("StableRosterView — tooltip replacement of native title", () => {
  it("no native title attributes remain on action buttons", () => {
    const { container } = render(
      <StableRosterView
        horses={[mkHorse()]}
        status="active"
        view="ledger"
        counts={{ active: 1, retired: 0, auctioned: 0, all: 1 }}
        playerAwards={[]}
        navigate={vi.fn()}
      />,
    );
    const titledButtons = container.querySelectorAll("button[title]");
    expect(titledButtons).toHaveLength(0);
  });

  it("has Zap icon for training (tooltip trigger exists)", () => {
    const { container } = render(
      <StableRosterView
        horses={[mkHorse()]}
        status="active"
        view="ledger"
        counts={{ active: 1, retired: 0, auctioned: 0, all: 1 }}
        playerAwards={[]}
        navigate={vi.fn()}
      />,
    );
    // The Zap icon is inside the tooltip trigger for Training Room
    const zapIcons = container.querySelectorAll("svg.lucide-zap");
    expect(zapIcons.length).toBeGreaterThanOrEqual(1);
  });

  it("has Clock icon for race plan (tooltip trigger exists)", () => {
    const { container } = render(
      <StableRosterView
        horses={[mkHorse()]}
        status="active"
        view="ledger"
        counts={{ active: 1, retired: 0, auctioned: 0, all: 1 }}
        playerAwards={[]}
        navigate={vi.fn()}
      />,
    );
    const clockIcons = container.querySelectorAll("svg.lucide-clock");
    expect(clockIcons.length).toBeGreaterThanOrEqual(1);
  });
});

describe("StableRosterView — compare and clear button tooltips", () => {
  it("Compare button is disabled with tooltip when < 2 horses selected", () => {
    const { container } = render(
      <StableRosterView
        horses={[mkHorse()]}
        status="active"
        view="ledger"
        counts={{ active: 1, retired: 0, auctioned: 0, all: 1 }}
        playerAwards={[]}
        navigate={vi.fn()}
        compareIds={["h1"]}
        onCompareIdsChange={vi.fn()}
      />,
    );
    expect(
      container.querySelector('[aria-label="Select at least 2 horses to compare"]'),
    ).toBeTruthy();
  });

  it("Compare button is enabled without tooltip when >= 2 horses selected", () => {
    const h1 = mkHorse({ id: "h1" });
    const h2 = mkHorse({ id: "h2", name: "Lightning" });
    const { container } = render(
      <StableRosterView
        horses={[h1, h2]}
        status="active"
        view="ledger"
        counts={{ active: 2, retired: 0, auctioned: 0, all: 2 }}
        playerAwards={[]}
        navigate={vi.fn()}
        compareIds={["h1", "h2"]}
        onCompareIdsChange={vi.fn()}
      />,
    );
    expect(
      container.querySelector('[aria-label="Select at least 2 horses to compare"]'),
    ).toBeFalsy();
  });

  it("Clear selection button has tooltip", () => {
    const { container } = render(
      <StableRosterView
        horses={[mkHorse()]}
        status="active"
        view="ledger"
        counts={{ active: 1, retired: 0, auctioned: 0, all: 1 }}
        playerAwards={[]}
        navigate={vi.fn()}
        compareIds={["h1"]}
        onCompareIdsChange={vi.fn()}
      />,
    );
    expect(container.querySelector('[aria-label="Clear selection"]')).toBeTruthy();
  });
});

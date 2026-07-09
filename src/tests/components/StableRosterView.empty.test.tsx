/**
 * Tests for StableRosterView empty state handling.
 * Validates groom's fix: empty states show in both ledger and gallery views.
 */

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

const mkHorse = (overrides: Partial<Horse> = {}): Horse => ({
  id: "h1",
  name: "Thunder",
  age: 3,
  gender: "colt",
  energy: 80,
  peakingIndex: 0,
  stats: { speed: 70, stamina: 70, acceleration: 70, temperament: 70, durability: 70 } as any,
  ...overrides,
} as Horse);

describe("StableRosterView empty states", () => {
  it("shows 'Stable is Empty' with onboarding links when horses=[] and counts.all=0", () => {
    const { container, getByText } = render(
      <StableRosterView
        horses={[]}
        status="active"
        view="ledger"
        counts={{ active: 0, retired: 0, auctioned: 0, all: 0 }}
        playerAwards={[]}
        navigate={vi.fn()}
      />,
    );

    expect(getByText(/Stable is Empty/i)).toBeTruthy();
    expect(container.textContent).toMatch(/Go to Market|Market/i);
    expect(container.textContent).toMatch(/Auction/i);
  });

  it("shows 'Stable is Empty' in gallery view too", () => {
    const { getByText } = render(
      <StableRosterView
        horses={[]}
        status="active"
        view="gallery"
        counts={{ active: 0, retired: 0, auctioned: 0, all: 0 }}
        playerAwards={[]}
        navigate={vi.fn()}
      />,
    );

    expect(getByText(/Stable is Empty/i)).toBeTruthy();
  });

  it("shows 'No Records Located' when horses=[] but counts.all > 0 (filtered)", () => {
    const { container, getByText } = render(
      <StableRosterView
        horses={[]}
        status="active"
        view="ledger"
        counts={{ active: 5, retired: 0, auctioned: 0, all: 5 }}
        playerAwards={[]}
        navigate={vi.fn()}
      />,
    );

    expect(getByText(/No Records Located/i)).toBeTruthy();
    expect(container.textContent).not.toMatch(/Go to Market/i);
  });

  it("does not show empty state when horses exist", () => {
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

    expect(container.textContent).not.toMatch(/Stable is Empty/i);
    expect(container.textContent).not.toMatch(/No Records Located/i);
  });
});

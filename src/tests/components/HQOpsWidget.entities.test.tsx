import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { seedStore } from "@/test-utils/renderWithStore";
import { createDefaultGameState } from "@/game/store/state";
import { HQOpsWidget } from "@/components/dashboard/HQOpsWidget";
import { createTestHorse } from "@/tests/helpers";
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

describe("HQOpsWidget — entity linking", () => {
  it("renders reputation event description with NewsContent auto-detection", () => {
    const horse = createTestHorse({ id: "h1", name: "Star Runner", ownership: makePlayerOwned() });
    seedStore({
      ...createDefaultGameState(),
      day: 55,
      horses: { [horse.id]: horse },
      reputation: {
        score: 500,
        totalWins: 10,
        gradedWins: { G1: 2, G2: 1, G3: 0, Listed: 0 },
        yearsActive: 3,
        events: [
          {
            id: "e1",
            day: 50,
            source: "race_win",
            description: "Star Runner won the Derby",
            amount: 50,
          },
        ],
      } as any,
    });

    const { container } = render(<HQOpsWidget />);
    const link = container.querySelector("a[to='/stable/$horseId']");
    expect(link).not.toBeNull();
    expect(link?.textContent).toBe("Star Runner");
  });
});

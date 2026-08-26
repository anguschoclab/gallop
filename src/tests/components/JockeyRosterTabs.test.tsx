import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement, type ReactNode } from "react";
import { screen, fireEvent, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithStore } from "@/test-utils/renderWithStore";

const navigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
  useNavigate: () => navigate,
  useSearch: () => ({}),
}));

import { JockeyRosterTabs, type JockeyRosterTabsProps } from "@/components/jockey/JockeyRosterTabs";
import type { Jockey } from "@/core/jockey/types";
import { createTestJockey } from "@/tests/helpers";
import { asJockeyId } from "@/core/types/branded";

function mkJockey(id: string, overrides: Partial<Jockey> = {}) {
  return createTestJockey({
    id: asJockeyId(id),
    name: `Jockey ${id}`,
    contractUntil: 100,
    ...overrides,
  });
}

const defaultProps: JockeyRosterTabsProps = {
  myJockeys: [mkJockey("j1"), mkJockey("j2")],
  market: [mkJockey("j3", { contractUntil: undefined })],
  filterList: (list: Jockey[]) => list,
  onRelease: vi.fn(),
  onHire: vi.fn(),
};

function findCard(name: RegExp): HTMLElement {
  const cards = screen.getAllByRole("button", { name });
  const card = cards.find((el) => el.tagName === "DIV");
  if (!card) throw new Error(`Card element not found for ${name}`);
  return card;
}

describe("JockeyRosterTabs", () => {
  beforeEach(() => {
    navigate.mockClear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("My Jockeys tab: clicking a jockey card calls navigate with correct route params", () => {
    renderWithStore(<JockeyRosterTabs {...defaultProps} />);
    fireEvent.click(findCard(/jockey j1/i));
    expect(navigate).toHaveBeenCalledWith({
      to: "/jockey/$jockeyId",
      params: { jockeyId: "j1" },
    });
  });

  it("Available tab: clicking a jockey card calls navigate with correct route params", async () => {
    const user = userEvent.setup();
    const marketOnlyProps = {
      ...defaultProps,
      myJockeys: [],
      market: [mkJockey("j3")],
    };
    const { container } = renderWithStore(<JockeyRosterTabs {...marketOnlyProps} />);
    const marketTabTrigger = screen.getByRole("tab", { name: /available/i });
    await user.click(marketTabTrigger);
    await screen.findByText("Sign");
    const card = container.querySelector('[role="button"][tabindex="0"]') as HTMLElement;
    fireEvent.click(card);
    expect(navigate).toHaveBeenCalledWith({
      to: "/jockey/$jockeyId",
      params: { jockeyId: "j3" },
    });
  });

  it("does NOT assign to window.location.href on My Jockeys tab", () => {
    const originalLocation = window.location;
    const mockLocation = { ...originalLocation, href: originalLocation.href };
    let hrefAssigned = false;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: new Proxy(mockLocation, {
        set(target, prop, value) {
          if (prop === "href") {
            hrefAssigned = true;
            return true;
          }
          (target as any)[prop] = value;
          return true;
        },
      }),
    });
    renderWithStore(<JockeyRosterTabs {...defaultProps} />);
    fireEvent.click(findCard(/jockey j1/i));
    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
    expect(hrefAssigned).toBe(false);
  });

  it("Release button calls onRelease with jockey ID", () => {
    renderWithStore(<JockeyRosterTabs {...defaultProps} />);
    const releaseBtns = screen.getAllByText("Release");
    fireEvent.click(releaseBtns[0]);
    expect(defaultProps.onRelease).toHaveBeenCalledWith("j1");
  });

  it("Sign button calls onHire with jockey ID", async () => {
    const user = userEvent.setup();
    const marketOnlyProps = {
      ...defaultProps,
      myJockeys: [],
      market: [mkJockey("j3")],
    };
    renderWithStore(<JockeyRosterTabs {...marketOnlyProps} />);
    const marketTabTrigger = screen.getByRole("tab", { name: /available/i });
    await user.click(marketTabTrigger);
    await screen.findByText("Sign");
    fireEvent.click(screen.getByText("Sign"));
    expect(defaultProps.onHire).toHaveBeenCalledWith("j3");
  });
});

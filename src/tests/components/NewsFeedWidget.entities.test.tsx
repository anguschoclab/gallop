import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { seedStore } from "@/test-utils/renderWithStore";
import { createDefaultGameState } from "@/game/store/state";
import { NewsFeedWidget } from "@/components/dashboard/NewsFeedWidget";
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

describe("NewsFeedWidget — entity linking", () => {
  it("renders log entries with NewsContent auto-detection for horse names", () => {
    const horse = createTestHorse({
      id: "h1",
      name: "Thunder Strike",
      ownership: makePlayerOwned(),
    });
    seedStore({
      ...createDefaultGameState(),
      horses: { [horse.id]: horse },
      log: [{ day: 50, text: "Thunder Strike won the big race" }],
    });

    const { container } = render(<NewsFeedWidget />);
    const link = container.querySelector("a[to='/stable/$horseId']");
    expect(link).not.toBeNull();
    expect(link?.textContent).toBe("Thunder Strike");
    expect(link?.getAttribute("data-params")).toBe(JSON.stringify({ horseId: "h1" }));
  });

  it("renders multiple log entries with auto-detected entities", () => {
    const horse = createTestHorse({ id: "h1", name: "Lightning", ownership: makePlayerOwned() });
    seedStore({
      ...createDefaultGameState(),
      horses: { [horse.id]: horse },
      log: [
        { day: 50, text: "Lightning won today" },
        { day: 51, text: "Lightning retired to pasture" },
      ],
    });

    const { container } = render(<NewsFeedWidget />);
    const links = container.querySelectorAll("a[to='/stable/$horseId']");
    expect(links.length).toBeGreaterThanOrEqual(2);
  });
});

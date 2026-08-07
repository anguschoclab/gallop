import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { createDefaultGameState } from "@/game/store/state";
import { ApprenticeTracker } from "@/components/apprentice/ApprenticeTracker";
import { createTestJockey } from "@/tests/helpers";

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

describe("ApprenticeTracker — entity linking", () => {
  it("renders apprentice jockey name as a Link to /jockey/$jockeyId", () => {
    const jockey = createTestJockey({
      id: "j1",
      name: "Young Rider",
      isApprentice: true,
      stableId: "player",
      careerWins: 2,
    });
    const { container } = renderWithStore(<ApprenticeTracker />, {
      ...createDefaultGameState(),
      jockeys: [jockey],
    });
    const link = container.querySelector("a[to='/jockey/$jockeyId']");
    expect(link).not.toBeNull();
    expect(link?.textContent).toBe("Young Rider");
    expect(link?.getAttribute("data-params")).toBe(JSON.stringify({ jockeyId: "j1" }));
  });
});

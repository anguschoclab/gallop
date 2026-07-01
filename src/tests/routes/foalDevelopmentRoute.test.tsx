/**
 * foalDevelopmentRoute.test.tsx — Route guard tests for /foal-development/$horseId.
 *
 * Ensures users never see an actionable resolve UI when they shouldn't:
 * - Invalid horseId → "Horse not found" with back link.
 * - Horse without a development arc → redirects to the horse detail page.
 * - Horse whose arc is fully resolved → read-only summary, no choice buttons.
 * - Horse whose next milestone hasn't triggered yet → read-only countdown.
 * And that the back-link / view-horse deep links target /stable/$horseId with
 * the same horse context.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { useGame } from "@/game/store";
import { createDefaultGameState } from "@/game/store/state";
import { createTestHorse } from "@/tests/helpers";
import { createDefaultFoalDevelopmentArc } from "@/core/horse/foalDevelopment";
import type { Horse } from "@/core/horse/types";

const params: { horseId: string } = { horseId: "foal-1" };
const navigateSpy = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: any) => ({
    options: config,
    useParams: () => params,
  }),
  Link: ({ children, to, params: p }: any) => (
    <a
      href={typeof to === "string" ? to : "#"}
      data-to={typeof to === "string" ? to : ""}
      data-params={p ? JSON.stringify(p) : ""}
    >
      {children}
    </a>
  ),
  Navigate: ({ to, params: p }: any) => {
    navigateSpy({ to, params: p });
    return (
      <div
        data-testid="navigate"
        data-to={typeof to === "string" ? to : ""}
        data-params={p ? JSON.stringify(p) : ""}
      />
    );
  },
  useRouter: () => ({ history: { back: vi.fn() } }),
}));

// Import AFTER the mock so createFileRoute uses the mocked implementation.
import { Route } from "@/routes/foal-development.$horseId";

const FoalDevelopmentPage = () => {
  const Component = Route.options.component!;
  return <Component />;
};

function seed(horses: Horse[], day = 20) {
  useGame.setState({ ...createDefaultGameState(), horses, day } as any);
}

describe("/foal-development/$horseId route guard", () => {
  afterEach(() => {
    cleanup();
    navigateSpy.mockClear();
    params.horseId = "foal-1";
  });

  it("shows 'Horse not found' for an invalid horseId and never exposes choice buttons", () => {
    params.horseId = "does-not-exist";
    seed([]);
    render(<FoalDevelopmentPage />);
    expect(screen.getByText(/Horse not found/i)).toBeTruthy();
    expect(screen.queryByText("Bold Approach")).toBeNull();
    expect(screen.queryByText("Patient Method")).toBeNull();
    // Back link points to the stable roster.
    const back = screen.getByText(/Back to Stable/i).closest("a")!;
    expect(back.getAttribute("data-to")).toBe("/stable");
  });

  it("redirects to /stable/$horseId when the horse has no development arc", () => {
    const horse = createTestHorse({ id: "foal-1", owned: true, developmentArc: undefined });
    seed([horse]);
    render(<FoalDevelopmentPage />);

    const nav = screen.getByTestId("navigate");
    expect(nav.getAttribute("data-to")).toBe("/stable/$horseId");
    expect(nav.getAttribute("data-params")).toBe(JSON.stringify({ horseId: "foal-1" }));
    expect(navigateSpy).toHaveBeenCalledWith({
      to: "/stable/$horseId",
      params: { horseId: "foal-1" },
    });
    // No resolve UI rendered.
    expect(screen.queryByText("Bold Approach")).toBeNull();
  });

  it("renders read-only 'complete' state when the arc is fully resolved (no buttons)", () => {
    const arc = createDefaultFoalDevelopmentArc(0);
    arc.milestones.forEach((m, i) => {
      m.status = "resolved";
      m.resolvedChoiceKey = m.choices[0].key;
      m.resolvedOnDay = m.triggerDay + i;
    });
    const horse = createTestHorse({ id: "foal-1", owned: true, developmentArc: arc });
    seed([horse], 60);
    render(<FoalDevelopmentPage />);

    expect(screen.getByText(/Read-only view/i)).toBeTruthy();
    expect(screen.getByText(/All development milestones are complete/i)).toBeTruthy();
    // Actionable choices for the not-yet-triggered milestone MUST NOT appear.
    expect(screen.queryByRole("button", { name: /Bold Approach/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Sprint Focus/i })).toBeNull();
    // Resolved section shows history.
    expect(screen.getByText(/Resolved Milestones/i)).toBeTruthy();
  });

  it("renders read-only countdown when the next milestone has not triggered yet", () => {
    const horse = createTestHorse({
      id: "foal-1",
      owned: true,
      developmentArc: createDefaultFoalDevelopmentArc(0),
    });
    seed([horse], 5); // breaking_in triggers at day 18.
    render(<FoalDevelopmentPage />);

    expect(screen.getByText(/Read-only view/i)).toBeTruthy();
    expect(screen.getByText(/Next milestone/i)).toBeTruthy();
    expect(screen.getByText(/day 18 \(in 13 days\)/i)).toBeTruthy();
    // No actionable choice buttons rendered.
    expect(screen.queryByRole("button", { name: /Bold Approach/i })).toBeNull();
  });

  it("shows the actionable resolve UI on trigger day with the correct back-context link", () => {
    const horse = createTestHorse({
      id: "foal-1",
      name: "Test Foal",
      owned: true,
      developmentArc: createDefaultFoalDevelopmentArc(0),
    });
    seed([horse], 18);
    render(<FoalDevelopmentPage />);

    // Actionable choice buttons ARE present.
    expect(screen.getByRole("button", { name: /Bold Approach/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Patient Method/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Natural Progression/i })).toBeTruthy();

    // Read-only banner NOT shown.
    expect(screen.queryByText(/Read-only view/i)).toBeNull();

    // "View Horse" link deep-links back to the same horse detail page.
    const viewHorse = screen.getByText(/View Horse/i).closest("a")!;
    expect(viewHorse.getAttribute("data-to")).toBe("/stable/$horseId");
    expect(viewHorse.getAttribute("data-params")).toBe(JSON.stringify({ horseId: "foal-1" }));
  });
});

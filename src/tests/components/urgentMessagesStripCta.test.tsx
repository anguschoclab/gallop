/**
 * urgentMessagesStripCta.test.tsx — Verifies inbox "Resolve Milestone" CTAs
 * deep-link to /foal-development/$horseId and that the resolution page's Back
 * control returns the user to the prior horse detail context via router
 * history.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const navigateMock = vi.fn();
const historyBackMock = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
  useRouter: () => ({ history: { back: historyBackMock } }),
  Link: ({ children, to, params }: any) => (
    <a
      href={typeof to === "string" ? to : "#"}
      data-to={typeof to === "string" ? to : ""}
      data-params={params ? JSON.stringify(params) : ""}
    >
      {children}
    </a>
  ),
  Navigate: () => null,
  createFileRoute: () => (_config: any) => ({
    useParams: () => ({ horseId: "foal-1" }),
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { UrgentMessagesStrip } from "@/components/dashboard/UrgentMessagesStrip";
import { Route as FoalDevelopmentRoute } from "@/routes/foal-development.$horseId";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { createTestHorse } from "@/tests/helpers";
import { createDefaultFoalDevelopmentArc } from "@/core/horse/foalDevelopment";

describe("Foal development inbox CTA → route → back navigation", () => {
  afterEach(() => {
    cleanup();
    navigateMock.mockReset();
    historyBackMock.mockReset();
  });

  it("clicking the Resolve Milestone CTA navigates to /foal-development/<horseId>", () => {
    const messages = [
      {
        id: "msg-1",
        title: "Test Foal: Breaking In",
        body: "Test Foal is ready for Breaking In.",
        priority: "action",
        cta: {
          route: "/foal-development/$horseId",
          params: { horseId: "foal-1" },
        },
      },
    ];

    renderWithStore(<UrgentMessagesStrip messages={messages} />);

    fireEvent.click(screen.getByText("Test Foal: Breaking In"));

    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith({ to: "/foal-development/foal-1" });
  });

  it("interpolates a different horseId param correctly", () => {
    const messages = [
      {
        id: "msg-2",
        title: "Second Foal: Early Workouts",
        body: "...",
        priority: "action",
        cta: {
          route: "/foal-development/$horseId",
          params: { horseId: "abc-123" },
        },
      },
    ];

    renderWithStore(<UrgentMessagesStrip messages={messages} />);
    fireEvent.click(screen.getByText("Second Foal: Early Workouts"));

    expect(navigateMock).toHaveBeenCalledWith({ to: "/foal-development/abc-123" });
  });

  it("resolution page Back button returns to the previous route via router history", () => {
    const horse = createTestHorse({
      id: "foal-1",
      name: "Test Foal",
      owned: true,
      developmentArc: createDefaultFoalDevelopmentArc(0),
    });
    const Comp = FoalDevelopmentRoute.options.component as React.ComponentType;
    renderWithStore(<Comp />, {
      horses: [horse],
      day: 18,
    } as any);

    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(historyBackMock).toHaveBeenCalledTimes(1);
  });

  it("resolution page also exposes a direct View Horse link to /stable/$horseId", () => {
    const horse = createTestHorse({
      id: "foal-1",
      name: "Test Foal",
      owned: true,
      developmentArc: createDefaultFoalDevelopmentArc(0),
    });
    const Comp = FoalDevelopmentRoute.options.component as React.ComponentType;
    renderWithStore(<Comp />, {
      horses: [horse],
      day: 18,
    } as any);

    const link = screen.getByText(/View Horse/i).closest("a")!;
    expect(link.getAttribute("data-to")).toBe("/stable/$horseId");
    expect(link.getAttribute("data-params")).toBe(JSON.stringify({ horseId: "foal-1" }));
  });
});

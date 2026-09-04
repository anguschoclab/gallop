import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement, type ReactNode } from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { NextActionBanner } from "@/components/dashboard/NextActionBanner";
import { TutorialNextActionBanner } from "@/components/tutorial/TutorialNextActionBanner";
import { createDefaultTutorialState } from "@/core/tutorial/tutorialTypes";
import type { NextAction } from "@/core/dashboard/nextAction";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
  useNavigate: () => ({ to: () => {} }),
}));

const dummyAction: NextAction = {
  kind: "advance",
  label: "Advance to the next day",
  detail: "Nothing needs your attention",
  to: "/",
};

describe("TutorialNextActionBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders tutorial copy when tutorial is active", () => {
    renderWithStore(<TutorialNextActionBanner fallbackAction={dummyAction} />, {
      tutorial: createDefaultTutorialState(),
    });
    // Beat 0 is "Meet your stable"
    expect(screen.getByText(/meet your stable/i)).toBeInTheDocument();
  });

  it("renders fallback NextActionBanner when tutorial is not active", () => {
    renderWithStore(<TutorialNextActionBanner fallbackAction={dummyAction} />, {
      tutorial: { ...createDefaultTutorialState(), tutorialActive: false },
    });
    // Should show the fallback action label, not tutorial copy
    expect(screen.getByText("Advance to the next day")).toBeInTheDocument();
  });

  it("renders fallback NextActionBanner when tutorial is skipped", () => {
    renderWithStore(<TutorialNextActionBanner fallbackAction={dummyAction} />, {
      tutorial: { ...createDefaultTutorialState(), skipped: true },
    });
    expect(screen.getByText("Advance to the next day")).toBeInTheDocument();
  });

  it("renders fallback when all tutorial beats are completed", () => {
    renderWithStore(<TutorialNextActionBanner fallbackAction={dummyAction} />, {
      tutorial: {
        ...createDefaultTutorialState(),
        completedBeats: [0, 1, 2, 3, 4],
      },
    });
    expect(screen.getByText("Advance to the next day")).toBeInTheDocument();
  });

  it("shows skip tutorial button when tutorial is active", () => {
    renderWithStore(<TutorialNextActionBanner fallbackAction={dummyAction} />, {
      tutorial: createDefaultTutorialState(),
    });
    expect(screen.getByRole("button", { name: /skip tutorial/i })).toBeInTheDocument();
  });

  it("calls skipTutorial when skip button clicked", () => {
    renderWithStore(<TutorialNextActionBanner fallbackAction={dummyAction} />, {
      tutorial: createDefaultTutorialState(),
    });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /skip tutorial/i }));
    });
    // After skipping, the fallback should render
    expect(screen.getByText("Advance to the next day")).toBeInTheDocument();
  });

  it("shows beat 1 copy after beat 0 is completed", () => {
    renderWithStore(<TutorialNextActionBanner fallbackAction={dummyAction} />, {
      tutorial: {
        ...createDefaultTutorialState(),
        completedBeats: [0],
      },
    });
    // Beat 1 is "Enter your first race"
    expect(screen.getByText(/enter.*first race/i)).toBeInTheDocument();
  });
});

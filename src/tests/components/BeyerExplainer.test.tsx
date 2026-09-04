import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement, type ReactNode } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { BeyerExplainer } from "@/components/tutorial/BeyerExplainer";
import { createDefaultTutorialState } from "@/core/tutorial/tutorialTypes";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
}));

describe("BeyerExplainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when beyer explainer already acknowledged", () => {
    const { container } = renderWithStore(<BeyerExplainer beyerScore={85} />, {
      tutorial: { ...createDefaultTutorialState(), beyerExplainerAcknowledged: true },
    });
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when tutorial is not active", () => {
    const { container } = renderWithStore(<BeyerExplainer beyerScore={85} />, {
      tutorial: { ...createDefaultTutorialState(), tutorialActive: false },
    });
    expect(container.firstChild).toBeNull();
  });

  it("renders explanation when tutorial active and not acknowledged", () => {
    renderWithStore(<BeyerExplainer beyerScore={85} />, {
      tutorial: createDefaultTutorialState(),
    });
    // "Beyer" appears in the title and body — use getAllByText
    const beyerElements = screen.getAllByText(/beyer/i);
    expect(beyerElements.length).toBeGreaterThanOrEqual(1);
  });

  it("shows the horse's beyer score", () => {
    renderWithStore(<BeyerExplainer beyerScore={92} />, {
      tutorial: createDefaultTutorialState(),
    });
    expect(screen.getByText("92")).toBeInTheDocument();
  });

  it("acknowledge button calls acknowledgeBeyerExplainer", () => {
    renderWithStore(<BeyerExplainer beyerScore={85} />, {
      tutorial: createDefaultTutorialState(),
    });
    const btn = screen.getByRole("button", { name: /got it|acknowledge|dismiss/i });
    fireEvent.click(btn);
    // After acknowledging, the explainer should disappear
    const beyerElements = screen.queryAllByText(/beyer/i);
    expect(beyerElements.length).toBe(0);
  });
});

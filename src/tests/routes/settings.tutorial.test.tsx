import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement, type ReactNode } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { TutorialSettingsCard } from "@/components/settings/TutorialSettingsCard";
import { createDefaultTutorialState } from "@/core/tutorial/tutorialTypes";
import { useGame } from "@/game/store";
import { createDefaultGameState } from "@/game/store/state";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => createElement("a", props, children),
}));

describe("TutorialSettingsCard", () => {
  beforeEach(() => {
    useGame.setState(createDefaultGameState());
  });

  it("renders tutorial status and replay button", () => {
    renderWithStore(<TutorialSettingsCard />, {
      tutorial: createDefaultTutorialState(),
    });
    // "Tutorial" appears in title and possibly elsewhere — use getAllByText
    const tutorialElements = screen.getAllByText(/tutorial/i);
    expect(tutorialElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: /replay tutorial/i })).toBeInTheDocument();
  });

  it("shows 'In progress' when tutorial is active with incomplete beats", () => {
    renderWithStore(<TutorialSettingsCard />, {
      tutorial: { ...createDefaultTutorialState(), completedBeats: [0, 1] },
    });
    expect(screen.getByText(/in progress/i)).toBeInTheDocument();
    expect(screen.getByText(/step 3 of 5/i)).toBeInTheDocument();
  });

  it("shows 'Completed' when all beats are done", () => {
    renderWithStore(<TutorialSettingsCard />, {
      tutorial: {
        ...createDefaultTutorialState(),
        completedBeats: [0, 1, 2, 3, 4],
        tutorialActive: false,
      },
    });
    expect(screen.getByText(/completed/i)).toBeInTheDocument();
  });

  it("shows 'Skipped' when tutorial was skipped", () => {
    renderWithStore(<TutorialSettingsCard />, {
      tutorial: { ...createDefaultTutorialState(), skipped: true, tutorialActive: false },
    });
    expect(screen.getByText(/skipped/i)).toBeInTheDocument();
  });

  it("resets tutorial state when 'Replay Tutorial' button clicked", () => {
    renderWithStore(<TutorialSettingsCard />, {
      tutorial: {
        ...createDefaultTutorialState(),
        completedBeats: [0, 1, 2, 3, 4],
        tutorialActive: false,
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /replay tutorial/i }));
    const state = useGame.getState();
    expect(state.tutorial!.tutorialActive).toBe(true);
    expect(state.tutorial!.completedBeats).toEqual([]);
    expect(state.tutorial!.currentBeat).toBe(0);
  });
});

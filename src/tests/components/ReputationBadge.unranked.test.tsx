import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReputationBadge } from "@/components/ReputationBadge";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { createDefaultGameState } from "@/game/store/state";
import { useGame } from "@/game/store";
import type { ManagerReputation } from "@/core/reputation";

function mkReputation(overrides: Partial<ManagerReputation> = {}): ManagerReputation {
  return {
    score: 0,
    tier: "unknown",
    events: [],
    gradedWins: { G1: 0, G2: 0, G3: 0, Listed: 0 },
    totalWins: 0,
    yearsActive: 1,
    ...overrides,
  };
}

describe("ReputationBadge — zero-state display", () => {
  beforeEach(() => {
    useGame.setState({ ...createDefaultGameState() });
  });

  afterEach(() => {
    cleanup();
  });

  it("shows 'Unranked' label when score = 0", () => {
    renderWithStore(<ReputationBadge />, {
      reputation: mkReputation({ score: 0 }),
    });
    expect(screen.getByText("Unranked")).toBeTruthy();
  });

  it("hides '0 pts' when score = 0", () => {
    renderWithStore(<ReputationBadge />, {
      reputation: mkReputation({ score: 0 }),
    });
    expect(screen.queryByText("0 pts")).toBeNull();
  });

  it("shows '{score} pts' when score > 0", () => {
    renderWithStore(<ReputationBadge />, {
      reputation: mkReputation({ score: 150 }),
    });
    expect(screen.getByText("150 pts")).toBeTruthy();
  });

  it("tooltip shows 'Unranked' instead of 'Unknown'", async () => {
    const user = userEvent.setup();
    renderWithStore(<ReputationBadge />, { reputation: mkReputation({ score: 0 }) });

    const badge = screen.getByTestId("reputation-badge");
    await user.hover(badge);

    await waitFor(() => {
      const tooltip = document.body.querySelector("[role='tooltip']");
      expect(tooltip).toBeTruthy();
    });

    const tooltip = document.body.querySelector("[role='tooltip']");
    const text = tooltip?.textContent ?? "";
    expect(text).toContain("Unranked");
    expect(text).not.toContain("Unknown");
  });
});

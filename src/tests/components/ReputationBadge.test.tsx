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
    score: 150,
    tier: "unknown",
    events: [],
    gradedWins: { G1: 0, G2: 0, G3: 0, Listed: 0 },
    totalWins: 0,
    yearsActive: 1,
    ...overrides,
  };
}

describe("ReputationBadge", () => {
  beforeEach(() => {
    useGame.setState({ ...createDefaultGameState() });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders tier derived from score and point total", () => {
    renderWithStore(<ReputationBadge />, {
      reputation: mkReputation({ score: 150, tier: "unknown" }),
    });
    expect(screen.getByText("Local")).toBeTruthy();
    expect(screen.getByText("150 pts")).toBeTruthy();
  });

  it("fixes stale stored tier by deriving it from score", () => {
    renderWithStore(<ReputationBadge />, {
      reputation: mkReputation({ score: 300, tier: "unknown" }),
    });
    expect(screen.getByText("Regional")).toBeTruthy();
    expect(screen.queryByText("Unknown")).toBeNull();
  });

  it("shows a tooltip explaining reputation on hover", async () => {
    const user = userEvent.setup();
    renderWithStore(<ReputationBadge />, { reputation: mkReputation({ score: 150 }) });

    const badge = screen.getByTestId("reputation-badge");
    expect(badge).toBeTruthy();

    await user.hover(badge);

    await waitFor(() => {
      const tooltip = document.body.querySelector("[role='tooltip']");
      expect(tooltip).toBeTruthy();
    });

    const tooltip = document.body.querySelector("[role='tooltip']");
    const text = tooltip?.textContent ?? "";
    expect(text).toMatch(/0[–-]1000/);
    expect(text).toContain("graded stakes");
    expect(text).toContain("Legendary");
  });

  it("does not use a native title attribute on the badge container", () => {
    renderWithStore(<ReputationBadge />, { reputation: mkReputation() });
    const badge = screen.getByTestId("reputation-badge");
    expect(badge.getAttribute("title")).toBeNull();
  });

  it("returns null when reputation is missing", () => {
    const { container } = renderWithStore(<ReputationBadge />, {
      reputation: undefined as unknown as ManagerReputation,
    });
    expect(container.firstChild).toBeNull();
  });
});

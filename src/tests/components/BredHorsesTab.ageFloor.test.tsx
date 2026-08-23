import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { screen, cleanup } from "@testing-library/react";
import { BredHorsesTab } from "@/components/breeding/BredHorsesTab";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { createDefaultGameState } from "@/game/store/state";
import { useGame } from "@/game/store";
import { generateHorse, ensurePhenotypeResolved } from "@/core/horse/horseFactory";
import type { Horse } from "@/game/types";
import { isPlayerOwned } from "@/core/horse/ownership";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: any) => children,
}));

describe("BredHorsesTab — age floor", () => {
  beforeEach(() => {
    useGame.setState({ ...createDefaultGameState() });
  });

  afterEach(() => {
    cleanup();
  });

  it("displays age with Math.floor for float age", () => {
    const horse = ensurePhenotypeResolved(
      generateHorse({ tier: "starter", ownership: { type: "player" } }),
    ) as unknown as Horse;
    horse.age = 3.9;
    horse.bredByPlayer = true;
    isPlayerOwned(horse) = true;

    renderWithStore(<BredHorsesTab />, {
      horses: { [horse.id]: horse },
    });

    const text = screen.getByText("3")?.textContent ?? "";
    expect(text).toContain("3");
    // Should not render "3.9" anywhere
    const allText = document.body.textContent ?? "";
    expect(allText).not.toContain("3.9");
  });
});

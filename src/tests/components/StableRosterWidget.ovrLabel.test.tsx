import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { screen, cleanup } from "@testing-library/react";
import { StableRosterWidget } from "@/components/dashboard/StableRosterWidget";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { createDefaultGameState } from "@/game/store/state";
import { useGame } from "@/game/store";
import { generateHorse, ensurePhenotypeResolved } from "@/core/horse/horseFactory";
import type { Horse } from "@/game/types";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: any) => children,
  useNavigate: () => () => {},
}));

describe("StableRosterWidget — OVR label", () => {
  beforeEach(() => {
    useGame.setState({ ...createDefaultGameState() });
  });

  afterEach(() => {
    cleanup();
  });

  it("displays 'OVR' as the rating label", () => {
    const horse = ensurePhenotypeResolved(
      generateHorse({ tier: "starter", ownership: { type: "player" } }),
    ) as unknown as Horse;
    horse.lifecycleStatus = "active";

    renderWithStore(<StableRosterWidget />, {
      horses: { [horse.id]: horse },
    });

    expect(screen.getByText("OVR")).toBeTruthy();
    expect(screen.queryByText("Rating")).toBeNull();
  });
});

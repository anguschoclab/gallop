import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { screen, cleanup } from "@testing-library/react";
import { StableRosterWidget } from "@/domains/dashboard/ui/StableRosterWidget";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { createDefaultGameState } from "@/platform/game/store/state";
import { useGame } from "@/platform/game/store";
import { generateHorse, ensurePhenotypeResolved } from "@/domains/horse/simulation/horseFactory";
import type { Horse } from "@/platform/game/types";
import { makePlayerOwned } from "@/domains/horse/simulation/ownership";

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
      generateHorse({ tier: "starter", ownership: makePlayerOwned() }),
    ) as unknown as Horse;
    horse.lifecycleStatus = "active";

    renderWithStore(<StableRosterWidget />, {
      horses: { [horse.id]: horse },
    });

    expect(screen.getByText("OVR")).toBeTruthy();
    expect(screen.queryByText("Rating")).toBeNull();
  });
});

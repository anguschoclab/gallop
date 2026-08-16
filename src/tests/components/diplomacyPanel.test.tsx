/**
 * Diplomacy Panel Component Tests
 *
 * Verifies that the DiplomacyPanel component renders NPC relationship data
 * from the stable's AI state.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { DiplomacyPanel } from "@/components/npc/DiplomacyPanel";

vi.mock("@/game/store", () => ({
  useGame: (selector: (s: any) => any) =>
    selector({
      npcAIManager: {
        stableStates: {
          "npc-1": {
            npcRelationships: {
              "npc-2": {
                trust: 0.6,
                allianceType: "racing_coalition",
                history: [],
              },
              "npc-3": {
                trust: -0.3,
                allianceType: null,
                history: [],
              },
            },
          },
        },
        activeCartels: [],
      },
      npcStables: [
        { id: "npc-2", name: "Rival Stable A" },
        { id: "npc-3", name: "Rival Stable B" },
      ],
    }),
  useGameWithShallow: (selector: (s: any) => any) =>
    selector({
      npcAIManager: {
        activeCartels: [],
      },
    }),
}));

describe("DiplomacyPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders diplomacy panel title", () => {
    render(<DiplomacyPanel stableId="npc-1" />);
    expect(screen.getByText(/diplomacy/i)).toBeDefined();
  });

  it("renders relationships for each NPC", () => {
    render(<DiplomacyPanel stableId="npc-1" />);
    expect(screen.getByText("Rival Stable A")).toBeDefined();
    expect(screen.getByText("Rival Stable B")).toBeDefined();
  });

  it("displays alliance type when present", () => {
    render(<DiplomacyPanel stableId="npc-1" />);
    // Alliance type is rendered with spaces instead of underscores
    expect(screen.getByText(/racing coalition/i)).toBeDefined();
  });

  it("displays trust values", () => {
    render(<DiplomacyPanel stableId="npc-1" />);
    // Trust 0.6 = 60%
    expect(screen.getByText(/60/)).toBeDefined();
  });
});

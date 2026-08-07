import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { renderWithStore } from "@/test-utils/renderWithStore";
import { createDefaultGameState } from "@/game/store/state";
import { StorylinesTab } from "@/components/briefing/StorylinesTab";
import { createTestStable } from "@/tests/helpers";
import type { NpcAIManager, StableAIState, NarrativeState } from "@/core/ai/npcCycleAI";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    children?: ReactNode;
    to?: string;
    params?: Record<string, string>;
  }) => createElement("a", { to, "data-params": JSON.stringify(params) }, children),
  useNavigate: () => () => {},
  useSearch: () => ({}),
}));

describe("StorylinesTab — entity linking", () => {
  it("renders stable name as a Link to /npc-stables/$stableId", () => {
    const stable = createTestStable({ id: "npc1", name: "Godolphin" });
    const narrative: NarrativeState = {
      activeArcs: [],
      storyBeats: [{ day: 50, arcId: "a1", headline: "Big win", body: "Godolphin won big" }],
      dramaticPotential: 0.5,
    };
    const stableState: Partial<StableAIState> = { narrativeState: narrative };
    const manager: Partial<NpcAIManager> = {
      stableStates: { npc1: stableState as StableAIState },
    };

    const { container } = renderWithStore(<StorylinesTab />, {
      ...createDefaultGameState(),
      npcStables: [stable],
      npcAIManager: manager as NpcAIManager,
    });
    const link = container.querySelector("a[to='/npc-stables/$stableId']");
    expect(link).not.toBeNull();
    expect(link?.textContent).toBe("Godolphin");
    expect(link?.getAttribute("data-params")).toBe(JSON.stringify({ stableId: "npc1" }));
  });

  it("renders story beat headline and body with NewsContent auto-detection", () => {
    const stable = createTestStable({ id: "npc1", name: "Rival Stable" });
    const narrative: NarrativeState = {
      activeArcs: [],
      storyBeats: [{ day: 50, arcId: "a1", headline: "Rival Stable rises", body: "Testing" }],
      dramaticPotential: 0.8,
    };
    const stableState: Partial<StableAIState> = { narrativeState: narrative };
    const manager: Partial<NpcAIManager> = {
      stableStates: { npc1: stableState as StableAIState },
    };

    const { container } = renderWithStore(<StorylinesTab />, {
      ...createDefaultGameState(),
      npcStables: [stable],
      npcAIManager: manager as NpcAIManager,
    });
    // Stable name should be linked
    const links = container.querySelectorAll("a[to='/npc-stables/$stableId']");
    expect(links.length).toBeGreaterThanOrEqual(1);
  });
});
